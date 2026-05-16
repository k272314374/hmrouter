# 多 Agent 并行编码协作约定

> S-003 立 · 2026-05-15
> 目的：M1 编码阶段 9 个 agent 通道并行不互改对方文件、不冲突、不重写。
> 适用：Phase 0 Harness 完成后的 Phase 1+2 编码阶段。

---

## 1. 9 通道职责边界

> 详见 [TASKS.md](../TASKS.md) "Agent 通道设计"。本文专注**文件所有权**。

| 通道 | 主要负责文件/目录 | 不得改 |
|---|---|---|
| **DB-Agent** | `enterprise/model/*.go` + `migrations/*.sql` + `scripts/seed/*` | 其他通道的 controller/middleware/前端 |
| **Backend-A** Auth/User/Dept | `enterprise/oauth/wecom.go` / `enterprise/controller/users.go` / `enterprise/controller/departments.go` / `enterprise/middleware/role_guard.go` | model/middleware 中其他 agent 的 |
| **Backend-B** Audit/Recorder | `enterprise/middleware/audit_recorder.go` / `enterprise/middleware/device_token_guard.go` / `enterprise/middleware/admin_action_log_hook.go` / `enterprise/service/audit_*.go` / `enterprise/service/error_diagnosis.go` / `enterprise/controller/audit.go` / `enterprise/controller/admin_actions.go` | 其他 controller / 前端 |
| **Backend-C** Quota/Models | `enterprise/middleware/personal_rate_limit.go` / `enterprise/middleware/dept_model_acl.go` / `enterprise/middleware/dept_budget_guard.go` (M2) / `enterprise/controller/dashboard.go` / `enterprise/controller/export.go` / `enterprise/controller/dept_model_acl.go` / `enterprise/controller/models_meta.go` / `enterprise/service/model_status.go` / `enterprise/service/cost_estimate.go` / `enterprise/service/budget_*.go` (M2) | — |
| **Backend-D** Resources/Inbox | `enterprise/controller/{announcements,announcement_ack,skills,courses,resources,inbox,devices,service_accounts,health}.go` / `enterprise/middleware/ip_whitelist.go` / `cli/*` / `enterprise/service/notification_pusher.go` (M2) | — |
| **Frontend-A** 公共组件 + 员工域 | `web/default/src/components/ui-enterprise/*` / `web/default/src/features/workspace/*` / `web/default/src/features/help/*` | 其他前端 features |
| **Frontend-B** 企业管理 + 调用记录 | `web/default/src/features/enterprise/*` (除 announcements 子目录) / `web/default/src/features/audit/*` | — |
| **Frontend-C** 公告/Skill/课程/系统域 | `web/default/src/features/admin/announcements/*` / `web/default/src/features/admin/skills/*` / `web/default/src/features/admin/courses/*` / `web/default/src/features/admin/health/*` / `web/default/src/features/admin/dept-model-acl/*` / **路由 / 菜单 filter** | — |
| **DevOps-Agent** | `.github/workflows/*` / `scripts/*` (除 seed) / `docker-compose.*.yml` / `Dockerfile` | 应用代码 |

---

## 2. 共享文件（多 agent 都可能动）的协作规则

| 文件 | 谁能改 | 怎么协作 |
|---|---|---|
| `router/main.go` | **仅 Backend-A** 集中加 `enterprise.SetupRouter()` 一行；其他 agent 提需求让 A 加 | 加完 A 通知所有人 |
| `middleware/distributor.go` | **仅 Backend-B** 集中加 3 个钩子 | 一次性加完 |
| `model/user.go` | **仅 Backend-A** 集中扩 5 个 HR 字段 | 一次性扩完 |
| `model/token.go` | **仅 Backend-A** 集中扩 owner_type/owner_id | 一次性扩完 |
| `web/default/src/i18n/locales/{zh,en}.json` | **任意前端 agent 可改自己 feature 的 key** | 命名空间隔离：`workspace.xxx` / `enterprise.xxx` / `admin.xxx`，避免顶层冲突 |
| `web/default/src/router/*` | **仅 Frontend-C** 注册路由 | 其他 agent 提需求 |
| `web/default/src/components/Layout/Menu*` | **仅 Frontend-C** 改 6 角色菜单 filter | — |
| `spec/openapi.yaml` | **仅 Phase 0 Harness 阶段我冻结**；之后只能补充新 endpoint（PR 走 review）| 不能修改已存在 endpoint 的 schema |

