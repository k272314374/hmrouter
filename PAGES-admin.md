# 管理后台页面设计

> 状态：**v2** · 2026-05-15（按 PRD v0.3 重写：6 角色 + 新模块 + 调用内容严格 3 角色可见）
> 与 [PRD-admin.md](PRD-admin.md) v0.3 配对，本文件聚焦"页面 + 跳转 + 模式"
> 目的：让前端 agent 按图施工，不再为"页面叫什么 / 跳到哪 / 共用什么组件"二次决策

---

## 0. 文档说明

### 0.1 v2 重大变更（接 v1）

| 维度 | v1 | v2 |
|---|---|---|
| **角色数** | 5 | **6**（新增 compliance_auditor）|
| **员工页面** | P-M1-02 个人页 + P-M1-04/05 调用列表/详情 | **重设计**：P-M1-WS-01 工作台 + 极简 4 项菜单；员工**不能在后台看 audit 内容**（ADR-019）|
| **调用列表/详情** | 全员按权限可见 | **仅 3 角色可见**（root / group_admin / compliance_auditor）|
| **新增页面** | — | 工作台 / Skill 中心 / 学习中心 / WorkBuddy 教程 / 公告 / 待办 inbox / 员工目录 / 部门管理 / 风险事件 (M3) |
| **路径规范** | 部分不一致 | 统一（员工域 `/workspace/*` / 企业管理 `/enterprise/*` / 帮助 `/help/*` / 系统 `/admin/*`）|
| **菜单** | 5 角色 | **6 角色变形**（详见 §2）|
| **页面命名** | `P-M1-NN` 顺序数字 | `P-<里程碑>-<域两字母>-<编号>` 语义化 |

### 0.2 跟其他文档关系

| 文档 | 关心什么 |
|---|---|
| **PRD-admin.md v0.3** | 功能（做什么 / 字段 / API / 验收）|
| **本文 PAGES-admin.md v2** | **页面（路径 / 跳转 / 角色 / 复用组件）**|
| ARCHITECTURE.md | 后端模块 + 数据流 |
| PLAN.md §10 | 数据库 schema |

读者：前端实现者 + 前端 agent + UX 评审者。

---

## 1. 页面总清单

> 命名：`P-<里程碑>-<域>-<编号>` （域两字母：WS=Workspace 员工 / HP=Help / EN=Enterprise / AU=Audit / AN=Announcement / SK=Skill 管理 / CR=Course 管理 / S=System / DB=Dept Budget / AP=Approval / RE=Risk Event / CA=Case / KP=KPI / HR=HR / NT=Notification）

### 1.1 员工域（全员可访问，common 角色主战场）

| ID | 路径 | 用途 | PRD |
|---|---|---|---|
| **P-M1-WS-01** | `/workspace` | ★ 员工工作台首页（Token+模型+设备+引导）| §5.J.3 |
| **P-M1-WS-02** | `/workspace/usage` | 个人 token 用量 + 模型分布 + 排名（自己 vs 部门）| §5.D + §5.J |
| **P-M1-WS-03** | `/workspace/skills` | Skill 中心（浏览 + 下载）| §5.J-11 |
| **P-M1-WS-04** | `/workspace/skills/:id` | Skill 详情 + WorkBuddy 导入引导 | §5.J-11 |
| **P-M1-WS-05** | `/workspace/courses` | AI 学习中心（课程列表）| §5.J-12 |
| **P-M1-WS-06** | `/workspace/courses/:id` | 课程详情 + 章节资源 | §5.J-12 |
| **P-M1-WS-07** | `/workspace/account` | 我的账户（HR 字段只读 + 显示名/语言/通知偏好可改）| §5.A + §5.J |

> 头像菜单"个人" → 指向 P-M1-WS-07。员工**不进** P-M1-EN-03（那是管理者诊断视角）。

### 1.2 帮助域（全员）

| ID | 路径 | 用途 | PRD |
|---|---|---|---|
| **P-M1-HP-01** | `/help/clients` | 客户端教程（M1：WorkBuddy + OpenClaw 的 PDF + 视频下载）| §5.J / ADR-018 |
| **P-M1-HP-02** | `/help/cli` | hmrouter-cli 使用文档（静态页）| §5.J |

### 1.3 企业管理域（AI 对接员 / 部门 admin / 集团 admin 等）

| ID | 路径 | 主要角色 | 用途 | PRD |
|---|---|---|---|---|
| **P-M1-EN-01** | `/enterprise/inbox` | ai_liaison+ | 待办 inbox（设备审批 / 错误高发 / ...）| §5.I |
| **P-M1-EN-02** | `/enterprise/users` | ai_liaison+ | 员工目录（搜索 + 筛选）| §5.A |
| **P-M1-EN-03** | `/enterprise/users/:id` | ai_liaison+ | 员工详情（**仅管理者视角**：元数据 + 错误诊断，**不显内容**；员工本人改资料走 WS-07 不进此页）| §5.A + §5.E |
| **P-M1-EN-04** | `/enterprise/dashboard` | ai_liaison+ | 仪表盘（双维度：部门聚合 / 员工 Top）| §5.D |
| **P-M1-EN-05** | `/enterprise/devices` | ai_liaison+ | 设备管理（tab：全部 / 待激活 / 已停用）| §5.B |
| **P-M1-EN-06** | `/enterprise/devices/:id` | ai_liaison+ | 设备详情 + 操作（停用 / 重新激活）| §5.B |
| **P-M1-EN-07** | `/enterprise/service-accounts` | ai_liaison+ | 服务账号列表（M1 demo 1 个）| §5.B |
| **P-M1-EN-08** | `/enterprise/service-accounts/:id` | ai_liaison+ | 服务账号详情 + Token 列表 | §5.B |
| **P-M1-EN-09** | `/enterprise/export` | ai_liaison+ | 一键导出（双维度 + 历史）| §5.D |
| **P-M1-EN-10** | `/enterprise/departments` | group_admin+ | 部门管理（M1 提前：基础 CRUD）| §5.A |
| **P-M1-EN-11** | `/enterprise/departments/:id` | group_admin+ | 部门详情 + 编辑 | §5.A |

