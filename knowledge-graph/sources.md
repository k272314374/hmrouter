# 原始图谱位置

> 不要移动这两个文件 —— Understand-Anything 工具按目录约定重生成。

## 全项目图谱（主用）

```
E:\Huamei Project\hmrouter\.understand-anything\knowledge-graph.json
```
- 大小：8.7 MB
- 节点：6749（file 1451 / function 4860 / class 363 / 其他 75）
- 边：29338（imports 21814 / contains 5223 / exports 2227 / 其他）
- 层：30（后端 12 + 前端 12 + relay 6）
- 学习导览：36 步
- 覆盖：完整 new-api 仓库（Go 后端 + React 前端 + relay）
- 生成时间：2026-05-14 08:52
- gitCommitHash: `196a82d11d4ee8c163ae3f71021797f34e0c26b2`

## relay 子系统图谱（细看 relay 时辅助）

```
E:\Huamei Project\hmrouter\new-api\relay\.understand-anything\knowledge-graph.json
```
- 大小：1.2 MB
- 节点：1178（file 196 / function 843 / class 139）
- 边：3481
- 层：6
- 学习导览：13 步
- 覆盖：仅 relay/ 子目录

## 直接查询提示

JSON 里 8.7MB **不要直接 Read**，用 `query.js` 或自写小脚本提取所需字段。

最常用字段：
- `g.project` — 项目元信息
- `g.nodes[]` — `{ id, type, name, filePath, summary, tags, complexity? }`
- `g.edges[]` — `{ source, target, type, weight }`
- `g.layers[]` — `{ id, name, description, nodeIds[] }`
- `g.tour[]` — `{ order, title, description, nodeIds[] }`

ID 规则：
- 文件：`file:<相对路径>`
- 函数：`function:<相对路径>:<函数名>`
- 类：`class:<相对路径>:<类名>`

边类型：
- `imports`：源文件 import 目标
- `contains`：父级（文件）包含子级（函数/类）
- `exports`：模块导出
- `tested_by`：测试关系
- `configures` / `depends_on` / `documents` / `triggers` / `deploys` / `related`：稀疏的语义边
