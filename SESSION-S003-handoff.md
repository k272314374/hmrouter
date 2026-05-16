# Session S-003 交接备忘

> 创建：2026-05-15
> 末次更新：2026-05-15（spec 重写完成 + 校准动作完成）
> 用途：换机/新会话续上，无需重读全部历史就能续接

---

## 1. S-003 一句话总结

**13 域 113 项决策深聊全部锁定 → 7 条新 ADR + 5 个核心 spec 文档全部按新决策重写完成 → 一致性 11/11 → 全部推上 GitHub。**

下一步是 **Phase 0 Harness Engineering**（建议在新窗口开始 + 多 agent 并行）。

---

## 2. S-003 主要产出

### 2.1 决策（DECISIONS.md，ADR-013~019）

| ADR | 决议 |
|---|---|
| ADR-013 | 加合规审计专员角色（5→6 角色）|
| ADR-014 | 公告与合规须知模块 M1 加入（解决员工知情权 Q11/BOPEN-3）|
| ADR-015 | ~~显示层脱敏~~ → SUPERSEDED by ADR-019 |
| ADR-016 | 风险事件软风控 M3（敏感词命中告警不拦截，AP19 守住）|
| ADR-017 | 集团 admin 权限上提 + 张远捷角色定位（group_admin）|
| ADR-018 | Agent 工具开放策略（M1 推荐 WorkBuddy + OpenClaw，3 层策略）|
| ADR-019 | **调用内容三角色严格可见**（root / group_admin / compliance_auditor 独占；员工本人也不能在后台看自己内容）|

### 2.2 Spec 文档全部重写

| 文档 | v 旧 | v 新 | 主要改动 |
|---|---|---|---|
| PRD-admin.md | v0.2 / 959 行 / 5 角色 / 18 模块按里程碑 | **v0.3 / 1178 行 / 6 角色 / 13 域** | 按域重组 + 严格 3 角色 + 新模块 |
| PAGES-admin.md | v1 / 485 行 / 11 页 | **v2 / 823 行 / 38 页** | 6 角色菜单变形 + 17 公共组件 + 9 旅程 |
| PLAN.md | v0.10 / 13 张表 | **v0.11 / 24 张表** | AP27 6 角色 + 11 张新表 schema |
| TASKS.md | 38 任务 | **117 任务（9 通道）** | Phase 0 Harness + 9 agent 通道 |
| ARCHITECTURE.md | 12 表 | **24 表** + middleware 链扩展 | 反映新 enterprise 模块 |

### 2.3 核心战略澄清

- **算力主权 + Agent 工具自由**（ADR-018）：API 控制权在 hmrouter，agent 工具（WorkBuddy/OpenClaw/...）可换
- **员工 4 件事**（用户明确）：① 工作台拿 Token + 选模型 + 看用量 ② Skill 中心 ③ AI 学习中心 ④ 公告查看
- **WorkBuddy = 腾讯产品**（不是自家），免费版可配第三方 OpenAI 兼容 API → 替代付费版积分
- **9 部门**（非 5 板块）：证券投资部 / 金融事业部 / 股权事业部 / 人力资源中心 / 计划财务部 / 总裁办 / 数智营销中心 / 监察审计室 / 法务部
- **金融三部门禁境外**（证券/金融/股权）→ C-D2 default
- **张远捷 = group_admin**（含明文 + 元审计权限），监察审计室人员 = compliance_auditor
- **数智营销中心独家**维护 Skill 中心 + AI 学习中心
- **中间层不录像**（术语统一为"调用记录"）

### 2.4 关键决策汇总（13 域 + J-11/J-12）

详见 PRD-admin.md v0.3 §5 各域 + DECISIONS.md ADR-013~019。要点：
- C 域 10 决策 / J 域 10 决策 + J-11 8 决策 + J-12 5 决策 / D 域 10 决策 / L 域 10 决策 / B 域 10 决策 / A 域 10 决策 / E 域 10 决策 / F 域 5 决策 / G 域 5 决策 / H 域 5 决策 / I 域 6 决策 / K 域 4 决策 / M 域 5 决策