### 1.4 调用记录域（★ 严格 3 角色：root / group_admin / compliance_auditor）

| ID | 路径 | 角色 | 用途 | PRD |
|---|---|---|---|---|
| **P-M1-AU-01** | `/enterprise/audit` | 3 角色 | ★ 调用列表（含筛选 + 关键词搜）| §5.E |
| **P-M1-AU-02** | `/enterprise/audit/:id` | 3 角色 | ★ 调用详情（模拟聊天 UI + 错误诊断 + 复制 / 删除 / 编辑）| §5.E |
| **P-M2-AU-01** | `/enterprise/audit/:id/edit` | root + group_admin | audit 编辑（带原因 + 元审计）| §5.E (M2) |

### 1.5 元审计域（4 档可见性：3 角色全见 + dept_admin 本部门相关）

| ID | 路径 | 用途 | PRD |
|---|---|---|---|
| **P-M2-AA-01** | `/enterprise/admin-actions` | 元审计查询页（M2 起完整；AA = admin-action audit 域）| §5.F |

### 1.6 公告域

| ID | 路径 | 角色 | 用途 | PRD |
|---|---|---|---|---|
| **P-M1-AN-01** | `/announcements` | 全员 | 公告历史（员工查自己面向的）| §5.L |
| **P-M1-AN-02** | `/announcements/:id` | 全员 | 公告详情（首次/版本变更触发强制弹窗模态）| §5.L |
| **P-M1-AN-03** | `/enterprise/announcements` | dept_admin+ | 公告管理（列表）| §5.L |
| **P-M1-AN-04** | `/enterprise/announcements/new` | dept_admin+ | 新建公告（TipTap 富文本编辑器 + 预览）| §5.L |
| **P-M1-AN-05** | `/enterprise/announcements/:id/edit` | dept_admin+ | 编辑公告 | §5.L |

### 1.7 Skill 管理域（数智营销中心独家）

| ID | 路径 | 角色 | 用途 | PRD |
|---|---|---|---|---|
| **P-M1-SK-01** | `/enterprise/skills` | 数智营销中心 dept_admin/ai_liaison + group_admin/root | Skill 管理列表 | §5.J-11 |
| **P-M1-SK-02** | `/enterprise/skills/new` | 同上 | 新建 Skill（上传 zip + 元数据）| §5.J-11 |
| **P-M1-SK-03** | `/enterprise/skills/:id/edit` | 同上 | 编辑 Skill | §5.J-11 |

### 1.8 学习中心管理域（数智营销中心独家）

| ID | 路径 | 角色 | 用途 | PRD |
|---|---|---|---|---|
| **P-M1-CR-01** | `/enterprise/courses` | 数智营销中心 dept_admin/ai_liaison + group_admin/root | 课程管理列表 | §5.J-12 |
| **P-M1-CR-02** | `/enterprise/courses/new` | 同上 | 新建课程（章节 + 资源上传）| §5.J-12 |
| **P-M1-CR-03** | `/enterprise/courses/:id/edit` | 同上 | 编辑课程 | §5.J-12 |

### 1.9 系统域（仅超管，复用原 New-API）

| ID | 路径 | 来源 | 用途 |
|---|---|---|---|
| **P-S-01** | `/admin/channels` | 原 features/channels | 上游渠道 CRUD + 测试 |
| **P-S-02** | `/admin/models` | 原 features/models | 模型定价 + 推荐元数据维护（C-D4）|
| **P-S-03** | `/admin/tokens` | 原 features/keys (admin 视角) | Token 总览 |
| **P-S-04** | `/admin/logs` | 原 features/usage-logs | 原始日志（不含 enterprise audit_log）|
| **P-S-05** | `/admin/health` | 新建（复用 channel-test）| 健康检查（M1）|
| **P-S-06** | `/admin/system-settings` | 原 features/system-settings + IP 白名单（M1）+ 8 项参数（M2）| 系统配置 |
| **P-S-07** | `/admin/dept-model-acl` | 新建 | 部门-模型可见性矩阵（M1）|

### 1.10 M2 / M3 页面

| ID | 路径 | 里程碑 | 用途 | PRD |
|---|---|---|---|---|
| **P-M2-DB-01** | `/enterprise/departments/:id/budget` | M2 | 部门预算配置（含 billingexpr 编辑器）| §5.D |
| **P-M2-AP-01** | `/workspace/budget/approval/request` | M2 | 员工申请临时配额 | §5.D D-D4 |
| **P-M2-AP-02** | `/enterprise/budget/approvals` | M2 | dept_admin 审批临时配额 | §5.D D-D4 |
| **P-M3-RE-01** | `/enterprise/risk-events` | M3 | 风险事件列表（合规专员入口）| §5.M |
| **P-M3-RE-02** | `/enterprise/risk-events/:id` | M3 | 风险事件处理详情 | §5.M |
| **P-M3-RE-03** | `/enterprise/risk-rules` | M3 | 风险规则编辑器 | §5.M |
| **P-M3-CA-01** | `/enterprise/cases` | M3 | 案例库 + 提交 + 审批 | §5.H |
| **P-M3-KP-01** | `/enterprise/kpi` | M3 | 业务量 + 数字员工占比 | §5.H |
| **P-M3-HR-01** | `/enterprise/hr-sync` | M3 | HR 同步状态 + 手动触发 | §5.A |
| **P-M3-NT-01** | `/notifications` | M3 | 通知中心（SSE 实时）| §5.I |

