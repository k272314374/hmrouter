# 企业管理后台 PRD

> 状态：**v0.3** · 2026-05-15（按 13 个功能域重组；6 角色矩阵；含 J-11 Skill 中心 + J-12 学习中心 + L 公告 + M 风险事件；调用内容严格 3 角色可见）
> 与 [PLAN.md](PLAN.md) / [DECISIONS.md](DECISIONS.md) ADR-001~019 / [PAGES-admin.md](PAGES-admin.md) / [ARCHITECTURE.md](ARCHITECTURE.md) 同步
> 读者：开发（spec 实现指南）+ 部门一把手 / 张主席（评审）

---

## 0. 文档说明

### 0.1 v0.3 重大变更（接 v0.2）

S-003 完成 13 域 113 项决策深聊，本次重写：

| 维度 | v0.2 | v0.3 |
|---|---|---|
| **组织方式** | 按里程碑硬塞模块（M1 8 个 + M2 5 个 + M3+ 5 个）| **按 13 个功能能力域**重组（A-M），每域内分 M1/M2/M3 |
| **角色数** | 5（超管/集团 admin/部门 admin/AI 对接员/员工） | **6**（新增"合规审计专员"，ADR-013）|
| **调用内容访问** | 部门 admin/AI 对接员/员工 都能看本部门/自己 | **严格 3 角色**（root / group_admin / compliance_auditor），其他角色仅元数据，员工本人也不在后台看（去 agent 客户端看），ADR-019 |
| **新模块** | — | 公告与合规须知（L，ADR-014）/ Skill 中心（J-11）/ AI 学习中心（J-12）/ 风险事件（M，ADR-016）|
| **客户端策略** | 多客户端都列教程 | **3 层策略**：M1 推荐 WorkBuddy + OpenClaw（PDF + 视频）/ 通用列基础说明 / 自定义凡 OpenAI 兼容均可，ADR-018 |
| **取消** | 显示层脱敏（ADR-015）→ 被 ADR-019 严格收窄取代 | — |
| **员工功能** | 我的页 + 调用历史 + 详情 | **极简 4 项**：工作台 + 用量 + Skill + 课程 |
| **术语** | 全模态会话录像 / 回放 | **调用记录 / 详情**（不录屏不监控）|

### 0.2 跟其他文档关系

| 文档 | 内容 |
|---|---|
| [PLAN.md](PLAN.md) | 决策（要做什么、AP、路线图、数据模型 schema） |
| [DECISIONS.md](DECISIONS.md) | 19 条 ADR（不应再讨论的决定） |
| [PAGES-admin.md](PAGES-admin.md) | 页面（路径、跳转、UX 模式） |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 架构（模块划分、数据流） |
| [knowledge-graph/INDEX.md](knowledge-graph/INDEX.md) | 事实（New-API 实际是怎样的） |
| **本 PRD** | **功能（做什么、为什么、谁能用、API 形态、验收）** |

### 0.3 阅读路径

- **老板 / 部门一把手**：§1 产品定位 → §2 角色 → §3 权限矩阵 → §5 各域目标段
- **开发**：完整顺读，重点 §3 + §4 + §5 + §8 验收
- **新会话续接**：先读 [SESSION-S003-handoff.md](SESSION-S003-handoff.md) 了解决策来源

---

## 1. 产品定位

### 1.1 核心战略：算力主权 + Agent 工具自由（ADR-018）

hmrouter = **企业版 LLM API 中转网关 + 管理后台 + Agent CLI 工具**。

集团统一采购各家 LLM API（DeepSeek / OpenAI / Claude / 通义 / ...），员工通过 hmrouter 免费用任意模型。**关键产品定位**：

- **API 控制权在集团手里**（不被 agent 工具厂商绑架）
- **Agent 工具可随时替换**（WorkBuddy / OpenClaw / QClaw / AutoClaw / Cherry Studio / Cursor / 自研 / 任意 OpenAI 兼容客户端）
- **任何客户端调用都经过 hmrouter** → 调用全量记录可追溯
- **替代 WorkBuddy 等工具的付费积分模式**：员工通过 hmrouter 用，不消耗 agent 工具的算力积分，集团可控成本

### 1.2 价值主张（按用户）

| 用户 | 价值 |
|---|---|
| 张主席（不直接用，听汇报）| 月度通报会有数据 + 部门排名 + 数字员工占比 KPI |
| 张远捷（副总裁，张主席之子）= 集团 admin | 看全集团数据 + 跟监察审计室一起查违规 / 泄密（看明文）|
| 部门一把手（dept_admin）| 本部门用量 + 预算消耗 + 员工排名（不看内容）|
| AI 对接员（每部门 1 人）| 协调本部门：管员工 + 审设备 + 协助排错（不看内容）|
| 监察审计室（compliance_auditor）| 风险事件跟进 + 元审计 + 调用内容明文 |
| 财务（计划财务部）| 按部门核算成本 + 月度对账 |
| 员工（2000 人主体）| 拿 Token + 配 agent 工具 + 用 LLM + 学 AI 技能 |

### 1.3 不是什么

- 不是面向外部客户的 SaaS 后台
- 不是 BI 平台（不做复杂自定义报表）
- 不替代企业现有 IAM
- **不做内容拦截 / 脱敏 / 过滤**（中间层只录不挡，AP19 + ADR-002 + ADR-016）
- **不录屏 / 不监控员工电脑**（"调用记录" 仅指 API 请求内容，不指屏幕）

### 1.4 关键设计原则（AP1-AP27 摘要）

完整 AP 见 [PLAN §2](PLAN.md)。本 PRD 反复用到的：

- **AP1**：网关不在请求链路上改写 payload（保护 prompt cache + SSE）
- **AP14**：预算只算部门，**统计始终双维度**（部门 + 个人）
- **AP16**：能复用 New-API 原生功能的，绝不重写（OAuth registry / billingexpr / shadcn / TanStack Router / keys feature / channel-test / ...）
- **AP19**：中间层 = **调用记录器**，只录不改、只录不挡
- **AP24**：audit_log 可改可删，但写元审计 admin_action_log（元审计本身不可改）
- **AP27**：复用 `User.Role` 枚举，扩 4 个角色（不引入完整 RBAC）

---

## 2. 用户角色（6 角色）

| # | 角色（枚举值）| 中文名 | 来源 | 能力上限 |
|---|---|---|---|---|
| 1 | `root` | 超管 | New-API admin | **唯一**能改系统配置；全集团；含调用内容明文 |
| 2 | `group_admin` | 集团 admin | 新增 | 全集团数据 + 调用内容明文 + 元审计；不能改系统配置；张远捷归此 |
| 3 | `compliance_auditor` | 合规审计专员 | 新增（ADR-013）| 跨部门只读 audit 内容明文 + 元审计 + 风险事件；不能改任何配置/数据；监察审计室人员归此 |
| 4 | `dept_admin` | 部门 admin = 部门一把手 | 新增 | 本部门统计 + 员工 token 用量 + Token/设备管理；**不能看 audit 内容** |
| 5 | `ai_liaison` | AI 对接员 = 部门 AI 落地员 | 新增 | dept_admin 子集：本部门员工管理 + 设备协调；**不能看 audit 内容**；每部门 1 人 |
| 6 | `common` | 普通员工 | New-API common | 自己的工作台 + 个人 token 用量 + Skill + 课程；**不能在后台看自己 audit 内容**（去 agent 客户端看）|

**角色实现**：复用原 `User.Role` 单字段（AP27），扩 4 个枚举值。无完整 RBAC 框架。

---

## 3. 权限矩阵

> ⚠️ **铁律**：调用内容（prompt + response + 附件原文）严格限定 root / group_admin / compliance_auditor 3 角色（ADR-019）。其他角色仅看元数据。