### 2.5 校准动作完成（S-003 收尾）

- ✅ SESSION-S003-handoff.md 更新（本文）
- ✅ STATE.md "下一步具体动作" 重写
- ✅ spec/error-rules.yaml 5 条核心错误诊断规则
- ✅ docs/agent-collaboration.md 9 通道协作规约 + CODEOWNERS
- ✅ 编码 4 原则（Karpathy 派生）集成进 CLAUDE.md §3.5

---

## 3. 当前 GitHub 状态

```
d4693c9 S-003 spec 重写收尾 — PAGES v2 / PLAN v0.11 / TASKS v2 / ARCH 同步
670f67d PRD v0.3 重写 — 按 13 域重组 + 6 角色 + ADR-013~019 落地
b86a32c 剥离 new-api submodule 引用
f34043e 方案文档骨架：S-002 初版 + S-003 13域深聊（C/J/D 锁定）
196a82d initial snapshot
```

仓库：https://github.com/k272314374/hmrouter （private）

---

## 4. 已知未决项（spec 已稳但需运营/法务介入）

### 4.1 用户那侧需准备的（不阻塞 harness/编码，dogfood 时需要）

| 项 | 责任 | 何时需要 |
|---|---|---|
| 9 部门负责人姓名 + 工号 + 企微账号 | 用户对接 HR | M1 dogfood 前 |
| 张远捷信息（工号 / 企微）| 用户 | 同上 |
| 监察审计室 1-2 人选 compliance_auditor | 用户 | 同上 |
| WorkBuddy 教程 PDF + 视频 | 用户/数智营销中心 | M1 dogfood 前 |
| OpenClaw 教程 PDF + 视频 | 同上 | 同上 |
| 数智营销中心 ~10 个 Skill 文件交付 | 数智营销中心 | M1 dogfood 前 |
| 1 门 AI 学习课程示范内容 + 视频 | 数智营销中心 | M1 dogfood 前 |

> **不阻塞编码**：seed 数据可用占位符（如 `部门负责人-证券-001`），Phase 0 Seed 生成器留接口让真名替换。

### 4.2 PRD §9 仍开放问题（尚未拍板，对编码影响小）

仅列待拍板的（已关闭的不重复）：
- DOPEN-1：仪表盘成本估算用什么价格表
- DOPEN-2：会话详情页附件预览，PDF/Word 在线渲染或仅下载
- DOPEN-4：Session 过期交互细节
- DOPEN-5：i18n 切换控件位置
- TOPEN-1：M3 全文搜走 ES 还是 PG tsvector
- TOPEN-2：附件预览缩略图策略
- TOPEN-3：billingexpr 编辑器是否需要 dry-run 按钮
- Q12：跨境合规 — 教育/营销板块法务再确认
- Q18：上游故障 fallback 详细策略
- Q19：计费单位
- Q23：出网防火墙白名单
- Q25：网关挂了是否留直通后门

### 4.3 外部阻塞（沿用，影响 dogfood 不影响编码）

- B1 Docker Desktop 等用户启动
- B2 企微自建应用申请
- B3 DeepSeek 对公付款
- B4 OpenAI / Anthropic 对公付款
- B5 群晖 NAS 凭证

> **Phase 0 Harness 中 mock-llm + mock-wecom 让 B2-B4 不阻塞代码**，仍需真凭证才能 dogfood。

---

## 5. 下一阶段：Phase 0 Harness Engineering（建议）

### 5.1 时间预估

3 天（单线，少量并行可压缩到 2 天）。

### 5.2 9 个 Harness 任务（详见 TASKS.md "Phase 0"）