---

## 3. 文件命名规范（避免命名冲突）

### Go 后端
- Controller：`enterprise/controller/<resource_singular>.go`（如 `users.go` `audit.go`）
- Middleware：`enterprise/middleware/<verb_object>.go`（如 `role_guard.go` `audit_recorder.go`）
- Service：`enterprise/service/<noun_or_verb>.go`（如 `audit_storage.go` `error_diagnosis.go`）
- Model：`enterprise/model/<table_name>.go`，跟 PLAN §10.1 表名一一对应

### 前端
- Feature 目录：`web/default/src/features/<domain>/<sub-domain>/index.tsx`（如 `workspace/skills/index.tsx`）
- 公共组件：`web/default/src/components/ui-enterprise/<ComponentName>.tsx`（PascalCase）
- 类型：从 `spec/openapi.yaml` 自动生成到 `web/default/src/types/api.ts`，**不手写**

---

## 4. 任务领取与状态同步

每个 agent 启动时：
1. 读 [TASKS.md](../TASKS.md) 找自己通道的待办任务（状态 `☐`）
2. 把当前要做的任务标 `⏳`（commit message 形式声明 "claim T-XX01"）
3. 完成后改 `✓` + 填实际时间
4. **每个 commit message 必须含任务 ID**（如 `[T-BB05] audit_writer 异步队列 + 失败重试`）

冲突解决：
- 同时 claim 同一任务 → 后到的 agent 让出 + 找下一个
- 跨通道依赖（如 Frontend 等 Backend 的 endpoint） → 用 mock 数据先开发，待 Backend 完成 endpoint 后联调

---

## 5. 编码风格 + 提交规范

> ⚠️ 编码行为铁律见 [coding-principles.md](coding-principles.md)（4 原则：Think Before Coding / Simplicity First / Surgical Changes / Goal-Driven）— **每个编码 agent 启动必读**。

### Go
- `gofmt -s` 强制（pre-commit hook 已配）
- `golangci-lint run` 必须 0 警告
- 包注释：每个 package 头注必须含 ★ 标识企业模块归属（如 `// Package controller — Backend-A: Auth/User/Dept`）

### TypeScript
- ESLint + Prettier 强制
- 严格模式 + 不允许 `any`
- 组件文件头注：`// FE-A: workspace 工作台主页`

### Commit message
格式：`[<task-id>] <imperative summary>`