### 1.11 全局元素（不是单独页面）

| 位置 | 组件 | 用途 |
|---|---|---|
| 顶栏左 | logo + 折叠按钮 | 主导航折叠 |
| 顶栏中 | 全局搜索（M3）| 搜员工/会话/部门 |
| **顶栏 banner** | AnnouncementBanner | 「本平台调用全量记录用于审计追责」(L 域兜底) + 未确认合规须知时切换 |
| 顶栏右 | 通知铃铛 + 红点 | 30s 轮询，点开下拉最近 5 条 + 跳通知中心 |
| 顶栏右 | 头像菜单 | 个人 / 公告历史 / 切语言 / 登出 |
| 全局 | AnnouncementModal | 强制弹窗 + 强制勾选确认 |
| 全局 | Toast | 操作反馈 |
| 全局 | Dialog | 删除/编辑确认 / 强制原因输入 |

---

## 2. 信息架构（菜单按 6 角色变形）

> 跟 PRD §4.1 一致。菜单按 user.role 严格 filter（路由 guard / 菜单 filter / API 后端三层校验）。

### 2.0 菜单 filter 的两条特殊规则（实现必读）

1. **M2/M3 菜单项在 M1 阶段隐藏**（不是置灰）。
   - 理由：置灰会让 5/31 演示界面显得"没做完"，对张主席观感差；隐藏更干净，M2 上线再出现。
   - 下面各角色菜单图中标 `(M3)` 的项，M1 不渲染。

2. **Skill / 课程"管理"入口是"角色 AND 部门"双条件**：
   ```
   可见 = role ∈ {group_admin, root}
          OR (role ∈ {dept_admin, ai_liaison} AND primary_dept_id = 数智营销中心)
   ```
   - 其他部门的 dept_admin / ai_liaison **看不到** Skill/课程管理入口（只能像普通员工一样浏览/下载）。
   - 菜单图中标 `▲` 的项受此双条件约束。

### 2.1 员工 (common) — 极简 4 项

```
╔════════════════════════════════════╗
║  hmrouter                  [─/+]   ║
╠════════════════════════════════════╣
║  📋 工作台          /workspace      ║
║  📊 我的用量        /workspace/usage║
║  🎯 Skill 中心      /workspace/skills║
║  🎓 学习中心        /workspace/courses║
╚════════════════════════════════════╝
顶栏：banner + 铃铛 + 头像菜单（个人/公告历史/语言/登出）
```

### 2.2 AI 对接员 (ai_liaison)

```
╔════════════════════════════════════╗
║  📥 待办 (badge)   /enterprise/inbox║
║  👥 本部门员工      /enterprise/users║
║  💻 设备管理        /enterprise/devices║
║  📊 本部门用量      /enterprise/dashboard║
║  🤖 服务账号        /enterprise/service-accounts║
║  📤 导出            /enterprise/export║
║  📋 Skill 管理 ▲    /enterprise/skills║
║  🎓 课程管理 ▲      /enterprise/courses║
║  ────────                          ║
║  📋 工作台          /workspace     ║
║  🎯 Skill 中心      /workspace/skills║
║  🎓 学习中心        /workspace/courses║
╚════════════════════════════════════╝
```
> ▲ Skill / 课程**管理**入口：仅 `primary_dept_id = 数智营销中心` 的 ai_liaison 可见（双条件，见 §2.0）。
> 🎯/🎓 中心是**浏览**入口，全员都有。

### 2.3 部门 admin (dept_admin = 部门一把手)

```
╔════════════════════════════════════╗
║  📊 本部门看板      /enterprise/dashboard║
║  👥 本部门员工                     ║
║  💻 设备管理                       ║
║  🤖 服务账号                       ║
║  📤 导出            /enterprise/export║
║  📥 待办            /enterprise/inbox║
║  📢 部门公告        /enterprise/announcements║
║  📋 Skill 管理 ▲    /enterprise/skills║
║  🎓 课程管理 ▲      /enterprise/courses║
║  ────────                          ║
║  📋 工作台 / Skill / 学习中心       ║
╚════════════════════════════════════╝
```
> ▲ Skill / 课程管理：仅 `primary_dept_id = 数智营销中心` 的 dept_admin 可见（见 §2.0）。

### 2.4 集团 admin (group_admin) — 含张远捷

```
╔════════════════════════════════════╗
║  📊 集团看板        /enterprise/dashboard║
║  📜 调用记录   ★    /enterprise/audit (跨部门 + 看明文) ║
║  📥 待办                            ║
║  👥 全集团员工                      ║
║  🏢 部门管理        /enterprise/departments║
║  💻 设备管理 / 🤖 服务账号           ║
║  📤 导出                            ║
║  📢 公告管理        /enterprise/announcements║
║  🎯 Skill 管理 / 🎓 课程管理         ║
║  🚨 风险事件 (M3)                   ║
║  📋 元审计          /enterprise/admin-actions║
║  🎫 案例 (M3) / 📈 业务量 (M3)       ║
║  ────────                          ║
║  📋 工作台                          ║
╚════════════════════════════════════╝
```

### 2.5 合规审计专员 (compliance_auditor) — 监察审计室

```
╔════════════════════════════════════╗
║  🚨 风险事件 (M3)  ★ 主入口         ║
║  📜 调用记录   ★    (跨部门 + 看明文)║
║  📋 元审计                          ║
║  📊 集团看板（只读）                 ║
║  📤 审计报告导出                     ║
║  ────────                          ║
║  📋 工作台                          ║
╚════════════════════════════════════╝
```

### 2.6 超管 (root)

