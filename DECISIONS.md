# 决策日志（ADR · Append-Only）

> 这里记录**已经拍板的、不应再讨论**的方案级决策。
> Append-only：旧条目不修改、不删除。决策反转 = 加新条目并标记 supersede。
> 来源：PLAN.md AP1-AP27、版本演进 v0.1-v0.10、关键讨论结论。

---

## ADR-001: 选 New-API 而非 LiteLLM / 自研 (2026-05-14)

**背景**：需要 LLM 网关基座，候选：New-API / LiteLLM / Higress + WASM / 自研。

**决策**：采用 **New-API**（QuantumNous fork）。

**理由**：
- 活跃维护（One-API 几乎停更）
- OpenAI 兼容协议齐全
- 31 家上游 adapter 现成
- Key/用户/配额/UI 完整
- Go 性能好、单进程部署简单

**权衡**：
- LiteLLM Python 改造容易但 UI/多租户弱
- 自研 3-6 周起、协议适配/流式/Token 计数都要重做

**实现影响**：fork 进自有 GitHub，新增代码集中在 `enterprise/` 目录避免冲突。

---

## ADR-002: DLP 移出本期工程范围 (2026-05-14)

**背景**：v0.1 设计在网关中间层做内容脱敏。

**决策**：DLP 整体**搁置**，归档到 [DLP-deferred.md](DLP-deferred.md)，独立窗口推进。

**理由**：识别出 v0.2 的结构性问题：
- 在网关脱敏破坏上游 prompt cache（成本 ×3-10）
- SSE 流式实时拦截工程上无完美解
- 跨境合规边界更高优先级

**取代**：员工通过 Agent 工具调用 → 前置 skill 脱敏 → 调网关。skill 设计在独立 Claude 窗口推。

**实现影响**：本工程范围内，网关只做"全量记录"，不改写、不阻断。

---

## ADR-003: 全模态会话记录 (2026-05-14, v0.5)

**背景**：用户要求"像聊天记录一样，员工发的每一次内容 + 模型回复全部记录"。

**决策**：中间层 = **会话记录器**（AP19）。
- 全量记录 prompt + response + 所有附件（图/文档/音/视频）
- 只录不改、只录不挡
- 二进制走对象存储，DB 只存元数据 + 文字（AP20）
- 存储抽象层：MinIO（开发） + 群晖 NAS WebDAV（生产）（AP21）

**取代**：之前模糊的"审计储存"概念。

**实现影响**：
- 新增 `audit_log` `audit_attachment` `export_task` 三张表
- 新增 `enterprise/middleware/audit_recorder.go`
- 新增 `enterprise/service/audit_storage.go` + 2 个 Storage 实现
- 多模态分阶段开放（M1 文字 / M2 图文档 / M4 音视频）

---

## ADR-004: audit_log 可改可删，但写元审计 (2026-05-14, v0.6)

**背景**：完整不可改 vs 灵活运营 的权衡。

**决策**：
- audit_log 允许 **超管 / 集团 admin** 改 / 删
- 任何修改/删除 **必须填原因** 并写入 `admin_action_log`
- `admin_action_log` 本身不可改不可删（GORM hook 强制）

**理由**：
- 完全不可改 → 隐私事故无法处置
- 完全自由改 → 审计失去价值
- 折中：可改但留痕，元审计本身是底线

**实现影响**：
- 所有 admin 写操作走 hook 自动落 `admin_action_log`
- 编辑/删除 UI 强制填"原因"
- 元审计页面 `/enterprise/admin-actions` 仅查询，无写入

---

## ADR-005: 设备白名单制 (2026-05-14, v0.6)

**背景**：如何识别"是哪台电脑"，防止跑路员工继续使用。

**决策**：**白名单制**（AP23）。
- admin 后台预先入白：hostname + MAC + 关联员工
- Agent 首启走 `auth login` 流程：收集本机 hostname + MAC → 匹配 → 颁发 device_token
- 所有 API 校验 device_token（中间件 `DeviceTokenGuard`）
- Token 过期/吊销/未匹配 → 401

**取代**：自助注册模式（员工首启自动登记，被否决）。

