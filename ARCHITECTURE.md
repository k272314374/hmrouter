# hmrouter / new-api 项目架构图

> 基于 new-api 源码（commit 196a82d）+ **全项目知识图谱（6749 节点 / 29338 边 / 30 层 / 36 步导览）** 整理。
> 标注 ★ 的位置是 hmrouter 企业版扩展点。
> 与 [PLAN.md](PLAN.md) v0.11 / [PRD-admin.md](PRD-admin.md) v0.3 / [PAGES-admin.md](PAGES-admin.md) v2 同步。
> S-003 重构反映：13 域 + 6 角色 + 24 张企业表 + 新模块（公告/Skill/课程/风险事件）+ ADR-019 严格 3 角色调用内容可见。

---

## 1. 顶层系统视图

```
┌────────────────────────────────────────────────────────────────────────────┐
│                            客户端 / 调用方                                   │
│  员工 Agent 工具       内部应用                    超管/部门 admin           │
│  (OpenAI SDK +         (Service Account              (浏览器)               │
│   hmrouter-cli)         HTTP/SSE/WS)                                        │
└────────────────────────────────────────────────────────────────────────────┘
            │                  │                            │
            │ /v1/chat/...     │ /v1/embeddings...          │ /api/* +
            │ /v1/messages     │ /v1/audio/...              │ /api/enterprise/*
            │ /api/agent/*     │                            │
            ▼                  ▼                            ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    hmrouter 进程  (单进程 Go + Gin)                         │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │  router/  路由分发                                                     │  │
│ │  SetRelayRouter | SetApiRouter | SetDashboardRouter | SetWebRouter   │  │
│ │  + ★ enterprise.SetupRouter  (/api/enterprise/* + /api/agent/*)     │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │  middleware/  中间件链 (relay 路径)                                    │  │
│ │  CORS → Stats → BodyCleanup → TokenAuth →                            │  │
│ │  ★ DeviceTokenGuard → ★ DeptModelACL → ★ PersonalRateLimit →         │  │
│ │  ModelRateLimit → PerfCheck → Distribute →                           │  │
│ │  ★ DeptBudgetGuard(M2) → ★ AuditRecorder → controller.Relay          │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │  controller/ + relay/ + service/  (原 New-API)                        │  │
│ │  Relay 中转引擎 (见 §3 详图，31 家厂商 adapter)                        │  │
│ │  + billing/quota/channel_select/token_counter (复用)                  │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │  model/  GORM 数据层                                                   │  │
│ │  原: User Token Channel Log Pricing ...                              │  │
│ │  ★ + 24 张企业表（见 §5.4 + PLAN §10.1）                              │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────────────────────────┐  │
│ │  ★ enterprise/  企业模块（新增，详见 §7）                              │  │
│ │  controller / service / middleware / oauth / model / router          │  │
│ └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
        │                       │                            │
        ▼                       ▼                            ▼
┌───────────────────┐  ┌───────────────────┐  ┌─────────────────────────────┐
│  PostgreSQL       │  │  Redis            │  │  对象存储                    │
│  原表 + 24 新表   │  │  原子配额/缓存     │  │  MinIO（开发）               │
│                   │  │                   │  │  / 群晖 NAS WebDAV (生产)   │
│                   │  │                   │  │  存附件原件（图/文档/音/视频）│
└───────────────────┘  └───────────────────┘  └─────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                  上游 LLM / 任务平台 (按部门 + 模型路由 AP5)                 │
│  M1：DeepSeek + OpenAI + Claude                                            │
│  境内：通义 文心 智谱 Kimi 火山 腾讯 讯飞 百度 阿里 ...                    │
│  境外：Gemini Vertex AWS Bedrock Cohere Mistral ...（按部门白名单）        │
│  任务：Midjourney Suno Sora/Veo 即梦 Kling Hailuo ...                       │
└────────────────────────────────────────────────────────────────────────────┘

★ 配套独立进程：
  cli/ 编译产物 hmrouter-cli  → 装在员工电脑，给 Agent shell 调用
                                调 /api/agent/* 端点（auth/usage/chats/case/kpi）
```

---

## 2. 目录结构与模块职责

