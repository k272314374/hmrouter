# 企业内部 LLM API 中转网关（hmrouter）方案草稿

> 状态：方案讨论中 · 未定稿
> 目标：作为**集团 AI 转型推进方案（2026.05）**的核心基础设施，提供：①统一的 LLM API 中转网关；②支撑月度通报会的部门用量统计后台；③接入员工 Agent 工具的标准入口。
> 最后更新：2026-05-15（v0.11 · 见 §0.3 版本历史）

---

## 0. 文档范围与版本演进

### 0.1 范围
- ✅ API 中转网关（基于 New-API 二次开发）
- ✅ 企业管理后台（部门/预算/服务账号/HR 同步/会话审计/设备管理）
- ✅ Agent CLI 工具
- ✅ 数据模型、部署架构、扩展策略

### 0.2 移出本文档
- ⏸ DLP / 前置脱敏 skill / 敏感词检测 → 独立讨论，存档于 [DLP-deferred.md](DLP-deferred.md)

### 0.3 版本历史
- v0.1：初版，DLP 设计在网关中间层做内容脱敏
- v0.2：识别 prompt cache / SSE 等结构性问题，DLP 改为前置 skill + 网关只检测
- v0.3：聚焦网关 + 管理后台；脱敏 skill 移出独立讨论
- v0.4：纳入集团 AI 转型方案上下文；按 1 全栈 + Claude 资源现实收敛 MVP
- v0.5：中间层职责明确为"全模态全量记录"；新增 `audit_log`/`audit_attachment` 表 + 存储抽象层
- v0.6：Agent 接口走 CLI；设备白名单 M1 完整启用；audit_log 可改可删 + 元审计
- v0.7：基于全项目知识图谱修正三处认知 — ①前端复用 web/default ②部门预算复用 billingexpr ③OAuth/i18n/RBAC 全复用
- v0.8：清理冗余 — DLP 内容外迁、待决策清单精简、章节版本标签去除
- v0.9：明确**统计双维度**（部门 + 个人）。AP14 加注释：仅指预算扣费，不影响统计。M1 看板加个人用量页 + 个人 Excel 导出。
- v0.10：PRD 交叉审计修补 — `audit_log` 加 `device_id` 字段（PRD §5.3/§5.4 用）；新增 `export_task` 表（PRD §5.5 异步导出 + 历史）；ARCHITECTURE 加 `admin_actions.go` controller。
- v0.11（当前）：S-003 13 域深聊收敛 — AP27 角色 5→6（加合规审计专员，ADR-013）；§10 共 24 张企业表（M1 13 + M2 5 + M3 6，本次新增公告/资源中心/审批工单/系统配置/登录日志/课程进度/风险事件 等）；落地 ADR-014~019；调用内容严格 3 角色可见（ADR-019 取代 ADR-015 显示层脱敏）。

---

## 1. 背景与目标

### 1.1 项目缘起
本项目是**集团 AI 转型推进方案（2026.05）**（Notion `35d60afd-e680-81ea-9b2a-fffcd80f9c65`）的关键支撑系统。无 hmrouter，则张主席年度 KPI（数字员工占比 ≥ 20%）无度量、9 部门考核 10% 奖金无依据、月度通报会无数据、金融/财务岗位重新竞聘无 baseline。

集团 2000 员工，目前各部门各自申请上游 API，存在 Key 分散、无审计、泄密风险三大问题。

### 1.2 干系人与汇报线
| 角色 | 身份 | 对本项目的关系 |
|------|------|---------------|
| 总指挥 | 张克强主席 | 战略验收；月度通报会拍板；年度终评 |
| 组长 | 远捷总 | 月度通报会主持决策环节 |
| **执行组长 / 本项目总负责** | 郑凯（数智营销中心总经理，本人） | 方案推进、跨部门统筹、与开发协同、对张主席汇报 |
| 副组长 | 9 部门一把手 | 部门第一责任人 + 最大用户群之一 |
| 组员 | 9 部门 AI 对接专员 | 数据录入与本部门管理实操 |

**决策路径**：日常技术决策由执行组长（郑凯）拍板即推进；重大变更需总指挥（张主席）月度会认可。

### 1.3 资源现实
| 维度 | 实际 |
|------|------|
| 开发人力 | 1 名全栈工程师 + Claude |
| 时间窗口 | 5 月底首次工作组会议；6-8 月金融/财务试点；12 月终评 |
| 一期用户范围 | **5 部门 / 150-300 人**：证券投资部、股权投资部、期货中心、财务中心、监察审计（金融板块 + 财务高电脑使用强度 90%+） |
| 技术决策 | 郑凯 + Claude 两人即定 |

### 1.4 关键里程碑
> 参考节奏：上一个全栈项目（131 小程序）3 天完成完整闭环。本项目是改造 4 万行 Go 代码 + 接外部 API。

```
T+0 → T+2   M0  本地 New-API 跑通 + 关键源码看完 + 外部账号申请
T+3 → T+5   M1  ★ 演示版：3 上游 + 企微 OAuth + 设备白名单 + 文字记录 + 看板（双维度） + 详情 + 个人/部门 Excel 导出
                （5/31 工作组首次会议演示）
T+6 → T+12  M2  ★ 金融试点版：多模态 + 服务账号 + 预算 observe + NAS 接入
                （6 月起金融/财务试点）
T+13 → T+30 M3  ★ 通报会版：排名 + 月报导出 + 企微同步 + 案例提交 + SSE 推送
                （8 月月度通报会用上）
T+31 → ...  M4  9 部门全员推广（9-11 月）
T+...       M5  年度终评数据出库（12 月）
```

**真实瓶颈在外部依赖，不在代码量**：企微审批、上游对公付款、内网服务器、你的同步配合时间。

### 1.5 项目目标（按优先级）
**P0（必须有）**
- **双维度统计**：按部门聚合 + 按个人聚合的 token 用量数据，支撑月度通报会与个人考核
- 统一 LLM 中转，9 部门能用 DeepSeek / OpenAI / Anthropic
- 企微 SSO + 部门同步
- 全模态会话记录（文字/图/文档/音视频 + 模型回复全量入库）

**P1（半年内）**
- 部门排名 / 个人 Top N / 模型分布 / 时间趋势 看板
- 按部门预算（observe 模式）— 注意：**只有预算单维度（部门），但统计始终双维度**
- Agent CLI + OpenAI 兼容入口

**P2（年底前）**
- 部门预算 enforce 模式
- 服务账号体系
- 数字员工业务占比指标支撑数据

**P3（明年）**
- DLP（独立讨论）/ HR 完整生命周期 / 内网模型路由 / 跨部门数据汇总

### 1.6 非目标
- 不做面向外部客户的 SaaS 售卖
- 一期不做模型私有化部署
- 不替代企业现有 IAM / 数据分类分级系统

---

## 2. 架构原则与硬约束（AP）

经过多轮权衡后**写死的前置约束**，后续所有设计都不得违背。如需变更，作为重大方案变更重新评审。

