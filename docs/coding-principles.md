# 编码原则（编码 Agent 必读）

> 来源：[Andrej Karpathy 关于 LLM 编码通病的观察](https://x.com/karpathy/status/2015883857489522876)
> + [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)
> 适配：hmrouter 项目 9 agent 并行编码场景（S-003 引入）
> 谁读：所有 Backend / Frontend / DB / DevOps agent — **编码前必读**

---

## 为什么这份文档存在

hmrouter 是 9 个 agent 并行改造 4 万行 Go + 新建 enterprise 模块。
LLM 编码有 4 个通病，并行场景会**放大**事故率：

1. 替你做错误假设，不核对就一路跑下去
2. 过度复杂化 — 1000 行做 100 行能做的事
3. 改/删它没完全理解的代码（哪怕跟任务无关）
4. 弱成功标准 → 需要反复澄清

下面 4 条原则是降事故率的**硬约束**，跟项目 AP 原则配套。

> **权衡**：这些原则偏向"谨慎 > 速度"。琐碎任务用判断力，别教条。

---

## 原则 1：Think Before Coding（编码前先想）

**不瞎假设，不藏困惑，把权衡摊开。**

写代码前：
- 显式声明你的假设。不确定就问。
- 多种解读并存 → 全列出来，别默默选一个。
- 有更简单的做法 → 说出来，该 push back 就 push back。
- 有不清楚的 → 停。说清楚哪里困惑。问。

**hmrouter 专属**：
- spec（PRD-admin / PAGES-admin / PLAN）没覆盖的实现细节 → **PR 评论 @ 用户**，不要自己脑补
- 发现 spec **自相矛盾** → 立刻停手，提 PR 评论或建议新 ADR，**不要"挑一个看起来对的"往下写**
- 任务 DoD 不清晰 → 先在 TASKS.md 把 DoD 补成可验证的，再动手

---

## 原则 2：Simplicity First（简单优先）↔ AP16

**解决问题的最小代码量。不写投机性的东西。**

- 不加没要求的功能
- 单次使用的代码不做抽象
- 没要求的"灵活性 / 可配置性"不要做
- 不为不可能发生的场景写错误处理
- 写了 200 行而 50 行能搞定 → 重写

自问："senior 工程师会不会嫌这过度复杂？" 会 → 简化。

**hmrouter 专属**：
- **AP16 复用至上** — 写 enterprise/ 新代码前先查 [knowledge-graph/INDEX.md](../knowledge-graph/INDEX.md)：OAuth registry / billingexpr / shadcn 169 组件 / channel-test / keys feature 等能复用的**绝不重写**
- enterprise/ 模块代码要克制：M1 不做 M2/M3 才需要的抽象
- 前端组件优先 shadcn，不自创组件库

---

## 原则 3：Surgical Changes（外科手术式改动）↔ AP13

**只碰你必须碰的。只清理你自己造成的烂摊子。**

改已有代码时：
- 不"改进"邻近代码、注释、格式
- 不重构没坏的东西
- 匹配现有风格，即使你会用别的写法
- 发现无关的死代码 → 提一句，**别删**

你的改动造成孤儿时：
- 删掉**你的改动**导致没用的 import / 变量 / 函数
- 不删**预先存在**的死代码（除非被要求）

检验标准：**每一行改动都能直接追溯到任务需求**。

**hmrouter 专属 — AP13 红线**：
- 原 New-API 文件**只允许改 4 处**：
  1. `router/main.go`（+ enterprise.SetupRouter 一行）
  2. `middleware/distributor.go`（+ 3 个钩子）
  3. `model/user.go`（+ 5 个 HR 字段）
  4. `model/token.go`（+ owner_type / owner_id）
- **任何 agent 改这 4 个之外的原 New-API 文件 = 违规，必须停手 + PR 评论 @ 用户**
- 绝不"顺手优化"原 New-API 代码（哪怕看着很烂）
- 文件所有权见 [agent-collaboration.md](agent-collaboration.md)，不碰其他 agent owner 的文件

---

## 原则 4：Goal-Driven Execution（目标驱动执行）↔ TASKS DoD

**定义成功标准。循环到验证通过为止。**

把任务转成可验证目标：
- "加校验" → "为非法输入写测试，然后让测试通过"
- "修 bug" → "写一个能复现的测试，然后让它通过"
- "重构 X" → "确保重构前后测试都通过"

多步任务先报一个简短计划：
```
1. [步骤] → 验证：[检查点]
2. [步骤] → 验证：[检查点]
```

强成功标准让你能独立 loop；弱标准（"让它能用"）会逼你反复澄清。

**hmrouter 专属**：
- 每个任务的 DoD 在 [TASKS.md](../TASKS.md)。DoD 偏弱的（如"model + 单元测试"）→ 自己补强成可验证的具体检查点
- 后端任务：table-driven test + 覆盖 happy path + 失败场景
- 关键安全路径必须有测试：双层 token 校验（B-D5）/ 部门-模型 ACL（C-D2）/ 元审计 hook（F-D2）/ 调用内容 3 角色隔离（ADR-019）

---

## 每次 commit 前自检清单

- [ ] 改动的每一行都能追溯到当前任务 ID
- [ ] 没动 AP13 四处之外的原 New-API 文件
- [ ] 没动其他 agent owner 的文件（见 agent-collaboration.md）
- [ ] 没有过度抽象 / 投机性代码（senior 不会嫌啰嗦）
- [ ] 能复用的 New-API 原生功能没重写（AP16）
- [ ] 遇到的不明确都问了 / 记了，没瞎假设
- [ ] DoD 可验证且已验证（测试跑过）
- [ ] commit message 含任务 ID（`[T-XX01] ...`）

---

## 这些原则在起作用的标志

- diff 里没有不必要的改动
- 因过度复杂而返工的次数下降
- 澄清问题出现在**实现前**，而不是犯错后
