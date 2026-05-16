# Claude 会话入口 — 必读

> 如果你是新会话第一次进来，按本文档**从上到下**读完，再处理用户的请求。

---

## 1. 你正在做什么

**项目**：hmrouter — 为华美国际投资集团 2000 员工建一个 LLM API 中转网关 + 管理后台 + Agent CLI 工具。

**项目地位**：集团 AI 转型推进方案（2026.05）的关键基础设施。无 hmrouter，则张主席的年度 KPI（数字员工占比 ≥ 20%）无法度量。

**做法**：fork [QuantumNous/new-api](https://github.com/QuantumNous/new-api) → 加 `enterprise/` 模块（后端） + `web/default/src/features/enterprise*/` 子域（前端） + `cli/` 工具。原代码改动收敛在 4 处。

**不做**：脱敏 / DLP（已挪到 [DLP-deferred.md](DLP-deferred.md)，独立窗口讨论）。

---

## 2. 5 分钟开局必读顺序

1. **本文档**（CLAUDE.md）—— 你正在读
2. **[STATE.md](STATE.md)** —— ★ **当前状态**（在哪个里程碑、阻塞什么、上次 session 做完什么）
3. **[TASKS.md 燃尽快报章节](TASKS.md)** —— ★ **进度量化**（M1 剩多少 / 每日速度要求 / 阻塞老化）
4. **[PLAN.md §0-§2](PLAN.md)** —— 项目缘起、AP 原则 22 条（编号至 AP27，AP2/3/4/9/10 已移 DLP-deferred）
5. **[knowledge-graph/INDEX.md](knowledge-graph/INDEX.md)** —— New-API 实际架构基线
6. （按需）**[PRD-admin.md §1-§4](PRD-admin.md)** —— 后台范围、角色、菜单
7. （按需）**[ARCHITECTURE.md](ARCHITECTURE.md)** —— 改造点 + 数据流

读完应该能回答：
- 我们现在在哪个里程碑（M0/M1/M2/...）？
- 还剩多少天 / 多少任务？平均每天需完成几个？
- 当前阻塞是什么？有阻塞老化 ≥ 3 天的吗？
- 上次会话做了什么？下个动作是什么？

如果回答不出，再读一遍 STATE.md + TASKS.md。

---

## 2.5 每会话开局必做（防进度乱）

读完上面文档后，**主动给用户报告一份"开局快报"**，3 段话以内：

**模板**：
```
开局快报（S-NNN）

📊 进度：M1 距 deadline X 天，38 任务完成 N / 38 (P%)，平均每天需 X.X 个
🚧 阻塞：[列还在的 + 标老化 > 3 天的]
🔥 风险升级：[如果有任务延期 / 阻塞老化，建议升级动作]
▶️ 下一步：根据 STATE.md "下一步" 推 1-3 个候选动作给用户挑
```

**示例**：
```
📊 进度：M1 距 deadline 17 天，38 任务完成 0 / 38 (0%)，平均每天需 2.4 个
🚧 阻塞：B1 (Docker 等用户 OK, 0 天) / B2-B4 (外部账号, 0 天)
🔥 风险升级：无（一切都是 0 天，刚拉起）
▶️ 下一步：① 启 Docker 让本地能跑（解 B1）② 你那边催进 B2-B4 ③ 同时我先做 M1-T01/T02/T03（git fork）
```

**触发更严重的报警**：
- 任何阻塞老化 ≥ 3 天 → 🟡 标黄 + 主动给"升级路径"建议
- 任何阻塞老化 ≥ 7 天 → 🔴 标红 + 强烈建议"启用 Plan B"或缩 scope
- M1 燃尽偏离（剩余天 × 每天需做数 < 剩余任务）→ 主动建议"砍 scope"或"加班"

不要等用户问。**每个新会话开局必做这一步**。

---

## 3. 不可违反的硬约束（AP 原则速查）

> 完整说明在 [PLAN.md §2](PLAN.md)。下面是会话中**最容易踩坑**的几条。

| # | 约束 |
|---|------|
| **AP1** | 网关不在请求链路上改写 payload（保护 prompt cache + SSE 体验）|
| **AP5** | 上游按"部门 + 模型"双维度路由：金融板块禁境外，其他可用 GPT/Claude |
| **AP11** | 后端单进程扩展 New-API，不拆微服务 |
| **AP12** | 前端在 web/default/src/features/ 加企业子域，不独立工程 |
| **AP13** | 新代码集中在 enterprise/，原 New-API 文件改动仅 4 处 |
| **AP14** | 个人不设额度，**部门预算**唯一计费主体（仅指预算扣费，不影响统计 — 统计是双维度） |
| **AP16** | **能复用 New-API 原生功能的，绝不重写**（OAuth registry / billingexpr / shadcn / i18n / Router / RBAC 角色等） |
| **AP19** | 中间层 = 全模态调用记录器，**只录不改、只录不挡** |
| **AP21** | 存储后端走接口抽象（MinIO 开发 / 群晖 NAS 生产） |
| **AP22** | Agent ↔ 后台接口走 CLI（hmrouter-cli），MCP 缓议 |
| **AP23** | 设备白名单制（hostname + MAC 预先入白） |
| **AP24** | audit_log 可改可删但写元审计 admin_action_log（元审计本身不可改） |

**违反前必须确认**：你是不是要发起方案级变更？如果是，跟用户对齐 + 写 DECISIONS.md 新条目。

---

## 4. 已决策的事，**不要再讨论**

完整 ADR 历史见 [DECISIONS.md](DECISIONS.md)。下面是高频被问的：

| 问题 | 已决策 | 见 |
|------|------|------|
| 为什么用 New-API 不用 LiteLLM？ | New-API 活跃 + UI 完整 + Go 性能 | ADR-001 |
| 为什么不做 DLP？ | 移到独立窗口讨论 | ADR-002 + [DLP-deferred.md](DLP-deferred.md) |
| 中间层到底要做什么？ | 全模态调用记录，只录不改不挡 | ADR-003 |
| 审计能不能改/删？ | Admin 可以但写元审计；元审计本身不可动 | ADR-004 |
| 设备识别怎么做？ | 白名单制 hostname+MAC，admin 预录 | ADR-005 |
| Agent 接口为什么不上 MCP？ | 一期 CLI 简单 100 倍，需要时再封 | ADR-006 |
| 为什么前端不独立工程？ | 复用 web/default 169 组件 + i18n + 路由 | ADR-007 |
| 部门预算的计算用什么？ | 复用 pkg/billingexpr 表达式引擎 | ADR-008 |
| 个人到底有没有统计？ | **预算只算部门，统计始终双维度**（部门+个人） | ADR-009 |
| 超管菜单怎么进原 New-API 后台？ | 单一菜单 + 分组分隔，企业域上 / 系统域下 | ADR-010 |
| 审计数据保留多久？ | 1 年保留，6 月后冷存，元审计永久 | ADR-011 |
| 部门预算超额怎么处理？ | 先 observe 模式不阻断跑 1-2 月再切 enforce | ADR-012 |
| 角色体系扩到几个？ | 6 个：超管/集团/部门/AI对接员/员工 + 合规审计专员 | ADR-013 |
| 员工知情权怎么落？ | 公告模块 + 工作台强制弹窗 + 顶部 banner（M1） | ADR-014 |
| 调用记录展示要不要脱敏？ | ~~M2 显示层正则脱敏~~ → 改：内容严格 3 角色可见（无需脱敏） | ~~ADR-015~~ → ADR-019 |
| 敏感词要拦截吗？ | 不拦截。M3 软风控：异步命中告警合规专员，不影响调用 | ADR-016 |
| 集团 admin 能看 audit 明文吗？ | 能（含跨部门 + 元审计）。张远捷 = 集团 admin | ADR-017 |
| 客户端只支持 WorkBuddy 吗？ | 否。3 层策略：推荐(WB/OpenClaw/QClaw/AutoClaw) + 通用(Cherry/Cursor) + 自定义 | ADR-018 |
| 谁能看员工的对话内容？ | 仅 3 角色：超管 / 集团 admin / 合规审计专员。员工本人也不能在后台看 | ADR-019 |

---

## 5. 项目元信息

**用户身份**：郑凯，数智营销中心**总经理** + 集团 AI 转型推进工作组**执行组长** + 本项目**总负责**。
- 决策路径：日常技术决策"郑凯 + Claude 两人定即推"
- 重大变更需总指挥（张主席）月度通报会认可

**资源**：1 名全栈 + Claude

**节奏参考**：上一个全栈项目（131 小程序）3 天完成完整闭环。本项目改造 4 万行 Go 代码，比纯新写慢一倍。

**风格偏好**：
- 倾向激进但不冒进
- 喜欢"先讨论方案讨清楚，再做 harness engineering，再推进"
- 容易嫌弃过度估算（"你过度低估我俩的能力"）
- 重视方案文档的整洁度（v0.8 专门做了一轮冗余清理）

---

## 5.5 跨文档修改影响表（防一致性破裂）

文档之间有大量交叉引用。**改一个文件时必须同步改其他**。下表是高频联动：

| 你修改了 | 必须同步检查/更新 |
|---------|-------------------|
| **PLAN.md AP 表**（增/改/删 AP） | CLAUDE.md §3 速查表 + CLAUDE.md §4 ADR 表（如关联）|
| **PLAN.md §10.1 表 schema**（加表/字段） | PLAN §10.0 总览表 + PLAN §4.2 模块划分 + ARCHITECTURE §7 enterprise/model + 所有"N 张表"措辞 |
| **PLAN.md 版本号**（v0.X → v0.X+1） | 顶部"最后更新" + §0.3 历史 + STATE 文档版本对照表 |
| **DECISIONS.md 加新 ADR** | CLAUDE §4 ADR 表 + 关联的 PLAN AP 注释 |
| **PRD-admin.md 加/改模块** | PRD §3 权限矩阵 + §4 信息架构 + §10 验收 + TASKS.md 任务 |
| **PRD-admin.md scope 变更** | PLAN §1.5（P0/P1/P2）+ TASKS.md 任务表 + STATE.md "下一步" |
| **TASKS.md 加任务** | TASKS.md 燃尽快报 + 依赖图（DAG）+ STATE.md "下一步" |
| **TASKS.md 改里程碑归属** | STATE.md 当前里程碑 + 重算燃尽 |
| **ARCHITECTURE.md 加模块** | PLAN §4.2 模块划分 + PRD §4 信息架构（如有 UI） |
| **任意文件行数大变** | STATE.md 文档版本对照表（容忍 ±5%）|

**修改完关键文档（PLAN/PRD/ARCH/DECISIONS/TASKS）后**：
```bash
node scripts/check-consistency.js
```
**必须 11 / 11 绿才算改完**。失败的项当场修，不留尾巴。

---

## 6. 不擅自做的事

| 动作 | 为什么 |
|------|------|
| 启动 Docker Desktop | 副作用大，必须用户确认 |
| 改 git remote / push | 涉及外部 |
| 删除文件 / git reset | 不可逆 |
| 申请外部账号（企微、上游 LLM） | 用户那边的事 |
| 自作主张违反 AP 原则 | 推翻已决策需要 ADR |

---

## 7. 工作流（速查）

| 场景 | 动作 |
|------|------|
| 新会话开局 | 读 CLAUDE → STATE → TASKS 燃尽 → 给"开局快报"（§2.5 模板） |
| 用户问"继续" | 看 TASKS.md 当前里程碑下一个 ☐ 任务 |
| 完成一个任务 | TASKS 勾 ✓ + 填实际时间 + git commit |
| 用户中途加需求 | 走变更流（TASKS.md 变更日志区记录 + 评估影响） |
| 改了 PLAN/PRD/ARCH | 查 §5.5 影响表同步改 + STATE.md 加一条 + **跑 `node scripts/check-consistency.js`** |
| 做出新决策 | 在 DECISIONS.md 追加 ADR |
| 阻塞老化 ≥ 3 天 | 主动跟用户提升级路径 |
| 会话即将结束 | **更新 STATE.md + TASKS 燃尽** |
| 用户问"项目是怎么回事" | 给一段话简介（不要倒所有内容） |
| 想动 git / Docker / 外部 API | 先问用户 |
| 完成一个里程碑 | 触发 retro：实际时间 vs 估时 / 意外项 / 校准下个 M |

详细规范见 [docs/workflow.md](docs/workflow.md) 与 [docs/session-handoff.md](docs/session-handoff.md)。

---

## 8. 文档地图

```
hmrouter/
├── CLAUDE.md              ← 你正在读，每会话自动加载
├── STATE.md               ★ 当前状态（动态）
├── TASKS.md               ★ 任务清单 + 燃尽 + 阻塞监控（动态）
├── DECISIONS.md           ★ 决策日志 ADR（追加，19 条 + 1 模板）
├── PLAN.md                方案、AP 原则、路线图、§10 数据模型 schema (24 张表)
├── PRD-admin.md           管理后台 PRD（v0.3 按 13 域 + 6 角色）
├── PAGES-admin.md         前端页面规范（v2 含 6 角色菜单 + 52 页 + 9 旅程）
├── ARCHITECTURE.md        架构图、模块、数据流
├── DLP-deferred.md        DLP 搁置归档
├── SESSION-S003-handoff.md ★ S-003 完整交接备忘 — 新会话续接必读
├── docs/
│   ├── workflow.md        开发流程、commit 规范、变更管理、retro
│   ├── session-handoff.md 会话开/关仪式
│   ├── agent-collaboration.md ★ 多 agent 并行编码协作约定 + CODEOWNERS
│   └── coding-principles.md ★ 编码 4 原则（编码 agent 必读，Karpathy 派生）
├── spec/
│   └── error-rules.yaml   M1 5 条错误诊断规则（Backend-B 加载）
├── knowledge-graph/       New-API 事实参照
│   ├── INDEX.md           ★ 速查
│   ├── query.js           查询脚本
│   ├── README.md
│   └── sources.md
└── new-api/               原项目代码（fork base）
```

**3 个动态文件分工**：
- **STATE.md**：状态快照，一页就懂"我们在哪"
- **TASKS.md**：任务清单，"我们具体要做什么、做了多少、还剩多少"
- **DECISIONS.md**：决策历史，"为什么这么做、什么不能再讨论"

---

## 9. 一句话定位

> hmrouter 是**集团 AI 转型方案**的支撑系统，不是普通技术项目。
> 项目成败标准来自张主席年度 KPI，不是技术 SLA。
> 任何决策回答"对不对得起 5/31 演示 + 12 月终评"。
