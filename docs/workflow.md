# 开发流程与规范

> 1 全栈 + Claude 节奏。规则极简，但每条都执行。

---

## 1. 文档分工与变更流

```
PLAN.md           决策（AP / 路线图 / 开放问题）
PRD-admin.md      功能（页面 / 字段 / API / 验收）
ARCHITECTURE.md   设计（架构图 / 模块 / 数据流 / 改造点）
DECISIONS.md      决策日志（追加，不删不改）
STATE.md          动态状态（每次 session 末尾更新）
DLP-deferred.md   搁置归档（不动）
knowledge-graph/  事实参照（New-API 实际是怎样）
docs/             流程类文档（本文件）
CLAUDE.md         Claude 入口（少改）
```

### 文档变更规则

| 改 | 何时 | 谁 |
|----|------|----|
| PLAN.md | 方案级变更（AP 增删、路线图调整、范围变更） | 用户 + Claude 商议后 Claude 执行；版本号 +0.1 + 加版本历史项 |
| PRD-admin.md | 功能级变更（页面增删、字段调整、验收点修改） | Claude 执行；顶部版本说明加注 |
| ARCHITECTURE.md | 架构层面变更（模块、数据流、关系图） | Claude 执行；与 PLAN/PRD 同步 |
| DECISIONS.md | 重大决策拍板时 | Claude 追加 ADR；不改旧条目 |
| STATE.md | 每次 session 末尾 + 中途状态变化 | Claude 自动维护 |
| CLAUDE.md | 极少改（影响所有未来会话） | 只在工作风格/硬约束变化时；用户拍板 |

### 跨文档一致性

任何变更都要思考：
- PLAN 改了 → ARCH 数据流要不要改？PRD 字段表要不要改？
- PRD 加了新字段 → PLAN 数据模型要不要加？
- 新 ADR → 是否要更新 CLAUDE §3 AP 速查或 §4 已决策表？

---

## 2. Git 工作流

### 当前阶段（M0 之前）
- `hmrouter/` 还没初始化 git
- 文档暂存本地
- M0 启动时一次性 init + first commit + push 到 GitHub fork

### M0 后（git 已就位）

**Repo 拓扑**（已决，见 ADR / 早期讨论）：
- `k272314374/hmrouter` 私有 GitHub repo（fork from QuantumNous/new-api）
- 双 remote：`origin`（我们的）+ `upstream`（QuantumNous）

**分支模型**（轻量）：
```
main          始终可部署，受保护，禁止 force push
dev           开发主线，所有 feature 合到这
feature/M1-*  按里程碑拉 feature 分支
hotfix/*      紧急修复
```

**Commit 信息约定**：
```
<type>(<scope>): <subject>

[optional body]
```
- type: `feat` / `fix` / `chore` / `docs` / `refactor` / `test` / `perf`
- scope: `enterprise` / `cli` / `frontend` / `infra` / `docs` / 文件夹名等
- subject: 一句话祈使句

例：
- `feat(enterprise): add audit_recorder middleware`
- `fix(cli): correct device token expiry handling`
- `docs(plan): bump to v0.11 add ADR-NNN`
- `chore: bump new-api submodule`

**永远不要**：
- 直接 push main（feature → dev → main）
- `git reset --hard` 远程分支
- `--no-verify` 跳过 hooks
- 强推（force push）main / dev

**首次 init 时要做**：
1. `git init`
2. 加 `.gitignore`（覆盖 Go / Node / IDE / OS / 机密）
3. 加 GitHub remote
4. 加 upstream remote
5. 首次 commit：`chore: initialize hmrouter from new-api fork`

### Upstream 同步流程
**频率**：每月或每季度（看 New-API release 节奏）

**步骤**：
```bash
git fetch upstream
git checkout dev
git rebase upstream/main
# 解决冲突（理论上仅 4 处原文件改动会冲突）
go test ./...
bun run build
# 通过则 push
git push origin dev --force-with-lease  # 仅 dev，不动 main
```

**冲突处理**：
- AP13 决策保证冲突仅在 4 处（`router/main.go` / `middleware/distributor.go` / `model/user.go` / `model/token.go`）
- 冲突 > 5 处时停下来分析是否 New-API 重构了相关模块
- 同步失败一律记到 DECISIONS.md（不要静默放弃）

---

## 3. 测试与验证

### 写代码时
- Go 后端：每个 service / middleware 写一个 `_test.go` 跑单元测试
- 前端：复杂逻辑写组件测试，简单展示页跳过
- **复用** New-API 已有的测试 fixture（`controller/*_test.go`）