```
[企业域 — 同集团 admin 全部菜单]
═══════════════════════════════════════
[系统域 — 仅超管见]
║  🔌 上游渠道        /admin/channels  ║
║  💰 模型定价        /admin/models    ║
║  🔑 Token 管理      /admin/tokens    ║
║  📜 原始日志        /admin/logs      ║
║  🩺 健康检查        /admin/health    ║
║  🌐 部门-模型 ACL    /admin/dept-model-acl║
║  ⚙️ 系统配置        /admin/system-settings║
```

---

## 3. 角色 × 页面可见矩阵

> 与 PRD §3 权限矩阵对齐。本表关注"页面入口"，PRD 关注"功能粒度"。

| 页面 ID | root | group_admin | compliance_auditor | dept_admin | ai_liaison | common |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **员工域** | | | | | | |
| P-M1-WS-01 工作台 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| P-M1-WS-02 我的用量 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| P-M1-WS-03/04 Skill | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| P-M1-WS-05/06 学习 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| P-M1-WS-07 我的账户 | ✅自己 | ✅自己 | ✅自己 | ✅自己 | ✅自己 | ✅自己 |
| **帮助域** | | | | | | |
| P-M1-HP-01/02 教程 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **企业管理域** | | | | | | |
| P-M1-EN-01 inbox | ✅ | ✅ | ✅ | ✅ 本部门 | ✅ 本部门 | ❌ |
| P-M1-EN-02 员工目录 | ✅ 全 | ✅ 全 | ✅ 全 | ✅ 本部门 | ✅ 本部门 | ❌ |
| P-M1-EN-03 员工详情 | ✅任意 | ✅任意 | ✅任意 | ✅本部门 | ✅本部门 | ✅ 自己 |
| P-M1-EN-04 仪表盘 | ✅全 | ✅全 | ✅全 | ✅本部门 | ✅本部门 | ❌ |
| P-M1-EN-05/06 设备 | ✅全 | ✅全 | ❌ | ✅本部门 | ✅本部门 | ❌ |
| P-M1-EN-07/08 服务账号 | ✅全 | ✅全 | ❌ | ✅本部门 | ✅本部门 | ❌ |
| P-M1-EN-09 导出 | ✅ | ✅ | ✅ | ✅本部门 | ✅本部门 | ❌ |
| P-M1-EN-10/11 部门 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **★ 调用记录域（铁律 3 角色）** | | | | | | |
| **P-M1-AU-01 调用列表** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **P-M1-AU-02 调用详情** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| P-M2-AU-01 audit 编辑 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **元审计** | | | | | | |
| P-M2-AA-01 元审计 | ✅ | ✅ | ✅ | ✅ 本部门相关 | ❌ | ❌ |
| **公告域** | | | | | | |
| P-M1-AN-01/02 公告查看 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| P-M1-AN-03 公告管理列表 | ✅ | ✅ | ❌ | ✅ 本部门 | ❌ | ❌ |
| P-M1-AN-04/05 公告编辑 | ✅ | ✅（合规须知 + 运营）| ❌ | ✅ 本部门运营 | ❌ | ❌ |
| **Skill 管理（数智营销中心独家）** | | | | | | |
| P-M1-SK-01/02/03 | ✅ | ✅（数智营销中心相关）| ❌ | ✅ 数智营销中心 | ✅ 数智营销中心 | ❌ |
| **课程管理（数智营销中心独家）** | | | | | | |
| P-M1-CR-01/02/03 | ✅ | ✅ | ❌ | ✅ 数智营销中心 | ✅ 数智营销中心 | ❌ |
| **系统域** | | | | | | |
| P-S-01~07 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **M2 页面** | | | | | | |
| P-M2-DB-01 部门预算 | ✅ | ✅ | ❌ | ✅ 看本部门 | ✅ 看本部门 | ❌ |
| P-M2-AP-01 申请临时配额 | — | — | — | — | — | ✅ |
| P-M2-AP-02 审批临时配额 | ✅ | ✅ | ❌ | ✅ 本部门 | ❌ | ❌ |
| **M3 页面** | | | | | | |
| P-M3-RE-01/02/03 风险事件 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| P-M3-CA-01 案例 | ✅审批 | ✅审批 | ❌ | ✅本部门审批 | — | ✅提交 |
| P-M3-KP-01 业务量 | ✅全 | ✅全 | ✅全 | ✅本部门 | ✅本部门 | ✅上报+看自己 |
| P-M3-HR-01 HR 同步 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| P-M3-NT-01 通知中心 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 自己 |

---

## 4. 典型用户旅程（9 个）

### 4.0 登录落地首页表

> 6 角色登录成功后 redirect 到的默认首页。深链无权限时也跳这张表对应的页 + toast"无权访问"。

| 角色 | M1 落地首页 | 备注 |
|---|---|---|
| `common` 员工 | `/workspace` 工作台 | — |
| `ai_liaison` | `/enterprise/inbox` 待办 | 日常第一眼看待办 |
| `dept_admin` | `/enterprise/dashboard` 本部门看板 | — |
| `group_admin` | `/enterprise/dashboard` 集团看板 | 张远捷归此 |
| `compliance_auditor` | M1 → `/enterprise/audit` 调用记录 | 风险事件 M3 才有；M3 起改落 `/enterprise/risk-events` |
| `root` | `/enterprise/dashboard` 集团看板 | 系统域是工具不是首页 |

实现：`/login` 回调后按 `user.role` 查此表 redirect。带 `?return_to=` 时优先 return_to（但仍校验权限，无权则落本表）。

---

### 旅程 1：新员工首次登录 onboarding ★ 关键

