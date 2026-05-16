# 知识图谱目录 — 架构基线参照

本目录用于**校准对项目架构的理解**。任何讨论涉及"原 New-API 怎么实现的 / 哪个文件干嘛 / 谁依赖谁"，都应该先查这里，避免凭印象答错。

## 文件清单

| 文件 | 用途 | 何时看 |
|------|------|------|
| [`sources.md`](sources.md) | 指向 Understand-Anything 生成的两份 JSON 图谱原始位置 | 想直接用 jq/Node 查原始图谱时 |
| [`INDEX.md`](INDEX.md) | 人读的速查表：30 层架构 + 36 步学习导览 + 关键枢纽节点 + 31 厂商 adapter 清单 | **新会话第一件事**：5 分钟建立架构基线 |
| [`query.js`](query.js) | Node 查询脚本，封装了常用查询函数 | 需要按文件/函数/层/tag 查具体节点和依赖时 |
| `README.md` | 本文件 | — |

## 速用

**新会话开局**：直接读 [`INDEX.md`](INDEX.md)。它是手工提炼、不会误导的稳定快照。

**回答具体问题**（如"Channel.Group 字段被哪些地方用到"）：
```bash
node knowledge-graph/query.js find-references --type=full --keyword="Channel.Group"
```

**列某层所有文件**：
```bash
node knowledge-graph/query.js layer:channel-adapters
```

**查某文件依赖谁**：
```bash
node knowledge-graph/query.js deps "controller/relay.go"
```

**找 fan-in/fan-out TOP 节点**：
```bash
node knowledge-graph/query.js hubs --top=10
```

## 维护

- Understand-Anything 重生成图谱后，[`INDEX.md`](INDEX.md) 可能需要小幅更新（层/步骤/数字）。手工 diff 一下即可。
- `query.js` 是纯查询封装，结构稳定，重生成不影响。
- **永远不要**把图谱内容直接塞进 PLAN.md / ARCHITECTURE.md —— 那些是设计决策，图谱是事实参照，分工明确。

## 跟其他文档的关系

```
PLAN.md          — 我们要做什么、AP 原则、路线图（决策）
ARCHITECTURE.md  — 整体架构图、模块职责、改造点（设计）
DLP-deferred.md  — DLP 方案搁置归档
knowledge-graph/ — ★ New-API 实际是怎样的（事实）
                   讨论时拿 PLAN/ARCH 的设计 ↔ knowledge-graph 的事实做对照
```