| 功能 | root | group_admin | compliance_auditor | dept_admin | ai_liaison | common |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **A. 身份与组织** | | | | | | |
| 全集团聚合看板 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 部门聚合看板 | ✅任意 | ✅任意 | ✅任意 | ✅本部门 | ✅本部门 | ❌ |
| 员工目录 | ✅全 | ✅全 | ✅全 | ✅本部门 | ✅本部门 | ❌ |
| 员工 HR 字段（工号/入职/状态/部门）| ✅改 | ✅改 | ❌ | ✅本部门改 | ✅本部门改 | 仅只读看自己 |
| 员工账户偏好（显示名/语言/通知，**仅改自己**）| ✅自己 | ✅自己 | ✅自己 | ✅自己 | ✅自己 | ✅自己（P-M1-WS-07）|
| 调岗 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 部门 CRUD | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| HR 同步触发 (M3) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **B. 凭证与访问控制** | | | | | | |
| API 凭证管理（自己）| ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| API 凭证管理（他人）| ✅任意 | ✅任意 | ❌ | ✅本部门 | ✅本部门 | ❌ |
| 服务账号 CRUD | ✅ | ✅ | ❌ | ✅本部门 | ✅本部门 | ❌ |
| 设备白名单录入 | ✅ | ✅ | ❌ | ✅本部门 | ✅本部门 | ❌ |
| 设备激活审批 | ✅ | ✅ | ❌ | ✅本部门 | ✅本部门 | ❌ |
| 设备停用 | ✅ | ✅ | ❌ | ✅本部门 | ✅本部门 | ❌ |
| **C. 模型与上游** | | | | | | |
| 模型清单（员工视角）| ✅ | ✅ | ✅ | ✅ | ✅ | ✅按权限 |
| 上游渠道配置 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 部门-模型可见性矩阵配置 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 模型推荐元数据维护 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **D. 用量限流与成本** | | | | | | |
| 个人 token 用量（自己）| ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 个人 token 用量（他人）| ✅任意 | ✅任意 | ✅任意 | ✅本部门 | ✅本部门 | ❌ |
| 部门 token 用量统计 | ✅任意 | ✅任意 | ✅任意 | ✅本部门 | ✅本部门 | ❌ |
| 个人限流配置 | ✅ | ✅ | ❌ | ✅本部门员工 | ✅本部门员工 | ❌ |
| 部门预算配置 (M2) | ✅ | ✅ | ❌ | 看本部门预算 | 看本部门预算 | ❌ |
| 临时配额申请 (M2) | — | — | — | 审批本部门 | — | 申请 |
| 月度账单导出（部门）| ✅ | ✅ | ✅ | ✅本部门 | ✅本部门 | ❌ |
| 月度账单导出（个人）| ✅ | ✅ | ✅ | ✅本部门员工 | ✅本部门员工 | ✅自己 |
| **E. 调用记录** | | | | | | |
| **调用列表（含内容摘要）** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **调用详情（prompt+response+附件）** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 调用元数据 + 错误诊断 | ✅ | ✅ | ✅ | ✅本部门 | ✅本部门 | ✅自己 |
| 调用编辑（带原因）| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 调用软删（带原因 + 元审计）| ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **F. 元审计** | | | | | | |
| 元审计 admin_action_log | ✅ | ✅ | ✅ | ✅本部门相关 | ❌ | ❌ |
| **G. 运维可观测** | | | | | | |
| 健康检查页 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 系统参数配置 (M2) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 异常预警查看 (M2) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **H. 业务沉淀 (M3)** | | | | | | |
| 案例提交 | — | — | — | — | — | ✅提交 |
| 案例审批 | ✅ | ✅ | ❌ | ✅本部门 | — | — |
| 业务量上报 | — | — | — | — | — | ✅上报 |
| 业务量看板 | ✅全 | ✅全 | ✅全 | ✅本部门 | ✅本部门 | ✅自己 |
| **I. 通知协作** | | | | | | |
| inbox 待办 | ✅ | ✅ | ✅ | ✅本部门 | ✅本部门 | ✅自己 |
| 通知模板配置 (M2) | ✅ | ✅ | ❌ | ✅本部门 | ✅本部门 | ❌ |
| **J. 自助支持** | | | | | | |
| 工作台 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Skill 中心浏览/下载 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Skill 中心发布 | ✅ | ✅（数智营销中心相关）| ❌ | ✅数智营销中心 | ✅数智营销中心 | ❌ |
| 学习中心浏览 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 学习中心发布 | ✅ | ✅ | ❌ | ✅数智营销中心 | ✅数智营销中心 | ❌ |
| **K. 安全合规** | | | | | | |
| IP 白名单配置 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 后台访问留痕查询 (M2) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **L. 公告与合规须知** | | | | | | |
| 公告查看 + 强制确认 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 合规须知发布 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 运营公告发布 | ✅ | ✅ | ❌ | ✅本部门 | ❌ | ❌ |
| 系统通知发布 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **M. 风险事件 (M3)** | | | | | | |
| 风险事件列表 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 风险事件处理 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 内置规则编辑 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 自定义规则编辑 | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |

---

## 4. 信息架构

### 4.1 菜单设计（按 6 角色变形）

**核心原则**：菜单按 user.role 严格 filter（不只是 hide，后端 API 也校验，三层防护）。

#### 4.1.1 员工 (common) — 极简 4 项

```
📋 工作台         /workspace
📊 我的用量       /workspace/usage
🎯 Skill 中心     /workspace/skills
🎓 学习中心       /workspace/courses
（顶栏铃铛通知 + 头像菜单：账户 / 公告历史 / 登出）
```

#### 4.1.2 AI 对接员 (ai_liaison)

```
📥 待办           /enterprise/inbox
👥 本部门员工     /enterprise/users
💻 设备管理       /enterprise/devices
📊 本部门用量     /enterprise/dashboard
🤖 服务账号       /enterprise/service-accounts
📤 导出           /enterprise/export
📋 Skill 管理 ▲   /enterprise/skills
🎓 课程管理 ▲     /enterprise/courses
─────────────
📋 工作台
🎯 Skill 中心
🎓 学习中心
```
> ▲ Skill/课程管理仅 `primary_dept_id=数智营销中心` 的 ai_liaison 可见（双条件，见 PAGES §2.0）。

#### 4.1.3 部门 admin (dept_admin = 部门一把手)

```
📊 本部门看板     /enterprise/dashboard
👥 本部门员工
💻 设备管理
🤖 服务账号
📤 导出           /enterprise/export
📥 待办
📢 部门公告       /enterprise/announcements
─────────────
📋 工作台
🎯 Skill 中心
🎓 学习中心
```

#### 4.1.4 集团 admin (group_admin) — 含张远捷

```
📊 集团看板
📜 调用记录       ★ /enterprise/audit  (跨部门, 看明文)
📥 待办
👥 全集团员工
🏢 部门管理       /enterprise/departments
💻 设备管理
🤖 服务账号
📤 导出
📢 公告管理       /enterprise/announcements
🎯 Skill 管理     /enterprise/skills
🎓 课程管理       /enterprise/courses
🚨 风险事件 (M3)
📋 元审计         /enterprise/admin-actions
🎫 案例 (M3)
📈 业务量 (M3)
─────────────
📋 工作台
```

#### 4.1.5 合规审计专员 (compliance_auditor) — 监察审计室

```
🚨 风险事件 (M3)  ★ 主入口
📜 调用记录       ★ /enterprise/audit  (跨部门, 看明文)
📋 元审计         /enterprise/admin-actions
📊 集团看板（只读）
📤 审计报告导出
─────────────
📋 工作台
```

#### 4.1.6 超管 (root)