**实现影响**：
- 新增 `device` 表（hostname、mac、status、device_token、assigned_user_id）
- 新增 `enterprise/middleware/device_token_guard.go`
- 新增 `enterprise/controller/device.go` + `/api/agent/activate` 端点
- 设备首次入白走 IT/HR 流程（M1 演示用 SQL 手工预录 5-10 台）

---

## ADR-006: Agent 接口走 CLI，MCP 缓议 (2026-05-14, v0.6)

**背景**：Agent ↔ 后台接口选 MCP server / 自定义 REST / CLI。

**决策**：一期走 **CLI 工具 `hmrouter-cli`**（AP22）。

**理由**：
- CLI 实现成本低 1 个数量级
- agent 通过 shell 调用，无协议复杂度
- 后期需要 MCP 化时把 CLI 包一层即可
- 跟用户基础匹配（Cherry Studio / Cursor 等都能 shell out）

**实现影响**：新增 `cli/` 目录 + 6 个子命令（auth / usage / chats / case / kpi / devices）。

---

## ADR-007: 前端复用 web/default 而非独立工程 (2026-05-14, v0.7)

**背景**：v0.3 计划独立 React 工程（hmrouter-admin）。

**决策**：**废弃独立工程**（旧 AP12 废）。改为**在 `web/default/src/features/` 下加企业子域**（AP12）。

**理由**（基于全项目知识图谱新发现）：
- features/ 已天然按业务域目录隔离，新增子域与 upstream 同步零冲突
- 169 个 shadcn 组件 + 6 语言 i18n + TanStack Router/Query/Zustand 全部现成
- 单一登录态、单一菜单、用户认知负担小
- 工程量节约 1.5+ 天

**取代**：v0.3 AP12 旧版（独立工程）。

**实现影响**：
- 不创建 hmrouter-admin 项目
- 在 `web/default/src/features/` 加 `enterprise/` `audit/` `devices/` `departments/` `service-accounts/` `enterprise-export/` 等子域

---

## ADR-008: 部门预算复用 billingexpr 引擎 (2026-05-14, v0.7)

**背景**：部门预算的灵活计算（不同部门不同公式）需要计算引擎。

**决策**：**复用 `pkg/billingexpr` 表达式引擎**（AP26），不写专门 Go 计算逻辑。

**理由**（基于全项目知识图谱新发现）：
- pkg/billingexpr 已生产验证（compile.go / run.go / settle.go / round.go）
- 规则可在管理界面热配置
- 金融部 vs 数智营销中心可设不同公式
- 节约开发量 + 灵活度高

**实现影响**：
- `enterprise/service/budget_eval.go` 调 billingexpr 求值
- `department_budget` 表 `formula` 字段存表达式字符串
- `features/departments/budget/` 前端做表达式编辑器（语法高亮 + 校验 + dry-run）

---

## ADR-009: 部门预算分维度 + 统计双维度 (2026-05-14, v0.9)

**背景**：用户提出"既要按部门也要按个人统计"，最初的 AP14 容易被误读为"个人也无统计"。

**决策**：**预算与统计分维度处理**（AP14 修订加注释）。
- **预算/扣费** = 仅部门维度（简化心智，财务以部门结算）
- **统计/查询/导出** = **始终双维度**（部门 + 个人）

**实现影响**：
- audit_log 表索引保留 `idx_user_ts` + `idx_dept_ts` 双向
- 看板支持双维度切换
- 个人用量页 `/enterprise/users/:id` 是必须页
- Excel 导出支持"部门月报"和"个人明细"两种模板

---

## ADR-010: 单一前端工程 + 同一菜单分组（2026-05-14, v0.10）

**背景**：原 New-API 后台保留给超管 vs 企业后台的菜单整合方式。

**决策**：**单一前端 + 同一左侧菜单 + 分组分隔**。
- 上方"企业域"，下方"系统域"，中间分隔线
- 按角色 filter：普通员工只看企业域；超管两域全显示
- 不做顶导栏 tab 切换、不做独立子域名

**理由**：
- 单一登录态，认知负担小
- 路由 guard + 菜单 filter 双重控制
- 跟 ADR-007 复用前端工程一致

**实现影响**：
- `web/default/src/components/layout/Sidebar.tsx` 加分组逻辑
- 不新建独立路由前缀

