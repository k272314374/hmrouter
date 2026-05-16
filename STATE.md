# 当前状态

> 这是项目的"动态心跳"。任何会话开局必读。会话结束前必更新。
> 最后更新：2026-05-16  ·  当前会话：S-003（跨日续；新会话读 SESSION-S003-handoff.md）

---

## 当前里程碑

**M0** — 本地能跑（PLAN §1.4）

> 详细任务进度见 **[TASKS.md](TASKS.md) §M0**。本节只做高维快报。

**M0 燃尽**：
- 12 任务总（5 外部依赖 X1-X5 + 7 本地任务 T1-T7）
- 已完成 2（T6 源码踩点 / T7 知识图谱）
- 进行中 0
- 阻塞 5 全部外部（B1-B5，0 天，刚拉起）
- 本地任务最快 2 天完成（T1-T5 串行）
- **距 M1 deadline (5/31) 还剩 17 天**

---

## 当前阻塞

| # | 阻塞项 | 谁负责 | 影响 |
|---|--------|--------|------|
| B1 | Docker Desktop 没启动 | 用户确认后 Claude 启 | M0 全员阻塞 |
| B2 | 企微自建应用没申请 | 用户 | M1 SSO 阻塞 |
| B3 | DeepSeek 对公付款流程 | 用户 | M1 上游 1 阻塞 |
| B4 | OpenAI / Anthropic 对公付款 | 用户 | M1 上游 2/3 阻塞（备案：M1 演示用 DeepSeek 单家也能完成）|
| B5 | 群晖 NAS 凭证 | 用户/IT | 不阻塞 M1（M1 用 MinIO 顶上） |

---

## 最近 session 做了什么（按时间倒序）

### S-003（2026-05-15，本次会话，**已完成 spec 重写 + 校准**）

**主线**：UX 审视 → 产品定位澄清 → 术语统一 → 13 域功能能力深聊（全部完成）→ Spec 全部重写 → 校准

- ✅ 产品定位澄清：员工是主用户 / 算力主权 + Agent 工具自由（ADR-018）
- ✅ 术语全项目统一：`录像→记录` / `回放→详情` / `ChatReplay→ChatTranscript`（9 个文件）
- ✅ 加 7 条 ADR（013-019）：合规审计专员 / 公告 / 脱敏 superseded / 风险事件 / 集团 admin 上提 / Agent 开放 / 严格 3 角色
- ✅ 13 域 113 项决策深聊全部完成（C/J/J-11/J-12/D/L/B/A/E/F/G/H/I/K/M）
- ✅ **PRD-admin v0.3 重写**（v0.2 959 行 → v0.3 1178 行，按 13 域 + 6 角色）
- ✅ **PAGES-admin v2 重写**（v1 485 行 → v2 823 行，52 页 + 6 角色菜单）
- ✅ **PLAN v0.11**（24 张企业表 + AP27 6 角色 + 11 张新表 schema）
- ✅ **TASKS v2 重排**（按 9 agent 通道；燃尽 M0 12 + Spec 5 + Phase0 9 + M1 104 = 130 任务；M2/M3 估 ~65 待展开）
- ✅ **ARCHITECTURE 同步**（middleware 链 + enterprise 模块全图）
- ✅ **校准产物**：SESSION-S003-handoff.md 更新 + STATE 下一步重写 + spec/error-rules.yaml + docs/agent-collaboration.md
- ✅ 一致性检查 11/11 → commit + push (5 commits)

**关键发现 / 决策**：
- 9 部门确认（含 9 部门一把手 = dept_admin）
- 张远捷 = group_admin（含 audit 内容明文 + 元审计）
- 监察审计室 1-2 人 = compliance_auditor
- WorkBuddy = 腾讯产品（非自家），M1 推荐 WorkBuddy + OpenClaw 两家
- 数智营销中心独家维护 Skill + 课程
- 调用内容严格 3 角色可见（员工本人也不在后台看）
- 错误诊断不暴露 prompt 关键词
- M1 单线 26d → 9 通道并行 wall-clock 8.5d（含 7.5d buffer）

### S-003 续（2026-05-16）

**主线**：编码原则引入 → 四层对齐修补 → 仓库重组 → 页面评审修补

- ✅ 新增 docs/coding-principles.md（Karpathy 4 原则，编码 agent 必读）
- ✅ PAGES/PRD 四层对齐修补：6 处不一致 + 3 DOPEN 收口（新增 P-M1-WS-07 我的账户 / AI 对接员可导出 / Skill·课程管理双条件 / `/admin/*`→`/enterprise/*` 路由迁移 / 登录落地表 / 元审计 ID 改 AA）
- ✅ **仓库重组**：fork QuantumNous/new-api → k272314374/hmrouter；方案文档全部并入；
  从此**单仓库** = new-api 代码 + enterprise 待建 + 方案文档。origin=fork / upstream=官方。
  旧纯文档仓归档为 hmrouter-spec-archive。M1-T01/T02/T03 实质完成。