| 目录 | 角色 | 关键文件 | hmrouter 是否扩展 |
|------|------|---------|------------------|
| `main.go` | 进程入口 | — | 不动 |
| `router/` | HTTP 路由 | `main.go` `relay-router.go` `api-router.go` `dashboard.go` `web-router.go` | 加 1 行注册 enterprise router |
| `middleware/` | 中间件链 | `auth.go` `distributor.go` `rate-limit.go` `stats.go` `recover.go` | ★ 在原中间件链插入 `device_token_guard` `dept_budget_guard` `audit_recorder`（位于 enterprise/middleware/） |
| `controller/` | HTTP handler | `relay.go` `user.go` `token.go` `channel.go` `log.go` `billing.go` | 不动（新增放 enterprise/） |
| `relay/` | **中转引擎核心** | 见 §3 | ★ 改 `RelayInfo` + `BillingSettler` |
| `service/` | 业务服务（50+ 文件） | `billing.go` `pre_consume_quota.go` `token_counter.go` `quota.go` `channel_select.go` | 不动 |
| `model/` | 数据模型 + GORM + 缓存 | `user.go` `token.go` `channel.go` `log.go` | ★ 加字段（user 5 个、token 2 个） |
| `setting/` | 配置（ratio/model/system/perf） | — | 不动 |
| `common/` | 工具（JSON/crypto/Redis/env） | `json.go` `redis.go` | 不动 |
| `dto/` | 请求/响应 DTO | — | 不动 |
| `constant/` | 常量（API 类型、context key） | `relay_mode.go` | 不动 |
| `types/` | 类型定义 | — | 不动 |
| `oauth/` | OAuth provider（GitHub/Discord/OIDC/...） | — | ★ 加 `wecom.go`（企微） |
| `pkg/` | 内部包（cachex/ionet/billingexpr） | — | 不动 |
| `i18n/` | 后端 i18n（en/zh） | — | 不动 |
| `web/` | 前端容器 | `default/` `classic/` | ★ 在 `web/default/src/features/` 下加企业子域（AP12） |
| `electron/` | 桌面壳 | — | 不动 |
| **★ `enterprise/`** | **新增后端模块** | `controller/` `service/` `middleware/` `oauth/` `router/` `model/` | **全新**（详见 §7） |
| **★ `cli/`** | **新增 CLI 工具** | `main.go` `cmd/{auth,usage,chats,case,kpi,devices}.go` | **全新**（hmrouter-cli 二进制） |

---

## 3. relay/ 核心中转引擎（详图）

