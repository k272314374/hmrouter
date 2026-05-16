# 任务清单（TASKS）

> [STATE.md](STATE.md) 是"状态快照"，本文件是"任务清单"。
> **v2 重构（S-003）**：M1 任务**按 agent 通道**重排，优化并行执行；任务粒度 ≤ 0.5 天。
> 每完成一个任务：勾 ✓ + 填实际时间 + 提 commit。

---

## 燃尽快报（每会话开始时更新）

> 最后更新：2026-05-15 · 会话 S-003

| 里程碑 | Deadline | 距离 | 任务总数 | 已完成 | 完成率 | 阻塞中 | 在做 |
|------|---------|------|---------|--------|--------|--------|------|
| **M0** | 5/16（T+1） | 1 天 | 12 | 2 | 17% | 5（外部）| 0 |
| **Spec 重写**（S-003 收尾）| 5/15 | 0 天 | 5 | 4 | 80% | 0 | 1 |
| **Phase 0 Harness** | 5/18（T+3）| 3 天 | 9 | 0 | 0% | 0 | 0 |
| **M1** | 5/31（T+16）| 16 天 | **74** | 0 | 0% | 0 | 0 |
| **M2** | 6/30（T+46）| 46 天 | ~30 | 0 | 0% | — | — |
| **M3** | 8/31（T+108）| 108 天 | ~35 | 0 | 0% | — | — |

**关键指标**：
- M1 任务 38 → **74**（S-003 13 域深聊增量 + 6 角色 + 新模块 + 公共组件拆细）
- 单线 M1 工作量 ≈ **22 天**，按 **9 个 agent 通道并行** wall-clock **5-7 天**完成
- 阻塞老化：B1-B5 全部 1 天（轻度）

---

## Agent 通道设计

> 核心：spec 稳定后，**多 agent 并行编码不互改对方文件**。每 agent 一条工作流。