### 2.1 网关与基础架构
| # | 约束 | 理由 |
|---|------|------|
| **AP1** | 网关不在请求链路上改写 payload | 保护上游 prompt cache（成本 ×3-10）、SSE 首字延迟、tool_calls / structured outputs 协议完整性 |
| **AP5** | 上游按**部门 + 模型**双维度路由：金融板块（证券/股权/期货/小贷/审计）禁用境外模型；其他部门可用 OpenAI / Anthropic / 境内全部 | 集团已有香港嘉信合法跨境通道，非金融板块跨境数据风险可控；金融板块客户数据绝对不能裸送境外 |
| **AP6** | 员工不得持有上游原始 Key | 保证流量必经网关的唯一手段。配合出网防火墙白名单 |
| **AP7** | 员工直调 与 应用调用 走两套接入路径 | 风险特征、限流策略、审计粒度差异巨大，不能混用 |
| **AP8** | 多模态分阶段开放，**但审计基础设施从 day 1 按全模态设计**：M1 仅文字；M2-M3 开放图片+文档；M4+ 开放音视频 | 让中间层从一开始就为全模态做好抽象 |
| **AP11** | 后端在 New-API 同进程内扩展，不拆微服务 | 新表与原表需高频 JOIN，跨库聚合代价大 |
| **AP12** | 企业管理后台前端**作为新 features 子目录**加入 `web/default/src/features/`，复用原项目所有基础设施 | 工程量净减；upstream 同步零冲突 |
| **AP13** | 所有新增代码集中在 `enterprise/` 目录，原 New-API 文件不改（除必要字段） | 跟 upstream 同步成本最低 |
| **AP14** | 个人不设额度，**部门预算**是计费/扣费唯一主体（**仅指预算，不影响统计**：统计/查询/导出始终支持部门 + 个人双维度） | 简化心智；财务以部门结算；但月度通报会与个人考核需要看个人数据 |
| **AP15** | 部门预算上线**先双轨（observe，不阻断）跑 1-2 个月**，再切 enforce | 避免预算估算错误造成全部门停摆 |
| **AP16** | **能复用 New-API 原生功能的，绝不重写**。复用清单：① OAuth 注册中心（加 wecom.go 即可）② billingexpr 表达式引擎（部门预算用）③ shadcn/ui + 169 组件 ④ i18n 6 语言 ⑤ TanStack Router/Query/Zustand ⑥ axios 客户端 ⑦ features/usage-logs（详情复用）⑧ features/dashboard（看板复用）⑨ features/chat（案例 UI 参考）⑩ admin/common 角色（扩枚举即可） | 1 全栈 + Claude 的资源现实 |
| **AP17** | **管理后台一期只服务"月度通报会"场景**，其他延后 | 通报会是对张主席最直接的价值兑现点 |
| **AP18** | **统计指标 ≠ 技术指标**。要做"数字员工业务占比"的支撑数据 | 项目成败标准来自集团 AI 转型方案 |
| **AP19** | 中间层职责 = **"会话记录器"**：全量记录员工 prompt + 模型 response + 所有附件。**只录不改、只录不挡** | 老板要求"像聊天记录一样"；与 AP1 一致 |
| **AP20** | 二进制内容必须存对象存储，DB 只存元数据 + 文字 | 单表塞二进制 = 备份/查询/磁盘三崩 |
| **AP21** | 存储后端走**接口抽象**，2 个实现：`MinIOStorage`（开发）+ `SynologyWebDAVStorage`（生产） | 不被采购流程阻塞；切换零代码改动 |
| **AP22** | Agent ↔ 后台接口一期走 **CLI `hmrouter-cli`**，MCP 后置 | CLI 成本低 1 个数量级；后期 MCP 包一层即可 |
| **AP23** | **设备白名单制**：admin 后台预先入白（hostname + MAC），Agent 激活时匹配 → 发 device_token；所有 API 校验 device_token | 防止跑路员工/未授权设备使用 |
| **AP24** | audit_log 允许 admin 修改/删除（处理隐私事故），但**写操作必须落 `admin_action_log`**（不可改不可删） | 平衡运营灵活性与审计完整性 |
| **AP25** | 推送通道用 **SSE 而非 WebSocket** | 复用 New-API 已有 SSE 基础设施；单向推送够用 |
| **AP26** | 部门预算的灵活规则**复用 `pkg/billingexpr` 表达式引擎** | 引擎已生产验证；规则可在管理界面热配置 |
| **AP27** | 企业角色复用原 `admin/common` 二分体系并按需扩展，**不引入完整 RBAC** | 一期需 **6 角色**：root / group_admin / compliance_auditor / dept_admin / ai_liaison / common（合规审计专员 = ADR-013，张远捷 = group_admin）|

> DLP / 脱敏相关原则（AP2/AP3/AP4/AP9/AP10）已搬至 [DLP-deferred.md](DLP-deferred.md)，本文档不讨论。

---

## 3. 核心架构

```
┌──────────────────────────────────────────────────────────────┐
│  统一前端 web/default/ (单一 React 工程)                       │
│  ┌──────────────────┬──────────────────────────────────────┐ │
│  │ 原 features 22 域 │ ★ 企业 features 8 域                    │ │
│  │ channels/users/  │ enterprise/audit/devices/depart-     │ │
│  │ logs/...         │ ments/budget/service-accounts/...    │ │
│  └──────────────────┴──────────────────────────────────────┘ │
│  共用：shadcn/ui • i18n • TanStack Router/Query • Zustand    │
└──────────┬───────────────────────────────────────────────────┘
           │ /api/* + /api/enterprise/* + /api/agent/*
           ▼
┌──────────────────────────────────────────────────────────────┐
│  Agent / CLI 客户端                                           │
│  hmrouter-cli (Go 二进制) → Agent shell 调用                  │
│  调 /api/agent/* 子集（auth / usage / chats / case / kpi）   │
└──────────┬───────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  hmrouter Backend (单进程，fork from new-api)                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ controller / model / relay / middleware  （原，保留）   │ │
│  │ ──────────────────────────────────────────────────────  │ │
│  │ ★ enterprise/                            （新增模块）   │ │
│  │   ├─ controller/  部门/预算/审计/设备/导出/agent API    │ │
│  │   ├─ model/       24 张新表                            │ │
│  │   ├─ service/     企微同步/审计写入/billingexpr 求值     │ │
│  │   ├─ middleware/  DeptBudgetGuard / DeviceTokenGuard /  │ │
│  │   │              AuditRecorder                          │ │
│  │   ├─ oauth/       wecom.go (注册到原 oauth/registry)    │ │
│  │   └─ router/      /api/enterprise/* + /api/agent/*      │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                          │
       ┌──────────────────┼──────────────────────┐
       ▼                  ▼                      ▼
  PostgreSQL          Redis                 对象存储
  原表+12 新表       缓存/原子配额          MinIO (一期)
                                          → 群晖 NAS WebDAV
                          │
                          ▼
              ├─→ DeepSeek / OpenAI / Claude（M1 三家）
              ├─→ 其他厂商（按部门 + 模型路由 AP5）
              └─→ 内网私有部署模型（远期）
```

**架构关键决策**：
- **后端单进程扩展**（AP11）：新表与 User/Token/Log JOIN 性能好
- **前端复用 web/default**（AP12）：新 features 子目录隔离，复用 169 组件 + 6 语言 + 路由/状态/HTTP
- **新代码隔离在 `enterprise/` 目录**（AP13）：后端改原文件仅 4 处
- **部门预算复用 billingexpr**（AP26）：表达式引擎已就绪，运营在管理界面写公式
- **OAuth 走原生注册中心**：`oauth/wecom.go` 通过 init() 注册，零改原文件
- **共用一个 DB**：预算聚合、HR 联动查询能力上限高

---

## 4. 企业管理后台架构

### 4.1 后台分工（单一前端工程 + 按 features 域分工）
| 角色 | 使用方 | 入口 | 主要操作 |
|------|--------|------|---------|
| 原 New-API features | 超管 / 平台运维 | `/admin/channels` `/admin/users` `/admin/logs` 等 | 渠道接入、上游 Key、原始日志、模型定价、系统参数 |
| **★ 企业 features** | HR / 财务 / 部门 admin / AI 对接员 / 全员 | `/enterprise/dashboard` `/enterprise/audit` `/enterprise/devices` `/enterprise/budget` 等 | 部门树、员工/服务账号、预算与看板、会话详情、设备白名单 |

> 共用同一前端工程 `web/default/`、同一登录态、同一组件库、同一 i18n。菜单按角色显示不同入口。

### 4.2 模块划分（后端 + 前端 features 一并列出）

**后端：在 New-API 仓库内新增 `enterprise/`**
```
enterprise/
├─ model/
│   ├─ department.go            部门树
│   ├─ user_department.go       用户-部门多对多
│   ├─ department_budget.go     部门预算（公式存 billingexpr 表达式字符串）
│   ├─ service_account.go       服务账号
│   ├─ device.go                设备白名单（AP23）
│   ├─ admin_action_log.go      元审计（AP24）
│   ├─ audit_log.go             会话记录主表（AP19）
│   ├─ audit_attachment.go      附件元数据（AP20）
│   ├─ case_submission.go       案例提交（M3）
│   ├─ business_kpi.go          业务量上报（M3-M4）
│   ├─ notification.go          推送通知（M3）
│   └─ hr_sync_event.go         HR 同步事件
├─ controller/
│   ├─ department.go            部门 CRUD
│   ├─ budget.go                预算配置 + 看板
│   ├─ device.go                设备白名单 CRUD + activate 接口
│   ├─ audit.go                 审计查询 + 修改（带 admin_action_log）
│   ├─ export.go                Excel/CSV/PDF 导出
│   ├─ agent.go                 /api/agent/* 端点（CLI 调用）
│   └─ ...
├─ service/
│   ├─ wecom_sync.go            企微 OpenAPI 同步
│   ├─ audit_storage.go         AuditStorage 接口（AP21）
│   ├─ audit_storage_minio.go   MinIO 实现
│   ├─ audit_storage_synology.go 群晖 WebDAV 实现
│   ├─ audit_writer.go          异步写入 + tee 流式
│   ├─ budget_aggregator.go     从 audit_log 聚合实时消耗
│   ├─ budget_eval.go           ★ 调 billingexpr 求值（AP26）
│   ├─ budget_reset.go          周期重置 cron
│   └─ device_token.go          设备 token 颁发/校验
├─ middleware/
│   ├─ dept_budget_guard.go     ★ 部门预算检查（接 relay 链路）
│   ├─ device_token_guard.go    ★ 设备 token 校验（AP23）
│   └─ audit_recorder.go        ★ 审计中间件（请求/响应记录）
├─ oauth/
│   └─ wecom.go                 ★ 企微 OAuth provider（注册到原 oauth/registry.go）
└─ router/
    └─ enterprise_router.go     注册 /api/enterprise/* 与 /api/agent/*
```

