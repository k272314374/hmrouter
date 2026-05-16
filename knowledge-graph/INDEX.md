# 知识图谱速查 — 一页看懂 New-API 架构基线

> 提炼自全项目图谱（commit 196a82d，2026-05-14 生成）。
> 数字与节点列表在重生成图谱后可能微调，但结构与命名稳定。

---

## 一、30 层架构（按子系统分组）

### 后端（Go + Gin + GORM）— 12 层

| # | layer id | 名称 | 节点 | 关键内容 |
|---|---------|------|------|---------|
| 1 | `entry-bootstrap` | 入口与启动 | 8 | `main.go` + systemd unit |
| 2 | `router` | 路由层 | 6 | `router/main.go` + 4 子路由树 |
| 3 | `middleware` | 中间件层 | 21 | auth / distributor / rate-limit / stats / recover ... |
| 4 | `controller` | 控制器层 | 70 | relay / channel / user / billing / oauth / payment ... |
| 5 | `service` | 业务服务层 | 61 | quota / pre_consume / channel_select / token_counter ... |
| 6 | `model` | GORM 数据模型 | 38 | User / Channel / Token / Log / Pricing / Redemption ... |
| 7 | `dto-types` | DTO 类型 | 38 | OpenAI/Claude/Gemini 请求响应 DTO |
| 8 | `setting-config` | 配置常量 | 63 | ratio_setting / model_setting / system_setting ... |
| 9 | `auth-oauth` | OAuth | 8 | registry + GitHub / Discord / OIDC / LinuxDo / Generic |
| 10 | `common-utility` | 工具基础设施 | 75 | json / redis / logger / billingexpr / ionet ... |
| 11 | `infra-cicd` | CI/CD | 13 | Dockerfile / docker-compose / GitHub Actions |
| 12 | `documentation` | 文档 | 30 | README × 6 语言 / CLAUDE / AGENTS / OpenAPI |

### 前端（React 19 + TanStack + shadcn）— 12 层

| # | layer id | 名称 | 节点 | 关键内容 |
|---|---------|------|------|---------|
| 13 | `entry` | 应用入口 | 4 | `index.html` `main.tsx` |
| 14 | `routing` | TanStack Router | 60 | 文件式路由 + 自动 routeTree.gen.ts |
| 15 | `features` | 业务功能模块 | **543** | ★ 22 个业务域，见下 |
| 16 | `components` | 通用组件 | 169 | shadcn/ui 派生 + Base UI |
| 17 | `hooks` | React Hooks | 20 | — |
| 18 | `state` | 状态管理 | 9 | Zustand + Context |
| 19 | `i18n` | 国际化 | 14 | i18next + 6 语言（en/zh/fr/ru/ja/vi） |
| 20 | `utilities` | 工具/辅助 | 27 | axios 封装 / formatters / cn() |
| 21 | `styling` | 样式 | 3 | Tailwind 配置 |
| 22 | `assets` | 静态资源 | 32 | — |
| 23 | `configuration` | 工程配置 | 17 | Rsbuild / ESLint / TS / netlify |
| 24 | `tooling` | 工程化脚本 | 2 | i18n 同步等 |

**前端 22 个 features 业务域**：
```
about, auth, channels, chat, dashboard, errors, home, keys, legal,
models, performance-metrics, playground, pricing, profile, rankings,
redemption-codes, setup, subscriptions, system-settings, usage-logs,
users, wallet
```

### Relay 子系统 — 6 层

| # | layer id | 名称 | 节点 | 关键内容 |
|---|---------|------|------|---------|
| 25 | `api-handler` | API 入口分发 | 12 | `*_handler.go`（chat/embed/image/audio/rerank/ws/...） |
| 26 | `relay-core` | Relay 核心上下文 | 10 | RelayInfo / BillingSettler / override / StreamStatus |
| 27 | `relay-helper` | 通用 Helper | 12 | model_mapped / stream_scanner / price / valid_request |
| 28 | `channel-framework` | Channel 接口框架 | 4 | adapter.go / relay_adaptor.go / api_request.go |
| 29 | `channel-adapters` | LLM 厂商适配器 | **137** | ★ 31 家厂商，见下 |
| 30 | `async-task` | 异步任务中继 | 21 | Midjourney / Suno / Sora / Vidu / Kling ... |

---

## 二、36 步学习导览（强烈推荐按序读源码）

### 后端启动到业务（Step 1-14）
```
1.  项目总览：README + CLAUDE.md
2.  进程入口：main.go
3.  路由层：router/main.go + 子路由
4.  中间件：auth + distributor
5.  数据模型：model/main.go + User/Channel/Token
6.  Relay 控制器：controller/relay.go
7.  管理面：controller/channel.go + user.go
8.  服务层：service/quota.go + ratio_setting
9.  动态计费：pkg/billingexpr  ★ 我们要复用
10. DTO：dto/openai_request.go + openai_response.go
11. OAuth：oauth/registry.go + github.go  ★ 加 wecom 处
12. 工具：common/json.go + redis.go
13. 容器化：Dockerfile + docker-compose.yml
14. CI/CD：GitHub Actions
```