---

## ADR-011: 审计数据保留 1 年 + 6 月冷存 (2026-05-14, v0.10)

**背景**：审计数据无限保留 vs 合规最低 6 月。

**决策**：
- **0-6 月**：热存储（PostgreSQL 主表 + 在线对象存储）
- **6-12 月**：冷存储（PostgreSQL 按月分区归档表 + 对象存储分级到低频访问层）
- **> 12 月**：自动批量删除（DELETE 写 admin_action_log "自动清理"）
- **元审计 admin_action_log 永久保留**
- **导出文件 7 天后自动从对象存储清理**
- **GDPR/隐私**：员工离职后 30 天内可申请删除其全量审计（超管审批 + admin_action_log）

**实现影响**：
- 新增 cron 任务 `enterprise/service/audit_archive.go`（M2/M3 实现）
- audit_log 按月分区
- 对象存储用生命周期规则自动分级

---

## ADR-012: 部门预算先 observe 跑 1-2 个月再切 enforce (2026-05-14, v0.3 起就有，本次正式归档)

**背景**：部门预算上线就硬阻断有大风险——预算估算错就全部门停摆，恢复也慢。

**决策**：**双轨上线**（AP15）。
- **第一阶段 observe**：超额仅记录 + 阈值告警（80% / 100%），不阻断
- 跑 1-2 个月，观察实际消耗 vs 预设预算的拟合度
- 根据数据校准预算公式（billingexpr 表达式）
- **第二阶段 enforce**：按部门**灰度**切到硬阻断（超额拒绝 + HTTP 402）
- 每个部门切换 enforce 前再次校验最近 30 天消耗 < 预算的 80%

**理由**：
- 预算估算错误是系统性风险，远大于"短期超额"的成本风险
- 灰度切换让出问题时影响面可控
- 配套 billingexpr 让运营可以热配置公式而不是改代码

**实现影响**：
- `department_budget.enforce_mode` 字段：`observe` / `enforce` 二值
- 默认 `observe`，admin 后台手工切 `enforce`（带原因 + admin_action_log）
- M1-M3 全部跑 observe；M4+ 才开始按部门灰度切

---

## ADR-013: 加"合规审计专员"独立角色（2026-05-15）

**背景**：豆包方案启发，对外 SaaS 网关常见"三权分立"。我们当前 5 角色（超管/集团/部门/AI 对接员/员工），admin 既能改系统配置又能改/删 audit_log，存在权力集中。

**决策**：新增第 6 个角色 **合规审计专员（compliance_auditor）**：
- 跨部门只读所有 `audit_log` + `admin_action_log` 元审计（看明文，不脱敏）
- 不能改系统配置、不能改/删 audit_log、不能管设备/部门/Token
- 可导出审计报告

**理由**：
- 未来真有合规岗位/法务介入时直接启用
- 跟 admin 形成制衡（admin 改/删 audit 后审计专员能立即查到元审计）
- 工作量极小（按 AP27 扩 User.Role 枚举即可）

**实现影响**：
- `User.Role` 枚举加 `RoleComplianceAuditor`
- 权限矩阵 PRD §3 + PAGES §3 加一列
- 元审计页 P-M3-02 的可访问角色加合规审计专员
- 不改 ADR-004（admin 仍可改/删，但有审计专员盯着）

---

## ADR-014: "公告与合规须知"模块 M1 加入（2026-05-15）

**背景**：员工知情权（Q11 / BOPEN-3）长期搁置；豆包方案的"公告 + 合规须知"正好补此漏。员工不知道"全量记录"会造成法务/HR 困扰。

**决策**：M1 新增**公告与合规须知**模块（功能域 L）：
- 后台：超管/集团 admin 发布公告（生效时间 / 受众范围 / 强制确认）
- 工作台：员工首次登录或公告变更时**强制弹窗 + 必须确认勾选**才能继续使用
- 工作台顶部常驻 banner：「本平台调用全量记录用于审计追责」
- 公告历史可查（员工 / admin 都可查）

**理由**：
- 一次性解决员工知情权合规问题（Q11 + BOPEN-3 一起关）
- 解决 HR / 法务沟通成本
- 工作量小（约 0.4d）