```
[企业域 — 同集团 admin 全部菜单]
─────────────
[系统域 — 仅超管见]
🔌 上游渠道       /admin/channels
💰 模型定价       /admin/models
🔑 Token 管理     /admin/tokens
📜 原始日志       /admin/logs
🩺 健康检查       /admin/health
⚙️ 系统配置       /admin/system-settings
```

---

## 5. 13 个功能域详细规范

### 5.A 身份与组织

#### A.1 目标
SSO 登录 / 用户管理 / 部门管理 / 角色权限 / HR 同步。地基模块。

#### A.2 核心能力（10 项）

| # | 能力 | 里程碑 | 决策 |
|---|---|---|---|
| 1 | 企微（企业微信）扫码登录 | M1 | A-D1: 企业自建应用 |
| 2 | 账号密码登录（仅超管备用）| M1 | — |
| 3 | /api/user/self 当前用户信息 | M1 | — |
| 4 | 员工目录页（搜索 + 筛选）| M1 | A-D6: 8 列 + 4 筛选 |
| 5 | 用户详情 + 编辑（HR 字段）| M1 | — |
| 6 | 部门 CRUD（基础增删改 + 重命名）| **M1** | M2→M1 提前（AI 转型期需灵活）|
| 7 | 部门树拖拽改 parent + full_path | M2 | A-D10: 最多 3 层 |
| 8 | 6 角色枚举（AP27 扩 User.Role）| M1 | A-D5 |
| 9 | HR 同步（北森系统）| M3 | A-D7: 每小时增量+每天全量 |
| 10 | 离职自动停 token + 设备 | M3 | A-D8 |

#### A.3 用户故事

- **首次登录员工**：扫企微 → 自动创建 user (status=pending) → 落工作台 + 公告强制弹窗 → 仅能浏览 Skill 中心，不能调 API → 部门 admin 收到 inbox → 一键激活 + 分配主部门 → 员工可用
- **跨部门调岗**：dept_admin 在员工详情点"调部门" → 选新部门 + 填原因 → primary_dept_id 改 + 写 user_department 历史行 + 写 admin_action_log → **历史 audit_log 仍归原部门**（dept_id 写入时已锁死，A-D3 历史归属）
- **离职 (M3)**：HR 同步 status=leave → 5min 内 user.status=disabled + token revoked + 所有设备 disabled + 通知部门 admin → 30 天后可走 GDPR 删除审批

> **6 角色登录落地首页**：见 [PAGES-admin.md §4.0 登录落地表](PAGES-admin.md)。深链无权限跳各自首页 + toast。