### 前端（Step 15-23）
```
15. 项目总览：package.json
16. 应用启动：index.html + main.tsx
17. 路由：TanStack Router 文件式
18. 业务功能：features/ 22 域
19. 通用 UI：components/ + shadcn
20. Hooks 与状态：hooks/ + stores/ + context/
21. i18n：i18next + 6 语言
22. 工具：lib/ + axios 封装
23. 构建部署：Rsbuild + Netlify
```

### Relay 引擎深入（Step 24-36）
```
24. RelayMode 枚举：constant/relay_mode.go
25. 核心上下文：RelayInfo + BillingSettler
26. 横切机制：override + stream_status
27. Channel 接口契约：channel/adapter.go
28. Adapter 工厂：relay_adaptor.go (fan-out 156)
29. Helper：model_mapped / stream_scanner / price
30. OpenAI 入口：compatible_handler.go
31. Responses API：responses_handler + chat→responses 桥接
32. Claude/Gemini 原生：claude_handler + gemini_handler
33. 多模态入口：embedding/image/audio/rerank/websocket
34. OpenAI Adapter：channel/openai/adaptor.go（最复杂）
35. Claude/Gemini Adapter：claude + gemini adaptor
36. 异步任务：relay_task.go + mjproxy_handler
```

---

## 三、核心枢纽节点（fan-out / fan-in TOP）

### 后端枢纽（fan-out 高 = 调最多人）
| 文件 | fan-out | 角色 |
|------|---------|------|
| `main.go` | 268 | 启动装配中心 |
| `controller/relay.go` | 235 | LLM 调用核心入口 |
| `controller/channel-test.go` | 233 | 渠道连通性测试 |
| `controller/model.go` | 200 | 模型管理 |
| `middleware/distributor.go` | 196 | ★ 渠道分发（DeptBudgetGuard 插这） |
| `controller/user.go` | 192 | 用户管理 |
| `controller/task.go` | 188 | 异步任务查询 |
| `controller/midjourney.go` | 184 | MJ 任务查询 |
| `controller/channel.go` | 179 | 渠道 CRUD |
| `controller/channel_upstream_update.go` | 179 | 上游模型清单同步 |
| `controller/channel-billing.go` | 171 | 渠道账单 |
| `middleware/auth.go` | 168 | ★ 认证（DeviceTokenGuard 接这） |

### 后端基石（fan-in 高 = 被最多人用）
| 文件 | fan-in | 角色 |
|------|--------|------|
| `common/json.go` | 174 | ★ 项目硬约定：所有 marshal/unmarshal 走这 |
| `common/redis.go` | 174 | Redis 封装 |
| `common/api_type.go` | 174 | channel 类型 ↔ API 类型映射 |
| `common/audio.go` | 174 | 音频元数据解析 |
| `common/body_storage.go` | 174 | 大请求体内存/磁盘双模 |
| `common/constants.go` | 174 | common 常量 |
| `common/copy.go` | 174 | JSON 深拷贝 |
| `common/crypto.go` | 174 | HMAC + bcrypt |
| `common/database.go` | 174 | 数据库类型标识 |
| `common/disk_cache.go` | 174 | 磁盘缓存 |

> 这一组都是 174，说明它们被同一个大集合（约 174 个文件）共同依赖 —— 即 controller + middleware + service 几乎全员都引 common/。

### 前端基石
| 文件 | fan-in | 角色 |
|------|--------|------|
| `src/components/ui/button.tsx` | 237 | shadcn Button 组件 |
| `src/lib/utils.ts` | 224 | cn() / sleep() / sanitize 等 |

### Relay 核心枢纽
| 文件 | fan-out | fan-in | 角色 |
|------|---------|--------|------|
| `relay/relay_adaptor.go` | 156 | — | ★ Adapter 工厂（指向 153 厂商节点） |
| `relay/common/relay_info.go` | — | 105 | ★ RelayInfo god-object |
| `relay/common/billing.go` | — | 105 | ★ BillingSettler 接口 |
| `relay/common/override.go` | 63 | 105 | 请求/Header 覆盖引擎 |

---

## 四、31 家 Channel Adapter 清单

