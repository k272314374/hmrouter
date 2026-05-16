# DLP / 脱敏方案（搁置 · 独立窗口讨论）

> 状态：**搁置 (deferred)**
> 不在当前 PLAN.md 工程范围内。
> 来源：从 PLAN.md v0.7 抽离，集中归档以避免污染主方案。

---

## 1. 共识与已锁定的策略

### 1.1 处理原则
- 网关侧不做内容改写。脱敏由前置 skill 完成。
- 网关侧仅做检测打标 + 告警 + 审计，不阻断。
- 响应侧只做异步审计，不实时拦截。

### 1.2 调用模式（v0.2 锁定）
员工通过 Agent 工具间接调用大模型，Agent 内部按"两步走"编排：

```
员工自然语言请求
      │
      ▼
┌─────────────────────────┐
│ Agent 工具（员工入口）   │
│  Step 1: 调用脱敏 skill │ ← 输入原文，输出脱敏后文本 + 占位符映射
│  Step 2: 调用 hmrouter  │ ← 用脱敏后文本请求大模型
│  Step 3: （可选）回填    │ ← 收到响应后用映射表还原占位符给员工看
└─────────────────────────┘
```

### 1.3 脱敏 skill 核心要求
- 与网关共享同一份规则源（规则中心，下发到 skill 本地缓存）
- 会话级**确定性**占位符映射（保证多轮上下文连贯和上游 prompt cache 命中）
- 离线可用（员工断网时 skill 仍能工作；联网时增量同步规则）
- 失败安全：skill 自身故障 → Agent 阻断本次调用（fail-close）
- 占位符映射表持久化层归属 Agent 工具，不归 skill（skill 是无状态纯函数）

---

## 2. DLP 引擎选型

| 方法 | 是否采用 | 备注 |
|------|---------|------|
| 正则规则 | ✅ 一期 | 身份证 / 手机 / 银行卡 / 邮箱 / IP |
| 关键词词典（AC 自动机） | ✅ 一期 | 客户名单 / 项目代号 / 合同号，后台维护 |
| 本地 NER 小模型 | ⏸ 二期 | 召回率提升，但 +20-50ms |
| 小 LLM 分类器 | ⏸ 三期 | 应对 base64 / 拼音绕过 |
| 商业 DLP API | ❌ | 把敏感数据先发给第三方，逻辑矛盾 |

---

## 3. 网关侧检测策略
- 网关不修改请求内容，原样转发给上游
- 命中即在审计日志记录 `pre_desensitized=false`，标记该次调用绕过了前置 skill
- L4+ 高敏感命中触发告警通道（飞书/邮件），安全团队人工跟进
- 通过周报/月报暴露"绕过率高的人/部门/应用"，用流程手段收敛

---

## 4. 待决策清单

### 4.1 规则与等级
- **Q5**：敏感等级如何划分？建议草案：
  - L1 公开信息（无）
  - L2 内部信息（员工姓名、邮箱）
  - L3 客户/合作方信息（客户名称、联系方式）
  - L4 商业机密（合同金额、未公开项目代号、源代码片段？）
  - L5 强监管数据（身份证、银行卡、手机号、医疗/金融数据）
- **Q6**：词典谁来维护？安全团队？各业务部门自治？审批流？
- **Q7**：不同部门是否需要不同规则？（例如法务部门看合同是合法场景，不应被脱敏）
- **Q8**：脱敏占位符策略 —— 同一原文是否映射到同一占位符（保留语义连贯性）？是否需要"会话内一致映射 + 响应回填还原"？

### 4.2 数据留存与合规
- **Q9**：审计日志是否存原文？方案：A 仅哈希；B 命中 L4+ 才加密存原文（KMS 管 key）；C 全量加密存 N 天后销毁
- **Q10**：日志保留多久？（合规一般要求 6 个月 - 2 年）
- **Q11**：员工是否有知情权？是否需要在调用时返回 `X-DLP-Hits` 头告知？还是完全静默？
- **Q12**：跨境数据问题 —— OpenAI / Anthropic 走海外节点，是否需要先做数据出境合规评估？

### 4.3 流式响应与多模态
- **Q13**：SSE 流式响应中模型回吐了敏感内容怎么办？增量扫描 + 边扫边吐 vs 缓冲后吐
- **Q14**：图片 / 文件上传如何处理？vision 模型 / PDF / Word / Excel 是否要先做内容提取再扫描？
- **Q15**：函数调用 / Tool use 中的参数是否扫描？