```
新员工小赵，HR 已入职 3 天
↓
打开 https://hmrouter.huamei.com/ → 跳企微扫码
↓
扫码成功 → 后台自动 user.create(status=pending)
↓
落 P-M1-WS-01 工作台
  ├─ 立刻强制弹 AnnouncementModal "本平台调用全量记录用于审计"
  │  必须勾"我已阅读" + 点确认 → 写 user_announcement_ack
  ├─ 工作台显示"⚠ 你的账号待激活"
  ├─ 顶部 banner 红色"账号未激活，部分功能受限"
  ├─ 不能复制 Token / 不能调 API
  └─ 但可以浏览 Skill 中心 / 学习中心 / 教程页
↓
后台：部门 admin 收到 inbox "新员工小赵待激活"
↓
部门 admin 进 P-M1-EN-02 员工目录 → 看到 status=pending 的小赵
↓
点进 P-M1-EN-03 员工详情 → 选主部门 + 角色 → 一键激活
↓
小赵下次刷新工作台 → 状态变 active → Token 显示 + 可用
↓
小赵跟"3 步开始"卡片：
  Step 1 [📋 复制 Token]
  Step 2 [⬇ 下载 WorkBuddy 安装包] → P-M1-HP-01
  Step 3 [📺 看视频教程] → 跳 P-M1-HP-01 视频
↓
配好 WorkBuddy → 第一次调用 → 工作台显示用量
```

### 旅程 2：员工日常使用 + 自助排错

```
员工张三 WorkBuddy 报错 "401 Unauthorized"
↓
打开 hmrouter 工作台 P-M1-WS-01
↓
看到底部"⚠ 出错调用 (3)"折叠区，点开
  ↓
  仅元数据 + 自动诊断卡片：
  "⚠ 你最近 3 次 401 错误
   推断: 你的 Token 已被重置（30 分钟前）
   解决: 复制下方新 Token 替换 WorkBuddy 配置中的旧值"
   [📋 复制新 Token]
   ⚠ 不显示任何 prompt 内容（ADR-019）
↓
张三复制新 Token 粘到 WorkBuddy → 重试 → 成功
```

### 旅程 3：AI 对接员协助员工排错（仍不看内容）

```
员工小李电话 AI 对接员王某："Cherry Studio 一直报错"
↓
王某进 P-M1-EN-02 员工目录 → 搜小李 → 进 P-M1-EN-03
↓
看到员工详情（管理者诊断视角）：
  🔴 状态异常
  ├─ Token 有效（上次重置 7 天前）
  ├─ 设备 1 台已激活，1 台 pending
  └─ 最近 24h 调用 18 次, 18 次 401
  
  自动诊断卡片：
  "推断: 此员工正用未激活设备调用
   操作: [批准 pending 设备] [发企微给员工说明]"
  
  ⚠ 不显示任何 prompt/response 内容
↓
王某点 [批准 pending 设备] → 设备激活
↓
小李重试 → 成功
```

### 旅程 4：张远捷查违规（看明文）★ 关键

```
张远捷登录 → 落 P-M1-EN-04 集团仪表盘（默认 group_admin 视角）
↓
监察审计室同事电话："麻烦看下 5/15 14:00 数智营销中心张三的调用，疑似含客户名单"
↓
张远捷点 📜 调用记录 → P-M1-AU-01
↓
筛选: 部门=数智营销, 员工=张三, 时间=5/15 13:00-15:00
↓
列表显示 8 条调用 → 点开 14:23 那条
↓
P-M1-AU-02 调用详情：
  💬 模拟聊天展示 (张远捷 = group_admin 可见明文)
  👤 张三 14:23:12
     "帮我整理这份客户名单... [包含 50 行客户姓名+电话]"
  🤖 gpt-4o 14:23:14
     "好的，我已将名单按A-Z排序..."
↓
张远捷确认是真泄密 → 点页面右上 [🗑 删除]
↓
弹 ReasonInputDialog：
  原因(下拉)：[隐私投诉] / [测试数据清理] / [误操作] / [其他]
  备注(必填)：______
↓
确认 → audit_log.status=deleted + 写 admin_action_log
↓
toast："已删除，元审计 ID: action-12345"
↓
（可选）张远捷跳 P-M2-AA-01 元审计验证自己的删除动作有记录
```

### 旅程 5：金融部一把手月底导出账单

```
金融事业部一把手登录 → 落 P-M1-EN-04 仪表盘（自动落本部门视图）
↓
看 KPI 卡：本月预算消耗 67% / 调用 12K / 成本 ¥3,200
↓
顶部点 [📤 导出本部门月报]
↓
跳 P-M1-EN-09 导出页（参数预填：dept=金融事业部 / 模板=月度通报 / 时间=本月）
↓
点 [开始导出]
  ↓
  小数据量（< 1万行）→ 同步生成 < 2s → 直接下载 Excel
  大数据量 → 异步任务，进度条 → 顶栏铃铛红点 → 完成后通知
↓
打开 Excel：Sheet1 概览 / Sheet2 员工 Top 20 / Sheet3 模型分布 / Sheet4 按天趋势
```

### 旅程 6：数智营销中心发布新 Skill

```
你（数智营销中心总经理）登录 → 落 P-M1-EN-04 仪表盘
↓
左菜单点 Skill 中心 → 因为是 dept_admin + 数智营销中心，看到"Skill 管理"入口
↓
跳 P-M1-SK-01 → 看到已发布 10 个 skill 列表
↓
点 [+ 新建 Skill] → P-M1-SK-02
  ├─ 上传 zip（Claude Skills 标准格式）
  ├─ 填元数据：name / description / scenario / 适用客户端 (WorkBuddy/OpenClaw/...)
  ├─ tags：[财务对账/写作/编码/...]
  └─ 上传截图
↓
点 [发布] → 确认 → 写 admin_action_log → toast
↓
其他部门员工进 P-M1-WS-03 Skill 中心 → 立刻看到新 skill
```

### 旅程 7：集团 admin 发合规须知公告