**实现影响**：
- 新增表 `announcement` + `user_announcement_ack`（员工确认记录）
- M1 加任务：1 后端 controller + 1 前端 feature + 工作台 banner
- M1 表数 13 → 15

---

## ADR-015: 调用记录显示层脱敏（M2，2026-05-15）  [SUPERSEDED by ADR-019]

**背景**：豆包方案启发。部门 admin / AI 对接员看本部门 audit 时，员工的 prompt 里可能包含身份证 / 手机号 / 银行卡，无差别明文展示有泄密二次扩散风险。

**决策**：M2 实现**显示层正则脱敏**（不影响存储）：
- 数据库存原文（用于审计追溯）
- 前端展示时按角色 mask：
  - 员工看自己：明文
  - 部门 admin / AI 对接员看本部门：身份证/手机号/银行卡/邮箱 mask（如 `138****5678`）
  - 集团 admin / 超管 / 合规审计专员：明文
- 脱敏规则可在系统配置里调整

**理由**：
- 不影响 AP19（中间层不改不挡，存储原文）
- 仅显示层逻辑，工程上简单
- 跟 ADR-014 公告里写"部分管理员看到内容是脱敏的"形成知情权闭环

**实现影响**：
- M2 加任务：脱敏规则配置 + 前端按角色判断展示
- 不改任何后端 API 返回结构

---

## ADR-016: 风险事件软风控（M3，2026-05-15）

**背景**：豆包方案核心模块 4 是"敏感词拦截 + OCR 风控 + 工单闭环"。这跟我们 ADR-002 + ADR-003 + AP19 冲突（不挡不改）。但完全无任何风险信号也不合理。

**决策**：M3 实现**软风控（observe-only）**：
- 异步在 audit_log 写入后做敏感词正则匹配（不影响调用链路）
- 命中后写一条 `risk_event` 记录（关联 audit_log_id + 命中规则 + 风险等级）
- 推送给合规审计专员（站内 inbox + 企微通知）
- **不拦截、不告警员工、不影响调用**
- 合规专员人工跟进（约谈 / 整改走线下，不做工单 SLA 系统）

**取代**：拒绝豆包模块 4（拦截 / OCR / 工单闭环）

**理由**：
- 保住 AP1 + AP19（链路上不改不挡）
- 给合规岗位最低限度的风险感知
- OCR 文档解析延迟太大不做
- 工单 SLA 系统对 2000 人规模过重，企微沟通即可

**实现影响**：
- M3 新增表 `risk_rule`（敏感词规则）+ `risk_event`（命中事件）
- M3 新增异步 worker：扫描新 audit_log 跑规则匹配
- 新增页面：风险事件列表（合规审计专员入口）
- 不改任何 M1/M2 已有功能

---

## ADR-017: 集团 admin 权限上提 + 张远捷角色定位（2026-05-15）

**背景**：S-003 用户澄清，张远捷（副总裁，张主席之子）会跟监察审计室一起查违规/泄密，要看得很细。他既需要副总裁视角（高位全局），又需要审计深度（明文 + 元审计）。但 A-D5 决定 user.role 单字段，不允许多角色。

**决策**：
1. 张远捷分配 `group_admin` 角色
2. **集团 admin 权限上提**：增加"查 audit 明文（不脱敏，跨部门）+ 访问元审计 admin_action_log"两项能力
3. 监察审计室人员仍走 `compliance_auditor` 角色（专职做风险事件跟进，无系统配置权限）
4. 两类角色并存不冲突：
   - 集团 admin = 高位全权（含审计明文）+ 系统配置
   - 合规审计专员 = 专职审计（明文 + 元审计 + 风险事件，但不能改系统）

**取代/微调**：微调 ADR-013（合规审计专员仍独立存在，但集团 admin 也能查明文，不再是合规审计专员独占）

**实现影响**：
- ADR-015 显示层脱敏的角色矩阵更新：集团 admin 看明文（之前推荐它看脱敏，本 ADR 改）
- 集团 admin 在 audit 列表/详情、元审计页都有访问权
- 合规审计专员仍是必要角色（专职岗位 + 制衡）

---

## ADR-018: Agent 工具开放策略（2026-05-15）