**前端：在 `web/default/src/features/` 内新增企业域子目录**
```
web/default/src/features/
├─ (原有 22 个域：about, auth, channels, chat, dashboard, ...)
│
├─ enterprise/                  ★ 企业总览
│   ├─ dashboard/               部门看板（复用 dashboard feature 图表）
│   ├─ personal/                ★ 个人用量页（双维度统计的"个人"维度）
│   └─ ranking/                 部门排名 + 部门内员工 Top N
├─ audit/                       ★ 会话记录
│   ├─ list/                    审计列表（复用 usage-logs 表格）
│   ├─ replay/                  会话详情（含附件预览）
│   └─ admin-edit/              admin 编辑/删除（带 admin_action_log）
├─ devices/                     ★ 设备白名单
│   ├─ list/
│   ├─ activate-pending/
│   └─ revoke/
├─ departments/                 ★ 部门管理
│   ├─ tree/
│   ├─ members/
│   └─ budget/                  预算配置（含 billingexpr 表达式输入）
├─ service-accounts/            ★ 服务账号
└─ enterprise-export/           ★ 一键导出
```

**CLI 工具**（独立子目录）
```
cli/
├─ main.go
└─ cmd/
    ├─ auth.go        login / logout
    ├─ usage.go       --me / --dept
    ├─ chats.go       list / search / show
    ├─ case.go        submit
    └─ kpi.go         report
```

### 4.3 与原 New-API 的耦合点（必要的最小改动）
| 原文件 | 改动 | 说明 |
|--------|------|------|
| `model/user.go` | 加字段：`employee_no` `hire_date` `leave_date` `employment_status` `primary_dept_id` | HR 联动需要 |
| `model/token.go` | 加字段：`owner_type`（user/service）`owner_id` | 服务账号体系 |
| `middleware/distributor.go` | 在原 Token 配额检查前**插入** `enterprise.DeptBudgetGuard` + `DeviceTokenGuard` + `AuditRecorder` 中间件 | 部门预算 + 设备校验 + 记录 |
| `router/main.go` | 注册 `enterprise.SetupRouter()` | 路由挂载 |
| `web/default/src/routeTree.gen.ts` | TanStack Router 自动生成，新加 features 后会重新生成 | 不算手改 |
| `web/default/src/i18n/locales/{zh,en}.json` | 加企业域翻译键 | 增量追加，不冲突 |

> 后端**仅 4 处**改原文件；前端是 router 自动生成 + i18n 追加。其他全部新增。

### 4.4 部门预算的扣费链路
```
请求 → middleware/auth (原)
     → middleware/distributor (原，识别 Token / Channel)
     → ★ enterprise/middleware/dept_budget_guard
        ├─ 找 Token.owner_type/owner_id → 找所属 user/service
        ├─ 找 owner 的 primary_dept_id（user）或 owner_dept_id（service）
        ├─ 找该 dept 当前周期的 department_budget
        ├─ 双轨模式：
        │     observe 模式 = 仅记录 + 阈值告警（不阻断）
        │     enforce 模式 = 余额不足 → 直接 reject（HTTP 402）
        └─ Redis 原子预占（沿用 New-API 既有机制）
     → relay (原，转发上游)
     → 后置异步：
        ├─ 写 Log（原表，UserId/TokenId/Quota 不变）
        ├─ 更新 department_budget.quota_used（原子加）
        └─ 触发告警（>80% / >100%）
```

### 4.5 HR 同步链路（基于企微 OpenAPI）
```
cron 每 N 分钟：
  feishu_sync.go / wecom_sync.go
    ├─ 拉部门树 → upsert department 表
    ├─ 拉员工列表 → upsert user 表 + user_department 关联
    ├─ diff 出"新离职"员工 → 批量 disable 其名下所有 Token
    ├─ diff 出"转岗"员工 → 更新 user_department + 写 hr_sync_event
    └─ 全量记录到 hr_sync_event 供审计追溯
```

---

## 5. 中间层"会话记录器"设计

### 5.1 核心定位
中间层的核心职责不是脱敏、不是限流、不是路由，是**全量记录**：员工通过 hmrouter 调用大模型的所有内容（文字 + 图片 + 文档 + 音视频，双向）都被持久化到企业可控的存储里，**像聊天记录一样可详情、可检索、可审计**。

### 5.2 录什么

| 端点 | 上行（员工 → 模型） | 下行（模型 → 员工） |
|------|-------------------|-------------------|
| `/v1/chat/completions` (text) | messages JSON 全量 | response 文字（流式拼接后存全文） |
| `/v1/chat/completions` (vision) | messages 文字 + image_url 下载存档 | 同上 |
| `/v1/files` 上传 | 文件原件存档 + 元数据 | — |
| `/v1/images/generations` | prompt 文字 | 生成的图片 URL 下载存档 |
| `/v1/audio/transcriptions` | 上传的音频原件存档 | 转写文字 |
| `/v1/audio/speech` (TTS) | prompt 文字 | 生成的音频存档 |
| `/v1/embeddings` | 输入文字 | 向量摘要（不存全部维度） |
| 视频生成（Sora/Veo/...） | prompt | 生成视频原件存档 |

### 5.3 数据落点
```
            ┌──────────────────┐
   请求 ───▶│ 审计中间件        │───▶ 上游 LLM
            │ (异步 tee)       │
            └────────┬─────────┘
                     │
       ┌─────────────┼─────────────┐
       ▼                           ▼
  ┌─────────────┐         ┌────────────────┐
  │ PostgreSQL  │         │ 对象存储        │
  │             │         │ (MinIO 一期 /   │
  │ audit_log   │  ←ref→  │  群晖 NAS 二期) │
  │ audit_attach│         │                │
  └─────────────┘         └────────────────┘
```
- **DB 存**：元数据、文字内容、对附件的引用（storage_key）
- **对象存储存**：所有二进制（图片、文档、音视频）

### 5.4 存储抽象层（AP21）

```go
// enterprise/service/audit_storage.go
type AuditStorage interface {
    Put(ctx, key string, data io.Reader, mime string) (storageKey string, err error)
    Get(ctx, key string) (io.ReadCloser, error)
    Delete(ctx, key string) error
    PresignURL(ctx, key string, ttl time.Duration) (string, error)  // 后台预览
    Stat(ctx, key string) (size int64, err error)
}

// 实现 1：本地 MinIO（M1-M2 默认；S3 兼容；Docker 起一个容器）
type MinIOStorage struct {
    client *minio.Client
    bucket string
}

// 实现 2：群晖 NAS（M3+ 接入；走 WebDAV 协议）
type SynologyWebDAVStorage struct {
    client *gowebdav.Client
    base   string
}

// 切换通过环境变量 / 配置文件选择，零代码改动
```

### 5.5 关键工程难点

| 难点 | 解决思路 |
|------|---------|
| **流式响应录全** | 在 SSE chunk 流中加 tee：一路转客户端、一路累积到 buffer，流结束后整体写库 |
| **大文件不阻塞** | 上传走 multipart，附件异步落对象存储；DB 先写元数据并标 `attachment_pending` |
| **写入失败不丢调用** | 审计写入异步 + 失败重试队列；网关本身不因审计失败而拒绝请求 |
| **录制内容自身的安全** | 对象存储路径用 UUID + sha256 防猜；预签 URL 有 TTL；审计后台严格 RBAC |
| **群晖 NAS 性能瓶颈** | 一期接受；预留接口将来切阿里云 OSS / 独立 MinIO 集群（AP21 抽象保底） |
| **企业网盘 API 限频** | 中间加本地缓存层（落本地磁盘 → 异步同步到 NAS） |
| **图片/文档去重** | sha256 索引；同一文件被多人上传只存一份（看实际场景需要再做） |