#### A.4 关键 API

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/oauth/wecom` | 跳企微授权 |
| GET | `/api/oauth/wecom/callback` | 回调，颁发 session |
| GET | `/api/user/self` | 当前用户（含 role + primary_dept_id）|
| GET | `/api/enterprise/users` | 员工目录列表 |
| GET | `/api/enterprise/users/:id` | 员工详情 |
| PATCH | `/api/enterprise/users/:id` | 编辑（HR 字段 / 角色 / 部门）|
| POST | `/api/enterprise/users/:id/activate` | 激活 pending 员工 |
| POST | `/api/enterprise/users/:id/transfer` | 调岗（带 reason）|
| GET | `/api/enterprise/departments` | 部门列表（树形）|
| POST | `/api/enterprise/departments` | 新建部门 |
| PATCH | `/api/enterprise/departments/:id` | 编辑（含改 parent，M2）|
| DELETE | `/api/enterprise/departments/:id` | 软删（仅空部门）|

#### A.5 涉及表

- `user` (扩 5 个 HR 字段)
- `department`
- `user_department` (含调岗历史 行 + is_primary 当前)
- `hr_sync_event` (M3)

#### A.6 9 部门预录种子数据（M1）

| ID | 部门 | 一把手账号 | 境外模型 |
|---|---|---|---|
| 1 | 证券投资部 | ✓ | ❌ 禁 |
| 2 | 金融事业部 | ✓ | ❌ 禁 |
| 3 | 股权事业部 | ✓ | ❌ 禁 |
| 4 | 人力资源中心 | ✓ | ✅ |
| 5 | 计划财务部 | ✓ | ✅ |
| 6 | 总裁办 | ✓ | ✅ |
| 7 | 数智营销中心 | ✓（用户本人）| ✅ |
| 8 | 监察审计室 | ✓（部分人配 compliance_auditor 角色）| ✅ |
| 9 | 法务部 | ✓ | ✅ |

#### A.7 验收点（M1）

- [ ] 企微扫码可登录
- [ ] 自动创建 pending 用户 + 部门 admin 看到 + 一键激活
- [ ] 员工目录按 8 列展示 + 4 筛选可用 + 搜索 OK
- [ ] 9 部门预录数据正确
- [ ] 调岗后历史 audit 仍归原部门
- [ ] 张远捷账号 = group_admin，监察审计室 1-2 人 = compliance_auditor

---

### 5.B 凭证与访问控制

#### B.1 目标
管理员工 / 服务账号的 API Token；管理设备白名单；**双层校验**（device token + API token）防止 sk-xxx 单独泄露后被滥用。

#### B.2 核心能力（10 项）

| # | 能力 | 里程碑 | 决策 |
|---|---|---|---|
| 1 | 员工 API Token 颁发（owner_type=user）| M1 | B-D1: 单个 |
| 2 | Token 重置（旧立失，**无宽限期**）| M1 | B-D7: 立即失效 |
| 3 | 服务账号 CRUD | M1 demo / M2 完整 | — |
| 4 | 服务账号 Token (owner_type=service) | M1 demo / M2 | — |
| 5 | 设备白名单录入 | M1 SQL / M2 UI | B-D2: hostname+MAC+辅助环境 |
| 6 | 设备激活流（CLI → /api/agent/activate）| M1 | B-D3 |
| 7 | 设备审批（部门 admin 30min / 24h 升集团 admin / 48h 作废）| M1 | B-D4 |
| 8 | 设备列表 + 停用/启用 | M1 | B-D8: 服务端立失 |
| 9 | **双层 Token 校验**（device + API token 配对）★ | M1 | B-D5 |
| 10 | 服务账号绑设备开关（高敏感强绑）| M2 | B-D6: 默认 IP 白名单 |

#### B.3 用户故事

- **新员工首次激活设备**：装 hmrouter-cli → `cli activate` → 浏览器跳企微扫码 → cli 上报 hostname+MAC+OS → 后台创建 device.status=pending → 部门 admin inbox 红点 → admin 一键批准 → cli 5min 内拿到永久 token → 写入 ~/.hmrouter/config → 员工开始用
- **员工 sk-xxx 泄露场景** ★：黑客拿到 sk-xxx 在外部机器调用 → DeviceTokenGuard 校验 device_token 不存在 / device.user_id ≠ token.user_id → 返回 401 → 调用失败。**这是核心安全机制**

#### B.4 关键 API

| Method | Path | 说明 |
|---|---|---|
| POST | `/api/agent/activate` | CLI 设备激活 |
| GET | `/api/agent/heartbeat` | CLI 检查激活状态（轮询）|
| GET | `/api/enterprise/devices` | 设备列表 |
| POST | `/api/enterprise/devices/:id/approve` | 部门 admin 批准 |
| PATCH | `/api/enterprise/devices/:id` | 改 status（disable/active） |
| GET | `/api/enterprise/service-accounts` | 服务账号列表 |
| POST | `/api/enterprise/service-accounts` | 创建服务账号 |

#### B.5 涉及表
- `token` (原表，扩 owner_type/owner_id)
- `service_account`
- `device`

#### B.6 验收点（M1）
- [ ] CLI activate 流程跑通（含 24h/48h 升级 + 作废）
- [ ] 设备激活后能调 API
- [ ] 未激活设备调 API 立返 401
- [ ] **sk-xxx 复制到非白名单机器调用立返 401**（核心安全）
- [ ] 部门 admin inbox 30s 内显示新待激活设备
- [ ] Token 重置后旧 token 立即失效（不留宽限期）

---

### 5.C 模型与上游

#### C.1 目标
管理 LLM 上游渠道；按部门 + 模型双维度路由；员工视角的模型可见性 + 推荐元数据。

#### C.2 核心能力（13 项）

| # | 能力 | 里程碑 | 复用/新增 + 决策 |
|---|---|---|---|
| 1 | 上游渠道 CRUD（API key/端点/超时/header）| M1 | ✅ New-API |
| 2 | 模型清单（每渠道支持哪些模型）| M1 | ✅ |
| 3 | 同模型多渠道权重/优先级 | M1 | ✅ |
| 4 | 故障重试自动切换 | M1 | ✅ |
| 5 | 渠道连通性测试 | M1 | ✅ channel-test |
| 6 | **模型分组**（region + vendor 双字段）| M1 | NEW (C-D1) |
| 7 | **部门-模型可见性矩阵** | M1 | NEW (C-D2: 境内默认开 / 境外按部门) |
| 8 | 路由策略（dept + model 双维度选 channel）| M1 | C-D3: 多级回退 |
| 9 | **模型推荐元数据**（用途/价格/场景）| M1 | NEW C-D4: 内置 + 超管覆盖 |
| 10 | **模型实时状态**（5min Redis 滑窗）| M1 | NEW C-D5 |
| 11 | 模型版本管理 + 灰度 | M2 | C-D7: 部门灰度 + 员工 beta |
| 12 | 模型生命周期状态机 | M2 | C-D8: draft→beta→stable→deprecated→removed |
| 13 | 多模态能力标识（capabilities 字段）| M1 字段 / M2 UI | C-D10 |

**关键决策**：
- **C-D6 模型替换严禁**（关 Q16）：员工调 deepseek-chat 不允许网关偷换为 v3，必须透明
- **C-D9** 私有化模型不专门设计（vLLM/Ollama 包成 OpenAI 兼容即可接）

#### C.3 部门-模型可见性 M1 默认配置

3 部门禁境外（证券投资部 / 金融事业部 / 股权事业部）；其他 6 部门 + 集团默认全开。

#### C.4 涉及表
- `channel` (原表)
- `model_meta`（NEW，存推荐元数据 + capabilities）
- `dept_model_acl`（NEW，部门-模型可见性矩阵）

#### C.5 验收点（M1）
- [ ] 3 家上游配好可调通
- [ ] 金融三部门员工调 GPT-4o 立返 403"模型不可用"
- [ ] 数智营销中心员工调 GPT-4o 正常
- [ ] 工作台展示模型清单（含价格档/场景/实时状态）
- [ ] 模型实时状态卡显示成功率（< 95% 标黄）

---

### 5.D 用量限流与成本

#### D.1 目标
统计调用量（双维度）+ 限流（个人 QPS / 日次数）+ 部门预算（M2）+ 成本估算 + 导出。

#### D.2 核心能力（15 项）

| # | 能力 | 里程碑 | 决策 |
|---|---|---|---|
| 1 | 双维度统计聚合（部门 + 个人）| M1 | D-D1: 联动下钻 |
| 2 | 调用量趋势（小时/天/周/月）| M1 | — |
| 3 | 模型分布饼图 | M1 | — |
| 4 | 部门排名 | M1 | — |
| 5 | 员工 Top N | M1 | — |
| 6 | **个人限流**（QPS+日次数）| M1 | D-D2: 默认 QPS 10 / 日 2000 / 并发 5 |
| 7 | 成本估算（按 model_ratio）| M1 | — |
| 8 | 月度账单导出（部门/财务模板）| M1 | — |
| 9 | 月度账单导出（个人模板）| M1 | — |
| 10 | IP 限流 | M2 | — |
| 11 | 部门预算（billingexpr）| M2 | D-D5: 默认按 token 累加；高价模型可加权 |
| 12 | 预算消耗实时累加 | M2 | — |
| 13 | 预算告警阈值（80%/100%）| M2 | D-D7: M2 部门 admin + 一把手 / M3 财务 + 张主席 |
| 14 | 超额策略 3 选 1（observe/告警/审批）| M2 | D-D3: 部门默认 + 单模型可覆盖 |
| 15 | **临时审批工单** | M2 | D-D4: 引导 URL + 30min 响应 + 单次令牌 1h |

**关键约束**：
- **AP14**：预算只算部门，统计始终双维度
- **D-D6**：周期类型 月/季/年
- **D-D8**：跨周期不结转
- **D-D9**：限流维度按员工总额（不按设备）
- **D-D10**：服务账号独立配额体系 + 高配额走超管审批

#### D.3 仪表盘字段（API 返回）

```typescript
type DashboardData = {
  scope: { dimension: 'group' | 'dept', deptId?: number };
  period: { start: number, end: number };
  kpis: {
    totalCalls: number;
    totalTokens: { prompt: number, completion: number, sum: number };
    estCostRMB: number;
    budgetUsedPct: number;       // 仅 dept 维度（M2 后有意义）
  };
  trends: { interval: 'hour'|'day', points: ...};
  modelDistribution: ...;
  deptRanking?: ...;             // 全集团维度才有
  userTop?: ...;
};
```

#### D.4 关键 API

| Method | Path | 说明 |
|---|---|---|
| GET | `/api/enterprise/dashboard` | 双维度看板 |
| GET | `/api/enterprise/users/:id/usage` | 个人用量 |
| POST | `/api/enterprise/export` | 创建导出任务 |
| GET | `/api/enterprise/export/:taskId/status` | 查询进度 |
| GET | `/api/enterprise/export/:taskId/download` | 下载 |
| POST | `/api/enterprise/budget/approval/request` | 临时配额申请（M2）|
| POST | `/api/enterprise/budget/approval/:id/decide` | admin 决策（M2）|

#### D.5 涉及表
- `audit_log` (统计基础)
- `department_budget` (M2)
- `dept_budget_approval` (M2 NEW，临时审批工单)
- `export_task`

#### D.6 验收点
- [ ] M1：双维度看板正确（部门视图 / 个人 Top）
- [ ] M1：单员工 QPS 11 立返 429
- [ ] M1：单员工日 2000 调用后立返 429
- [ ] M1：3 种 Excel 模板能导出 + 打开正常
- [ ] M2：部门预算 observe 模式跑通
- [ ] M2：超额走临时审批流跑通

---

### 5.E 调用记录

#### E.1 目标
**全量记录每次调用的内容（文字 + 附件元数据）+ 严格的访问控制（仅 3 角色看内容）+ 排查/审计/复盘的所有数据来源**。

> ⚠️ **核心原则**（ADR-019）：调用内容（prompt + response + 附件）严格限定 3 角色（root / group_admin / compliance_auditor）。
> - 部门 admin / AI 对接员：仅看本部门元数据 + 自动诊断（不暴露任何 prompt 关键词）
> - 员工本人：仅看自己元数据；想看历史对话内容 → 去 agent 客户端（WorkBuddy / OpenClaw / ...）

#### E.2 核心能力（17 项）

| # | 能力 | 里程碑 | 决策 |
|---|---|---|---|
| 1 | 全量记录 prompt + response 文字 | M1 | E-D1: 元数据同步 + 附件异步 |
| 2 | 附件元数据记录 | M1 | — |
| 3 | 附件原件存对象存储（路径按时间分层）| M1 | E-D3 |
| 4 | SSE 流式 tee | M1 | E-D2: 缓存到内存 + 流结束整段落库 |
| 5 | 调用列表（多筛选）| M1 | 仅 3 角色可见 |
| 6 | 关键词搜索（LIKE 4 字段）| M1 | E-D4: 数据量边界提示 |
| 7 | 调用详情（meta + 完整内容 + 附件预览）| M1 | E-D6: 模拟聊天 UI（给管理者看，不给员工）|
| 8 | 附件 presigned URL（5min TTL）| M1 | — |
| 9 | 调用状态高亮（200/4xx/5xx/超时）| M1 | — |
| 10 | **错误诊断卡片**（仅基于元数据，**不暴露 prompt 关键词**）| M1 | E-D6 + ADR-019 |
| 11 | conversation_id 串联多轮 | M1 | E-D5: 客户端传 + 网关推断兜底 |
| 12 | 复制会话 markdown | M1 | — |
| 13 | admin 编辑（带枚举原因 + 必填备注 + 元审计）| M2 | E-D9 |
| 14 | admin 软删（带原因 + 元审计）| M2 | — |
| 15 | 已删除内容对 3 角色可见（标灰）| M2 | — |
| 16 | 数据冷热分层（6 月归档）| M3 | ADR-011 |
| 17 | 全文搜（ES）| M3 | — |

#### E.3 三层错误诊断梯度

```
L1 员工自助：工作台"出错调用"折叠区，仅元数据 + 自动推断 (无 prompt 内容)
   "你最近 3 次 401 / 推断: Token 已重置 / 点这里复制新 Token"