```
┌──────────────────────────────────────────────────────────────────┐
│  Phase 0 Harness (3d, 串行/小并行, 我先做完)                       │
│   ├─ T-H01 OpenAPI 契约 (单一真理源)                               │
│   ├─ T-H02 GORM models 冻结                                       │
│   ├─ T-H03 Mock LLM 上游 + Mock 企微                              │
│   ├─ T-H04 docker-compose dev stack                                │
│   ├─ T-H05 Seed 数据生成器 (9 部门 + 14 演示账号 + 1 万 audit)      │
│   ├─ T-H06 共享 types 自动生成 (Go + TS)                           │
│   ├─ T-H07 测试 harness 模板                                       │
│   ├─ T-H08 pre-commit + CI 雏形                                    │
│   └─ T-H09 任务派发文档 (每 agent 的 prompt 模板)                   │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
                          │
                          ▼ (Harness 完后，多 agent 并行)
┌──────────────────────────────────────────────────────────────────┐
│                    Phase 1+2 并行 (5-7 天 wall clock)              │
├──────────────────────────────────────────────────────────────────┤
│  DB-Agent (单线, 1.5d)                                             │
│   13 张 M1 表 GORM model + migration + seed                        │
│  ─────────                                                         │
│  Backend-A (Auth/User/Dept, 2d)                                    │
│   oauth/wecom.go + 用户 + 部门 + 6 角色 + 权限中间件                │
│  ─────────                                                         │
│  Backend-B (Audit/Recorder, 3d)                                    │
│   audit_recorder + device_token_guard + audit_storage              │
│   + audit controller (列表/详情/编辑/删除) + 元审计 hook            │
│  ─────────                                                         │
│  Backend-C (Quota/Models/Dashboard, 2.5d)                          │
│   个人限流 + dept-model ACL + dashboard 双维度 + 导出 Excel         │
│   + Redis 模型实时状态                                              │
│  ─────────                                                         │
│  Backend-D (Resources/Announcements/Inbox/Devices, 3d)             │
│   skill/course/announcement controller + inbox + device 激活流      │
│   + cli + service_account demo + health                            │
│  ─────────                                                         │
│  Frontend-A (公共组件 + 员工工作台, 3d)                              │
│   17 个公共组件 + 员工 4 页 + 帮助 2 页                              │
│  ─────────                                                         │
│  Frontend-B (企业管理 + 调用记录, 3d)                                │
│   仪表盘 + 员工目录 + 设备 + 导出 + inbox + 服务账号 + 部门          │
│   + 调用列表 + 详情 (仅 3 角色)                                     │
│  ─────────                                                         │
│  Frontend-C (公告/Skill/课程管理/系统域, 2.5d)                       │
│   公告管理 (含 TipTap) + Skill/课程管理 + 健康检查 + 部门-模型 ACL    │
│   + 6 角色菜单变形 + 路由 guard                                     │
│  ─────────                                                         │
│  DevOps-Agent (持续并行, 0.5d)                                      │
│   监控 CI / 一致性检查 / commit hooks                               │
└──────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  Phase 3 集成 + Dogfood (1d)                                       │
│   T-DG01 端到端联调                                                │
│   T-DG02 WorkBuddy + OpenClaw 真客户端调通                          │
│   T-DG03 5/31 演示彩排                                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## M0：本地能跑（12 任务）

| ID | 任务 | 状态 | 估时 | 实际 | 阻塞 | 责任 | DoD |
|----|------|------|------|------|------|------|-----|
| M0-X1 | 企微自建应用申请 | ⏸ | 1d | - | - | 用户 | 拿到 corp_id+agent_id+secret |
| M0-X2 | DeepSeek 对公付款 | ⏸ | 0.5d | - | - | 用户 | 拿到 API Key |
| M0-X3 | OpenAI 对公付款 | ⏸ | 7d | - | - | 用户 | 拿到 API Key + 境外网络通 |
| M0-X4 | Anthropic 对公付款 | ⏸ | 7d | - | - | 用户 | 拿到 API Key |
| M0-X5 | 群晖 NAS 凭证 | ⏸ | 3d | - | - | 用户/IT | endpoint + 账号 |
| M0-T1 | 启动 Docker Desktop | ⏸ | 0.1d | - | B1 | Claude | docker ps OK |
| M0-T2 | 起 PG/Redis/MinIO 容器 | ⏸ | 0.2d | - | T1 | Claude | 3 容器 healthy |
| M0-T3 | 跑通 New-API 后端 | ⏸ | 0.3d | - | T2 | Claude | curl /api/status 200 |
| M0-T4 | 跑通前端 dev server | ⏸ | 0.1d | - | T3 | Claude | localhost:3000 出页面 |
| M0-T5 | 注册超管 + 摸熟原后台 | ⏸ | 0.3d | - | T4 | 用户+Claude | 知道 channel/key/log 在哪 |
| M0-T6 | 关键源码踩点 | ✓ | 0.5d | 0.7d | - | Claude | 已读 distributor/relay/billing |
| M0-T7 | 全项目知识图谱加载 | ✓ | 0.2d | 0.3d | - | Claude | INDEX.md 写完 |

> ⚠️ **Phase 0 Harness 中的 mock LLM 让 M0-X2/X3/X4 不再阻塞代码工作**（仍需真凭证才能 dogfood）。

---

## Spec 重写（S-003 收尾）

| ID | 任务 | 状态 | 实际 |
|----|------|------|------|
| S-S01 | DECISIONS.md 加 ADR-013~019 | ✓ | done |
| S-S02 | PRD-admin.md v0.3 重写（按 13 域 + 6 角色）| ✓ | done |
| S-S03 | PAGES-admin.md v2 重写（38 页 + 6 角色菜单）| ✓ | done |
| S-S04 | PLAN.md v0.11（24 张表 + AP27 6 角色）| ✓ | done |
| S-S05 | TASKS.md v2 重排（按 agent 通道）| ⏳ | in progress |
| S-S06 | ARCHITECTURE.md 同步反映新模块 | ☐ | next |

---

## Phase 0：Harness Engineering（9 任务，3 天）

> Spec 稳定后立刻做。这是后续所有并行 agent 的地基。

| ID | 任务 | 估时 | DoD |
|----|------|------|-----|
| **T-H01** | OpenAPI 3.1 契约（spec/openapi.yaml）覆盖所有 enterprise/* + agent/* + workspace/* endpoints | 0.7d | 文件 commit + 通过 spectral lint |
| **T-H02** | GORM models 冻结（13 张 M1 表的 struct + 标签 + 索引）| 0.5d | go build + AutoMigrate dry-run 通过 |
| **T-H03a** | Mock LLM upstream（OpenAI 兼容 + SSE 流）| 0.3d | mock-llm 容器可启 + curl 调通 |
| **T-H03b** | Mock 企微 OAuth | 0.2d | mock-wecom 模拟扫码登录回调 |
| **T-H04** | docker-compose.dev.yml（PG + Redis + MinIO + mock-llm + mock-wecom + 后端 + 前端）| 0.5d | `docker-compose up` 一键起 |
| **T-H05** | Seed 数据生成器（9 部门 + 14 演示账号 + 50 员工 + 30 设备 + 1 万 audit_log + 5 skill + 1 课程 + 3 公告） | 0.5d | `scripts/seed/run.sh` 30s 重建 |
| **T-H06** | 共享 types 自动生成（Go: oapi-codegen + TS: openapi-typescript）| 0.2d | npm run gen-types 通过 |
| **T-H07** | 测试 harness 模板（table-driven test + mock fixture + Bruno 接口集合）| 0.3d | 1 个示范 controller 测试可跑 |
| **T-H08** | pre-commit hook + GitHub Actions 雏形（gofmt + lint + 一致性检查）| 0.3d | PR 触发 CI 通过 |
| **T-H09** | 任务派发文档（每 agent 的 prompt 模板 + 启动方式）| 0.2d | docs/agent-prompts/ |

**Harness 总估时**：3.0 天（单线，可少量并行减到 2 天）

---

## M1：演示版（74 任务，按 9 通道分派）

> M1 deadline = 5/31。Phase 0 完成后启动多 agent 并行编码。

### 通道 0：DB-Agent（13 任务，1.5d）

| ID | 任务 | 估时 | 域 | DoD |
|----|------|------|----|-----|
| T-DB01 | enterprise/model/department.go | 0.1d | A | model + 单元测试 |
| T-DB02 | user_department.go (含调岗历史) | 0.1d | A | 同上 |
| T-DB03 | service_account.go | 0.1d | B | 同上 |
| T-DB04 | device.go | 0.1d | B | 同上 |
| T-DB05 | audit_log.go (含 device_id + conversation_id) | 0.2d | E | 同上 |
| T-DB06 | audit_attachment.go | 0.1d | E | 同上 |
| T-DB07 | admin_action_log.go + GORM hook | 0.2d | F | hook 阻 update/delete |
| T-DB08 | export_task.go | 0.1d | E/D | 同上 |
| T-DB09 | announcement.go | 0.1d | L | 同上 |
| T-DB10 | user_announcement_ack.go | 0.1d | L | 同上 |
| T-DB11 | enterprise_resource.go | 0.1d | J-11/12 | 含 type=skill/course |
| T-DB12 | enterprise_resource_version.go + download_log.go | 0.1d | J-11/12 | 同上 |
| T-DB13 | AutoMigrate 跑通三库（SQLite/MySQL/PG） + Seed 灌种子数据 | 0.2d | — | 三库都建表成功 + 种子数据可见 |

### 通道 1：Backend-A（Auth/User/Dept，13 任务，2.0d）

| ID | 任务 | 估时 | 域 | DoD |
|----|------|------|----|-----|
| T-BA01 | enterprise/oauth/wecom.go（企微扫码 + 自动 user.create status=pending）| 0.5d | A | 跟原 github.go 风格一致 |
| T-BA02 | model/user.go 加 5 个 HR 字段 + AP27 角色枚举扩展（6 角色）| 0.2d | A | 兼容原 admin/common |
| T-BA03 | model/token.go 加 owner_type/owner_id | 0.2d | B | 老代码默认 owner_type='user' |
| T-BA04 | enterprise/middleware/role_guard.go（6 角色权限校验）| 0.3d | A | 单元测试覆盖各角色 |
| T-BA05 | enterprise/controller/users.go（员工目录列表 + 8 列 + 4 筛选）| 0.3d | A | 含搜索 + 分页 |
| T-BA06 | controller/users.go 详情 + 编辑（HR 字段 + 角色 + 部门）| 0.2d | A | 含权限校验 |
| T-BA07 | controller/users.go 激活 pending + 调岗（写元审计）| 0.2d | A | 含 user_department 历史行 |
| T-BA08 | enterprise/controller/departments.go（CRUD 基础）| 0.3d | A | 含 9 部门 seed 校验 |
| T-BA09 | controller/users.go 个人用量 API（self / 他人按权限）| 0.2d | A/D | 调 audit_log 聚合 |
| T-BA10 | router 注册 + 6 角色路由 guard | 0.2d | A | 集成测试 |

### 通道 2：Backend-B（Audit/Recorder，14 任务，3.0d）

| ID | 任务 | 估时 | 域 | DoD |
|----|------|------|----|-----|
| T-BB01 | enterprise/middleware/audit_recorder.go（元数据同步 + 内容同步 + 附件异步）| 0.5d | E | 流式 + 非流式都正确 tee |
| T-BB02 | SSE 流式 tee 实现（缓存到内存 + 流结束整段落库 + > 1MB 走对象存储）| 0.3d | E | E2E 测试 |
| T-BB03 | enterprise/middleware/device_token_guard.go（双层 Token 校验 B-D5）| 0.3d | B | 关键安全：sk 在外部机调立 401 |
| T-BB04 | enterprise/service/audit_storage.go（接口）+ audit_storage_minio.go | 0.3d | E | put/get/presign 通过 |
| T-BB05 | enterprise/service/audit_writer.go（异步 + 失败重试队列）| 0.3d | E | 失败 3 次进死信告警 |
| T-BB06 | enterprise/middleware/conversation_id.go（客户端传 + 网关推断 E-D5）| 0.2d | E | 推断时标 is_inferred |
| T-BB07 | middleware/distributor.go 插入 3 钩子（device guard + audit recorder + dept ACL）| 0.2d | E/B/C | 顺序正确不破坏原流 |
| T-BB08 | enterprise/controller/audit.go 列表（多筛选 + 分页 + 仅 3 角色）| 0.4d | E | 403 校验严格 |
| T-BB09 | controller/audit.go 详情（meta + 内容 + 附件 presigned）| 0.3d | E | 仅 3 角色 |
| T-BB10 | controller/audit.go 关键词搜（LIKE 4 字段 + 数据量边界提示）| 0.2d | E | < 200K 行 < 800ms |
| T-BB11 | enterprise/service/admin_action_writer.go（写元审计的统一入口）| 0.2d | F | 含 before/after snapshot |
| T-BB12 | 错误诊断引擎 enterprise/service/error_diagnosis.go（加载 [spec/error-rules.yaml](spec/error-rules.yaml) 5 条核心规则 R1-R5 + 热加载）| 0.3d | E/J | **不读 prompt 内容**（ADR-019）|
| T-BB13 | controller/audit.go 编辑/软删（带 reason + 元审计，M2）| 0.3d | E | M2 |
| T-BB14 | DB hook 阻 admin_action_log update/delete + 数据库 user 权限保险 | 0.2d | F | 试图改报错 |

### 通道 3：Backend-C（Quota/Models/Dashboard，10 任务，2.5d）

| ID | 任务 | 估时 | 域 | DoD |
|----|------|------|----|-----|
| T-BC01 | enterprise/middleware/personal_rate_limit.go（QPS + 日次数 + 并发，D-D2）| 0.4d | D | 11/2001 立 429 |
| T-BC02 | model_meta + dept_model_acl 表 + middleware 校验（C-D2）| 0.4d | C | 金融三部门调 GPT 立 403 |
| T-BC03 | enterprise/controller/dashboard.go（双维度聚合 D-D1）| 0.5d | D | 部门视图 + 个人 Top 都正确 |
| T-BC04 | enterprise/controller/export.go（3 模板：月度通报 / 详细明细 / 财务对账）| 0.5d | D | Excel 打开正常 |
| T-BC05 | enterprise/controller/export.go 异步任务 + 历史 + 全局任务通知 | 0.3d | D | 大数据走异步 |
| T-BC06 | enterprise/service/model_status.go（Redis sliding window 5min 成功率，C-D5）| 0.2d | C | 工作台读 |
| T-BC07 | enterprise/controller/models.go（员工视角模型清单 + 按部门权限）| 0.2d | C | 含价格档/场景/状态 |
| T-BC08 | enterprise/controller/dept_model_acl.go（admin 配置 ACL）| 0.2d | C | 超管 UI 用 |
| T-BC09 | C-D6 模型替换严禁实施（不允许网关偷换模型名）| 0.1d | C | 单测 |
| T-BC10 | enterprise/service/cost_estimate.go（按 model_ratio 估成本）| 0.2d | D | 仪表盘 + 个人页用 |

### 通道 4：Backend-D（Resources/Announcements/Inbox/Devices/CLI，13 任务，3.0d）

| ID | 任务 | 估时 | 域 | DoD |
|----|------|------|----|-----|
| T-BD01 | enterprise/controller/announcements.go（CRUD + 3 类公告 + 版本管理）| 0.4d | L | 含权限校验 |
| T-BD02 | enterprise/controller/announcement_ack.go（员工强制确认 + 5 天通知 admin）| 0.3d | L | E2E 测试 |
| T-BD03 | enterprise/controller/skills.go（Skill CRUD + 上传 zip 到对象存储）| 0.3d | J-11 | 仅数智营销中心 |
| T-BD04 | enterprise/controller/courses.go（Course CRUD + 上传资源）| 0.3d | J-12 | 仅数智营销中心 |
| T-BD05 | enterprise/controller/resources.go（员工浏览 + 下载 + 计数）| 0.3d | J-11/12 | 全员可见 |
| T-BD06 | enterprise/controller/inbox.go（待办聚合：设备 + 错误高发 + 新员工 + 配额申请）| 0.3d | I | 30s 轮询 |
| T-BD07 | enterprise/controller/devices.go 列表 + 停用 + 详情 | 0.3d | B | 含权限校验 |
| T-BD08 | enterprise/controller/devices.go 激活流（POST /api/agent/activate）| 0.3d | B | + 24h/48h 升级/作废 cron |
| T-BD09 | enterprise/controller/service_accounts.go（M1 demo 1 个）| 0.2d | B | 创建 + token 颁发 |
| T-BD10 | enterprise/controller/health.go（网关 + DB + Redis + MinIO + 上游）| 0.2d | G | 30s 缓存 + 立即刷新 |
| T-BD11 | enterprise/middleware/ip_whitelist.go（K-D1 仅内网/VPN）| 0.2d | K | 配置在 system_setting |
| T-BD12 | cli/main.go + cmd/auth.go（扫码登录）| 0.3d | B/J | 跑通激活流程 |
| T-BD13 | cli/cmd/usage.go（调 /api/agent/usage 返回数据）| 0.2d | J | 数据展示 |

### 通道 5：Frontend-A（公共组件 + 员工域，11 任务，3.0d）

| ID | 任务 | 估时 | 页面 | DoD |
|----|------|------|------|-----|
| T-FA01 | 公共组件 ★ TokenCard / ModelCard / DeviceList / ResourceCard | 0.4d | 工作台 | shadcn 风格 |
| T-FA02 | ★ ChatTranscript（模拟聊天 UI 给 audit 详情用）| 0.3d | P-M1-AU-02 | 多轮 + 附件占位 |
| T-FA03 | ★ ErrorDiagnosisCard（**不暴露 prompt**）| 0.2d | 多页 | 5 条规则展示 |
| T-FA04 | ★ AnnouncementBanner + AnnouncementModal（强制弹窗 + 不可关）| 0.3d | 全局 | 强制确认逻辑 |
| T-FA05 | ★ TimeRangePicker / ReasonInputDialog / EmptyState / BreadcrumbBar | 0.3d | 多页 | 标准样式 |
| T-FA06 | P-M1-WS-01 工作台首页（Token + 模型 + 设备 + 引导 + 出错调用折叠）| 0.5d | 员工 | 完整流程 |
| T-FA07 | P-M1-WS-02 我的用量（趋势 + 模型分布 + 排名）| 0.3d | 员工 | 复用 dashboard 组件 |
| T-FA08 | P-M1-WS-03/04 Skill 中心列表 + 详情 + WorkBuddy 导入引导 | 0.4d | 员工 | 含下载 |
| T-FA09 | P-M1-WS-05/06 学习中心列表 + 详情 + 章节资源播放 | 0.3d | 员工 | 视频/PDF 嵌入 |
| T-FA10 | P-M1-HP-01 客户端教程页（WorkBuddy + OpenClaw 下载 + PDF + 视频）| 0.2d | 帮助 | 静态页 + 文件挂载 |
| T-FA11 | P-M1-HP-02 hmrouter-cli 文档静态页 | 0.1d | 帮助 | markdown 渲染 |

### 通道 6：Frontend-B（企业管理 + 调用记录，13 任务，3.0d）

| ID | 任务 | 估时 | 页面 | DoD |
|----|------|------|------|-----|
| T-FB01 | P-M1-EN-04 仪表盘（双维度切换 + KPI + 趋势 + 排名 + Top N）| 0.5d | 企业管理 | 复用 dashboard 组件 |
| T-FB02 | P-M1-EN-02 员工目录（8 列 + 4 筛选 + 搜索）| 0.3d | 企业管理 | — |
| T-FB03 | P-M1-EN-03 员工详情（管理者诊断视角，**仅元数据**）| 0.3d | 企业管理 | 含错误诊断卡片 |
| T-FB04 | P-M1-EN-05/06 设备管理（tab + 列表 + 详情 + 停用）| 0.4d | 企业管理 | — |
| T-FB05 | P-M1-EN-09 一键导出（表单 + 历史 + ExcelExportTask 异步进度）| 0.4d | 企业管理 | — |
| T-FB06 | P-M1-EN-01 待办 inbox（30s 轮询 + 红点）| 0.3d | 企业管理 | — |
| T-FB07 | P-M1-EN-07/08 服务账号（M1 demo）| 0.2d | 企业管理 | — |
| T-FB08 | P-M1-EN-10/11 部门管理（基础 CRUD）| 0.4d | 企业管理 | — |
| T-FB09 | P-M1-AU-01 调用列表（仅 3 角色入口 + 筛选 + 搜索）| 0.4d | 调用记录 | 菜单 + 路由 + API 三层校验 |
| T-FB10 | P-M1-AU-02 调用详情（ChatTranscript 集成 + 错误诊断 + 复制 / 操作按钮）| 0.4d | 调用记录 | M2 加编辑/删除按钮 |
| T-FB11 | 跨页跳转参数（URL query 保留：dept/user/time → audit）| 0.2d | — | E2E 验 |
| T-FB12 | P-M2-DB-01 部门预算配置页（M2，含 BillingExprEditor）| 0.5d | M2 | M2 |
| T-FB13 | P-M2-AP-01/02 临时配额申请 + 审批（M2）| 0.4d | M2 | M2 |

### 通道 7：Frontend-C（公告/Skill/课程管理/系统域/菜单，11 任务，2.5d）

| ID | 任务 | 估时 | 页面 | DoD |
|----|------|------|------|-----|
| T-FC01 | P-M1-AN-01/02 公告查看（员工历史列表 + 详情）| 0.2d | 公告 | — |
| T-FC02 | P-M1-AN-03 公告管理列表 | 0.2d | 公告 | — |
| T-FC03 | P-M1-AN-04/05 公告编辑（**TipTap 富文本** + 预览）| 0.5d | 公告 | 集成 tiptap |
| T-FC04 | P-M1-SK-01/02/03 Skill 管理（列表 + 上传 zip + 编辑）| 0.4d | Skill | 数智营销中心独享 |
| T-FC05 | P-M1-CR-01/02/03 课程管理（列表 + 章节编辑 + 资源上传）| 0.4d | 课程 | 数智营销中心独享 |
| T-FC06 | P-S-05 健康检查页（5 大组件 + 上游 + 立即刷新）| 0.2d | 系统 | 复用 channel-test |
| T-FC07 | P-S-07 部门-模型 ACL 矩阵编辑 | 0.3d | 系统 | 9 部门 × 模型表 |
| T-FC08 | 6 角色菜单变形（按 user.role 显示不同菜单结构）| 0.3d | 全局 | 跟 PRD §4 对齐 |
| T-FC09 | 路由 guard（前端按角色禁止访问无权页面）| 0.2d | 全局 | 跳 403 |
| T-FC10 | 顶栏 + 头像菜单 + 铃铛红点（30s 轮询）| 0.2d | 全局 | — |
| T-FC11 | P-S-01~04, 06 复用原 New-API features 仅加菜单链接 | 0.1d | 系统 | — |

### 通道 8：DevOps-Agent（持续，0.5d）

| ID | 任务 | 估时 | DoD |
|----|------|------|-----|
| T-OP01 | 监控 CI 跑通率 + 失败修复 | 持续 | — |
| T-OP02 | 一致性检查脚本融入 PR 流程 | 0.2d | PR 必跑 |
| T-OP03 | commit hook 改进（block .env / 大文件等）| 0.2d | — |
| T-OP04 | 部署脚本（M1 dogfood 用本地 docker-compose；M2 内网 k8s）| 0.1d | — |

### 通道 9：基础设施前置任务（5 任务，0.5d）

| ID | 任务 | 状态 | 估时 | DoD |
|----|------|------|------|-----|
| M1-T01 | gh repo fork QuantumNous/new-api → 私有 hmrouter | ✓ | 0.1d | repo 已建（k272314374/hmrouter）|
| M1-T02 | 完整 clone 替换 shallow（如果有）| ☐ | 0.1d | git log 完整历史 |
| M1-T03 | .gitignore + 首次 commit | ✓ | 0.2d | 已 push |
| M1-T04 | 创建 enterprise/ 目录骨架 | ☐ | 0.1d | go build 不报错 |
| M1-T05 | 创建 cli/ 目录骨架 | ☐ | 0.1d | go build cli/main.go OK |

---

## M1 收尾

| ID | 任务 | 估时 | DoD |
|----|------|------|-----|
| T-DG01 | 端到端联调（前后端 + DB + mock 上游）| 0.5d | 完整流程跑通 |
| T-DG02 | 真客户端 dogfood（WorkBuddy + OpenClaw + 真上游）| 0.5d | PRD §8.1 验收清单 ≥ 80% 勾 |
| T-DG03 | 5/31 演示彩排（14 演示账号切换演示）| 0.3d | 用户认可 |
| T-DG04 | M1 retrospective | 0.2d | 列实际 vs 估时 |

---

## 工作量汇总

### M1 单线工作量

| 通道 | 任务数 | 估时 |
|---|---|---|
| 0 Harness | 9 | 3.0d |
| DB-Agent | 13 | 1.5d |
| Backend-A | 10 | 2.0d |
| Backend-B | 14 | 3.0d |
| Backend-C | 10 | 2.5d |
| Backend-D | 13 | 3.0d |
| Frontend-A | 11 | 3.0d |
| Frontend-B | 13 | 3.0d |
| Frontend-C | 11 | 2.5d |
| DevOps | 4 | 0.5d |
| 基础设施 | 5 | 0.5d |
| 收尾 | 4 | 1.5d |
| **总计** | **117** | **26d 单线** |

### M1 并行 wall-clock

```
Phase 0 Harness:     3 天 (我串行 + 小并行)
Phase 1+2 并行:
  - DB:              1.5 天 (其他 agent 开始的前置)
  - Backend × 4:     ~3 天 (并行最长链)
  - Frontend × 3:    ~3 天 (并行,等 backend OpenAPI 契约即可)