### 5.6 储存量级估算
| 场景 | 文字 | 图片(10%) | 文档(2%) | 合计/天 | 半年累计 |
|------|------|----------|---------|---------|---------|
| 一期（150 人 × 30 次/天） | 13 MB | 220 MB | 450 MB | **~700 MB/天** | ~125 GB |
| 半推（500 人） | 45 MB | 750 MB | 1.5 GB | **~2.5 GB/天** | ~450 GB |
| 全推（2000 人） | 180 MB | 3 GB | 6 GB | **~10 GB/天** | ~1.8 TB |

→ **群晖 NAS** 撑得住一期；半推开始可能吃力；全推必须切对象存储集群。

---

## 6. Agent 接口与 CLI 工具

### 6.1 定位
Agent（员工电脑上跑的客户端工具，比如 Cursor / Claude Code / Cherry Studio / 自研客户端）通过两个表面与 hmrouter 交互：

| 表面 | 用途 |
|------|------|
| **OpenAI 兼容 HTTP API** | 调大模型（被审计中间件记录） |
| **`hmrouter-cli` CLI 工具** | 查自己用量 / 提交案例 / 上报业务量 / 设备激活等管理类操作 |

未来如有需求再封装 MCP server（AP22）。

### 6.2 hmrouter-cli 命令规划
```
# 设备激活（首次）
hmrouter-cli auth login                        # 收集 hostname+MAC → 走激活流程

# 自我查询
hmrouter-cli usage --me [--today|--month]      # 自己的用量
hmrouter-cli quota --me                        # 自己/部门配额
hmrouter-cli devices --me                      # 自己绑定的设备
hmrouter-cli ranking --dept                    # 本部门排名

# 案例与业务量上报
hmrouter-cli case submit --file case.md
hmrouter-cli kpi report --hours 4 --type "对账自动化"

# 会话查询
hmrouter-cli chats list --recent 10
hmrouter-cli chats search "关键词"
hmrouter-cli chats show <chat-id>

# Admin 子命令（M2+）
hmrouter-cli admin device add --hostname xxx --mac yy:yy --user 张三
hmrouter-cli admin export dept --month 2026-06 --output xxx.xlsx
```

### 6.3 工程位置
- 仓库内新建 `cli/` 目录
- 复用 enterprise/ 的 service 层逻辑（CLI 不直连 DB，调内部 HTTP API）
- 编译产物：单一 Go 二进制 `hmrouter-cli.exe` / `hmrouter-cli`（Windows / macOS / Linux）
- 配置：`~/.hmrouter/config.json`（device_token、server_url）

---

## 7. 设备白名单机制

### 7.1 流程
```
HR/IT 入职流程
    │
    ▼ 在 admin 后台录入员工 + 关联设备信息
┌──────────────────────────────────┐
│ device 表：                       │
│  hostname: zhangsan-laptop       │
│  mac: AA:BB:CC:DD:EE:FF          │
│  assigned_user_id: <张三>         │
│  status: pending                 │
└──────────────────────────────────┘
                 │
                 ▼
   ┌─────────────────────────────┐
   │ Agent 在张三电脑首启          │
   │ hmrouter-cli auth login     │
   │  ① 收集 hostname + MAC      │
   │  ② 走 SSO 验证员工身份       │
   │  ③ POST /api/agent/activate │
   └─────────────┬───────────────┘
                 ▼
   ┌─────────────────────────────┐
   │ 后端匹配：                   │
   │  hostname + MAC ∈ device 表 │
   │  AND assigned_user = 张三   │
   │  → 生成 device_token        │
   │  → device.status = active   │
   │  → 返回 token 给 Agent      │
   │  → 失败：拒绝 + 告警 admin  │
   └─────────────────────────────┘
```

### 7.2 后续 API 调用
所有请求 header 带：
- `Authorization: Bearer <user_token>`
- `X-Device-Token: <device_token>`

中间件链：
1. `TokenAuth`（原 New-API）—— 验 user/token
2. **★ `DeviceTokenGuard`**（M1 新增）—— 验 device_token，过期/吊销/未匹配则 403
3. 进入 relay

### 7.3 拦截边界
| 场景 | 处理 |
|------|------|
| 设备未在白名单 | 激活 401 + admin 告警 |
| device_token 过期（默认 30 天） | 401 + 提示 Agent 重新激活 |
| Admin 在后台 disable 设备 | device_token 立即失效 |
| 员工换电脑 | 走 IT/HR 新增白名单流程 |
| 设备 hostname 改了 | 重新激活流程 |

---

## 8. 技术选型

### 8.1 网关基座：**New-API**（One-API 活跃 fork）

| 候选 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| **New-API** | OpenAI 兼容、多上游适配齐全、Key/用户/配额/UI 完整、社区活跃 | Go 改造、UI 偏 SaaS 风格需裁剪 | ✅ **采用** |
| One-API | 同上，最早期 | 几乎停更 | ❌ |
| LiteLLM | Python 生态、改造容易 | UI/多租户弱、运维成本高 | 备选 |
| Higress + WASM | 性能好、云原生友好 | DLP 用 WASM 写复杂、团队学习曲线 | 不在一期 |
| 从零自研 | 完全可控 | 协议适配/流式/Token 计数都要重做，3-6 周起 | ❌ |

> DLP 引擎选型 / 命中处理策略 / 前置脱敏 skill 设计 → 见 [DLP-deferred.md](DLP-deferred.md)

### 8.2 部署形态

**开发环境（混合模式）**：
- PostgreSQL + Redis + **MinIO** 用 Docker 起（贴近生产）
- Go 后端本地 `go run main.go`（热编译/调试）
- **统一前端** `web/default/` 本地 `bun run dev`（含原 + 企业 features）
- CLI 工具 `cli/` 本地 `go build` 即可
- 数据目录 `./data` 持久化在仓库外（避免误提交）

**生产环境（一期目标）**：
- 单可用区双副本 + PostgreSQL 主从 + Redis（New-API 默认依赖）
- 内网部署，仅通过公司 VPN / 内网域名访问
- 出网调用统一从网关出，配合防火墙白名单收敛
- 两个前端可同域名不同 path（`/` 原后台、`/admin/` 企业后台），或独立子域名

**升级与同步策略**：
- 跟踪 New-API upstream tag，定期 rebase（每月或每季度）
- `enterprise/` 目录为新增，原文件改动收敛在 §2.5.3 列出的 4 处
- 数据库迁移：原表字段扩展用 GORM `AutoMigrate` 兼容 SQLite/MySQL/PG（遵循 New-API CLAUDE.md Rule 2）

---

## 9. 开放问题（剩余未决）

> v0.4-v0.7 已经决策的 Q 已删除（看 AP1-AP27 体现）。下面是仍需对齐的点。
> DLP/脱敏相关 Q5-Q8 / Q13-Q15 / Q22 / Q26 → 见 [DLP-deferred.md](DLP-deferred.md)

### 9.1 数据留存与合规
- **Q10**：审计日志（含全量内容）保留多久？合规一般要求 6 个月 - 2 年
- **Q11**：员工是否有知情权？登录时强提示"全量记录"？还是只在员工手册写明
- **Q12**：跨境合规边界 — 金融板块禁境外已锁（AP5），教育/营销板块要不要法务再确认

### 9.2 路由与上游
- **Q16**：员工请求 `gpt-4o`，是否允许网关换成更便宜的 `deepseek-v3`？（成本 vs 透明度）
- **Q18**：上游故障时的 fallback 策略 — 自动切同组其他渠道？还是直接报错让员工感知？

### 9.3 计费
- **Q19**：计费单位 — 直接转嫁上游成本 / 加内部加价系数 / 公司全额承担只做配额

### 9.4 绕过与可用性
- **Q23**：是否做出网防火墙白名单（员工绕过网关直连 OpenAI）？需要网络团队配合
- **Q25**：网关挂了 — 是否需要"直通模式"降级（之前我倾向不留后门，但你拍）

---

## 10. 数据模型