| ID | 任务 | 估时 |
|---|---|---|
| T-H01 | OpenAPI 3.1 契约（spec/openapi.yaml）| 0.7d |
| T-H02 | GORM models 冻结 | 0.5d |
| T-H03a | Mock LLM upstream | 0.3d |
| T-H03b | Mock 企微 OAuth | 0.2d |
| T-H04 | docker-compose dev stack | 0.5d |
| T-H05 | Seed 数据生成器 | 0.5d |
| T-H06 | 共享 types 自动生成 | 0.2d |
| T-H07 | 测试 harness 模板 | 0.3d |
| T-H08 | pre-commit + GitHub Actions | 0.3d |
| T-H09 | 任务派发文档 | 0.2d |

### 5.3 推荐启动方式

**新窗口 + 4 个并行 agent**：
- A. T-H01（OpenAPI）+ T-H02（GORM models）— 串行做完 → 是其他 agent 的契约
- B. T-H03a + T-H03b — 写 mock 服务
- C. T-H04 + T-H05 — 写 docker-compose + seed
- D. T-H07 + T-H08 — 写测试 harness + CI

T-H06 / T-H09 在 H01-H02 完成后做。

---

## 6. 之后阶段（参考 TASKS.md）

```
Phase 1+2 编码（5-7d wall-clock）：9 个 agent 并行
Phase 3 收尾 + dogfood（1d）
M1 演示（5/31）
M2 金融试点（6/30）
M3 通报会版（8/31）
```

---

## 7. 新窗口/新会话续接 step-by-step

```bash
# 1. clone（如果新机）
git clone https://github.com/k272314374/hmrouter.git
cd hmrouter

# 2. 验证
node scripts/check-consistency.js   # 应 11/11 ✅

# 3. 启动 Claude Code

# 4. 让 Claude 按顺序读：
#    CLAUDE.md → STATE.md → 本文件 SESSION-S003-handoff.md →
#    DECISIONS.md ADR-013~019 → spec/error-rules.yaml →
#    docs/agent-collaboration.md（编码 4 原则见 CLAUDE.md §3.5）
#
# 读完应该说类似：
#    "S-003 spec 重写已完成（PRD v0.3 / PAGES v2 / PLAN v0.11 / TASKS v2 / ARCH）。
#     下一步建议进 Phase 0 Harness Engineering。
#     用户可选：① 我串行做完 9 个 harness 任务 ② 派 4 个并行 agent"

# 5. 你定方向后 Claude 启动
```

---

## 8. 老旧信息（保留备查）

### S-003 早期阶段（已完成）

- 术语统一：`录像→记录` / `回放→详情` / `ChatReplay→ChatTranscript` / `audit/replay→audit/detail`，9 个文件批量替换
- UX 审视 v1（偏向"张主席演示翻车"）— 后被反思 → v2 改为员工 + AI 对接员日常视角
- 产品定位 3 次澄清：员工是主用户 / 不要"录像"措辞 / 算力主权而非客户端绑定
- 13 域 4 问题深入聊完（C / J / D / L / B / A / E / F / G / H / I / K / M）

### 老的 SESSION-S003-handoff §4 待改清单（已全部完成）

✅ PRD-admin.md 重写（v0.2 → v0.3）
✅ PAGES-admin.md 重写（v1 → v2）
✅ PLAN.md §10 加表（v0.10 → v0.11）
✅ TASKS.md 重排（v2，9 通道）
✅ ARCHITECTURE.md 同步
✅ STATE.md 文档版本对照表对齐
✅ 一致性检查 11/11

---

## 9. 项目数据快照（截至本次提交）

- 文档：15+ 个 markdown，~6500 行
- 已决策 ADR：19 条（含 1 superseded）
- 已盘点功能能力：~120 项（13 域 + J-11 + J-12）
- 已深聊域：13 / 13 ✅
- 数据库表：24 张企业表 + 2 张原表扩展
- M1 任务：117 个（9 通道并行 wall-clock 估 8.5d）
- 一致性检查：11/11 ✅
- GitHub commits: 5 (从 initial 起)