Phase 3 收尾:        1 天

Wall-clock 估计:   3 + 1.5 + 3 + 1 = 8.5 天
余量: 16 - 8.5 = 7.5 天 buffer ✅
```

---

## M2：金融试点版（~30 任务，6/30 deadline）

> M1 接近完成时再展开。当前只列高维度。

| 主题 | 估时 | 关键 DoD |
|------|------|---------|
| 多模态端点开放（图片 / 文档调用全程记录）| 3d | image_url 在 audit_attachment 存得到 |
| 群晖 NAS WebDAV adapter（AP21）| 1d | 切换零代码改动 |
| CLI 完整命令集（devices/quota/chats search/show 等）| 1.5d | 跟 PRD §5.B 一致 |
| 服务账号完整 UI + 高敏感设备绑定（B-D6）| 1.5d | 测试覆盖 |
| 部门预算 observe + billingexpr 编辑器 | 2d | 阈值告警通过企微机器人 |
| 临时配额审批工单（D-D4）| 1d | E2E 跑通 |
| 超额策略 3 选 1（D-D3）| 0.5d | 部门级 + 单模型可覆盖 |
| Admin 设备录入 UI + 批量 CSV | 1d | 100 台 < 5s |
| Audit 编辑/软删 UI + 已删标灰（E-D9）| 1d | 强制原因 + 元审计 |
| 元审计列表查询页（F-D4）| 0.5d | 4 档可见性 |
| 部门管理拖拽 + 多级嵌套 | 1d | full_path 自动更新 |
| 异常预警 5 条规则（G-D2）| 1d | system_setting 可调阈值 |
| 系统参数配置 UI（8 项，G-D3）| 0.5d | — |
| 显示层脱敏 ~~M2~~ | ❌ 取消 | ADR-019 取代 ADR-015 |
| 后台访问留痕 login_log + 查询页（K-D3）| 0.5d | — |
| 公告紧急横幅（L-D9）| 0.3d | 红色置顶 + 双通道推 |
| 公告受众细分（L-D7）| 0.3d | 部门 / 角色 |
| Skill / 课程版本管理 + 启用下架 + 评分 | 1d | — |
| 课程进度跟踪（J-12 enterprise_resource_progress）| 0.5d | — |
| 站内通知列表 + 已读 + 邮件 + 企微机器人 | 1.5d | — |
| 通知模板配置 | 0.5d | — |
| 内网部署文档 + docker-compose.prod.yml | 1d | — |
| 金融部 dogfood + 试点切换 | 2d | 30 天日常使用 |
| **总计** | **~22d** | |

---

## M3：通报会版（~35 任务，8/31 deadline）

| 主题 | 估时 |
|------|------|
| HR 同步（北森系统）+ 离职自动化 | 3d |
| 部门排名 + 月报 PDF 导出 | 1.5d |
| 元审计完整页（M2→M3 完善）| 0.5d |
| 案例提交 CLI + 审批流 + 案例库 | 2d |
| 业务量 KPI 上报 + 数字员工占比聚合 | 2d |
| SSE 长连接推送 + notification | 2d |
| 通知订阅（按事件类型/角色）| 0.5d |
| 风险事件软风控（M 域全套：规则库 + 异步 worker + 列表 + 处理流）| 3d |
| 数据冷热分层（6 月归档 + 1 年自动清理）| 1.5d |
| GDPR 离职 30 天数据删除审批流 | 1d |
| 全文搜（ES 集成）| 2d |
| 实时监控数字卡（QPS/并发/延迟）| 0.5d |
| 落盘加密（敏感字段 AES-256）| 1d |
| 通用客户端教程补全（QClaw / AutoClaw / Cherry / Cursor）| 0.5d 仅 PDF + 上传 |
| 8 月通报会演练 + 调优 | 2d |
| **总计** | **~22d** |

---

## 任务状态图例

- ☐ 待开始 / ⏳ 进行中 / ⏸ 阻塞中 / ✓ 完成 / ✗ 取消

---

## 变更日志

### 2026-05-15 - S-003 13 域深聊 + spec 重写
- 13 域 113 项决策深聊完成 → 写入 ADR-013~019
- PRD-admin v0.3 / PAGES v2 / PLAN v0.11 重写
- TASKS 重构为 9 个 agent 通道（M1 38 → 74 任务）
- M1 工作量重估：单线 26d → 并行 wall-clock 8.5d
- 新加任务集中在：6 角色权限校验 / 公告系统 / Skill+课程管理 / 错误诊断 / 工作台重设计 / WorkBuddy+OpenClaw 教程

### 2026-05-14 - v0.10 新增（已吸收）
- 用户："数据库要和 PRD 对齐" → 加 audit_log.device_id + export_task → M1-T10 字段 + M1-T13 任务
- 用户："统计要双维度" → AP14 加注释 + M1-T32/T33 任务
- 用户："设备白名单 M1 就要完整" → M1-T17/T25 + M1-T26 设备激活
- 用户："3 家上游接入 M1" → M1-T38（依赖外部）
- 用户："API 凭证 + 健康检查 M1 也要" → M1-T31 + M1-T36 + M1-T37

---

## 阻塞监控

| ID | 阻塞 | 拉起时间 | 距今 | 老化预警 |
|----|------|---------|------|--------|
| B1 | Docker Desktop 等用户启动 | 2026-05-14 | 1 天 | - |
| B2 | 企微自建应用没申请 | 2026-05-14 | 1 天 | - |
| B3 | DeepSeek 对公付款 | 2026-05-14 | 1 天 | - |
| B4 | OpenAI/Anthropic 对公付款 | 2026-05-14 | 1 天 | - |
| B5 | 群晖 NAS 凭证 | 2026-05-14 | 1 天 | - |

> **关键**：Phase 0 Harness 中 mock-llm + mock-wecom 让 B2-B4 不再阻塞代码工作（仍需真凭证才能 dogfood）。
> 单个阻塞**老化 ≥ 3 天**：会话开局标红预警，主动建议升级路径。

---

## 完成后做的（M1 结束触发 retro）

- [ ] 算 M1 实际总耗时 vs 估时 = ?
- [ ] 列 3 个意料之外的事
- [ ] 列 3 个估算失准的任务（估太多/太少）
- [ ] 校准 M2 估时
- [ ] 把 M1 经验写进 docs/workflow.md
- [ ] 评估 agent 通道分工是否合理（是否要重组）