### 10.0 总览
| 表 | 类型 | 来源 | 实施阶段 | 关联域 |
|----|------|------|----------|------|
| `users` | 原表 | New-API | **+ 字段扩展**（HR 字段） | A |
| `tokens` | 原表 | New-API | **+ 字段扩展**（owner_type/owner_id） | B |
| `channels` `logs` `redemptions` `topup` 等 | 原表 | New-API | 不动 | C |
| `department` | 新表 | enterprise/ | ✅ **M1 实现** | A |
| `user_department` | 新表 | enterprise/ | ✅ **M1 实现**（含调岗历史） | A |
| `service_account` | 新表 | enterprise/ | ✅ **M1 实现**（demo 1 个 / M2 完整 UI） | B |
| `device` | 新表 | enterprise/ | ✅ **M1 实现**（白名单核心，AP23） | B |
| `audit_log` | 新表 | enterprise/ | ✅ **M1 实现**（含 conversation_id） | E |
| `audit_attachment` | 新表 | enterprise/ | ✅ **M1 实现**（M1 仅文字端点 → 表存在但少量数据） | E |
| `admin_action_log` | 新表 | enterprise/ | ✅ **M1 实现**（元审计，AP24） | F |
| `export_task` | 新表 | enterprise/ | ✅ **M1 实现**（异步导出 + 历史） | E/D |
| `announcement` | 新表 | enterprise/ | ✅ **M1 实现**（公告 ADR-014） | L |
| `user_announcement_ack` | 新表 | enterprise/ | ✅ **M1 实现**（员工确认记录） | L |
| `enterprise_resource` | 新表 | enterprise/ | ✅ **M1 实现**（Skill+课程 统一基础表）| J-11/J-12 |
| `enterprise_resource_version` | 新表 | enterprise/ | ✅ **M1 实现**（资源版本） | J-11/J-12 |
| `enterprise_resource_download_log` | 新表 | enterprise/ | ✅ **M1 实现**（下载记录） | J-11/J-12 |
| `department_budget` | 新表 | enterprise/ | ⏳ **M2 实现**（部门预算）| D |
| `dept_budget_approval` | 新表 | enterprise/ | ⏳ **M2 实现**（临时配额审批工单） | D |
| `system_setting` | 新表 | enterprise/ | ⏳ **M2 实现**（8 项可热配参数 + IP 白名单） | G/K |
| `login_log` | 新表 | enterprise/ | ⏳ **M2 实现**（后台访问留痕） | K |
| `enterprise_resource_progress` | 新表 | enterprise/ | ⏳ **M2 实现**（课程学习进度） | J-12 |
| `hr_sync_event` | 新表 | enterprise/ | ⏳ **M3 实现**（HR 同步事件） | A |
| `case_submission` | 新表 | enterprise/ | ⏳ **M3 实现**（案例提交） | H |
| `business_kpi` | 新表 | enterprise/ | ⏳ **M3-M4 实现**（业务量上报） | H |
| `notification` | 新表 | enterprise/ | ⏳ **M3 实现**（SSE 推送配套） | I |
| `risk_rule` | 新表 | enterprise/ | ⏳ **M3 实现**（敏感词规则库 ADR-016） | M |
| `risk_event` | 新表 | enterprise/ | ⏳ **M3 实现**（命中事件） | M |

**总计**：13 → **24 张企业新表**（+11，S-003 增量）。
- M1 必建：13 张（`department`/`user_department`/`service_account`/`device`/`audit_log`/`audit_attachment`/`admin_action_log`/`export_task`/`announcement`/`user_announcement_ack`/`enterprise_resource`/`enterprise_resource_version`/`enterprise_resource_download_log`）
- M2 加：5 张（`department_budget`/`dept_budget_approval`/`system_setting`/`login_log`/`enterprise_resource_progress`）
- M3 加：6 张（`hr_sync_event`/`case_submission`/`business_kpi`/`notification`/`risk_rule`/`risk_event`）

### 10.1 企业管理后台新表

> 字段类型按 GORM 跨库兼容（SQLite/MySQL/PG）写法表达；JSON 字段用 TEXT 存储（遵循 New-API CLAUDE.md Rule 2）。

#### 10.1.1 `department` —— 部门树
```sql
CREATE TABLE department (
  id               BIGINT PRIMARY KEY,
  parent_id        BIGINT,                            -- 0 或 NULL = 根
  name             VARCHAR(128) NOT NULL,
  full_path        VARCHAR(512),                      -- /公司/技术部/平台组（冗余便于查询）
  manager_user_id  INT,                               -- 部门负责人
  hr_external_id   VARCHAR(128),                      -- 飞书/企微的部门 open_department_id
  hr_source        VARCHAR(16),                       -- feishu / wecom / manual
  status           TINYINT DEFAULT 1,                 -- 1=active, 0=disabled
  created_at       BIGINT,
  updated_at       BIGINT,
  deleted_at       BIGINT,
  INDEX idx_parent(parent_id),
  INDEX idx_hr_ext(hr_external_id)
);
```

#### 10.1.2 `user_department` —— 用户-部门关联
```sql
CREATE TABLE user_department (
  id              BIGINT PRIMARY KEY,
  user_id         INT NOT NULL,
  department_id   BIGINT NOT NULL,
  is_primary      BOOLEAN DEFAULT 0,                  -- 主部门标志
  joined_at       BIGINT,
  source          VARCHAR(16),                        -- feishu / wecom / manual
  UNIQUE KEY uk_user_dept(user_id, department_id),
  INDEX idx_dept(department_id)
);
```

#### 10.1.3 `department_budget` —— 部门预算
```sql
CREATE TABLE department_budget (
  id                BIGINT PRIMARY KEY,
  department_id     BIGINT NOT NULL,
  period_type       VARCHAR(16),                       -- monthly / quarterly / yearly
  period_start      BIGINT,                            -- 周期起始时间戳
  period_end        BIGINT,                            -- 周期结束时间戳
  quota_total       BIGINT,                            -- 预算总额（沿用 New-API quota 单位）
  quota_used        BIGINT DEFAULT 0,                  -- 实时聚合（异步更新）
  alert_threshold   FLOAT DEFAULT 0.8,                 -- 0.8 = 80% 时告警
  alert_recipients  TEXT,                              -- JSON 数组：通知人 user_id 列表
  enforce_mode      VARCHAR(16) DEFAULT 'observe',     -- observe(双轨) / enforce(硬阻断)
  status            VARCHAR(16) DEFAULT 'active',      -- active / exceeded / closed
  created_at        BIGINT,
  updated_at        BIGINT,
  UNIQUE KEY uk_dept_period(department_id, period_start, period_end),
  INDEX idx_dept_status(department_id, status)
);
```
> `enforce_mode` 字段实现 AP15 双轨策略：一期默认 `observe`（看板+告警不阻断），稳定后切 `enforce`（超额拒绝）。可按部门粒度独立切换，灰度上线。

#### 10.1.4 `service_account` —— 服务账号（应用）
```sql
CREATE TABLE service_account (
  id                BIGINT PRIMARY KEY,
  name              VARCHAR(128) NOT NULL,
  description       TEXT,
  app_type          VARCHAR(32),                       -- bot / pipeline / business / other
  owner_user_id     INT,                               -- 责任人（员工）
  owner_dept_id     BIGINT NOT NULL,                   -- 归属部门（计费主体）
  contact_email     VARCHAR(128),
  status            TINYINT DEFAULT 1,
  created_at        BIGINT,
  updated_at        BIGINT,
  deleted_at        BIGINT,
  INDEX idx_owner_dept(owner_dept_id),
  INDEX idx_owner_user(owner_user_id)
);
```

#### 10.1.5 `hr_sync_event` —— HR 同步事件
```sql
CREATE TABLE hr_sync_event (
  id            BIGINT PRIMARY KEY,
  user_id       INT,
  event_type    VARCHAR(32),                           -- onboard / transfer / offboard / dept_change
  source        VARCHAR(16),                           -- feishu / wecom / manual
  payload       TEXT,                                  -- JSON 原始数据快照
  applied_at    BIGINT,
  applied_by    INT,                                   -- 触发用户（系统自动 = 0）
  status        VARCHAR(16),                           -- success / failed / skipped
  error_msg     TEXT,
  INDEX idx_user_ts(user_id, applied_at),
  INDEX idx_type_ts(event_type, applied_at)
);
```

#### 10.1.6 `audit_log` —— 会话记录主表 ★
```sql
CREATE TABLE audit_log (
  id                BIGINT PRIMARY KEY,
  user_id           INT,
  dept_id           BIGINT,
  token_id          INT,
  channel_id        INT,
  service_account_id BIGINT,                  -- 应用调用时填
  device_id         BIGINT,                   -- ★ 调用来自哪台设备（v0.10 补，PRD §5.3/§5.4 用）
  model             VARCHAR(64),
  endpoint          VARCHAR(128),             -- /v1/chat/completions 等
  request_id        VARCHAR(64),
  upstream_request_id VARCHAR(128),
  -- 内容字段
  request_text      TEXT,                     -- 文字内容（messages JSON 序列化或纯文本）
  response_text     TEXT,                     -- 模型响应文字（流式拼接后）
  is_streaming      BOOLEAN,
  attachment_count  INT DEFAULT 0,            -- 附件数（>0 表示有 audit_attachment 关联）
  -- 计费/性能
  prompt_tokens     INT,
  completion_tokens INT,
  duration_ms       INT,
  http_status       INT,
  error_msg         TEXT,
  -- 上下文
  ip                VARCHAR(64),
  user_agent        VARCHAR(255),
  -- 时间
  created_at        BIGINT,
  -- 索引
  INDEX idx_user_ts(user_id, created_at),
  INDEX idx_dept_ts(dept_id, created_at),
  INDEX idx_device_ts(device_id, created_at),  -- ★ v0.10 补
  INDEX idx_request_id(request_id),
  INDEX idx_model_ts(model, created_at)
);
```
> **特别说明**：text 字段直接存全文，方便后台简单 LIKE 查询；后期量大可加 ES 做全文检索。按月分区便于归档。