**背景**：S-003 用户澄清核心战略：API 控制权在 hmrouter，Agent 工具（WorkBuddy / OpenClaw / QClaw / AutoClaw / Cherry Studio / Cursor / ...）可随时替换。意义是企业不被 agent 工具厂商绑架，同时所有 LLM 调用必经 hmrouter 因而审计可控。

**决策**：客户端策略 = **集团推荐 + 通用支持 + 用户自选**三层：
1. **集团推荐**（M1 必做，PDF + 视频教程）：WorkBuddy / OpenClaw / QClaw / AutoClaw
2. **通用支持**（M1 列出基础说明 + 一键复制配置）：Cherry Studio / Cursor / Continue.dev / Python SDK / curl
3. **未列入但兼容**：凡 OpenAI 兼容协议的客户端均可接，工作台说明端点

**取代**：之前 J-D3 的"M1 仅 WorkBuddy 一家"决策

**理由**：
- 跟产品定位匹配（算力主权 + Agent 自由）
- 防止 agent 工具厂商绑架
- 即便 WorkBuddy 涨价或停服，集团有备选
- 数智营销中心维护的 Claude Skills 在多家 agent 间通用

**实现影响**：
- J-11 Skill 中心详情页加"兼容性"标签（数智营销中心发布时手动勾）
- WorkBuddy / OpenClaw 等 4 个推荐工具的 PDF + 视频教程由用户准备，hmrouter 只做下载页
- 教程页 UI 分三类：推荐 / 通用 / 自定义

---

## ADR-019: 调用内容严格三角色可见 + 元数据宽授权（2026-05-15）

**背景**：S-003 用户严格收窄调用内容访问权。调用内容是泄密风险最高的数据，必须严格控制；同时为不影响日常运维（错误排查、用量查看），元数据维度可放宽。

**决策**：

### 调用内容（prompt + response + 附件）
仅 3 角色可见：
- 超管 (root)
- 集团 admin (group_admin) — 含张远捷
- 合规审计专员 (compliance_auditor) — 监察审计室

部门 admin / AI 对接员 / 员工 (含员工本人) **均不可在 hmrouter 后台看到任何调用内容**。员工自己想看历史对话 → 去 WorkBuddy/OpenClaw 等客户端查。

### 调用元数据（时间 / 模型 / 状态码 / token 数 / 设备 / 错误推断）
可下放：
- 上述 3 角色：跨部门全见
- 部门 admin / AI 对接员：本部门员工的元数据
- 员工：自己的元数据（用于自助排错，但不含 prompt 关键词）

**关键约束**：错误诊断卡片的"自动推断原因" **不能暴露任何 prompt 内容关键词**。诊断引擎仅基于错误码 + token 计数 + 系统状态推断。

### 元审计 admin_action_log（不含调用内容）
- 上述 3 角色：全见
- 部门 admin：本部门相关元审计（本部门员工的 token 重置 / 设备改动等）
- AI 对接员 / 员工：不可见

### 不引入"内容查看临时审批"流
保持简单，需要看内容就升级到 3 角色。审批流过重。

**取代 / 被取代**：
- **取代 ADR-015**（显示层脱敏作废，被严格收窄取代）
- 微调 ADR-013（合规审计专员仍是必要角色）
- 微调 ADR-017（集团 admin 已含明文权限，本 ADR 进一步明确仅 3 角色）

**实现影响**：
- PRD §3 权限矩阵全表重写
- PAGES 菜单"调用记录" 仅 3 角色显示
- 员工工作台仅展示元数据，不展示内容
- AI 对接员/部门 admin 看员工详情：仅元数据 + 异常推断 + 操作（重置 token 等）
- 错误诊断 yaml 规则：仅基于元数据，禁止读 prompt
- 三层错误诊断梯度：员工自助 → 对接员协助（仅元数据）→ 升级 3 角色看内容

---

## 模板（追加新 ADR 时复制）

```markdown
## ADR-NNN: <标题> (YYYY-MM-DD, vX.Y 可选)

**背景**：

**决策**：

**理由**：

**取代/被取代**：（可选，supersedes ADR-XXX 或 superseded by ADR-YYY）

**实现影响**：
```