L2 AI 对接员/部门 admin 协助：员工详情页看错误统计 + 错误码分布 + 推断原因
   "该员工今日 23 次调用 / 18 次错误 / 401 ×15 / 推断: Token 失效 18 次"
   不看任何 prompt/response 内容
   操作: 重置 Token / 查设备 / 发邮件提醒

L3 升级到 3 角色：群体 admin / 合规专员 看内容
   看内容动作本身写元审计 admin_action_log
```

#### E.4 详情页布局（仅 3 角色见）

```
┌─ 调用详情 #2026-05-15-001 ─────────────────────────┐
│ 张三 · 数智营销中心 · gpt-4o · 10:23:14            │
│ [设备 MacBook-Pro][耗时 2.3s][1234 tokens]         │
│ [conversation: conv-abc123 · 第 3 轮 / 5]          │ ← 点击看完整对话
├────────────────────────────────────────────────────┤
│ 错误诊断（仅当 status != 200）                       │
│ ❌ 401 / 推断: Token 已过期 / [发邮件提醒]            │
├────────────────────────────────────────────────────┤
│ 💬 模拟聊天展示 (仅给管理者看，员工见不到此页)       │
│  👤 张三  10:23:12                                 │
│     帮我把这份对账单算一下                          │
│     📎 对账单_2026Q1.xlsx [⬇下载]                  │
│  🤖 gpt-4o  10:23:14                               │
│     收到您的对账单...                              │
├────────────────────────────────────────────────────┤
│ [📋 复制为 Markdown] [⬇ 导出 JSON]                  │
│ [🗑 删除]（仅 admin）[✏️ 编辑]（仅 admin）          │
└────────────────────────────────────────────────────┘
```

#### E.5 涉及表
- `audit_log` (扩 conversation_id 字段)
- `audit_attachment`
- `admin_action_log` (编辑/删除时写)

#### E.6 验收点
- [ ] M1：每次调用都有 audit_log 记录
- [ ] M1：3 角色能查列表 + 详情 + 导出
- [ ] M1：dept_admin / ai_liaison 看不到调用列表（菜单不显 + 后端 403）
- [ ] M1：员工本人调用列表/详情都不可访问
- [ ] M1：员工工作台"出错调用"仅元数据，**无 prompt 内容关键词**
- [ ] M1：流式响应正确 tee 到 audit_log
- [ ] M2：admin 删除 audit 后元审计有记录

---

### 5.F 元审计

#### F.1 目标
admin_action_log 表 + GORM hook 阻止改/删 + 列表查询。**审计的审计**，防止 admin 滥权。

#### F.2 核心能力（5 项）

| # | 能力 | 里程碑 | 决策 |
|---|---|---|---|
| 1 | admin_action_log 表 + GORM hook | M1 | F-D2 |
| 2 | 5 个核心写入点（audit edit/delete/export/token reset/device disable）| M1 | F-D3 |
| 3 | 14 类完整写入点 | M2 | F-D3 |
| 4 | 元审计列表查询页 | M2 | — |
| 5 | 4 档可见性（含部门 admin 看本部门相关）| M2 | F-D4 |

#### F.3 字段设计（关键）

```
admin_action_log {
  id, admin_user_id, admin_role,
  action_type (enum, 14 类),
  target_table, target_id, target_summary,
  reason_enum, reason_text,
  before_snapshot (JSONB),  -- 改前
  after_snapshot (JSONB),   -- 改后
  ip, user_agent, ts, request_id
}
```

**关键决策**：
- **F-D2 双层兜底**：GORM hook + 数据库 user 仅 INSERT/SELECT 权限（不授 UPDATE/DELETE）
- **F-D5 永久保留**（ADR-011）

#### F.4 14 类必写场景
audit edit/delete · export · token reset · device disable/enable/unbind · dept CRUD · role 变更 · budget 改动 · 公告发布/编辑 · skill 发布/下架 · 风险事件规则增删改

#### F.5 验收点
- [ ] M1：试图 UPDATE/DELETE admin_action_log 报错（GORM hook + DB 权限双兜底）
- [ ] M1：5 类核心操作都写元审计
- [ ] M2：元审计页 3 角色 + 部门 admin 本部门相关可见
- [ ] M2：snapshot 字段能还原"改了什么"

---

### 5.G 运维可观测

#### G.1 目标
健康检查 + 异常预警 + 系统配置。

#### G.2 核心能力（7 项）

| # | 能力 | 里程碑 | 决策 |
|---|---|---|---|
| 1 | 健康检查页（网关/DB/Redis/MinIO/上游）| M1 | G-D1: 30s 缓存 + 立即刷新按钮 |
| 2 | 上游单家通断测试 | M1 | ✅ 复用 channel-test |
| 3 | 异常预警（5 条规则）| M2 | G-D2 |
| 4 | 系统参数配置（8 项）| M2 | G-D3 |
| 5 | 错误日志查询页 | M2 | G-D4: audit_log 预设视图 |
| 6 | 实时监控数字卡（QPS/并发/延迟/错误率）| M3 | G-D5 |
| 7 | 性能 P95/P99 仪表 | nice/M3 | — |

#### G.3 异常预警 5 条规则（M2）

1. 短时高频：单员工 1 分钟 > 100 次 → 疑似脚本
2. 超大请求：单 prompt > 50KB → 疑似数据外泄
3. 异地登录：跨省 + 距离 > 1000km
4. 错误暴涨：部门 5 分钟错误率 > 50%
5. 离群模型使用：员工首次用高价模型且单次 token > 10K

每条可在 system_setting 后台开关 + 调阈值。命中写 risk_event（M 域共用）。

#### G.4 系统参数配置（8 项 M2）
- 会话超时（默认 30 min）
- 单请求最大 prompt 长度（默认 100KB）
- 单请求最大附件大小（默认 50MB）
- 单员工 QPS 上限（默认 10）
- 单员工日调用上限（默认 2000）
- 设备审批超时（默认 24h）
- audit 列表分页大小（默认 20）
- presigned URL TTL（默认 5 min）

#### G.5 涉及表
- `system_setting` (M2 NEW)

---

### 5.H 业务沉淀（M3 主战场）

#### H.1 目标
案例 + 业务量上报 + 数字员工占比 KPI。**集团 AI 转型推进方案的命脉数据源**（张主席年度 KPI ≥ 20%）。

#### H.2 核心能力（7 项，全 M3）

| # | 能力 |
|---|---|
| 1 | 案例提交（hmrouter-cli case submit）|
| 2 | 案例审批工作流（草稿/提交/审批/通过/驳回，H-D3）|
| 3 | 案例库展示 + 检索 |
| 4 | 业务量上报（CLI hmrouter-cli kpi report，H-D4 周报节奏）|
| 5 | 业务量聚合（部门/月）|
| 6 | **数字员工占比 KPI**（H-D2: 完成业务量 × AI 节省比例）|
| 7 | 月报 PDF 导出（H-D5）|

#### H.3 关键决策
- H-D1：案例 / Skill / 课程独立但可互链
- H-D2：数字员工占比 = 完成业务量 × AI 节省比例（员工自报）

#### H.4 涉及表
- `case_submission` (M3)
- `business_kpi` (M3)

---

### 5.I 通知协作

#### I.1 目标
inbox 待办 + 通知红点 + SSE 实时推送 + 企微机器人 + 邮件。

#### I.2 核心能力（8 项）

| # | 能力 | 里程碑 | 决策 |
|---|---|---|---|
| 1 | AI 对接员 inbox 待办 | M1 | I-D1: 30s 轮询版 |
| 2 | 顶栏通知铃铛 + 红点 | M1 | — |
| 3 | 站内通知列表 + 已读 | M2 | — |
| 4 | SSE 长连接实时推送 | M3 | — |
| 5 | 企微机器人通知 | M2 | I-D4: 数智营销中心维护 webhook |
| 6 | 邮件通知（仅 2 类）| M2 | I-D5 |
| 7 | 通知模板配置 | M2 | — |
| 8 | 通知订阅 | M3 | — |

#### I.3 通知 6 类（I-D2）
1. 审批待办（设备激活 / 临时配额）
2. 风险事件 (M3)
3. 配额告警（80% / 100%）
4. 系统通知（维护 / 升级 / 上游故障）
5. 个人事项（你的申请被批 / Token 被重置）
6. 公告广播（合规须知 / 运营公告）

**关键决策**：
- I-D3 自动合并（5min 窗口 + 同类 + 同 admin）
- I-D6 90 天自动清理已读

#### I.4 涉及表
- `notification` (M3)

---

### 5.J 自助支持（员工核心阵地）

#### J.1 目标
员工 4 件事：拿 Token + 选模型 + 学 Skill + 学 AI 课程。

#### J.2 核心能力（10 项 + J-11 + J-12）

| # | 能力 | 里程碑 | 决策 |
|---|---|---|---|
| 1 | 员工工作台首页（Token + 模型 + 设备 + 引导）| M1 | J-D1: Token 优先 |
| 2 | Token 展示（mask + 复制按钮直拷明文）| M1 | J-D2 |
| 3 | 客户端配置教程页（M1: WorkBuddy + OpenClaw）| M1 | J-D3/D4: PDF + 视频，ADR-018 |
| 4 | 模型选型建议（用途/价格/场景）| M1 | — |
| 5 | 错误自助诊断（5 条核心规则 yaml，**不暴露 prompt**）| M1 | J-D5/D6 |
| 6 | API 凭证管理 | M1 | ✅ 复用 keys feature |
| 7 | 我的设备页（仅展示折叠区，无操作）| M1 | — |
| 8 | hmrouter-cli 文档静态页 | M1 | J-D8 |
| 9 | 提示词模板收藏（个人 + 部门）| M2 | J-D10 |
| 10 | FAQ 知识库 | M2 | — |

#### J-11. 华美 Skill 中心

| 子能力 | 里程碑 |
|---|---|
| 列表页（卡片 + 标签筛 + 关键词搜）| M1 |
| 详情页（说明 + 截图 + 下载 + WorkBuddy 导入引导）| M1 |
| 上传/发布（数智营销中心独家维护）| M1 |
| 版本管理（v1.0 → v1.1）| M2 |
| 启用/下架（标 deprecated）| M2 |
| 下载次数 + 评分 + 反馈 | M2 |
| 标签分类管理 | M2 |

**J-11 决策锁（重要）**：
- J-11.1 格式 = **Claude Skills 标准**
- J-11.2 维护 = **数智营销中心独家发布**
- J-11.3 发布权限 = 数智营销中心 dept_admin / ai_liaison / group_admin / root；其他部门发布请走 root 授权
- J-11.4 文件存储 = 对象存储抽象（MinIO/NAS）
- J-11.5 审批流 = M1 不做（信任内部）；所有发布写 admin_action_log
- J-11.6 跟案例（H 域）= 不合并，并存，详情页可互链
- J-11.7 WorkBuddy 导入 = 文件级（下载 zip → WorkBuddy 设置导入）
- J-11.8 种子内容 = 数智营销中心已有 ~10 个 skill，M1 直接导入

#### J-12. AI 学习中心

| 子能力 | 里程碑 |
|---|---|
| 课程列表（卡片 + 分类筛）| M1 |
| 课程详情（章节 + 资源）| M1 |
| 资源类型（PDF / 视频 / 外链 / Markdown）| M1 |
| 发布管理（数智营销中心）| M1 |
| 学习进度跟踪 | M2 |
| 评分 + 收藏 | M2 |
| 学习证书 | nice/M3 |

**J-12 跟 J-11 共用底层**（J-12.4）：统一 `enterprise_resource` 表 + `type` 字段区分 skill / course，前端两菜单两入口。

#### J.3 工作台主视图

```
┌─ 我的工作台 ───────────────────────────────────────┐
│ 🔑 你的 API 凭证                                    │
│   sk-...****1234  [📋复制]  [↻重置 Token]           │
│   端点: https://hmrouter.huamei.com/v1              │
│                                                    │
│ 📦 你能用的模型 (按部门权限)                         │
│   [DeepSeek-V3 | 日常聊天 | 💰 | ✅ 正常]            │
│   [GPT-4o     | 复杂推理 | 💰💰💰 | ✅ 正常]          │
│   [Claude-3.5 | 写代码   | 💰💰💰 | ⚠ 抖动中]        │
│                                                    │
│ 🚀 没用过？3 步开始                                  │
│   [1.复制Token] [2.下载WorkBuddy/OpenClaw] [3.看教程]│
│                                                    │
│ 💻 我的设备 (3 台)                                   │
│   · MacBook-Pro-张三  ✅ 已激活  最近 2 小时前        │
│   · 办公-Win-台式机   ✅ 已激活  最近 3 天前          │
│   · 新-iPad           ⏳ 待审   申请于昨天 [催办]     │
│                                                    │
│ ▸ 用量速览 / 出错调用 (3) ⚠ / 最近 30 天             │
│   ⚠ 出错调用：仅元数据 + 自动诊断 (无 prompt 内容)    │
└────────────────────────────────────────────────────┘
顶部 banner: 「本平台调用全量记录用于审计追责」
```

#### J.4 涉及表
- `enterprise_resource` (NEW M1，统一 skill + course)
- `enterprise_resource_version` (NEW M1)
- `enterprise_resource_download_log` (NEW M1)
- `enterprise_resource_progress` (NEW M2，课程进度)

#### J.5 验收点（M1）
- [ ] 员工登录后落工作台，看到 Token + 模型 + 设备 + 引导
- [ ] 一键复制 Token 后能粘贴到 WorkBuddy 配置
- [ ] WorkBuddy 接 hmrouter 调通 LLM 全流程
- [ ] OpenClaw 同上
- [ ] Skill 中心至少 5 个 skill（数智营销中心提供）
- [ ] 学习中心至少 1 门示范课
- [ ] 错误调用折叠区 + 自动诊断不包含 prompt 内容
- [ ] 客户端教程 PDF / 视频可下载/播放

---

### 5.K 安全合规

#### K.1 核心能力（10 项）

| # | 能力 | 里程碑 | 决策 |
|---|---|---|---|
| 1 | 后台 IP 白名单（仅内网/VPN）| M1 | K-D1: 默认内网 + 超管可临时开广域 |
| 2 | 三层权限校验（路由 guard + 菜单 filter + API 后端）| M1 | — |
| 3 | 敏感字段 hash 存储（device_token / 企微 secret）| M1 | — |
| 4 | 附件 presigned URL TTL 5min | M1 | — |
| 5 | 数据保留策略（1 年 + 6 月冷存 + 元审计永久）| M3 | ADR-011 |
| 6 | 离职 30 天可申请删审计（GDPR）| M3 | — |
| 7 | 落盘加密 | nice/M3 | K-D2: DB 字段级 + 对象存储自带 |
| 8 | ~~显示层脱敏~~ | ~~M2~~ | **作废**（ADR-019 严格收窄取代）|
| 9 | 后台访问留痕（login_log）| M2 | K-D3 |
| 10 | CSP/CSRF/XSS（New-API 自带）| M1 | — |

#### K.2 涉及表
- `system_setting` (M2，含 IP 白名单)
- `login_log` (M2 NEW)

---

### 5.L 公告与合规须知

#### L.1 目标
**员工知情权落地**（关 Q11 / BOPEN-3 长期搁置问题）+ 集团/部门级群体广播 + 合规告示统一管控。

#### L.2 核心能力（9 项）

| # | 能力 | 里程碑 | 决策 |
|---|---|---|---|
| 1 | 公告 CRUD（**TipTap 富文本**/受众/生效时间）| M1 | L-D5: 富文本（TipTap）|
| 2 | 公告强制弹窗 | M1 | L-D2: 版本变更触发 |
| 3 | 强制确认勾选（"我已阅读"）| M1 | — |
| 4 | 用户确认记录 | M1 | — |
| 5 | 工作台顶部 banner（兜底文案 + 未确认时切换）| M1 | L-D3 |
| 6 | 公告历史 + 检索 | M1 | L-D6 |
| 7 | 公告版本管理（V1→V2 重新弹）| M1 | L-D2 + 合规须知年度重新确认 |
| 8 | 受众范围细分（全员/某部门/某角色）| M2 | L-D7 |
| 9 | 紧急公告（红色横幅）| M2 | L-D9 |

**3 类公告**（L-D1）：
- **合规须知**：强制弹窗 + 强制勾选；超管 + 集团 admin 发
- **运营公告**：弹窗一次后可"不再提醒"；超管 + 集团 admin + 部门 admin（仅本部门）
- **系统通知**：仅顶栏铃铛红点；仅超管发

**关键决策**：
- L-D4：不确认者阻断后台（API 调用不影响）+ 5 天后通知部门 admin
- L-D8：发布流程 = 起草 → 预览 → 发布
- L-D10：跟通知中心独立；系统通知类可联动

#### L.3 工作台 banner 兜底文案
> 「本平台调用全量记录用于审计追责，请规范使用」

#### L.4 涉及表
- `announcement` (NEW M1)
- `user_announcement_ack` (NEW M1)

#### L.5 验收点（M1）
- [ ] 超管发"全量记录用于审计"合规须知
- [ ] 全员登录被强制弹窗 + 必须勾"我已阅读"
- [ ] 工作台顶部 banner 显示
- [ ] 不确认者 5 天后部门 admin 收到 inbox 通知
- [ ] 公告改 V2 后所有人重新弹

---

### 5.M 风险事件（M3）

#### M.1 目标
软风控（observe-only，ADR-016）：异步扫 audit_log → 命中规则 → 写 risk_event → 通知合规专员。**不拦截、不告警员工、不影响调用链路**。

#### M.2 核心能力（10 项，全 M3）

| # | 能力 | 决策 |
|---|---|---|
| 1 | 敏感词规则库（系统内置 + 企业自定义）| M-D4 |
| 2 | 正则规则（身份证/手机号/项目代号）| — |
| 3 | 异步 worker 扫 audit_log | M-D1: Redis stream + < 1min 延迟 |
| 4 | risk_event 表 | — |
| 5 | 风险等级（高/中/低）| M-D3 |
| 6 | 风险事件列表（合规专员入口）| — |
| 7 | 推送合规专员（inbox + 企微机器人）| 高=即时 / 中=仅 inbox / 低=日终报告 |
| 8 | 不告警员工 / 不影响调用 | ADR-016 |
| 9 | 规则编辑器（合规专员维护）| M-D4 |
| 10 | 规则命中率统计 | nice |

**关键决策**：
- M-D2：仅扫 prompt + response + 附件文件名（不做 OCR，符合 ADR-016 拒绝豆包模块 4）
- M-D5：状态机 new → acknowledged → investigating → resolved/false_positive
- 内置规则改：仅超管；自定义规则：合规专员可加改删

#### M.3 涉及表
- `risk_rule` (NEW M3)
- `risk_event` (NEW M3)

---

## 6. 全局非功能需求

### 6.1 性能

| 指标 | M1 目标 | 全推目标 |
|---|---|---|
| 后台页面加载 P95 | < 1s | < 800ms |
| 仪表盘 API P95 | < 500ms | < 300ms |
| 调用列表查询 P95 | < 800ms | < 500ms |
| 单次 LLM 调用网关延迟 P99 | < 100ms | < 50ms |
| 异步附件写入失败率 | < 1% | < 0.1% |

### 6.2 安全
- 所有 admin 操作必须有 admin_action_log
- 附件下载用 presigned URL（5 min TTL）
- 敏感字段（device_token、企微 secret）DB 存 hash
- **后台仅内网访问 + IP 白名单**（K-D1）
- 三层权限校验（路由 guard / 菜单 filter / API 后端校验）
- **调用内容严格 3 角色可见**（ADR-019）

### 6.3 可用性
- 网关单进程双副本（生产期）
- 调用记录写入异步 + 失败队列重试
- 不留"直通"后门（网关挂了请求拒绝，不允许绕过）
- 数据库主从

### 6.4 i18n
- 复用原 New-API i18next 框架
- M1 仅 zh + en
- 翻译键加在 `web/default/src/i18n/locales/{zh,en}.json`

### 6.5 浏览器兼容
- Chrome / Edge 最新两版本
- 不支持 IE
- 移动端 M1 不做，M3 看板 / 工作台做响应式

### 6.6 数据保留与归档（ADR-011）
- audit_log + audit_attachment：1 年保留
- 0-6 月：热存储；6-12 月：冷存储；> 12 月：自动删除（写元审计）
- 元审计 admin_action_log：永久
- 导出文件：7 天后自动清理
- 业务数据（department / device / service_account 等）：永久软删
- GDPR：员工离职后 30 天内可申请删除其全量审计（超管审批 + 元审计）

---

## 7. 数据流速查

```
员工 agent 工具 (WorkBuddy/OpenClaw/...) → hmrouter API
   ↓