例：
```
[T-BB05] audit_writer 异步队列 + 失败重试 + 死信告警

- 用 Redis stream 做异步队列
- 失败 3 次进死信表 + inbox 告警
- 单元测试覆盖 happy path + 失败场景

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## 6. 集成测试边界

每个 agent 跑自己模块的单元测试。

集成测试由 **DevOps-Agent** 维护：`tests/integration/*` 含 E2E 关键流：
- 员工 onboarding（扫码 → pending → 激活 → 复制 Token → 调通 mock LLM）
- AI 对接员审批设备激活
- 集团 admin 查 audit 详情
- 公告强制确认
- Skill 下载

每次 PR 合入 master 前必须跑通。

---

## 7. 跨 agent 沟通

正常情况：通过 commit message + PR 评论。

紧急情况（如发现 spec 不一致 / 决策需要调整）：**通过 ADR 或 PR 评论 @ 用户**。Agent 间不直接对话。

任何 agent 不得**擅自修改 spec 文档**（PRD/PAGES/PLAN/ARCHITECTURE/TASKS）— 除 DevOps-Agent 维护 TASKS 任务状态。Spec 改动走用户。

---

## 8. CODEOWNERS 文件（GitHub PR 自动 review）

> 路径：`.github/CODEOWNERS`（DevOps-Agent 在 Phase 0 创建）

```
# 默认 owner
*                                   @hmrouter-team

# DB
/enterprise/model/                  @db-agent
/migrations/                        @db-agent
/scripts/seed/                      @db-agent

# Backend-A
/enterprise/oauth/                  @backend-a
/enterprise/controller/users.go     @backend-a
/enterprise/controller/departments.go @backend-a
/enterprise/middleware/role_guard.go @backend-a

# Backend-B
/enterprise/middleware/audit_recorder.go        @backend-b
/enterprise/middleware/device_token_guard.go    @backend-b
/enterprise/middleware/admin_action_log_hook.go @backend-b
/enterprise/service/audit_*.go                  @backend-b
/enterprise/service/error_diagnosis.go          @backend-b
/enterprise/controller/audit.go                 @backend-b
/enterprise/controller/admin_actions.go         @backend-b

# Backend-C
/enterprise/middleware/personal_rate_limit.go   @backend-c
/enterprise/middleware/dept_model_acl.go        @backend-c
/enterprise/middleware/dept_budget_guard.go     @backend-c
/enterprise/controller/dashboard.go             @backend-c
/enterprise/controller/export.go                @backend-c
/enterprise/controller/dept_model_acl.go        @backend-c
/enterprise/controller/models_meta.go           @backend-c
/enterprise/service/model_status.go             @backend-c
/enterprise/service/cost_estimate.go            @backend-c
/enterprise/service/budget_*.go                 @backend-c

# Backend-D
/enterprise/controller/announcements.go         @backend-d
/enterprise/controller/announcement_ack.go      @backend-d
/enterprise/controller/skills.go                @backend-d
/enterprise/controller/courses.go               @backend-d
/enterprise/controller/resources.go             @backend-d
/enterprise/controller/inbox.go                 @backend-d
/enterprise/controller/devices.go               @backend-d
/enterprise/controller/service_accounts.go      @backend-d
/enterprise/controller/health.go                @backend-d
/enterprise/middleware/ip_whitelist.go          @backend-d
/cli/                                           @backend-d

# Frontend-A
/web/default/src/components/ui-enterprise/      @frontend-a
/web/default/src/features/workspace/            @frontend-a
/web/default/src/features/help/                 @frontend-a

# Frontend-B
/web/default/src/features/enterprise/           @frontend-b
/web/default/src/features/audit/                @frontend-b

# Frontend-C
/web/default/src/features/admin/                @frontend-c
/web/default/src/router/                        @frontend-c
/web/default/src/components/Layout/Menu*        @frontend-c

# DevOps
/.github/                                       @devops-agent
/scripts/                                       @devops-agent
/docker-compose.*.yml                           @devops-agent
/Dockerfile                                     @devops-agent
/tests/integration/                             @devops-agent

# Spec（仅用户可改，agent 通过 PR 提议）
/PRD-admin.md                                   @user
/PAGES-admin.md                                 @user
/PLAN.md                                        @user
/ARCHITECTURE.md                                @user
/DECISIONS.md                                   @user
/CLAUDE.md                                      @user
/STATE.md                                       @user
/spec/                                          @user

# 共享文件（多 owner，必须双签）
/router/main.go                                 @backend-a @user
/middleware/distributor.go                      @backend-b @user
/model/user.go                                  @backend-a @user
/model/token.go                                 @backend-a @user
/web/default/src/i18n/                          @frontend-a @frontend-b @frontend-c
```

> Agent 名是占位符。实际派 agent 时用 GitHub username 替换。

---

## 9. 出现冲突的处理

- **2 个 agent 改了同一文件** → 按 CODEOWNERS 决定，被 own 的那位 win，另一位 rebase
- **Spec 不一致** → 任何 agent 发现立刻停手 + 提 PR 评论 @ 用户，等用户决策
- **测试失败** → owner 修，不要"换个测试用例绕过"
- **CI 红 > 30 min** → DevOps-Agent 介入

---

## 10. 工作流摘要

```
1. 启动 agent
2. 读 CLAUDE.md → STATE.md → TASKS.md → 本文件 → coding-principles.md
3. 找通道下一个 ☐ 任务，标 ⏳ + commit "[T-XX01] claim"
4. 实现 + 单元测试
5. PR：commit "[T-XX01] <description>" + push + 自动 CI
6. CI 通过 + CODEOWNERS 批准 → merge
7. 改 TASKS.md ✓ + 实际时间 → 找下一个任务
8. 进度有阻塞 → PR 评论 @ 用户

Don't:
- 不改 spec 文档
- 不擅自改其他 agent owner 的文件
- 不跳过 pre-commit hook
- 不 force push master
- 不删除别人的 commit
```