| Adapter | 文件 | 备注 |
|---------|------|------|
| OpenAI | `channel/openai/adaptor.go` | ★ 最复杂，覆盖 chat/audio/image/embed/rerank 全模式 |
| Anthropic Claude | `channel/claude/adaptor.go` | ★ M1 接入 |
| DeepSeek | `channel/deepseek/adaptor.go` | ★ M1 优先接入 |
| Gemini | `channel/gemini/adaptor.go` | 原生协议入口 |
| Vertex AI | `channel/vertex/adaptor.go` | 含 Claude/Gemini/Llama/Mistral 子模型 |
| AWS Bedrock | `channel/aws/adaptor.go` | 复用 Claude 转换 + SigV4 |
| 阿里通义 | `channel/ali/adaptor.go` | DashScope |
| 百度千帆 v2 | `channel/baidu_v2/adaptor.go` | OpenAI 兼容 |
| 百度千帆旧版 | `channel/baidu/adaptor.go` | ERNIE 自有协议 |
| 腾讯混元 | `channel/tencent/adaptor.go` | 腾讯云签名 |
| 智谱 ChatGLM | `channel/zhipu/adaptor.go` | 旧版 |
| 智谱 GLM-4V | `channel/zhipu_4v/adaptor.go` | 多模态 |
| 讯飞星火 | `channel/xunfei/adaptor.go` | OpenAI 兼容 |
| Moonshot | `channel/moonshot/adaptor.go` | 复用 OpenAI 路径 |
| 火山引擎/豆包 | `channel/volcengine/adaptor.go` | 多模态 |
| 360 智脑 | `channel/ai360/constants.go` | 仅常量声明 |
| MiniMax | `channel/minimax/adaptor.go` | 文本+图像+TTS |
| Cloudflare AI | `channel/cloudflare/adaptor.go` | Workers AI |
| Cohere | `channel/cohere/adaptor.go` | chat + rerank |
| Mistral | `channel/mistral/adaptor.go` | OpenAI 风格 |
| Ollama | `channel/ollama/adaptor.go` | 本地模型 |
| Perplexity | `channel/perplexity/adaptor.go` | OpenAI 兼容 |
| xAI (Grok) | `channel/xai/adaptor.go` | OpenAI 兼容 |
| PaLM | `channel/palm/adaptor.go` | Google PaLM |
| Replicate | `channel/replicate/adaptor.go` | 图像生成 |
| SiliconFlow | `channel/siliconflow/adaptor.go` | OpenAI 兼容 |
| Codex | `channel/codex/adaptor.go` | OpenAI Responses + OAuth |
| Coze | `channel/coze/adaptor.go` | 自定义 chat |
| Dify | `channel/dify/adaptor.go` | chat-messages / workflows |
| Submodel | `channel/submodel/adaptor.go` | 子模型代理 |
| Jina AI | `channel/jina/adaptor.go` | embeddings + rerank |
| MokaAI | `channel/mokaai/adaptor.go` | 嵌入服务 |
| 火山即梦 | `channel/jimeng/adaptor.go` | 图像生成 |

### 异步任务（async-task layer）
- **视频生成**：Sora / Veo / Vertex / Vidu / Kling / Hailuo / 即梦 / 豆包
- **音乐生成**：Suno
- **图像（异步协议）**：Midjourney
- **核心入口**：`relay_task.go`、`mjproxy_handler.go`

---

## 五、隐藏的能力宝藏（hmrouter 应该复用）

| 能力 | 位置 | hmrouter 复用方式 |
|------|------|-----------------|
| **billingexpr 计费表达式引擎** | `pkg/billingexpr/` | AP26：部门预算公式直接配 |
| **OAuth 注册中心（插件式）** | `oauth/registry.go` | 加 `oauth/wecom.go` 通过 init() 注册 |
| **请求/Header override 引擎** | `relay/common/override.go` | 按部门下发模型/Header 白名单，运营自配 |
| **Channel Group 路由** | `model/channel.go` 的 `Group` 字段 | AP5：按部门分流境内/境外上游 |
| **SSE 流式基础设施** | `relay/common/` + `helper/stream_scanner.go` | AP25：Agent 实时推送通道直接复用 |
| **三库兼容 GORM 抽象** | `model/main.go` | 我们新表自动获 SQLite/MySQL/PG |
| **Redis 原子配额预占** | `service/pre_consume_quota.go` | dept_budget 复用同套机制 |
| **shadcn/ui 169 组件** | `web/default/src/components/ui/` | 企业前端零组件库自研 |
| **i18n 6 语言框架** | `web/default/src/i18n/` | 加 zh/en 翻译键即可 |
| **TanStack Router 文件式** | `web/default/src/routes/` | 加新路由文件自动注册 |

---

## 六、需要侵入修改的原文件（最小集合）

| 原文件 | 改动 | 理由 |
|--------|------|------|
| `router/main.go` | + 注册 enterprise 子路由 | 路由挂载 |
| `middleware/distributor.go` | + 调用 3 个 enterprise 中间件钩子 | 部门预算 + 设备 + 记录 |
| `model/user.go` | + 5 个 HR 字段 | HR 联动 |
| `model/token.go` | + `owner_type` `owner_id` 2 字段 | 服务账号 |

> 仅 4 处。其他全部新增到 `enterprise/` 与 `cli/`，跟 upstream 同步零冲突。