### 提 commit 前
- `go test ./enterprise/...`
- `go vet ./enterprise/...`
- `cd web/default && bun run lint`
- 跨 DB 改动：分别在 SQLite / PostgreSQL 跑 AutoMigrate（遵循 [new-api/CLAUDE.md Rule 2](../new-api/CLAUDE.md)）

### 里程碑验收
按 [PRD-admin.md §10](../PRD-admin.md) 的 DoD 清单一项项过。

### Dogfooding
**每个里程碑前一天必做**：自己装 Cherry Studio / Cursor，配置 hmrouter 当上游，**亲自跑一次**完整流程。
- 调通了 ✅
- 看板有数据 ✅
- 会话能详情 ✅
- 导出能下载 ✅

如果自己用着别扭，演示时一定也别扭。

---

## 4. 决策与变更流

### 小决策（不影响别人 / 可逆）
直接做，记 STATE.md "最近 session 做了什么"即可。

例：选 cn() 还是 classnames() → 选了就完，无需 ADR。

### 中决策（影响 1-2 个模块 / 可逆但麻烦）
跟用户确认 → 做 → 记 STATE.md。

例：表单库选 React Hook Form vs Formik。

### 大决策（影响架构 / 难逆 / 推翻 AP）
1. 跟用户充分讨论
2. 拍板后**先写 ADR**（DECISIONS.md 追加）
3. 再改 PLAN/PRD/ARCH 同步
4. 最后才动代码

例：把单 repo 改多 repo / 把 New-API 换成 LiteLLM。

---

## 5. 复用优先（AP16）

**写代码前先查**：
- New-API 是不是已有？→ 查 [knowledge-graph/INDEX.md](../knowledge-graph/INDEX.md) §五"隐藏的能力宝藏"
- 类似模块在 features/ 哪个域？→ `node knowledge-graph/query.js features` + `grep`
- 某个 utility 函数原项目有没有？→ `node knowledge-graph/query.js summary "xxx"`

**判断标准**：
- ✅ 复用 if 节约 > 半天工作量 + 风格不冲突
- ❌ 不复用 if 改造原代码 > 新写
- 📝 任何复用决策记 STATE.md

---

## 6. 常用命令速查

### 知识图谱
```bash
node knowledge-graph/query.js stats            # 总览
node knowledge-graph/query.js layer enterprise # 不存在的会报错，用作格式校验
node knowledge-graph/query.js file middleware/distributor.go
node knowledge-graph/query.js refs common/json.go
node knowledge-graph/query.js adapters
node knowledge-graph/query.js features
node knowledge-graph/query.js grep "billing"
node knowledge-graph/query.js summary "缓存"
```

### 本地开发（M0 后）
```bash
# 起依赖
docker compose -f deploy/docker-compose.dev.yml up -d

# 后端
cd new-api && go run main.go

# 前端
cd new-api/web/default && bun run dev

# CLI
cd cli && go build -o ../bin/hmrouter-cli && ../bin/hmrouter-cli --help
```

### 测试
```bash
go test ./enterprise/...
go test ./cli/...
cd web/default && bun run lint && bun run typecheck
```

### Git
```bash
git status
git log --oneline -10
git diff
gh pr create --draft
```

---

## 7. 文档维护清单（季度自检）

每个季度做一次：
- [ ] PLAN.md 是否还反映当前认知？过时章节清理
- [ ] PRD-admin.md 中 P3+ 模块是否需要重写（情况变化大）
- [ ] DECISIONS.md 是否有 supersede 关系没标注
- [ ] STATE.md 是否还在被维护（如果好几个 session 没更新 = 流程坏了）
- [ ] knowledge-graph 是否需要重生成（New-API upstream 大改后）
- [ ] CLAUDE.md AP 速查是否跟 PLAN 一致

---

## 8. 安全规则（始终适用）

- ⛔ 不擅自启 Docker / 改 git remote / push
- ⛔ 不写真实秘钥到任何 markdown / commit / log
- ⛔ 不写测试数据进 audit_log（生产意义上）
- ⛔ 不删 admin_action_log 任何记录（GORM hook 应阻止）
- ⛔ 不绕过 DeviceTokenGuard 测试（找其他方式）
- ✅ 任何疑似秘钥的字符串 → `.env`（gitignore） + `.env.example`（占位）
- ✅ 任何破坏性 git 命令前停一停（rm -rf / reset --hard / push --force）

---

## 8.5 一致性自检（防文档漂移）

文档之间高度交叉引用。**任何改 PLAN/PRD/ARCH/DECISIONS/TASKS/STATE 后必跑**：

```bash
node scripts/check-consistency.js
```