- ✅ 页面评审修补：M1 任务数 74→104 订正 / PRD 账户偏好行勾选统一 / 命名图例补 AA / 路由迁移跨文档残留清理（ARCHITECTURE + agent-collaboration）

**当前仓库**：`E:\Huamei Project\hmrouter\` 就是项目仓库（= new-api fork），代码 + 文档同仓。

**下一步**：M1-T04 创建 enterprise/ 骨架 → Phase 0 Harness Engineering（建议新窗口 + 4 agent 并行）

### S-002（2026-05-14）

**主线**：方案文档建设 + harness 工程

- ✅ 创建 PAGES-admin.md（485 行）：完整页面 IA + 5 个典型用户旅程 + 跳转规范 + 通用组件复用清单 + M1 实施排序
- ✅ 跨文档一致性审计 + 修补（v0.10 后扫描）：表数 12→13、ADR-012 补全、CLAUDE ADR 表补 4 条、STATE 文档表补 5 项、5 部门具体列出
- ✅ Harness engineering：建 CLAUDE.md / STATE.md / DECISIONS.md / docs/workflow.md / docs/session-handoff.md
- ✅ PRD 交叉审计修补 P0：`audit_log.device_id` + `export_task` 表 + `admin_actions.go` controller（PLAN/ARCH 同步更新）
- ✅ PRD 交叉审计修补 P1：API 凭证 §5.7 / 健康检查 §5.8 / 菜单整合 / 审计保留 1 年 6 月冷存
- ✅ 创建 PRD-admin.md v0.2（959 行；M1 8 模块 + M2 5 模块 + M3+ 5 模块 = 18 模块）
- ✅ PLAN v0.9：明确统计双维度、AP14 加注释、M1 加个人页 + 个人 Excel
- ✅ knowledge-graph/ 目录建好（INDEX/query.js/sources/README）
- ✅ ARCHITECTURE 更新到 v0.8 对齐
- ✅ PLAN v0.8：清理 1190 → 999 行（DLP 外迁、章节版本标签去除、待决策精简、AP12/AP12' 合并）
- ✅ DLP-deferred.md：DLP 内容外迁归档
- ✅ PLAN v0.7：基于全项目知识图谱修正 3 处认知（前端复用、billingexpr、OAuth registry）
- ✅ 全项目知识图谱加载（6749 节点 / 30 层 / 36 步导览）

### S-001（2026-05-14 早些时候）

- 初版 PLAN v0.1 → v0.6（多次迭代，含 DLP 演化、企业方案、Agent CLI、设备白名单）
- ARCHITECTURE.md 初版（基于 relay 知识图谱）
- relay 知识图谱加载

---

## 下一步具体动作

> **更新（S-003 末）**：spec 全部重写完成，11/11 ✅，已推 GitHub。
> 详细交接见 [SESSION-S003-handoff.md](SESSION-S003-handoff.md)。

### 立刻可启动（不阻塞）

1. **(Claude 新窗口)** Phase 0 Harness Engineering 9 任务 — 详见 [TASKS.md](TASKS.md) Phase 0 章节
   - 推荐 4 agent 并行：A 写 OpenAPI+GORM、B 写 Mocks、C 写 docker+seed、D 写 CI+测试 harness
   - 估 3d 单线 / 2d 并行 wall-clock

2. **(用户)** 准备 dogfood 阶段需要的种子内容（不阻塞编码，可慢慢给）：
   - 9 部门负责人姓名 + 工号 + 企微账号
   - 张远捷信息
   - 监察审计室 compliance_auditor 候选人选 1-2 人
   - WorkBuddy + OpenClaw 教程 PDF + 视频
   - 数智营销中心 ~10 个 Skill 文件
   - 1 门 AI 学习课程示范内容

### 等外部依赖（沿用）

3. **(用户)** 企微自建应用申请（B2，已 1 天）
4. **(用户)** DeepSeek 对公付款（B3）
5. **(用户)** OpenAI/Anthropic 对公付款（B4）
6. **(用户)** 群晖 NAS 凭证（B5）
> ⚠️ Phase 0 Harness 中 mock-llm + mock-wecom 让 B2-B4 不再阻塞代码工作

### Phase 0 完成后启动 Phase 1+2（编码）

7. 9 通道 agent 并行编码 — 详见 [TASKS.md](TASKS.md) "Agent 通道设计"
   - DB / Backend×4 / Frontend×3 / DevOps
   - 预估 wall-clock 5-7 天
   - 文件所有权见 [docs/agent-collaboration.md](docs/agent-collaboration.md)

### Phase 3：dogfood + 演示

8. **(用户+Claude)** WorkBuddy + OpenClaw 真客户端调通 → PRD §8.1 M1 验收清单
9. **(用户)** 5/31 演示给 AI 转型小组（9 部门一把手 + 张主席旁听 + 张远捷）

### S-003 校准产物

- ✅ [SESSION-S003-handoff.md](SESSION-S003-handoff.md) 完整交接备忘
- ✅ [spec/error-rules.yaml](spec/error-rules.yaml) M1 5 条核心错误诊断规则
- ✅ [docs/agent-collaboration.md](docs/agent-collaboration.md) 9 通道协作规约 + CODEOWNERS

---

## 在做但未完成

（无）

---

## 待决策清单（剩余）

> 真理源 = [PRD-admin.md §9](PRD-admin.md)。S-003 已关闭多项，下面仅列**仍开放**的。

### 仍开放
- Q12：跨境合规 — 教育/营销板块要不要法务再确认（已部分解决：仅金融三部门禁境外）
- Q18：上游故障 fallback 详细策略（C-D3 已定多级回退，细节 M2 实施时定）
- Q19：计费单位
- Q23：出网防火墙白名单
- Q25：网关挂了是否留直通后门（倾向不留）
- DOPEN-1：仪表盘"成本估算"按什么价格（倾向 New-API model_ratio 表）
- TOPEN-1：M3 全文搜走 ES 还是 PG tsvector
- TOPEN-2：附件预览缩略图策略
- TOPEN-3：billingexpr 编辑器是否需要 dry-run 按钮

### S-003 已关闭（不再讨论）
- Q10 审计保留期 → ADR-011 ｜ Q11/BOPEN-3 员工知情权 → ADR-014 ｜ Q16 模型替换 → C-D6 严禁
- DOPEN-2 附件预览 → M1 仅图片/M2 加 PDF ｜ DOPEN-3 复制会话 → ADR-019 ｜ DOPEN-4 登出/过期 → 模态框重登 ｜ DOPEN-5 i18n → 头像菜单
- BOPEN-1 导出审批 → 不做（写元审计即可）｜ BOPEN-2 部门 admin 删 audit → ADR-019 部门 admin 看不到 audit 内容

---

## 风险监控（来自 PLAN §12）

- 🔴 5/31 演示来不及 — 缓解：M1 极限收敛，DeepSeek 单上游也能演示
- 🔴 OpenAI/Claude 付款拖 M1 — 缓解：M1 至少 DeepSeek 跑通
- 🔴 1 人 + Claude 撑不到 12 月 — 缓解：AP16/17 复用至上
- 🔴 审计存储成新泄密源 — 缓解：严格 RBAC + 加密
- 🟡 企微 OpenAPI 申请卡壳 — 缓解：你直接归口推进
- 🟡 部门一把手不会用 — 缓解：AI 对接员培训
- 🟡 群晖 NAS 撑不住流量 — 缓解：AP21 抽象保底
- 🟡 设备白名单首次入职流程跑不通 — 缓解：M1 演示走 SQL 手工预录
- 🟡 业务量统计口径定不下来 — 缓解：M4 给 Agent 接口让业务侧定
- 🟢 CLI 跨平台编译/分发 — Go 一行命令搞定

---

## 当前文档版本对照

| 文档 | 版本 | 行数 |
|------|------|------|
| PLAN.md | v0.11（S-003：AP27 6 角色 + §10 24 张表 + ADR-014~019 落地）| 1243 |
| PRD-admin.md | v0.3（S-003：13 域 + 6 角色 + ADR-019 + 四层对齐修补）| 1185 |
| PAGES-admin.md | v2（S-003：6 角色 + 52 页 + 四层对齐修补）| 866 |
| ARCHITECTURE.md | 跟 PLAN v0.11 / PRD v0.3 / PAGES v2 对齐（S-003 重构）| 751 |
| DLP-deferred.md | 静态归档 | 173 |
| CLAUDE.md | v1（S-003 末加 ADR/文档地图）| 235 |
| STATE.md | 本文（每次会话更新） | 229 |
| TASKS.md | v2（S-003 重构：9 通道并行；燃尽 130 任务，M1 104）| 460 |
| DECISIONS.md | ADR-001 ~ ADR-019（S-003 加 7 条；ADR-015 superseded） | 445 |
| docs/workflow.md | v1（S-002 新建） | 366 |
| docs/session-handoff.md | v1（S-002 新建） | 194 |
| SESSION-S003-handoff.md | S-003 新建（spec 完成 + 校准）| 226 |
| spec/error-rules.yaml | S-003 新建（M1 5 条诊断规则） | 155 |
| docs/agent-collaboration.md | S-003 新建（9 通道协作规约 + CODEOWNERS）| 253 |
| docs/coding-principles.md | S-003 新建（编码 4 原则，Karpathy 派生）| 131 |
| scripts/check-consistency.js | 15 项检查（S-003 升级）| 574 |
| knowledge-graph/INDEX.md | 跟 commit 196a82d 对齐 | 239 |
| knowledge-graph/query.js | 13 查询命令 | 330 |

---

## 会话结束前 checklist（给 Claude 自己）

- [ ] 更新本文件"当前里程碑子任务进度"
- [ ] 更新"当前阻塞"
- [ ] 在"最近 session 做了什么"加新条目
- [ ] 更新"下一步具体动作"
- [ ] 如果有未完成工作，写"在做但未完成"
- [ ] 如果做了重大决策，去 DECISIONS.md 加 ADR
- [ ] 如果有新待决策项，加到"待决策清单"
- [ ] 更新顶部"最后更新"时间和会话编号
