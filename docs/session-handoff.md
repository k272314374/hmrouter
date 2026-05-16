# 会话开关仪式（Session Handoff）

> Claude 跨会话连续性的关键。**每次会话开始与结束都执行**。

---

## 开局仪式（新会话第一件事）

### 给 Claude 自己的检查清单

1. **读 [CLAUDE.md](../CLAUDE.md)**（如未自动加载）
2. **读 [STATE.md](../STATE.md)**（最重要）
   - 当前里程碑是哪个？
   - 当前阻塞列表？
   - 上次会话做了什么？
   - 下一步具体动作是什么？
3. **跟用户简短确认**（不超过 5 句）：
   ```
   读了 STATE，我现在认知：
   - 里程碑：M0 子任务 X
   - 阻塞：B1 + B2
   - 下一步可推：动作 N
   你是想继续推 N，还是？
   ```
4. **等用户回应**，不要假设也不要直接动手

### 用户的视角

正常的开局对话长这样：
```
用户：（打开新窗口，输入）继续
Claude：（已读 CLAUDE + STATE）
       OK，按 STATE.md 我们在 M0，等你确认 Docker 启动。
       要不要现在启？还是先做 X？
用户：启
Claude：（启动 Docker → 跑通 New-API → 更新 STATE）
```

或者：
```
用户：今天想搞 enterprise/middleware/audit_recorder.go
Claude：（已读 CLAUDE + STATE）
       看 STATE 这是 M1 步骤 11，但前置阻塞 B1（Docker）+ M0 步骤 6（DeepSeek 跑通）
       还没解。要先解阻塞，还是不管阻塞先把代码骨架写起来？
```

---

## 关局仪式（会话即将结束 / 用户准备休息）

### 给 Claude 自己的检查清单

**任何这些信号都触发关局**：
- 用户说"今天就到这"、"我去吃饭了"、"明天继续"
- 用户长时间沉默后发新主题
- 自己感觉到上下文将满（接近压缩）
- 完成了一个明显的里程碑

**关局动作（5 步）**：

1. **更新 [STATE.md](../STATE.md)**
   - "当前里程碑子任务进度"勾选完成项
   - "当前阻塞"刷新（解掉的删，新增的加）
   - "最近 session 做了什么"加新条目（带本次 session 编号）
   - "下一步具体动作"调整（删掉做完的，加新的）
   - 顶部"最后更新"时间 + 会话编号 + 1

2. **如果有未完成工作 → 写"在做但未完成"**
   - 写清楚：在哪个文件、做到哪一步、卡在什么、下次怎么继续
   - 例：`正在写 enterprise/middleware/audit_recorder.go::AsyncWriteToObjectStorage()，stub 写了空函数，需补 MinIO PutObject 调用 + 错误重试逻辑。卡在不确定 retry policy（指数退避还是固定间隔），下次问用户或自己拍`

3. **如果做了重大决策 → 在 [DECISIONS.md](../DECISIONS.md) 加 ADR**
   - 用模板格式
   - 决策号顺延
   - 跟 PLAN/PRD/ARCH 中的 AP 引用对得上

4. **如果有新待决策项 → 加到 STATE.md "待决策清单"**

5. **跟用户告别一句**：
   ```
   STATE.md 已更新到会话 S-XXX。
   下次开局直接读 STATE，知道在哪个步骤、有哪些阻塞、下一步做什么。
   今天 done 的：A、B、C
   下次推：D、E、F
   ```

---

## 中途遇到这些情况怎么办

### Claude 发现自己快没上下文了

不要硬撑。主动跟用户说：
```
我感觉上下文快满了，建议现在做关局仪式（更新 STATE.md），
你下次开新窗口我能从 STATE 接着推。要做吗？
```

### Claude 发现 STATE.md 与当前进度不符

立刻**先修 STATE.md**，再跟用户说：
```
我刚发现 STATE.md 还停在上上次的状态（M0 步骤 X），
但实际我们已经做到 M1 步骤 Y 了。我现在更新 STATE，再继续。
```

### 用户突然换方向

允许，但务必：
1. 把当前未完成的写到 STATE "在做但未完成"
2. 在 STATE "下一步" 加新方向
3. 如果新方向跟某条 AP 冲突 → 先确认是否要写新 ADR

### 用户问"我们之前是不是讨论过 X"

先查 [DECISIONS.md](../DECISIONS.md)（已决策的）→ STATE.md "待决策清单"（已知未决的）→ git log（如果已开 commit）。

不要猜，要查。

### Claude 不确定该不该做某个动作

按 [CLAUDE.md §6 不擅自做的事] 处理：先问用户。

---

## STATE.md 更新示例

### 示例：会话结束时

**修改前**：
```markdown
最后更新：2026-05-14 21:30  ·  会话编号：S-002

## 当前里程碑
M0 子任务进度：
- [ ] 启动 Docker Desktop
- [ ] 起 PostgreSQL + Redis + MinIO 容器
- [ ] 本地 `go run main.go` 跑通后端
```

**修改后（这次 session 启了 Docker、跑通了后端）**：
```markdown
最后更新：2026-05-15 18:00  ·  会话编号：S-003

## 当前里程碑
M0 子任务进度：
- [x] 启动 Docker Desktop（S-003）
- [x] 起 PostgreSQL + Redis + MinIO 容器（S-003）
- [x] 本地 `go run main.go` 跑通后端（S-003）
- [ ] 本地 `bun run dev` 跑通前端 ← 下次推这个
```

### 示例：会话结束加新 ADR

```markdown
（在 DECISIONS.md 末尾）

## ADR-NNN: <举例：M1 演示如果 OpenAI 没到位则只用 DeepSeek> (2026-05-15, v0.11)
（注：这是**示例模板**。真追加 ADR 时编号取 DECISIONS.md 中最大编号 +1）

**背景**：5/31 演示 deadline 临近，OpenAI 对公付款流程 7 个工作日未到。

**决策**：M1 演示仅用 DeepSeek，OpenAI/Claude 接入但留空 channel 配置。

**理由**：上游切换是配置而非代码，演示时口头说"另两家配好就能切"已足够。

**实现影响**：M1 验收清单调整：3 家上游 → 1 家上游 + 接入框架就绪。
```

---

## 反模式（不要做）

| ❌ 错的做法 | ✅ 对的做法 |
|------------|-----------|
| 新会话开始就直接动手 | 先读 STATE.md，确认对齐再动 |
| 忘记更新 STATE.md | 关局仪式必做 5 步 |
| 把决策写在 STATE.md "最近 session 做了什么" | 决策走 DECISIONS.md ADR |
| 重复讨论 DECISIONS.md 已记的决策 | 先查 DECISIONS，已决就不议 |
| 用户问"还记得 X 吗"就凭印象答 | 查 STATE / DECISIONS / git log |
| 上下文快满了硬撑 | 主动提议关局 |

---

## 保险措施

**如果 STATE.md 被搞丢了或损坏**：
1. 看 git log 找最近一次提交的 STATE.md 版本
2. 看 DECISIONS.md 推断最近决策
3. 看 PLAN §0.3 版本历史推断进度
4. 跟用户对话还原

**如果 Claude Code 没自动读 CLAUDE.md**：
用户提醒"先看 CLAUDE.md"即可。