middleware 链：
  TokenAuth (原)
  → DeviceTokenGuard (NEW B-D5: 双层校验) [失败 401]
  → DeptModelACL (NEW C: 部门-模型可见性) [失败 403]
  → ModelRateLimit (原 + 个人限流 D-D2)
  → Distribute (原: 选 channel, C-D3 路由策略)
  → DeptBudgetGuard (NEW D, M2 enforce)
  → AuditRecorder (NEW E-D1: 元数据同步)
   ↓
relay 转发到上游 LLM
   ↓
响应 → AuditRecorder 异步写：
   ├─ audit_log (元数据 + 文字, 同步)
   ├─ audit_attachment (附件元数据, 异步)
   ├─ 对象存储 (附件原件, 异步, 路径按时间分层)
   └─ Redis sliding window (C-D5 模型实时状态)

异步 worker (M3):
   audit_log → risk_rule 匹配 → risk_event → 通知合规专员

后台查询:
   audit_log → 看板/个人页/列表/详情/导出
   audit_log → 错误诊断 (仅元数据 + 推断)
   admin_action_log → 元审计页
   department / department_budget → 部门管理
   device → 设备白名单页
   announcement / user_announcement_ack → 公告系统
   enterprise_resource → Skill / 课程
```

---

## 8. 验收标准

### 8.1 M1 验收（5/31 工作组首次会议演示）

#### A 身份与组织
- [ ] 企微扫码登录可用，6 角色登录后落地不同首页
- [ ] 9 部门预录种子数据正确
- [ ] 员工目录搜索/筛选 OK
- [ ] 调岗后历史 audit 仍归原部门

#### B 凭证与访问控制
- [ ] CLI activate 流程跑通（含 24h/48h 升级 + 作废）
- [ ] sk-xxx 复制到非白名单机器立返 401（核心安全 B-D5）
- [ ] Token 重置立即失效（无宽限期）

#### C 模型与上游
- [ ] 3 家上游配好（DeepSeek 必装，OpenAI/Claude 凭付款进度）
- [ ] 金融三部门员工调 GPT-4o 立返 403
- [ ] 工作台显示模型清单 + 实时状态

#### D 用量限流与成本
- [ ] 双维度看板正确
- [ ] 个人限流 QPS 11 / 日 2001 立返 429
- [ ] 3 种 Excel 模板能导出

#### E 调用记录
- [ ] 每次调用都有 audit_log 记录
- [ ] **3 角色能查列表/详情；其他角色 403**
- [ ] **员工自己也无法在后台看自己内容**
- [ ] 错误诊断卡片不含 prompt 内容
- [ ] 流式响应正确 tee

#### F 元审计
- [ ] admin_action_log 改/删立返错误（双层兜底）
- [ ] 5 类核心操作都写

#### G 运维可观测
- [ ] 健康检查页 5 大组件 + 上游全绿

#### J 自助支持
- [ ] WorkBuddy 接 hmrouter 端到端调通
- [ ] OpenClaw 同上
- [ ] Skill 中心 ≥ 5 个种子 skill
- [ ] 学习中心 ≥ 1 门示范课
- [ ] 工作台一键复制 Token 跑通

#### K 安全合规
- [ ] 内网 IP 才能访问后台

#### L 公告与合规须知
- [ ] 合规须知发布 + 全员强制确认
- [ ] 工作台顶部 banner 显示

#### 演示场景验收
- [ ] 在 AI 转型小组 + 张主席旁听场景下，能用真实 WorkBuddy / OpenClaw 调通 hmrouter
- [ ] 14 个演示账号（9 一把手 + 张远捷 + 用户 + AI 对接员 + 合规专员 + 超管）能切换登录
- [ ] 张远捷登录能查任意员工调用明文（验证 ADR-017 + ADR-019）

### 8.2 M2 验收（金融试点）
- [ ] 多模态：图片 / 文档调用全程记录
- [ ] 群晖 NAS WebDAV 接入
- [ ] 部门预算 observe 模式跑通 + 阈值告警
- [ ] 临时配额审批流跑通
- [ ] 服务账号 CRUD UI 完整可用
- [ ] 设备白名单 UI 录入流程完整
- [ ] admin 编辑/删除 audit 流程跑通 + 元审计有记录
- [ ] 元审计列表查询页可用
- [ ] 异常预警 5 条规则跑通
- [ ] 公告紧急横幅可用
- [ ] 部门 admin 后台访问留痕

### 8.3 M3 验收（月度通报会）
- [ ] HR 同步定时跑（北森系统对接）
- [ ] 离职员工自动停 token + 设备
- [ ] 案例提交流跑通
- [ ] 业务量上报 + 数字员工占比 KPI 出数
- [ ] SSE 实时推送
- [ ] 风险事件软风控跑通（敏感词命中告警合规专员）
- [ ] 月报 PDF 导出
- [ ] 数据冷热分层 + 自动清理 + GDPR 删除流程

---

## 9. 待决策与开放问题

### 9.1 已关闭（S-003 决策）
- ~~Q11 员工知情权~~ → 解决（ADR-014 公告强制确认）
- ~~Q16 模型替换是否允许偷换~~ → 解决（C-D6 严禁）
- ~~BOPEN-1 导出审批~~ → 解决（不做审批，导出动作写元审计即可）
- ~~BOPEN-2 部门 admin 能否删 audit~~ → 解决（ADR-019 部门 admin 看不到 audit 内容，更不能删）
- ~~BOPEN-3 员工知情权~~ → 解决（ADR-014）
- ~~DOPEN-3 复制会话审计~~ → 解决（ADR-019 仅 3 角色能进详情，复制内容自然受控）
- ~~DOPEN-2 附件预览渲染~~ → 解决（S-003）：M1 仅**图片直显**；PDF/Word/音视频**仅下载**；M2 加 PDF 在线渲染 + 音视频内嵌
- ~~DOPEN-4 登出/Session 过期~~ → 解决（S-003）：登出 = 头像菜单"登出"→清 session→跳 `/login`；Session 过期(401) = **弹模态框 + "重新登录"按钮**（不直接跳，避免丢上下文）
- ~~DOPEN-5 i18n 切换位置~~ → 解决（S-003）：放**头像菜单内**（不占顶栏空间）

### 9.2 仍开放
- **DOPEN-1**：仪表盘"成本估算"按什么价格？倾向用 New-API model_ratio 表
- **TOPEN-1**：M3 全文搜走 ES 还是 PG `tsvector`
- **TOPEN-2**：附件预览缩略图策略
- **TOPEN-3**：billingexpr 编辑器是否需要"测试"按钮跑过去 7 天数据
- **Q12**：跨境合规 — 教育/营销板块要不要法务再确认（已部分解决 — 仅金融三部门禁境外）
- **Q18**：上游故障 fallback 策略（C-D3 已决多级回退，具体细节待 M2 实施时定）
- **Q19**：计费单位
- **Q23**：出网防火墙白名单
- **Q25**：网关挂了是否留直通后门（倾向不留）

---

## 10. 与 PLAN 的对应

| PLAN 章节 | 本 PRD 章节 |
|---|---|
| §1.5 P0 双维度统计 | §5.D |
| §1.5 P0 全模态调用记录 | §5.E |
| §2 AP1-AP27 | §1.4 摘要 + 各域引用 |
| §5 中间层调用记录器 | §5.E + §7 数据流 |
| §6 Agent 接口 CLI | §5.B 设备激活 + §5.H 案例/KPI 上报 |
| §7 设备白名单 | §5.B |
| §10 数据模型 schema | §5.X 各域涉及表（schema 见 PLAN）|
| §11 路线图 M1-M3 | §8 验收标准 |

| 本 PRD 与 ADR 的对应 |
|---|
| ADR-013 合规审计专员 → §2 第 3 个角色 |
| ADR-014 公告与合规须知 → §5.L |
| ADR-015 ~~显示层脱敏~~（superseded） → §5.K K-D8 注 |
| ADR-016 风险事件软风控 → §5.M |
| ADR-017 集团 admin 权限上提 + 张远捷 → §2 group_admin 行 + §3 矩阵 |
| ADR-018 Agent 工具开放策略 → §1.1 + §5.J J-D3 |
| ADR-019 调用内容三角色可见 → §3 矩阵铁律 + §5.E E.1 |