#### 10.1.7 `audit_attachment` —— 会话附件元数据表 ★
```sql
CREATE TABLE audit_attachment (
  id              BIGINT PRIMARY KEY,
  audit_log_id    BIGINT NOT NULL,
  direction       VARCHAR(16),               -- upload(员工上传) / download(模型返回)
  position        VARCHAR(64),               -- "messages[2].image_url" 等定位
  mime_type       VARCHAR(128),
  size_bytes      BIGINT,
  sha256          CHAR(64),                  -- 内容指纹，去重用
  -- 对象存储
  storage_backend VARCHAR(16),               -- minio / synology / oss
  storage_key     VARCHAR(512),              -- 对象存储路径
  original_filename VARCHAR(255),
  -- 元信息
  encrypted       BOOLEAN DEFAULT 0,
  status          VARCHAR(16) DEFAULT 'ok',  -- ok / pending / failed
  error_msg       TEXT,
  created_at      BIGINT,
  INDEX idx_audit(audit_log_id),
  INDEX idx_sha(sha256)
);
```

#### 10.1.8 `device` —— 设备白名单 ★（M1）
```sql
CREATE TABLE device (
  id                BIGINT PRIMARY KEY,
  hostname          VARCHAR(255),                  -- 标准化小写
  mac_address       VARCHAR(64),                   -- 大写无冒号 AABBCCDDEEFF
  assigned_user_id  INT NOT NULL,
  remark            VARCHAR(255),                  -- "张三的笔记本"
  status            VARCHAR(16) DEFAULT 'pending', -- pending / active / disabled / revoked
  device_token      VARCHAR(128),                  -- 激活后生成（hash 存）
  device_token_expires_at BIGINT,
  os                VARCHAR(64),                   -- agent 上报：Windows 11 / macOS 14 ...
  agent_version     VARCHAR(32),                   -- agent 上报版本
  activated_at      BIGINT,
  last_seen_at      BIGINT,
  created_by_admin_id INT,
  created_at        BIGINT,
  updated_at        BIGINT,
  UNIQUE KEY uk_hostname_mac(hostname, mac_address),
  INDEX idx_user(assigned_user_id),
  INDEX idx_status(status)
);
```

#### 10.1.9 `admin_action_log` —— 元审计 ★（M1）
```sql
CREATE TABLE admin_action_log (
  id              BIGINT PRIMARY KEY,
  admin_user_id   INT NOT NULL,
  action_type     VARCHAR(64),                     -- update / delete / disable / approve ...
  target_table    VARCHAR(64),                     -- audit_log / user / device / dept_budget ...
  target_id       BIGINT,
  before_value    TEXT,                            -- JSON 序列化
  after_value     TEXT,                            -- JSON 序列化
  reason          VARCHAR(512),                    -- admin 必填的操作原因
  ip              VARCHAR(64),
  user_agent      VARCHAR(255),
  created_at      BIGINT,
  INDEX idx_admin_ts(admin_user_id, created_at),
  INDEX idx_target(target_table, target_id)
);
-- 这张表本身不允许任何应用层修改/删除（GORM hook 阻止）
```

#### 10.1.10 `case_submission` —— 案例提交（M3）
```sql
CREATE TABLE case_submission (
  id              BIGINT PRIMARY KEY,
  user_id         INT,
  dept_id         BIGINT,
  title           VARCHAR(255),
  content         TEXT,
  attachment_keys TEXT,                            -- JSON 数组：附件 storage_key 列表
  status          VARCHAR(16),                     -- draft / submitted / approved / rejected
  reviewer_id     INT,
  review_comment  TEXT,
  submitted_at    BIGINT,
  reviewed_at     BIGINT,
  created_at      BIGINT,
  INDEX idx_dept_status(dept_id, status),
  INDEX idx_user_ts(user_id, submitted_at)
);
```

#### 10.1.11 `business_kpi` —— 业务量上报（M3-M4）
```sql
CREATE TABLE business_kpi (
  id              BIGINT PRIMARY KEY,
  user_id         INT,
  dept_id         BIGINT,
  kpi_type        VARCHAR(64),                     -- "对账自动化" "报告生成" 等
  value           DECIMAL(10,2),                   -- 数量
  unit            VARCHAR(32),                     -- "小时" "份" "条"
  related_chat_ids TEXT,                           -- JSON：关联的 audit_log id 列表
  reported_at     BIGINT,
  reported_via    VARCHAR(16),                     -- cli / web / api
  INDEX idx_dept_ts(dept_id, reported_at),
  INDEX idx_type_ts(kpi_type, reported_at)
);
```

#### 10.1.12 `export_task` —— 异步导出任务 ★（M1 实现，v0.10 补）
```sql
CREATE TABLE export_task (
  id              BIGINT PRIMARY KEY,
  requester_id    INT NOT NULL,                  -- 谁发起的
  dimension       VARCHAR(16),                   -- dept / user
  scope_id        BIGINT,                        -- dept_id 或 user_id
  template        VARCHAR(32),                   -- monthly_report / detailed / financial
  format          VARCHAR(16),                   -- xlsx / csv
  period_start    BIGINT,
  period_end      BIGINT,
  status          VARCHAR(16),                   -- pending / running / done / failed
  progress_pct    INT DEFAULT 0,                 -- 0-100
  result_storage_key VARCHAR(512),               -- 完成后对象存储的路径
  result_size_bytes BIGINT,
  row_count       INT,
  error_msg       TEXT,
  created_at      BIGINT,
  started_at      BIGINT,
  finished_at     BIGINT,
  expires_at      BIGINT,                        -- 7 天后自动清理
  INDEX idx_requester_ts(requester_id, created_at),
  INDEX idx_status(status)
);
```
> 同步生成的小导出（< 1 万行）也会落表，方便审计"谁在什么时候导了什么"。

#### 10.1.13 `notification` —— 推送通知（M3）
```sql
CREATE TABLE notification (
  id              BIGINT PRIMARY KEY,
  recipient_user_id INT,
  recipient_dept_id BIGINT,                        -- 部门级通知
  title           VARCHAR(255),
  content         TEXT,
  level           VARCHAR(16),                     -- info / warn / critical
  category        VARCHAR(32),                     -- quota / device / case / system
  payload         TEXT,                            -- JSON 上下文
  read_at         BIGINT,
  pushed_via      VARCHAR(16),                     -- sse / wecom_bot / email
  created_at      BIGINT,
  INDEX idx_user_unread(recipient_user_id, read_at)
);
```

#### 10.1.14 `announcement` —— 公告（M1，ADR-014）
```sql
CREATE TABLE announcement (
  id              BIGINT PRIMARY KEY,
  type            VARCHAR(32) NOT NULL,            -- compliance / operational / system
  title           VARCHAR(256) NOT NULL,
  content_html    TEXT NOT NULL,                    -- TipTap 输出 HTML（员工端渲染）
  content_json    TEXT,                             -- TipTap 内部 JSON（admin 编辑回填用）
  audience_scope  VARCHAR(32) DEFAULT 'all',        -- all / dept / role
  audience_ids    TEXT,                             -- JSON 数组（dept_ids 或 role_codes）
  version         INT DEFAULT 1,                    -- 版本号（V1→V2 重新弹）
  effective_at    BIGINT,                           -- 生效时间
  annual_recertify BOOLEAN DEFAULT 0,               -- 是否每年强制重新确认（合规须知）
  priority        VARCHAR(16) DEFAULT 'normal',     -- normal / high (紧急公告 M2)
  status          VARCHAR(16) DEFAULT 'active',     -- draft / active / archived
  published_by    INT,
  published_at    BIGINT,
  created_at      BIGINT,
  updated_at      BIGINT,
  INDEX idx_type_effective(type, effective_at),
  INDEX idx_status(status)
);
```