> 基于 understand-anything 知识图谱：6 层架构 / 196 文件 / 31 家 channel adapter

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Layer 1 — api-handler  (12 文件 · relay/*_handler.go)                       │
│  按 RelayMode 分流的入口 helper：                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ compatible_handler.go      OpenAI 兼容 chat/completions（90% 流量）   │  │
│  │ chat_completions_via_responses.go    Chat → Responses 桥接           │  │
│  │ responses_handler.go       OpenAI Responses API                      │  │
│  │ claude_handler.go          Anthropic Messages 原生                    │  │
│  │ gemini_handler.go          Google Gemini 原生                         │  │
│  │ embedding_handler.go       /v1/embeddings                            │  │
│  │ image_handler.go           /v1/images                                │  │
│  │ audio_handler.go           /v1/audio                                 │  │
│  │ rerank_handler.go          /v1/rerank                                │  │
│  │ websocket.go               /v1/realtime                              │  │
│  │ mjproxy_handler.go         Midjourney 异步                            │  │
│  │ relay_task.go              Suno/Sora/Vidu/Kling 异步任务              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  Layer 2 — relay-core  (10 文件 · relay/common/)  ★ 改造重点                │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ ★ relay_info.go   RelayInfo 上下文 god-object（fan-in 105）            │  │
│  │                   承载渠道/用户/分组/模型映射/计费状态                    │  │
│  │                   ★ 加字段：DepartmentId, DeptBudgetId                │  │
│  │                                                                      │  │
│  │ ★ billing.go      BillingSettler 计费抽象（fan-in 105）                │  │
│  │                   预扣 → 调用 → 结算 → 写日志                          │  │
│  │                   ★ 结算阶段联动 department_budget                     │  │
│  │                                                                      │  │
│  │ override.go       请求/Header 覆盖引擎（fan-in 105 / fan-out 63）      │  │
│  │                   运营改请求不动代码；支持条件/wildcard/审计            │  │
│  │                   ★ 可用：按部门下发 model/header 白名单                │  │
│  │                                                                      │  │
│  │ stream_status.go  流式状态聚合器（线程安全）                            │  │
│  │ relay_utils.go    URL 构造、multipart 校验                             │  │
│  │ request_conversion.go  RelayFormat 猜测                              │  │
│  │ constant/relay_mode.go RelayMode 枚举（chat/embed/image/...）          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  Layer 3 — relay-helper  (12 文件 · relay/helper/)                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ model_mapped.go      用户模型名 → 上游真实模型                          │  │
│  │ stream_scanner.go    通用 SSE 扫描器（解耦上下游）                      │  │
│  │ price.go             分组倍率 / 按调用 / 按 Token / 表达式分层计费       │  │
│  │ valid_request.go     各类下游请求合法性校验                             │  │
│  │ billing_expr_request.go 计费表达式请求快照                             │  │
│  │ common.go            SSE/WS 写出 / ping / chunk 序列化                  │  │
│  │ stream_result.go     流式结束态封装                                     │  │
│  │ reasonmap/           finish_reason 映射                                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  Layer 4 — channel-framework  (4 文件 · relay/channel/)                     │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ adapter.go         Adaptor / TaskAdaptor 接口契约：                    │  │
│  │                    Init / ConvertRequest / DoRequest /                │  │
│  │                    DoResponse / GetModelList / GetChannelName         │  │
│  │ relay_adaptor.go   ★ Adapter 工厂（fan-out 156，最大枢纽）             │  │
│  │                    按 ApiType / TaskPlatform 选择具体 adapter         │  │
│  │ api_request.go     通用 HTTP/Form/WebSocket 执行                       │  │
│  │                    header 透传 / 占位符 / override 应用 / ping        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
                                     │
                ┌────────────────────┴────────────────────┐
                ▼                                         ▼
┌───────────────────────────────────┐     ┌─────────────────────────────────┐
│  Layer 5 — channel-adapters       │     │  Layer 6 — async-task           │
│  (137 文件 · relay/channel/<ven>/)│     │  (21 文件 · relay/channel/task/)│
│                                   │     │                                 │
│  境内厂商：                        │     │  视频生成：                      │
│   ali/ baidu/ baidu_v2/           │     │   ali/ doubao/ gemini/          │
│   tencent/ zhipu/ zhipu_4v/       │     │   hailuo/ jimeng/ kling/        │
│   xunfei/ moonshot/ deepseek/     │     │   sora/ veo/ vertex/ vidu/      │
│   volcengine/ ai360/              │     │                                 │
│                                   │     │  音乐：                          │
│  境外厂商：                        │     │   suno/                         │
│   openai/ claude/ gemini/         │     │                                 │
│   vertex/ aws/ codex/             │     │  图像：                          │
│   cohere/ mistral/ ollama/        │     │   midjourney/                   │
│   cloudflare/ perplexity/         │     │                                 │
│   xai/ palm/ replicate/           │     │  → relay_task.go 中继核心       │
│   siliconflow/ submodel/          │     │                                 │
│   minimax/ jina/ mokaai/          │     │                                 │
│   coze/ dify/                     │     │                                 │
│                                   │     │                                 │
│  每个 adapter 一个目录：           │     │                                 │
│   adaptor.go  constants.go        │     │                                 │
│   dto.go      text.go/image.go    │     │                                 │
└───────────────────────────────────┘     └─────────────────────────────────┘
                                     │
                                     ▼
                          上游 LLM / 任务平台 HTTP/WS
```

---

## 4. 请求生命周期（OpenAI 兼容 chat 主流程）

```
[客户端 SDK]
    │  POST /v1/chat/completions
    │  Authorization: Bearer sk-xxx
    │  Body: {"model":"gpt-4","messages":[...]}
    ▼
┌─────────────────────────────────────────────────────────────┐
│  router/relay-router.go                                     │
│   → relayV1Router.POST("/chat/completions", ...)            │
│   → controller.Relay(c, types.RelayFormatOpenAI)            │
└─────────────────────────────────────────────────────────────┘
    │
    ▼ (中间件链按序执行)
┌─────────────────────────────────────────────────────────────┐
│  CORS → BodyCleanup → Stats                                 │
│  ↓                                                          │
│  TokenAuth (middleware/auth.go)                             │
│   → 解析 sk-xxx → 查 Token 表 → 验状态/IP/过期/模型限制      │
│   → 上下文写入 user_id, token_id, group, model_limits ...   │
│  ↓                                                          │
│  ★ DeviceTokenGuard (enterprise/middleware/, AP23)           │
│   → 验 X-Device-Token header → 查 device 表                 │
│   → 不在白名单/吊销/过期 → 401 + 告警                       │
│  ↓                                                          │
│  ModelRequestRateLimit (middleware/model-rate-limit.go)     │
│   → 按 user_id + model 频控                                 │
│  ↓                                                          │
│  SystemPerformanceCheck                                     │
│  ↓                                                          │
│  Distribute (middleware/distributor.go)  ★ 关键              │
│   → 解析请求 model 字段                                      │
│   → 按 group + model 选 channel（service/channel_select.go）│
│   → 上下文写入 channel_id, base_url, key, mapped_model ...  │
│  ↓                                                          │
│  ★ DeptBudgetGuard (enterprise/middleware/, AP14/AP15)       │
│   → 反查 user_id → user.primary_dept_id                     │
│   → 查 dept_budget 当前周期 → 调 billingexpr 求值（AP26）   │
│   → observe 模式：仅记录              ┐                      │
│   → enforce 模式：余额不足 → 402     ┘                      │
│  ↓                                                          │
│  ★ AuditRecorder (enterprise/middleware/, AP19)              │
│   → 在 ResponseWriter 上做 tee：一路给客户端，一路累积      │
│   → 流结束后异步写 audit_log + 附件存对象存储                │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  controller/relay.go::Relay                                 │
│   → 按 RelayFormat 分发                                     │
│   → relay/compatible_handler.go::TextHelper                 │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  relay/compatible_handler.go::TextHelper                    │
│   ① helper/valid_request.go  请求合法性校验                  │
│   ② common/relay_info.go     初始化 RelayInfo 上下文         │
│      ★ 此处注入 dept_id 等企业字段                           │
│   ③ common/override.go       应用请求/Header 覆盖             │
│   ④ helper/model_mapped.go   模型名映射                      │
│   ⑤ service/pre_consume_quota.go  预扣配额（Redis 原子）    │
│   ⑥ helper/price.go          价格计算                        │
│   ⑦ relay_adaptor.go         ★ 工厂选 adapter               │
│   ⑧ adapter.ConvertRequest() 转换为上游协议格式               │
│   ⑨ adapter.DoRequest()      发起上游 HTTP/SSE/WS           │
│   ⑩ adapter.DoResponse()     解析响应（流式：StreamScanner） │
│   ⑪ common/stream_status.go  收集 finish_reason / usage     │
│   ⑫ common/billing.go        BillingSettler 结算             │
│      ★ 此处异步更新 department_budget.quota_used             │
│   ⑬ service/log_info_generate.go  写 Log 表                  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼ 响应流回客户端
[客户端 SDK]
```

---

## 5. 核心抽象与依赖关系

### 5.1 RelayInfo（贯穿全链路的 god-object）

```
RelayInfo
├─ ChannelInfo (上游)   from middleware.Distribute
├─ UserId / Group       from middleware.TokenAuth
├─ TokenId / Quota      from middleware.TokenAuth
├─ Model / MappedModel  from helper.model_mapped
├─ RequestUrl / Method
├─ StreamStatus         实时聚合 finish_reason / usage
├─ BillingSettler       计费策略
├─ ★ DeviceId          (新增) from DeviceTokenGuard
├─ ★ DepartmentId       (新增) from DeptBudgetGuard
└─ ★ DeptBudgetId       (新增)

派生类型：
├─ RelayInfoClaude     (claude_handler 用)
├─ RelayInfoRerank     (rerank_handler 用)
├─ RelayInfoResponses  (responses_handler 用)
└─ RelayInfoTask       (relay_task 用)
```

### 5.2 BillingSettler 接口

```go
type BillingSettler interface {
    PreConsume(ctx) error      // 预扣（Redis 原子，防超额）
    Settle(ctx, usage) error   // 结算（写 Log + 退还预扣差额）
    OnError(ctx, err) error    // 失败回滚
}

★ hmrouter 改造：
  - PreConsume() 阶段：检查 dept_budget.remaining (enforce 模式) + billingexpr 求值
  - Settle() 阶段：原子加 dept_budget.quota_used；触发 audit_writer 写 audit_log
  - 异步触发 80%/100% 阈值告警 + SSE 推送给部门 admin
```

### 5.3 Adaptor 接口契约（厂商必实现）

```go
type Adaptor interface {
    Init(info *RelayInfo)
    GetRequestURL(info) (string, error)
    SetupRequestHeader(c, req, info) error
    ConvertRequest(c, info, req) (any, error)   // 转上游格式
    DoRequest(c, info, body) (Response, error)  // 发起调用
    DoResponse(c, resp, info) (usage, err)      // 解析响应
    GetModelList() []string
    GetChannelName() string
}
```

### 5.4 数据模型关系（含 hmrouter 扩展，v0.8 完整版）

```
                              ┌──────────────┐
                              │   Channel    │
                              │ (上游渠道)    │
                              └──────┬───────┘
                                     │ 1:N
                                     ▼
   ┌──────────────┐  N:1   ┌──────────────┐  1:N   ┌──────────────┐
   │     User     │◄───────│    Token     │───────►│   Log（原）  │
   │ (★ HR 字段)  │        │ (★ owner_*)  │        │              │
   └──┬────────┬──┘        └──────┬───────┘        └──────────────┘
      │ N:M    │ 1:N              │ N:1
      ▼        ▼                  ▼
┌──────────┐ ┌──────────┐  ┌──────────────────┐
│ ★ user_  │ │ ★ device │  │ ★ service_       │
│ depart-  │ │  (白名单) │  │   account        │
│ ment     │ │          │  │  (应用，AP23)    │
└────┬─────┘ └──────────┘  └────────┬─────────┘
     │ N:1                          │ N:1
     ▼                              ▼
   ┌──────────────────────────────────────┐
   │       ★ department  (部门树)          │
   └──────────────┬───────────────────────┘
                  │ 1:N
                  ▼
   ┌──────────────────────────────────────┐
   │   ★ department_budget                │
   │   (公式存 billingexpr 表达式 AP26)   │
   │   (enforce_mode: observe/enforce)    │
   └──────────────────────────────────────┘

   ──── 审计与记录（AP19/AP20/AP24）────

   ┌──────────────────────────────────────┐    ┌──────────────────┐
   │       ★ audit_log  (会话记录主表)     │───►│ ★ audit_         │
   │ user/dept/token/channel/model/        │1:N │   attachment     │
   │ request_text/response_text/...        │    │ (附件元数据)     │
   └────────────┬─────────────────────────┘    └──────────────────┘
                │ 被改/删 → 写
                ▼
   ┌──────────────────────────────────────┐         对象存储
   │   ★ admin_action_log (元审计)         │       (MinIO/群晖)
   │   admin/action/before/after/reason    │       存附件原件
   └──────────────────────────────────────┘

   ──── 导出（M1）────

   ┌──────────────────────────────────────┐
   │   ★ export_task                       │
   │ requester/dimension/scope/template/   │
   │ status/progress/result_storage_key    │
   └──────────────────────────────────────┘

   ──── HR 与协同（M3+）────

   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
   │ ★ hr_sync_event  │  │ ★ case_submission│  │ ★ business_kpi   │
   │ (HR 同步审计)    │  │ (案例，M3)       │  │ (业务量上报 M3-4)│
   └──────────────────┘  └──────────────────┘  └──────────────────┘

   ┌──────────────────┐
   │ ★ notification   │
   │ (SSE 推送 M3)    │
   └──────────────────┘
```

---

## 6. middleware 链顺序速查（relay 路径）

| 顺序 | 中间件 | 文件 | 职责 | hmrouter 改 |
|-----|-------|------|------|------------|
| 1 | CORS | `middleware/cors.go` | 跨域 | — |
| 2 | DecompressRequest | `middleware/utils.go` | gzip 解压 | — |
| 3 | BodyStorageCleanup | `middleware/body_cleanup.go` | 清理 body 缓存 | — |
| 4 | Stats | `middleware/stats.go` | 调用统计 | — |
| 5 | RouteTag | — | 路由标签 | — |
| 6 | **TokenAuth** | `middleware/auth.go` | sk-xxx 解析 + Token 校验 | — |
| 7 | **★ DeviceTokenGuard** | `enterprise/middleware/device_token_guard.go` | **设备白名单校验 + 双层 token 校验**（AP23 + B-D5） | **新增** |
| 8 | **★ DeptModelACL** | `enterprise/middleware/dept_model_acl.go` | **部门-模型可见性校验**（C-D2，金融三部门禁境外） | **新增** |
| 9 | **★ PersonalRateLimit** | `enterprise/middleware/personal_rate_limit.go` | **个人 QPS + 日次数 + 并发**（D-D2） | **新增** |
| 10 | ModelRequestRateLimit | `middleware/model-rate-limit.go` | per-user-model 频控 | — |
| 11 | SystemPerformanceCheck | `middleware/performance.go` | 系统过载保护 | — |
| 12 | **Distribute** | `middleware/distributor.go` | **选 channel + 注入**（C-D3 dept-aware 路由） | + 部门感知 |
| 13 | **★ DeptBudgetGuard** | `enterprise/middleware/dept_budget_guard.go` | **部门预算检查**（M2，AP14/AP15） | **新增** M2 |
| 14 | **★ AuditRecorder** | `enterprise/middleware/audit_recorder.go` | **调用记录 tee**（AP19，元数据同步 + 附件异步） | **新增** |
| → | controller.Relay | `controller/relay.go` | 进入 relay 引擎 | — |

---

## 7. hmrouter 企业模块扩展点全图

```
┌──────────────────────────────────────────────────────────────────┐
│              ★ enterprise/  企业能力模块（后端，新增）             │
│                                                                  │
│  enterprise/router/                                              │
│    enterprise_router.go     注册 /api/enterprise/* + /api/agent/*│
│                                                                  │
│  enterprise/controller/                                          │
│    users.go                 ★ 员工目录 + 详情 + 编辑 + 激活/调岗  │
│    departments.go           部门 CRUD（M1 提前）                  │
│    budget.go                M2 预算配置 + 临时审批工单            │
│    service_account.go       服务账号 CRUD + Token 关联            │
│    device.go                设备白名单 + activate 接口 + 审批流   │
│    audit.go                 ★ 调用查询（仅 3 角色）+ 编辑/删除 M2 │
│    admin_actions.go         元审计日志查询（PRD §5.F）            │
│    export.go                导出任务 CRUD + 异步进度              │
│    agent.go                 /api/agent/* 端点（CLI 调用）         │
│    hr_sync.go               企微同步触发与状态（M3）              │
│    dashboard.go             双维度看板 API（D-D1）                │
│    announcements.go         ★ 公告 CRUD + 强制确认（L 域）       │
│    skills.go                ★ Skill CRUD（J-11，数智营销中心）   │
│    courses.go               ★ 课程 CRUD（J-12）                  │
│    resources.go             ★ 资源浏览/下载（员工，统一 J-11/12）│
│    inbox.go                 ★ 待办聚合（30s 轮询）                │
│    health.go                健康检查（G 域）                      │
│    dept_model_acl.go        ★ 部门-模型可见性矩阵配置（C-D2）    │
│    models_meta.go           ★ 模型推荐元数据维护（C-D4）         │
│    risk_events.go           风险事件列表（M3，M 域）              │
│    risk_rules.go            风险规则编辑（M3）                    │
│                                                                  │
│  enterprise/service/                                             │
│    wecom_sync.go            企微 OpenAPI 拉部门/员工（M3）        │
│    audit_storage.go         AuditStorage 接口（AP21）             │
│    audit_storage_minio.go   MinIO 实现                            │
│    audit_storage_synology.go 群晖 WebDAV 实现（M2）              │
│    audit_writer.go          异步写入 + 流式 tee + 失败队列        │
│    error_diagnosis.go       ★ 错误诊断引擎（yaml 规则，不读 prompt）│
│    model_status.go          ★ Redis sliding window 模型实时状态  │
│    cost_estimate.go         按 model_ratio 估成本                 │
│    budget_aggregator.go     从 audit_log 聚合实时消耗（M2）       │
│    budget_eval.go           ★ 调 billingexpr 求值（AP26）（M2）   │
│    budget_reset.go          周期重置 cron（M2）                   │
│    device_token.go          设备 token 颁发/校验                  │
│    admin_action_writer.go   ★ 元审计统一入口（before/after snapshot）│
│    risk_worker.go           异步规则匹配 worker（M3）             │
│    notification_pusher.go   通知推送（站内+企微+邮件）（M2）      │
│    alert.go                 80%/100% 告警（M2）                   │
│                                                                  │
│  enterprise/middleware/                                          │
│    ★ device_token_guard.go   设备 token 校验 + 双层 token（B-D5） │
│    ★ dept_model_acl.go       部门-模型可见性（C-D2）              │
│    ★ personal_rate_limit.go  个人限流 QPS+日次数+并发（D-D2）     │
│    ★ dept_budget_guard.go    部门预算检查（M2，AP14/AP15）        │
│    ★ audit_recorder.go       调用记录中间件（AP19）              │
│    ★ role_guard.go           6 角色权限校验（A-D5）              │
│    ★ ip_whitelist.go         IP 白名单（K-D1）                   │
│    ★ admin_action_log_hook.go GORM hook 阻 update/delete（F-D2） │
│                                                                  │
│  enterprise/service/                                             │
│    wecom_sync.go            企微 OpenAPI 拉部门/员工              │
│    audit_storage.go         AuditStorage 接口（AP21）             │
│    audit_storage_minio.go   MinIO 实现                            │
│    audit_storage_synology.go 群晖 WebDAV 实现                     │
│    audit_writer.go          异步写入 + 流式 tee                   │
│    budget_aggregator.go     从 audit_log 聚合实时消耗             │
│    budget_eval.go           ★ 调 billingexpr 求值（AP26）         │
│    budget_reset.go          周期重置 cron                         │
│    device_token.go          设备 token 颁发/校验                  │
│    alert.go                 80%/100% 告警                         │
│                                                                  │
│  enterprise/middleware/                                          │
│    ★ dept_budget_guard.go    部门预算检查（AP14/AP15）            │
│    ★ device_token_guard.go   设备 token 校验（AP23）              │
│    ★ audit_recorder.go       审计中间件（请求/响应记录，AP19）    │
│                                                                  │
│  enterprise/oauth/                                               │
│    wecom.go                 ★ 企微 OAuth provider                │
│                              （注册到原 oauth/registry.go）       │
│                              + 自动创建 user.status=pending        │
│                                                                  │
│  enterprise/model/  (M1 13 张 + M2 5 张 + M3 6 张 = 24 张)        │
│    department.go            部门树                                │
│    user_department.go       用户-部门关联（含调岗历史）           │
│    service_account.go       服务账号                              │
│    device.go                设备白名单                            │
│    audit_log.go             调用记录主表（含 device_id+conversation_id）│
│    audit_attachment.go      调用附件元数据                        │
│    admin_action_log.go      元审计（AP24，含 GORM hook）         │
│    export_task.go           异步导出任务                          │
│    announcement.go          ★ 公告（L 域）                        │
│    user_announcement_ack.go ★ 公告确认记录                       │
│    enterprise_resource.go   ★ Skill+课程统一基础表（J-11/12）    │
│    enterprise_resource_version.go ★ 资源版本                     │
│    enterprise_resource_download_log.go ★ 下载记录                │
│    department_budget.go     M2 部门预算（AP26 公式）              │
│    dept_budget_approval.go  M2 临时配额审批工单（D-D4）           │
│    system_setting.go        M2 系统参数 + IP 白名单               │
│    login_log.go             M2 后台访问留痕                       │
│    enterprise_resource_progress.go M2 课程学习进度                │
│    hr_sync_event.go         M3 HR 同步事件                        │
│    case_submission.go       M3 案例提交                           │
│    business_kpi.go          M3-4 业务量上报                       │
│    notification.go          M3 推送通知                           │
│    risk_rule.go             M3 风险规则库（ADR-016）              │
│    risk_event.go            M3 命中事件                           │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│              ★ web/default/src/features/  （前端，新增子域）       │
│                                                                  │
│  ── 员工域（common 角色 4 项菜单）──                              │
│  workspace/index/           ★ 员工工作台（Token+模型+设备+引导）  │
│  workspace/usage/           个人 token 用量 + 排名                │
│  workspace/skills/          Skill 中心列表 + 详情                 │
│  workspace/courses/         AI 学习中心列表 + 详情                │
│                                                                  │
│  ── 帮助域 ──                                                    │
│  help/clients/              客户端教程（M1 WorkBuddy + OpenClaw）│
│  help/cli/                  hmrouter-cli 文档                     │
│                                                                  │
│  ── 企业管理域（ai_liaison+） ──                                  │
│  enterprise/dashboard/      仪表盘（双维度）                      │
│  enterprise/users/          员工目录 + 详情（管理者诊断视角）     │
│  enterprise/devices/        设备管理                              │
│  enterprise/service-accounts/ 服务账号                            │
│  enterprise/inbox/          待办（30s 轮询）                      │
│  enterprise/export/         一键导出                              │
│  enterprise/departments/    部门管理（M1 基础 CRUD）              │
│                                                                  │
│  ── 调用记录域（仅 3 角色）──                                     │
│  audit/list/                调用列表                              │
│  audit/detail/              ★ 调用详情（ChatTranscript + ErrorDiag）│
│  audit/admin-edit/          admin 编辑/删除（带元审计，M2）       │
│                                                                  │
│  ── 公告域 ──                                                    │
│  announcements/             公告列表 + 详情（员工查看）           │
│  enterprise/announcements/  ★ 公告管理（含 TipTap 富文本）       │
│                                                                  │
│  ── Skill / 课程管理域（数智营销中心独家）──                       │
│  enterprise/skills/         Skill 上传 + 编辑                     │
│  enterprise/courses/        课程章节编辑                          │
│                                                                  │
│  ── 系统域（仅 root，多数复用）──                                  │
│  admin/health/              健康检查（M1）                        │
│  admin/dept-model-acl/      ★ 部门-模型可见性矩阵（M1）          │
│  admin/system-settings/     系统配置（M2 参数 + IP 白名单）       │
│                                                                  │
│  ── 公共组件 ──                                                  │
│  components/ui-enterprise/                                       │
│    TokenCard / ModelCard / DeviceList / ResourceCard             │
│    ChatTranscript / ErrorDiagnosisCard                           │
│    AnnouncementBanner / AnnouncementModal                        │
│    TimeRangePicker / ReasonInputDialog / EmptyState              │
│    WorkBuddyImportGuide / ExcelExportTask / InboxList            │
│    SkillUploadForm / CourseEditor                                │
│    AnnouncementEditor (TipTap)                                   │
│    BillingExprEditor (M2)                                        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│              ★ cli/  （Agent 接口工具，新增）                      │
│                                                                  │
│  cli/main.go                                                     │
│  cli/cmd/                                                        │
│    auth.go        login / logout                                 │
│    usage.go       --me / --dept                                  │
│    chats.go       list / search / show                           │
│    case.go        submit                                         │
│    kpi.go         report                                         │
│    devices.go     list / status                                  │
└──────────────────────────────────────────────────────────────────┘

对原 New-API 的最小侵入（仅 4 处）：
  ┌──────────────────────────────┬─────────────────────────────────┐
  │ router/main.go               │ + enterprise.SetupRouter()      │
  │ middleware/distributor.go    │ + DeptBudgetGuard / DeviceToken │
  │                              │   Guard / AuditRecorder 三个钩子 │
  │ model/user.go                │ + 5 个 HR 字段                  │
  │ model/token.go               │ + owner_type, owner_id 2 字段   │
  └──────────────────────────────┴─────────────────────────────────┘

复用原 New-API 的能力（AP16）：
  ✓ TokenAuth / OAuth 注册中心（扩展 oauth/wecom.go，零改原文件）
  ✓ Channel / Group 路由（按部门下发不同 Group，AP5）
  ✓ override 引擎（按部门下发模型白名单）
  ✓ billingexpr 表达式引擎（部门预算公式，AP26）
  ✓ Redis 配额预占机制（dept_budget 复用同套原子操作）
  ✓ 31 家 channel adapter（不写一行 adapter 代码）
  ✓ 流式 SSE / WebSocket 转发
  ✓ 模型映射 / 价格计算 / Token 计数
  ✓ shadcn/ui 169 组件 + i18n 6 语言 + TanStack Router/Query/Zustand
  ✓ admin/common 角色（扩枚举即可，AP27）
```

---

## 8. 前端架构

```
┌──────────────────────────────────────────────────────────────────┐
│  统一前端 web/default/  (单一 React 19 工程)                      │
│  React 19 + TypeScript + Rsbuild + TanStack Router/Query +       │
│  Base UI + shadcn/ui + Tailwind + Zustand + i18next + axios      │
│                                                                  │
│  src/features/                                                   │
│  ├─ (原 22 个域，给超管/平台运维)                                 │
│  │   about / auth / channels / chat / dashboard / errors /       │
│  │   home / keys / legal / models / performance-metrics /        │
│  │   playground / pricing / profile / rankings /                 │
│  │   redemption-codes / setup / subscriptions /                  │
│  │   system-settings / usage-logs / users / wallet               │
│  │                                                               │
│  └─ ★ 企业新增 features（v2 修订）                                │
│      enterprise/dashboard/    部门看板（聚合视图）                 │
│      enterprise/personal/     ★ 个人用量页（双维度的个人维度）     │
│      enterprise/ranking/      部门排名 + 部门内员工 Top N          │
│      audit/list/              审计列表（复用 usage-logs 表格）    │
│      audit/detail/            会话详情（含附件预览）              │
│      audit/admin-edit/        admin 编辑/删除（带元审计）         │
│      devices/list/            设备白名单管理                      │
│      devices/activate-pending/                                   │
│      departments/tree/        部门树                              │
│      departments/members/     部门成员                            │
│      departments/budget/      预算配置（含 billingexpr 表达式）   │
│      service-accounts/        服务账号管理                        │
│      enterprise-export/       一键导出                            │
│                                                                  │
│  共用：shadcn/ui 169 组件 / 6 语言 i18n /                         │
│       TanStack Router 文件式 / axios 客户端 / Zustand store       │
└──────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ /api/* + /api/enterprise/* + /api/agent/*

服务对象按角色显示菜单（统计始终双维度：部门 + 个人）：
  超管 / 平台运维  →  原 22 域 + 全部企业域（任意部门 / 任意员工）
  张主席          →  全集团聚合 + 9 部门排名 + 部门内员工 Top
  9 部门一把手     →  本部门聚合 + 本部门员工 Top + 本部门审计 + 导出
  9 AI 对接员      →  本部门所有企业域 + 案例提交 + 个人数据
  普通员工        →  enterprise/personal（自己的）+ chats（自己的）

CLI 工具（独立 Go 二进制 cli/，给 Agent shell 调用）：
  hmrouter-cli auth login / usage / chats / case / kpi / devices ...
```

**为什么复用前端工程**：
- 原 web/default 已经有完整的 22 个 features 域 + 169 个 shadcn 组件 + 6 语言 i18n
- features/ 按目录隔离，新增子目录与 upstream 同步零冲突
- 复用 TanStack Router 文件式路由 / Zustand 状态 / axios 客户端 / RBAC 中间件
- 单一登录态、单一菜单、用户认知负担小
- 跟 PLAN AP12 一致

---

## 9. 关键数据点

### 全项目（new-api 完整）
- **总节点**：6749 个（1451 文件 / 4860 函数 / 363 类）
- **总边**：29338 条
- **架构层**：30 个（后端 12 / 前端 12 / relay 6）
- **学习导览**：36 步
- **支持语言/框架**：Go + Gin + GORM 后端；React 19 + TS + Rsbuild + TanStack + shadcn 前端
- **i18n 语言**：en / zh / fr / ru / ja / vi（6 种）

### 后端枢纽（fan-out Top 6）
| 文件 | fan-out | 角色 |
|------|---------|------|
| `main.go` | 268 | 启动装配中心 |
| `controller/relay.go` | 235 | LLM 调用核心入口 |
| `controller/channel-test.go` | 233 | 渠道连通性测试 |
| `controller/model.go` | 200 | 模型管理 |
| `middleware/distributor.go` | 196 | ★ 渠道分发（DeptBudgetGuard 插这） |
| `middleware/auth.go` | 168 | ★ 认证（DeviceTokenGuard 接这） |

### 后端基石（fan-in Top 3）
- `common/json.go`、`common/redis.go`、`common/api_type.go` 各被 170+ 文件依赖

### 前端业务域
- 22 个原有 features 域
- shadcn/ui 派生 169 个组件
- TanStack Router 文件式路由 60 节点
- Zustand + Context 状态管理 9 节点

### Relay 子系统
- 196 个 .go 文件 / 843 函数 / 139 类
- 31 家 LLM 厂商 adapter（OpenAI/Claude/Gemini/DeepSeek/通义/百度/腾讯/...）
- 异步任务：Midjourney + Suno + Sora/Veo/Vidu/Kling/Hailuo/即梦/豆包

### 隐藏的能力宝藏（基于全项目知识图谱发现）
| 能力 | 位置 | 我们怎么用 |
|------|------|----------|
| **billingexpr 计费表达式引擎** | `pkg/billingexpr/` | 部门预算的灵活规则配置（AP26） |
| **OAuth 注册中心** | `oauth/registry.go` | 加 `wecom.go` 通过 init() 注册，零改原文件 |
| **override 引擎** | `relay/common/override.go` | 按部门下发模型/Header 白名单，运营自配 |
| **Channel Group 路由** | `model/channel.go` Group 字段 | 按部门分流上游（金融用境内、营销可用境外） |
| **SSE 流式基础设施** | relay/common/ + helper/stream_scanner.go | Agent 推送通道直接复用 |
| **三库兼容 GORM 抽象** | `model/main.go` | 我们新表自动获得 SQLite/MySQL/PG 三库支持 |

---

## 附：知识图谱原始位置

**全项目图谱**（主用）
`E:/Huamei Project/hmrouter/.understand-anything/knowledge-graph.json` (8.7 MB)
- 6749 节点 / 29338 边 / 30 层 / 36 步导览
- 包含后端 + 前端 + relay 三个子系统全部内容

**Relay 子系统图谱**（细看 relay 时辅助）
`E:/Huamei Project/hmrouter/new-api/relay/.understand-anything/knowledge-graph.json` (1.2 MB)
- 1178 节点 / 3481 边 / 6 层 / 13 步导览

需要细查某个文件/函数/调用关系，用 Node 脚本针对性查询（按 layer/tour/fan-in/fan-out 检索）。