```
张远捷决定发新合规须知"使用 AI 工具不得处理客户身份证号"
↓
左菜单点 公告管理 → P-M1-AN-03
↓
[+ 新建公告] → P-M1-AN-04
  ├─ 类型：[合规须知]（强制弹窗）
  ├─ 标题 + TipTap 富文本内容
  ├─ 受众：全员
  ├─ 生效时间：立即
  └─ 勾选 ☑ 年度重新确认
↓
[预览] → 看到员工弹窗效果
↓
[发布] → 写 admin_action_log
↓
全员下次访问任何后台页 → 强制弹 AnnouncementModal
↓
不勾确认 = 不能继续用后台（API 调用不影响）
↓
5 天后未确认者 → 部门 admin 收到 inbox 通知
```

### 旅程 8：监察审计室合规专员处理风险事件（M3）

```
监察审计室小张登录 → 落 P-M3-RE-01 风险事件列表（compliance_auditor 默认首页）
↓
看到一条 "high 优先级"红标事件
  "员工小李 2026-08-15 14:23 调用命中规则 #3 (身份证号正则 ×3)"
↓
点开 P-M3-RE-02 风险事件详情：
  ├─ 关联 audit_log 链接 → 点击跳 P-M1-AU-02 看明文
  ├─ 命中规则：身份证正则
  ├─ 命中位置：prompt 第 234-249 字符
  └─ 历史：该员工本月命中 5 次
↓
跳 P-M1-AU-02 看完整对话 → 判断是合理业务（客户开户审核）
↓
回 P-M3-RE-02 → 状态改为 [false_positive] + 备注"客户开户合理业务"
↓
状态机变更写元审计
```

### 旅程 9：员工申请临时配额（M2）

```
员工小赵当天调用接近上限（1900/2000）
↓
WorkBuddy 还在调 → 第 2001 次返回 429 "已达日上限"
↓
WorkBuddy 弹错误（含 hmrouter 引导 URL）
↓
小赵点 URL → 跳 P-M2-AP-01 申请临时配额
  ├─ 用途：(填) "今天客户对账急用，需多调 500 次"
  ├─ 预计 token：500
  └─ 紧急度：[高/中/低]
↓
[提交] → 异步通知本部门 admin
↓
部门 admin inbox 红点 → P-M2-AP-02 临时配额审批
  ├─ 看申请详情
  └─ [同意 +500] / [拒绝 + 原因]
↓
同意 → 颁发"单次令牌"（1h 有效）→ 推小赵 → 小赵继续用
拒绝 → 推小赵原因
```

---

## 5. 通用页面模式

### 5.1 三段式：列表 → 详情 → 编辑

**列表页**：
- 顶栏：页面标题 + 主操作按钮 + 次操作（导出 / 筛选切换）
- 筛选区：折叠式（默认折，常用筛选默认展开）
- 表格：可排序列 + 行 hover + 行点击进详情
- 分页：底部居中
- 空状态：插画 + 一句话 + 主操作引导

**详情页**：
- 顶栏：面包屑 + 页面标题（含主键）+ 操作按钮组
- 元数据卡片：关键字段
- 子内容 tab 或 section
- 底部固定操作栏（仅在表单时）

**编辑**：
- 简单字段（如改备注）→ 模态框
- 复杂字段 / 富文本（如公告 / audit 编辑）→ 独立页
- 删除 → 模态框 + 强制原因（ReasonInputDialog）

### 5.2 筛选保留（URL query 是真理之源）

跨页跳转时保留筛选上下文。例：
- P-M1-EN-04 仪表盘选了"金融事业部"
- 跳 P-M1-AU-01 调用列表，自动带 `?dept=金融事业部`
- 浏览器后退到 P-M1-EN-04 时，筛选状态恢复

实现：URL query 是真理之源，组件从 URL 读不读 localStorage。

### 5.3 模态框 vs 抽屉 vs 独立页

| 场景 | 形式 |
|---|---|
| 单字段编辑（改备注）| 模态框 |
| 多字段表单（新建部门 / 服务账号）| 模态框 |
| 富文本 / 大量字段（公告 / audit 编辑）| 独立页 |
| 列表行的快速预览 | 抽屉（右滑入）|
| 复杂多 tab（部门详情）| 独立页 |
| **公告强制确认** | 全屏遮罩模态框（不可关闭，必须勾确认）|

### 5.4 操作反馈

- ✅ 成功 → toast 右上角，2s 自愈
- ⚠️ 警告 → toast，4s
- ❌ 失败 → toast，6s + 详细错误展开
- 💀 严重错误（删除 / 重大变更）→ 模态框（带操作日志 ID）
- 处理中 → 按钮 loading + 禁用其他操作

### 5.5 空状态 / Loading / 错误

| 状态 | 设计 |
|---|---|
| Loading | 骨架屏（不要 spinner）|
| 空数据 | 插画 + 一句话 + 主操作按钮 |
| 网络错误 | 全页错误页 + "重试" + "联系管理员" |
| 权限不足 (403) | 全页 403 + "返回首页" |
| 404 | 全页 + "返回首页" |
| Session 过期 (401) | 弹模态框 + "重新登录" 按钮 |

### 5.6 面包屑规范

> 2 层嵌套以下不需要，3 层及以上必须

例：
```
仪表盘 > 数智营销中心 > 张三 > 设备：MacBook-Pro
```
点任一段可跳回。最右段是当前页（不可点）。

### 5.7 错误诊断展示规范（ADR-019 重要）

工作台 / 员工详情页的"错误诊断卡片"严格遵循：
- ✅ 显示：错误码 / 错误次数 / 自动推断原因 / 修复建议链接
- ❌ **绝对不显示**：任何 prompt 内容关键词 / 任何 response 内容 / 附件文件名（除非纯英文不含敏感词）

诊断引擎仅基于：
- HTTP status code
- token 使用量数字
- 调用频次模式
- 系统状态（Token 重置时间 / 设备状态等）

