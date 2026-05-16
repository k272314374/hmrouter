# 编码原则 —— 已并入 CLAUDE.md §3.5

> S-003（2026-05-16）起，编码 4 原则（Karpathy 派生）的**完整内容已集成到项目根
> [CLAUDE.md](../CLAUDE.md) §3.5「编码原则（编码前必读）」**。
>
> CLAUDE.md 每会话自动加载，所以编码 agent 无需再单独打开本文件。
>
> 本文件保留为指针，避免旧链接失效。**真理源 = CLAUDE.md §3.5**。

内容速览（详见 CLAUDE.md §3.5）：

- **原则 1 Think Before Coding** — 不瞎假设、不藏困惑、spec 没覆盖/矛盾就停手问
- **原则 2 Simplicity First ↔ AP16** — 最小代码量、复用至上、不过度抽象
- **原则 3 Surgical Changes ↔ AP13** — 只改该改的、原 New-API 只动 4 处、不顺手优化
- **原则 4 Goal-Driven Execution ↔ TASKS DoD** — 可验证目标、测试先行
- **commit 前自检清单** 8 项

来源：[Andrej Karpathy LLM 编码通病观察](https://x.com/karpathy/status/2015883857489522876) + [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)。