#### 10.1.15 `user_announcement_ack` —— 公告确认记录（M1，ADR-014）
```sql
CREATE TABLE user_announcement_ack (
  id              BIGINT PRIMARY KEY,
  user_id         INT NOT NULL,
  announcement_id BIGINT NOT NULL,
  version         INT NOT NULL,                    -- 确认的是哪个版本
  acked_at        BIGINT,
  ip              VARCHAR(64),
  UNIQUE KEY uk_user_ann_ver(user_id, announcement_id, version),
  INDEX idx_user(user_id)
);
```

#### 10.1.16 `enterprise_resource` —— Skill + 课程统一基础表（M1，J-11+J-12）
```sql
CREATE TABLE enterprise_resource (
  id              BIGINT PRIMARY KEY,
  type            VARCHAR(32) NOT NULL,            -- skill / course
  title           VARCHAR(256) NOT NULL,
  slug            VARCHAR(128) UNIQUE,             -- URL 友好标识
  description     TEXT,
  scenario        VARCHAR(128),                    -- 适用场景（财务对账 / 写作 / ...）
  tags            TEXT,                            -- JSON 数组
  capabilities    TEXT,                            -- JSON 数组（仅 skill：兼容客户端 WorkBuddy/OpenClaw/...）
  current_version_id BIGINT,                       -- 指向 enterprise_resource_version.id
  owner_user_id   INT,                             -- 发布人
  owner_dept_id   BIGINT DEFAULT 7,                -- 默认归数智营销中心（dept_id=7）
  status          VARCHAR(16) DEFAULT 'active',    -- active / deprecated / archived
  created_at      BIGINT,
  updated_at      BIGINT,
  INDEX idx_type_status(type, status),
  INDEX idx_owner(owner_dept_id)
);
```

#### 10.1.17 `enterprise_resource_version` —— 资源版本（M1）
```sql
CREATE TABLE enterprise_resource_version (
  id              BIGINT PRIMARY KEY,
  resource_id     BIGINT NOT NULL,
  version         VARCHAR(32) NOT NULL,            -- v1.0 / v1.1 / ...
  file_object_keys TEXT,                           -- JSON 数组：对象存储 key（zip / pdf / mp4 / md）
  changelog       TEXT,
  published_by    INT,
  published_at    BIGINT,
  UNIQUE KEY uk_res_ver(resource_id, version),
  INDEX idx_resource(resource_id)
);
```

#### 10.1.18 `enterprise_resource_download_log` —— 下载记录（M1）
```sql
CREATE TABLE enterprise_resource_download_log (
  id              BIGINT PRIMARY KEY,
  resource_id     BIGINT NOT NULL,
  version_id      BIGINT NOT NULL,
  user_id         INT NOT NULL,
  downloaded_at   BIGINT,
  ip              VARCHAR(64),
  INDEX idx_resource_ts(resource_id, downloaded_at),
  INDEX idx_user_ts(user_id, downloaded_at)
);
```

#### 10.1.19 `dept_budget_approval` —— 临时配额审批工单（M2，D-D4）
```sql
CREATE TABLE dept_budget_approval (
  id              BIGINT PRIMARY KEY,
  user_id         INT NOT NULL,                    -- 申请员工
  dept_id         BIGINT NOT NULL,
  reason          TEXT NOT NULL,                   -- 用途说明
  estimated_tokens INT,                            -- 预计 token 数
  urgency         VARCHAR(16),                     -- high / medium / low
  status          VARCHAR(16) DEFAULT 'pending',   -- pending / approved / rejected / expired
  approver_user_id INT,
  approved_quota  INT,                             -- 同意的额度（可能 < 申请的）
  one_time_token_id INT,                           -- 颁发的单次令牌 token.id
  decision_reason TEXT,
  expires_at      BIGINT,                          -- 单次令牌有效期（默认 1h）
  requested_at    BIGINT,
  decided_at      BIGINT,
  INDEX idx_status_dept(status, dept_id),
  INDEX idx_user_ts(user_id, requested_at)
);
```

#### 10.1.20 `system_setting` —— 系统参数 + IP 白名单（M2，G-D3 + K-D1）
```sql
CREATE TABLE system_setting (
  id              BIGINT PRIMARY KEY,
  key             VARCHAR(128) UNIQUE NOT NULL,    -- session_timeout_min / max_prompt_size_kb / qps_limit / ip_whitelist / ...
  value           TEXT NOT NULL,                   -- JSON 或纯字符串
  category        VARCHAR(32),                     -- ratelimit / security / display / ...
  description     TEXT,
  updated_by      INT,
  updated_at      BIGINT,
  INDEX idx_category(category)
);
```

#### 10.1.21 `login_log` —— 后台访问留痕（M2，K-D3）
```sql
CREATE TABLE login_log (
  id              BIGINT PRIMARY KEY,
  user_id         INT,
  ip              VARCHAR(64),
  user_agent      VARCHAR(256),
  login_type      VARCHAR(32),                     -- wecom_sso / password / api_token
  success         BOOLEAN,
  failure_reason  VARCHAR(128),                    -- 失败原因（如 disabled / invalid_credential / ip_blocked）
  ts              BIGINT,
  INDEX idx_user_ts(user_id, ts),
  INDEX idx_ts(ts)
);
```

#### 10.1.22 `enterprise_resource_progress` —— 课程学习进度（M2，J-12）
```sql
CREATE TABLE enterprise_resource_progress (
  id              BIGINT PRIMARY KEY,
  resource_id     BIGINT NOT NULL,                 -- 仅 type=course 用
  user_id         INT NOT NULL,
  progress_pct    FLOAT DEFAULT 0,                 -- 0-100
  last_chapter    VARCHAR(128),
  completed_at    BIGINT,
  updated_at      BIGINT,
  UNIQUE KEY uk_res_user(resource_id, user_id),
  INDEX idx_user(user_id)
);
```

#### 10.1.23 `risk_rule` —— 风险规则库（M3，ADR-016）
```sql
CREATE TABLE risk_rule (
  id              BIGINT PRIMARY KEY,
  name            VARCHAR(128) NOT NULL,
  rule_type       VARCHAR(32),                     -- regex / keyword / pattern
  pattern         TEXT NOT NULL,                   -- 正则或关键词
  severity        VARCHAR(16),                     -- high / medium / low
  scope           VARCHAR(32) DEFAULT 'all',       -- all / prompt / response / attachment_filename
  is_builtin      BOOLEAN DEFAULT 0,               -- 系统内置 vs 自定义
  enabled         BOOLEAN DEFAULT 1,
  created_by      INT,                             -- 自定义规则的创建者
  created_at      BIGINT,
  updated_at      BIGINT,
  INDEX idx_enabled_severity(enabled, severity)
);
```

#### 10.1.24 `risk_event` —— 风险命中事件（M3，ADR-016）
```sql
CREATE TABLE risk_event (
  id              BIGINT PRIMARY KEY,
  audit_log_id    BIGINT NOT NULL,                 -- 关联的调用记录
  user_id         INT NOT NULL,
  dept_id         BIGINT NOT NULL,
  rule_id         BIGINT NOT NULL,
  severity        VARCHAR(16),
  match_count     INT DEFAULT 1,                   -- 命中次数（同 rule 多次匹配）
  match_positions TEXT,                            -- JSON: 命中位置（字符 offset）
  status          VARCHAR(16) DEFAULT 'new',       -- new / acknowledged / investigating / resolved / false_positive
  handled_by      INT,
  handled_at      BIGINT,
  notes           TEXT,
  ts              BIGINT,                          -- 命中时间（异步 worker 写入）
  INDEX idx_status_ts(status, ts),
  INDEX idx_user_ts(user_id, ts),
  INDEX idx_audit(audit_log_id)
);
```

### 10.2 原表字段扩展（向后兼容方式新增）

#### `users` 表新增字段
```
employee_no         VARCHAR(64)   -- 工号（对接 HR）
hire_date           BIGINT        -- 入职时间
leave_date          BIGINT        -- 离职时间（NULL = 在职）
employment_status   VARCHAR(16)   -- active / leave / terminated
primary_dept_id     BIGINT        -- 主部门（冗余，便于查询，权威数据看 user_department.is_primary）
```

#### `tokens` 表新增字段
```
owner_type   VARCHAR(16) DEFAULT 'user'   -- user / service
owner_id     BIGINT                        -- 当 owner_type='service' 时指向 service_account.id
```
> ⚠️ 兼容性：`owner_type='user'` 时 `owner_id` 与原 `user_id` 字段同值，所有原有逻辑（`Token.UserId`）保持不变。新代码统一用 `owner_type + owner_id` 入口。后续考虑加迁移任务把 user_id 同步到 owner_id。