---

## 6. 通用组件复用

### 6.1 复用原 New-API 已有

| 复用 | 用于哪些 page |
|---|---|
| `features/dashboard/` 图表组件 | P-M1-EN-04 / P-M1-WS-02 |
| `features/usage-logs/` 表格 + 筛选 | P-M1-AU-01 |
| `features/keys/` Token 管理 | P-M1-WS-01 工作台的凭证 section |
| `features/channels/` channel-test | P-S-05 健康检查 |
| `features/users/` 用户列表 | P-M1-EN-02 员工目录 |
| `components/ui/` shadcn 169 个 | 全部 |
| `lib/api.ts` axios | 全部 |
| `i18n/` | 全部 |

### 6.2 新建组件（★ 跨页复用）

| 组件 | 用于 | 优先级 |
|---|---|---|
| ★ `BurndownCard` 燃尽卡片（KPI 数字 + 趋势）| P-M1-EN-04 / P-M2-DB-01 | M1 |
| ★ `DeptUserPicker` 部门员工树+搜索选择器 | P-M1-AU-01 / P-M1-EN-09 / P-M1-EN-11 | M1 |
| ★ `TimeRangePicker` 时间范围选择 | P-M1-EN-04 / P-M1-AU-01 / P-M1-EN-09 / P-M1-WS-02 | M1 |
| ★ `ChatTranscript` 对话详情（模拟聊天 UI）| P-M1-AU-02（仅 3 角色入口）| M1 |
| ★ `AttachmentPreview` 附件预览（图片直显，PDF M2 加渲染）| P-M1-AU-02 | M1 |
| ★ `ErrorDiagnosisCard` 错误诊断卡片（**不暴露 prompt**）| P-M1-WS-01 / P-M1-EN-03 / P-M1-AU-02 | M1 |
| ★ `ModelCard` 模型卡片（含价格 / 场景 / 实时状态）| P-M1-WS-01 | M1 |
| ★ `TokenCard` Token 一键复制（mask + 复制按钮直拷明文）| P-M1-WS-01 | M1 |
| ★ `DeviceList` 设备状态展示（员工版 + 管理者版）| P-M1-WS-01 / P-M1-EN-05 | M1 |
| ★ `ResourceCard` 通用资源卡片（Skill + 课程共用）| P-M1-WS-03/04/05/06 | M1 |
| ★ `WorkBuddyImportGuide` WorkBuddy 导入引导 | P-M1-WS-04 Skill 详情底部 | M1 |
| ★ `ExcelExportTask` 异步任务进度 + 全局通知 | P-M1-EN-09 + 顶栏铃铛 | M1 |
| ★ `ReasonInputDialog` 强制原因模态框（枚举 + 必填备注）| P-M1-AU-02 删除 / 编辑 | M1 |
| ★ `BreadcrumbBar` 面包屑 | 多层嵌套页 | M1 |
| ★ `EmptyState` 空状态 | 全部列表页 | M1 |
| ★ `AnnouncementBanner` 顶栏 banner | 全局 | M1 |
| ★ `AnnouncementModal` 强制弹窗（不可关闭）| 全局 | M1 |
| ★ `AnnouncementEditor` TipTap 富文本编辑 | P-M1-AN-04/05 | M1 |
| ★ `InboxList` 待办列表 + 红点 + 30s 轮询 | P-M1-EN-01 + 顶栏铃铛 | M1 |
| ★ `SkillUploadForm` Claude Skills zip 上传 | P-M1-SK-02 | M1 |
| ★ `CourseEditor` 课程章节编辑器 | P-M1-CR-02/03 | M1 |
| ★ `BillingExprEditor` 表达式编辑器 + dry-run | P-M2-DB-01 | M2 |

### 6.3 不要做的组件（避免过度设计）

- ❌ 自建 chart 库 — 用 recharts / 复用 New-API 已有
- ❌ 自建表格库 — shadcn data-table 够用
- ❌ 自建 toast / dialog — shadcn sonner / dialog
- ❌ 拖拽组件 — M2 才需要（部门树拖拽），M1 别引入

---

## 7. 跨页参数传递

### 7.1 用 URL query string

✅ 应该用 URL：
- 列表筛选（部门 / 员工 / 时间 / 模型 / 状态）
- 分页（page / page_size）
- 排序（sort_by / order）
- 视图模式（view=table/chart）
- tab 选中（tab=members/budget）

❌ 不要用 URL：
- 表单输入（用 form state）
- 模态框开关（用 component state）
- 临时选中（如多选删除前的勾选）

### 7.2 跨页跳转参数

| 来源 | 目的 | 带参数 |
|---|---|---|
| P-M1-EN-04 仪表盘 → P-M1-AU-01 | dept_id / user_id / time_range（仅 3 角色，否则按钮不显示）|
| P-M1-EN-04 → P-M1-EN-03 个人 | user_id |
| P-M1-AU-01 → P-M1-AU-02 详情 | audit_id（path）|
| P-M1-AU-01 → P-M1-EN-09 导出 | dept_id / user_id / time_range / 模板预设 |
| P-M1-EN-06 设备 → P-M1-EN-03 员工 | user_id |
| 顶栏搜索 → 任意 | q + 跳目标页 |
| WorkBuddy 错误 → P-M2-AP-01 | error_code / quota_used |
| P-M3-RE-02 风险事件 → P-M1-AU-02 | audit_id |

### 7.3 深链 + 未登录跳转

邮件 / IM 链接 `/enterprise/audit/12345`，未登录用户点了：
- 跳 `/login?return_to=/enterprise/audit/12345`
- 登录后自动 redirect 到 return_to
- 无权限角色跳到自己的首页 + 提示"无权访问"

---

## 8. 响应式策略