### 4.4 路由策略（与 DLP 联动部分）
- **Q17**：是否做"按敏感等级路由"？例如 L4+ 强制走内网模型

### 4.5 绕过与对抗
- **Q22**：明确承认哪些绕过手段"一期不防"？（base64、拼音拆字、外语翻译后发送）

### 4.6 Agent 工具与 skill 形态
- **Q28**：Agent 工具的承载形态？候选：
  - 公司自研聊天客户端（最强管控，工程量大）
  - 基于成熟开源客户端二次开发（Cherry Studio / LobeChat / OpenWebUI）
  - 飞书机器人 / 企业微信机器人（覆盖最广，交互受限）
  - IDE 插件（覆盖研发场景）
- **Q29**：脱敏 skill 的实现语言与分发方式？候选：
  - Python / Node 包，Agent 进程内调用（简单但耦合）
  - 独立二进制（Go/Rust），子进程或 gRPC 调用（解耦但复杂）
  - HTTP 微服务，Agent 远程调用（最解耦，但失去离线可用特性）
- **Q30**：规则同步机制 —— skill 启动时全量拉？后台增量推？缓存多久？规则包是否签名？
- **Q31**：占位符映射表（Agent 持有）的存储位置？候选：
  - 内存（会话结束即丢，最安全但跨会话不一致）
  - 本地加密文件（多会话一致，本地泄漏风险）
  - 服务端集中存储（最一致，但变成新的敏感数据库）
- **Q32**：响应回填策略 —— 不回填（员工看占位符，体验差但安全）vs 回填（自然但模型若"猜对"会一并返回）
- **Q33**：Agent fail-close 的逃生口 —— skill 故障时硬阻断，还是允许员工带审批"强制发送"？
- **Q34**：内部应用（非员工交互）的集成路径 —— 同一套 Agent 工具？SDK？还是直接调网关 + 自行集成 skill？

### 4.7 可用性与运维
- **Q26**：DLP 引擎挂了（词典加载失败、正则编译失败），是 fail-open 还是 fail-close？

---

## 5. 数据模型草稿（搁置）

### `dlp_rule` —— DLP 规则配置表
```sql
CREATE TABLE dlp_rule (
  id           BIGINT PRIMARY KEY AUTO_INCREMENT,
  name         VARCHAR(64),       -- "身份证号"
  type         ENUM('regex','keyword','dict'),
  pattern      TEXT,              -- 正则 或 词条列表
  replacement  VARCHAR(64),       -- "[ID_CARD]"
  severity     TINYINT,           -- 1-5
  scope_dept   VARCHAR(255),      -- 适用部门，空=全员
  enabled      BOOLEAN,
  created_by   INT,
  updated_at   TIMESTAMP
);
```

### `dlp_audit` —— DLP 审计日志表
```sql
CREATE TABLE dlp_audit (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id       INT,
  dept_id       INT,
  channel       VARCHAR(32),     -- openai / anthropic / ...
  model         VARCHAR(64),
  request_id    VARCHAR(64),
  request_hash  CHAR(64),        -- 原文 SHA256
  request_cipher BLOB,           -- 可选：加密原文（仅 L4+）
  hits          JSON,            -- [{rule_id, rule_name, count, severity}]
  max_severity  TINYINT,         -- 索引用
  direction     ENUM('request','response'),
  ts            TIMESTAMP,
  INDEX idx_user_ts(user_id, ts),
  INDEX idx_severity_ts(max_severity, ts)
);
```

### `dlp_alert` —— 告警事件表（L4+ 触发）
```sql
CREATE TABLE dlp_alert (
  id         BIGINT PRIMARY KEY,
  audit_id   BIGINT,
  status     ENUM('new','ack','closed','false_positive'),
  assignee   INT,
  notes      TEXT,
  created_at TIMESTAMP
);
```

---

## 6. 与 PLAN.md 主方案的关联点

如果将来 DLP 重新进入主方案，需要联动修订：
- **AP5**（部门+模型路由）：可能扩展为按敏感等级路由
- **AP19**（中间层全量记录）：DLP 在记录基础上加打标即可
- **AP20**（二进制走对象存储）：附件 DLP 扫描需要先解码（OCR / 文档解析）
- **AP24**（admin 改 audit_log + 元审计）：DLP 命中字段也走元审计
- **AP25**（SSE 推送）：DLP 告警可以走推送通道实时通知 admin