**当前 11 项检查**：
| ID | 检查 |
|----|------|
| CHK-01 | 企业新表数量在所有文档一致 |
| CHK-02 | AP 引用都在 PLAN §2 范围内 |
| CHK-03 | ADR 引用都在 DECISIONS.md 范围内 |
| CHK-04 | STATE 文档版本对照表的行数与实际一致（±5% 容忍）|
| CHK-05 | PLAN 顶部版本号与 §0.3 最新一致 |
| CHK-06 | knowledge-graph 数据点跨文档一致（节点/边/层/厂商/组件/i18n）|
| CHK-07 | TASKS 燃尽快报数字内部一致 |
| CHK-08 | DLP 内容无泄漏回主文档 |
| CHK-09 | 所有必要文件存在 |
| CHK-10 | PRD 权限矩阵 5 角色都列了 |
| CHK-11 | PLAN §10.0 总览中 M1 实现表数 = 实际 M1 表数 |

**规则**：
- 修改后**必须 11 / 11 绿**才算改完
- 失败当场修，不留尾巴
- 加新检查项：在 `scripts/check-consistency.js` 末尾加一个 `check(...)` 块
- 容忍误差（如行数 ±5%）已经内置，不要为此 disable check

**何时新加检查项**：
- 出现新的"重要事实"被多文档引用（如新里程碑数 / 新角色 / 新概念）
- 一致性事故复盘后（防止同样的错再发生）

---

## 9. 变更管理（防 scope 爆炸）

### 用户中途加需求时的流程

1. **不要立刻答应"加进 M1"** —— 先评估
2. **写到 [TASKS.md "变更日志"](../TASKS.md) 区**，按模板：
   ```
   ### YYYY-MM-DD - 短描述
   - 用户："xxx" → 影响 M1-T?? + 新增 M1-T?? → 决定 in-scope / push 到 M_next
   ```
3. **算燃尽影响**：当前 M 还有多少 buffer？这次加完是否还能按时？
4. **回复用户**，明示三选一：
   - ✅ in-scope（buffer 够 / 增加任务在 budget 内）
   - 📅 push 到下个 M（buffer 紧 / 不影响 M deadline 的核心 demo）
   - 🔥 in-scope 但要砍其他（必须做 + buffer 不够 → 商量砍哪个）

### 变更分类

| 类型 | 处理 |
|------|------|
| **加新功能**（新页面 / 新 API） | 走上面流程 |
| **改既有需求**（字段变化 / 行为调整） | 评估返工量；如 < 0.5d 直接吸收，否则按变更走 |
| **改 AP 原则** | 必须新 ADR，跟 [DECISIONS.md](../DECISIONS.md) |
| **改优先级**（M2 提到 M1 / M1 推到 M2） | 改 TASKS 里程碑归属 + 重算燃尽 |

### 反模式（不要做）

| ❌ | ✅ |
|----|-----|
| "我加进 M1 了"（口头同意没记） | 立刻写 TASKS 变更日志 + 评估 |
| "好的我做"（不算 buffer） | 先算 M1 是否还按时 |
| 默默砍掉某任务以容纳新需求 | 明示用户"为加 X 我建议砍 Y" |

---

## 10. 里程碑回顾（Retro）

每个 M 完成后**强制做**，不超过 30 分钟。

### Retro 模板

```markdown
# M1 Retro - YYYY-MM-DD

## 数字
- 估时 vs 实际：13.7d → ?d（偏差 ?%）
- 任务总数：38 → 实际完成 ?（含中途加的）
- buffer 用完否：
- 跨过的阻塞：B1/B2/...

## 估算失准 Top 3
1. M1-T?? 估 0.5d 实际 ?d（原因：）
2. ...

## 意料之外的事
1. ...
2. ...

## 校准下个 M
- M2 哪些任务估时要加倍 / 减半？
- 哪些假设被证伪？
- 哪些原则要新写 ADR？

## 沉淀经验（写进 docs/workflow.md）
1. ...
```

### Retro 触发动作

完成 retro 后立刻：
- [ ] 把"沉淀经验"加进 docs/workflow.md
- [ ] 校准 TASKS.md 下个 M 的估时
- [ ] 加新 ADR（如有）
- [ ] STATE.md 切到下个 M
- [ ] 给用户报一份"M? 完成 + 进入 M? 启动"

---

## 11. 跟用户沟通的风格

参考 CLAUDE.md §5 项目元信息。要点：
- **直接**：少铺垫
- **诚实**：不知道就说不知道
- **节奏**：用户喜欢"先讨论清楚再做工程"，但讨论完就要立刻能开干，别拖
- **简洁**：用户对冗余很敏感（v0.8 专门做了一轮清理）
- **图表 > 散文**：能用表格就用表格、能用代码块就不解释