> DLP 相关表 `dlp_rule` `dlp_audit` `dlp_alert` 设计 → 见 [DLP-deferred.md](DLP-deferred.md)

---

## 11. 路线图

### Phase 0：方案锁定（当前）
- ✅ 完成网关 + 管理后台数据架构对齐
- ⏳ 本地开发环境跑通 New-API（PG + Redis + Go + 前端）
- ⏳ 阅读 New-API relay / middleware / model 关键代码，确认改动点
- ⏳ 前置脱敏 skill 方案在独立窗口推进

### Phase 1：能跑（M0 → M1，约 5-7 天）
**目标**：5/31 工作组会议能演示"用真实客户端（Cursor / Cherry Studio）调三家上游 → 后台看完整会话记录 + 部门权限隔离 + 当场点击导出 Excel"。

**M1 必做清单**：
- New-API fork & 混合环境跑通（Docker PG + Redis + **MinIO** + 本地 Go + bun）
- **3 家上游**接入：DeepSeek + OpenAI + Claude
- 企微 SSO（扩展 New-API 原生 OAuth 框架）
- 极简部门：手工建 9 个部门、灌入 5-10 个金融板块测试员工
- ★ **设备白名单完整拦截**（AP23）：device 表 + `/api/agent/activate` + `DeviceTokenGuard` 中间件
- ★ **审计中间件 v1**：仅文字端点，全量录到 `audit_log` + `audit_attachment`（含元数据）
- ★ **存储抽象层 + MinIO 实现**
- ★ **`hmrouter-cli` 工具**：`auth login` + `usage --me` 两个最简命令
- **在 `web/default/src/features/` 下新建 4 个企业子域**（复用原 shadcn/i18n/router/HTTP）：
  - `features/enterprise/dashboard/` —— 看板首页：**部门聚合 + 部门内员工 Top N**（双视图切换）
  - `features/enterprise/personal/` —— ★ **个人用量页**（员工自己看自己 / admin 看任意员工）
  - `features/audit/detail/` —— 会话详情页（复用 usage-logs 表格，按 user_id / dept_id 双维度筛选）
  - `features/enterprise-export/` —— 导出页：**部门 Excel + 个人 Excel** 两种模板
- ★ **部门权限隔离**（AP27）：复用原 admin/common 角色 + 扩 3 个角色枚举
  - 一把手 / AI 对接员：本部门聚合 + 本部门内员工明细
  - 普通员工：仅自己的数据
  - 超管：全集团 + 任意部门 + 任意员工
- ★ **元审计**：`admin_action_log` 表 + 任何 audit_log 修改自动记一笔

> ⚠️ **本阶段仍砍掉**：服务账号、预算、HR 实时同步、多模态端点、案例提交、SSE 推送、企微告警机器人、Admin 设备录入 UI（设备入库走 SQL 手工）

> ⚠️ **风险**：上游 OpenAI/Claude 涉及对公付款 + 境外网络配置，可能拖时间。备案：M1 演示如果 OpenAI/Claude 没到位，至少 DeepSeek + 切换上游的代码已就绪，演示时口头说"另两家配好就能切"。

### Phase 2：能看（M1 → M2，约 7-10 天）
**目标**：金融/财务部门一把手日常用上 hmrouter，多模态可用。
- ★ **多模态端点开放**：图片输入/输出 + 文档上传 + 二进制记录入对象存储
- ★ **群晖 NAS WebDAV adapter 实现**（IT 凭证到位后切换）
- ★ 完整 CLI 命令集：`devices` `quota` `chats list/search/show`
- ★ **服务账号** `service_account` 表 + Token owner_type 改造
- ★ **部门预算 observe 模式** + 阈值告警 + **billingexpr 表达式编辑器**（AP26）
- ★ `features/devices/` 子域：Admin 设备录入 UI（替换 SQL 手工）
- ★ `features/audit/admin-edit/` 子域：admin 编辑 audit_log 操作流（带原因输入 + 元审计写入）
- ★ `features/departments/budget/` 子域：部门预算配置 + 表达式输入框
- 内网部署

### Phase 3：能推（M2 → M3，约 18 天）
**目标**：8 月底月度通报会能用 hmrouter 的数据出报告。
- **部门预算 observe 模式**：配额配置 + 阈值告警（飞书/企微机器人推送）
- **部门排名 + 月度报告导出**（直接出可贴入通报会的截图/PDF）
- 企微部门同步任务（cron 拉部门树 + 员工名单，离职自动停 Token）
- 服务账号最小实现（Token 表 owner_type 字段）
- 接入 Anthropic（Opus 给数智营销 + 法务 + 总裁办用）

### Phase 4：能扩（9 月 → 11 月）
**目标**：全集团 9 部门完整接入。
- 9 部门全员 Token 发放
- AI 对接员后台（本部门员工管理、案例提交）
- 业务量上报接口（让 Agent 工具能上报"我替代了几小时人工"，配合"数字员工占比"指标）

### Phase 5：能兑现（12 月）
**目标**：年度终评的数据可信、可审计。
- 全年数据的归档与对账
- 9 部门 KPI 完成情况报表
- 年度报告自动生成

### 远期（明年）
- 部门预算 enforce 模式
- DLP 检测（待独立窗口方案确定）
- 内网私有部署模型
- 多模态、跨部门汇总等

---

## 12. 风险

| 风险 | 等级 | 缓解 |
|------|------|------|
| **5/31 工作组首次会议来不及演示** | 🔴 高 | Phase 1 极限收敛；只跑通 1 家上游 + 1 个看板页 + 文字记录 |
| **审计存储成新泄密源**（全量记录 = 全员聊天记录裸放） | 🔴 高 | 严格 RBAC + 对象存储 ACL + 后台审计访问留痕 + 加密落盘（待评估） |
| **OpenAI/Claude 对公付款拖 M1 进度** | 🔴 高 | 备案：M1 至少 DeepSeek 跑通；切换上游代码就绪后口头说明 |
| **1 人 + Claude 撑不到 12 月终评** | 🔴 高 | AP16/17：能复用就不重写；通报会场景外的需求一律延后 |
| **审计存储成新泄密源**（全量记录 = 全员聊天记录裸放） | 🔴 高 | 严格 RBAC + 对象存储 ACL + 后台审计访问留痕 + 加密落盘（待评估） |
| **企微 OpenAPI 权限申请卡壳** | 中 | 你直接归口推进；提前在 5 月内拿到 corp_id + secret |
| 部门一把手不会用、不愿用 | 中 | AI 对接员（每部门 1 人）做培训；每月通报会"被点名"形成压力 |
| **群晖 NAS 撑不住流量** | 中 | 一期 OK；半推时切对象存储集群（AP21 保底） |
| **设备白名单首次入职流程跑不通** | 中 | 提前与 HR/IT 走通流程；M1 演示设备 SQL 手工预录 |
| **"数字员工业务占比"统计口径定不下来** | 中 | Phase 4 给 Agent 工具开上报接口；定义留给业务侧 |
| **CLI 跨平台编译/分发** | 低 | Go cross-compile 三平台一行命令；分发用内网下载页 |

---

## 13. 下一步

**今天-后天（M0）—— 让本地能跑 + 启动外部申请**
1. ⏳ 启动 Docker Desktop → 起 PG + Redis 容器
2. ⏳ 本地 `go run main.go` + `bun run dev` 跑通
3. ⏳ 注册管理员，熟悉原后台
4. ⏳ Claude 读关键源码（auth / relay / oauth / model.user / model.token / middleware.distributor）
5. **你这边并行**：申请企微自建应用、DeepSeek 对公付款流程

**T+3 → T+5（M1）—— 演示版**
6. 接 DeepSeek 渠道，端到端跑通
7. 企微 OAuth provider 实现（扩展 New-API 原生 OAuth 框架）
8. 极简看板（一页）：按部门聚合 token 用量
9. 灌入 5-10 个金融板块种子用户
10. 5/31 工作组会议演示

**T+6 → T+12（M2）—— 金融试点版**
11. 独立企业前端项目搭起来（React + shadcn/ui + Tailwind）
12. 3 个核心页面 + 部门权限隔离
13. 接 OpenAI

**T+13 → T+30（M3）—— 通报会版**
14. 部门预算 observe、排名、月报导出、企微同步、Anthropic

**全程贯穿**：
- 关键代码踩点（distributor / relay / token），但不为踩点而踩点，**遇到要改才读**
- 每个里程碑前一天，做一次 dogfooding（自己当员工跑一次）
- PLAN.md 每个里程碑后小步迭代一次