**M1**：仅桌面（min-width 1280px）。移动端不做。

**M3+**：
- 看板（P-M1-EN-04）必须响应式（部门一把手可能用平板看）
- 工作台（P-M1-WS-01）应响应式（员工随时查 Token）
- 学习中心（P-M1-WS-05/06）应响应式（员工通勤看视频）
- 其他重表单 / 表格类不支持移动

实现：Tailwind 断点 `lg:` `xl:` 控制。

---

## 9. 设计 Do / Don't

### ✅ Do
- 高频操作放顶栏（如部门 admin 顶上常驻"导出本部门"按钮）
- 列表 + 详情 + 编辑 三段式标准化
- 跳转保留筛选状态（URL query）
- 操作反馈即时（toast）
- 写操作（特别是 admin 编辑/删除）必须强制原因
- 所有删除都是软删（status=deleted）
- 复用原 features 不重写
- 全部走 shadcn/ui，不自创组件库
- ★ **任何"看 audit 内容"的入口仅 3 角色显示**（菜单 filter + 按钮 hide + 后端 403）
- ★ **错误诊断卡片绝不显示 prompt 关键词**（ADR-019）
- ★ **公告强制弹窗不可关闭，必须勾确认**

### ❌ Don't
- 不要在多个地方重复同样筛选条件（用 URL 参数 + 组件复用）
- 不要把 admin 操作藏深（如"批准激活"应在列表行就能点）
- 不要用 spinner（用骨架屏）
- 不要弹"确定要 X 吗"空话模态框
- 不要绕过权限校验做"前端 hide 后端不限"，**必须前后端双重防护**
- 不要用浏览器 confirm() / alert()，全部用 shadcn Dialog
- 不要把英文菜单项和中文菜单项混用（i18n 完整覆盖）
- ★ **不要让员工/部门 admin/AI 对接员看到 audit 内容**（即便误开发出按钮，后端也必须 403）
- ★ **不要让员工自己在后台看自己 audit**（去 agent 客户端）

---

## 10. M1 页面实施优先级

> M1 distance to deadline 17 天。按 agent 通道 + 依赖排序。

### Tier 1：基础页面 + 公共组件（P0，所有其他页面依赖）

| 顺序 | 页面/组件 | 依赖 | 估时 |
|---|---|---|---|
| 1 | TokenCard / ModelCard / DeviceList / ResourceCard 公共组件 | shadcn | 0.5d |
| 2 | AnnouncementBanner / AnnouncementModal | shadcn dialog | 0.3d |
| 3 | InboxList + 30s 轮询 | API | 0.2d |
| 4 | ErrorDiagnosisCard | yaml 规则 | 0.3d |
| 5 | ChatTranscript | shadcn | 0.4d |
| 6 | ReasonInputDialog | shadcn dialog | 0.2d |

### Tier 2：员工域 4 页面（员工 onboarding 必须）

| 顺序 | 页面 | 估时 |
|---|---|---|
| 1 | P-M1-WS-01 工作台 | 0.5d |
| 2 | P-M1-WS-02 我的用量 | 0.3d |
| 3 | P-M1-WS-03/04 Skill 中心 | 0.4d |
| 4 | P-M1-WS-05/06 学习中心 | 0.3d |
| 5 | P-M1-HP-01 客户端教程页 | 0.2d |
| 6 | P-M1-HP-02 CLI 文档页 | 0.1d |

### Tier 3：企业管理域

| 顺序 | 页面 | 估时 |
|---|---|---|
| 1 | P-M1-EN-04 仪表盘（双维度）| 0.5d |
| 2 | P-M1-EN-02/03 员工目录 + 详情 | 0.5d |
| 3 | P-M1-EN-05/06 设备管理 | 0.4d |
| 4 | P-M1-EN-09 导出页 | 0.4d |
| 5 | P-M1-EN-01 待办 inbox | 0.3d |
| 6 | P-M1-EN-07/08 服务账号 | 0.2d |
| 7 | P-M1-EN-10/11 部门管理 | 0.5d |

### Tier 4：调用记录域（仅 3 角色）

| 顺序 | 页面 | 估时 |
|---|---|---|
| 1 | P-M1-AU-01 调用列表 | 0.5d |
| 2 | P-M1-AU-02 调用详情（ChatTranscript + ErrorDiagnosis）| 0.5d |

### Tier 5：公告 + Skill/课程管理

| 顺序 | 页面 | 估时 |
|---|---|---|
| 1 | P-M1-AN-01/02 公告查看 | 0.2d |
| 2 | P-M1-AN-03/04/05 公告管理 + 编辑（含 TipTap）| 0.5d |
| 3 | P-M1-SK-01/02/03 Skill 管理 | 0.3d |
| 4 | P-M1-CR-01/02/03 课程管理 | 0.3d |

### Tier 6：系统域

| 顺序 | 页面 | 估时 |
|---|---|---|
| 1 | P-S-05 健康检查（复用 channel-test）| 0.3d |
| 2 | P-S-07 部门-模型 ACL（NEW）| 0.3d |
| 3 | P-S-01/02/03/04/06 复用原 New-API | 0.1d 仅加菜单链接 |

### M1 前端总估时

约 **8.5-10 天**（单线）。

→ 按 agent 通道并行：3 个前端 agent，wall-clock **3-4 天**完成全部 M1 前端。

### Agent 通道分工建议

| Agent | 负责 |
|---|---|
| Frontend-A | Tier 1 公共组件 + Tier 2 员工域 |
| Frontend-B | Tier 3 企业管理域 + Tier 4 调用记录域 |
| Frontend-C | Tier 5 公告/Skill/课程 + Tier 6 系统域 |

每 Agent 不互改对方的 features 目录，公共组件由 Frontend-A 先做完发布到 `components/ui-enterprise/`。
