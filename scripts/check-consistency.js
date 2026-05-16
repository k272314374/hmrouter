#!/usr/bin/env node
/**
 * 文档跨文件一致性检查
 *
 * 用法：
 *   node scripts/check-consistency.js
 *   node scripts/check-consistency.js --fix      # 尝试自动修一些（仅安全的）
 *   node scripts/check-consistency.js --quiet    # 只输出失败项
 *
 * 退出码：
 *   0 = 全通过
 *   1 = 有不一致（CI / pre-commit 应该挂掉）
 *
 * 设计原则：
 *   - 每个 check 是独立的，互不影响
 *   - 失败信息要精确到行号 + 期望值 + 实际值
 *   - 不依赖第三方包，纯 Node 标准库
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const QUIET = process.argv.includes("--quiet");

// ── 文件读取缓存 ───────────────────────────────────────
const fileCache = {};
function read(p) {
  const full = path.join(ROOT, p);
  if (!fileCache[full]) fileCache[full] = fs.readFileSync(full, "utf8");
  return fileCache[full];
}
function lines(p) {
  return read(p).split(/\r?\n/);
}
function lineCount(p) {
  // wc -l 风格：以换行符分隔，trailing newline 不算多
  const content = read(p);
  if (!content) return 0;
  const arr = content.split("\n");
  // 如果文件以 \n 结尾，最后一项是空字符串，不算
  if (arr[arr.length - 1] === "") return arr.length - 1;
  return arr.length;
}

// ── 检查框架 ──────────────────────────────────────────
const results = [];
function check(id, name, fn) {
  try {
    const issues = fn() || [];
    if (issues.length === 0) {
      results.push({ id, name, status: "✅ pass", issues: [] });
    } else {
      results.push({ id, name, status: "❌ fail", issues });
    }
  } catch (e) {
    results.push({
      id,
      name,
      status: "💥 err ",
      issues: [{ msg: "脚本错误: " + e.message }],
    });
  }
}

// ── 工具函数 ──────────────────────────────────────────
function findLines(content, regex) {
  const ls = content.split(/\r?\n/);
  const matches = [];
  ls.forEach((line, i) => {
    if (regex.test(line)) matches.push({ ln: i + 1, line });
  });
  return matches;
}
function countMatches(content, regex) {
  const m = content.match(regex);
  return m ? m.length : 0;
}

// ════════════════════════════════════════════════════════
// CHECKS
// ════════════════════════════════════════════════════════

// CHK-01: 企业新表数量一致
check("CHK-01", "企业新表数量在所有文档中一致", () => {
  const issues = [];
  const planText = read("PLAN.md");
  // PLAN §10.1 实际定义的表数（#### 10.1.X 标题）
  const actualCount = countMatches(planText, /^#### 10\.1\.\d+/gm);
  // 各处的"N 张企业表/新表"引用
  const filesToCheck = [
    "PLAN.md",
    "ARCHITECTURE.md",
    "STATE.md",
    "CLAUDE.md",
    "PRD-admin.md",
  ];
  filesToCheck.forEach((f) => {
    const text = read(f);
    const matches = findLines(text, /(\d+)\s*张(?:企业|新)表/);
    matches.forEach((m) => {
      const n = parseInt(m.line.match(/(\d+)\s*张/)[1]);
      if (n !== actualCount) {
        issues.push({
          msg: `${f}:${m.ln} 写"${n} 张表"但 PLAN §10.1 实际有 ${actualCount} 张`,
          line: m.line.trim(),
        });
      }
    });
  });
  return issues;
});

// CHK-02: AP 编号引用都存在
check("CHK-02", "AP 引用都在 PLAN §2 范围内", () => {
  const issues = [];
  const planText = read("PLAN.md");
  // PLAN §2 中实际定义的 AP 编号
  const apRows = findLines(planText, /^\| \*\*AP(\d+)\*\*/);
  const definedAPs = new Set(
    apRows.map((r) => parseInt(r.line.match(/AP(\d+)/)[1]))
  );
  // AP2/3/4/9/10 是已移到 DLP-deferred.md 的历史编号，引用/提及它们合法
  const dlpMovedAPs = new Set([2, 3, 4, 9, 10]);

  const filesToCheck = [
    "CLAUDE.md",
    "PRD-admin.md",
    "ARCHITECTURE.md",
    "DECISIONS.md",
    "TASKS.md",
    "docs/workflow.md",
    "docs/session-handoff.md",
  ];
  filesToCheck.forEach((f) => {
    const text = read(f);
    const refs = text.match(/AP\d+/g) || [];
    refs.forEach((r) => {
      const n = parseInt(r.replace("AP", ""));
      if (!definedAPs.has(n) && !dlpMovedAPs.has(n)) {
        issues.push({
          msg: `${f} 引用了 ${r}，但 PLAN §2 中没有这个编号（已定义: AP${[...definedAPs].sort((a, b) => a - b).join(", AP")}）`,
        });
      }
    });
  });
  return issues;
});

// CHK-03: ADR 编号在 DECISIONS.md 中存在
check("CHK-03", "ADR 引用都在 DECISIONS.md 范围内", () => {
  const issues = [];
  const adrText = read("DECISIONS.md");
  const adrHeadings = findLines(adrText, /^## ADR-(\d+)/);
  const definedADRs = new Set(
    adrHeadings.map((r) => parseInt(r.line.match(/ADR-(\d+)/)[1]))
  );

  const filesToCheck = [
    "CLAUDE.md",
    "PLAN.md",
    "PRD-admin.md",
    "ARCHITECTURE.md",
    "STATE.md",
    "TASKS.md",
  ];
  filesToCheck.forEach((f) => {
    const text = read(f);
    const refs = text.match(/ADR-\d+/g) || [];
    refs.forEach((r) => {
      const n = parseInt(r.replace("ADR-", ""));
      if (!definedADRs.has(n)) {
        issues.push({
          msg: `${f} 引用了 ${r}，但 DECISIONS.md 中没有这个编号（已定义到 ADR-${Math.max(...definedADRs)}）`,
        });
      }
    });
  });
  return issues;
});

// CHK-04: STATE 文档版本对照表的行数与实际匹配
check("CHK-04", "STATE.md 文档版本对照表的行数与实际文件一致", () => {
  const issues = [];
  const stateText = read("STATE.md");
  // 表格行格式: | <文件名> | <版本> | <行数> |
  const tableRows = stateText.match(
    /^\|\s*([\w\-\/]+\.md|[\w\-\/]+\.js)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|$/gm
  );
  if (!tableRows) {
    issues.push({ msg: "STATE.md 中没找到文档版本对照表" });
    return issues;
  }
  tableRows.forEach((row) => {
    const m = row.match(
      /^\|\s*([\w\-\/]+\.(?:md|js))\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|$/
    );
    if (!m) return;
    const filename = m[1];
    const declaredLines = parseInt(m[3]);
    const actualPath = path.join(ROOT, filename);
    if (!fs.existsSync(actualPath)) {
      issues.push({
        msg: `STATE 表声明 ${filename} 但文件不存在`,
      });
      return;
    }
    const actual = lineCount(filename);
    // 容忍 ±5% 误差（小幅修订不强制更新 STATE）
    const tolerance = Math.max(5, Math.floor(actual * 0.05));
    const diff = Math.abs(actual - declaredLines);
    if (diff > tolerance) {
      issues.push({
        msg: `${filename}: STATE 声明 ${declaredLines} 行，实际 ${actual} 行（误差 ${diff} > 容忍 ${tolerance}）`,
      });
    }
  });
  return issues;
});

// CHK-05: PLAN 顶部版本号 = §0.3 最新版本
check("CHK-05", "PLAN.md 顶部版本号与 §0.3 最新一致", () => {
  const issues = [];
  const text = read("PLAN.md");
  // 顶部 "最后更新：YYYY-MM-DD（vX.Y · ...）"
  const topMatch = text.match(/最后更新：[\d-]+（v(\d+\.\d+)/);
  if (!topMatch) {
    issues.push({ msg: "PLAN.md 顶部没找到版本号声明" });
    return issues;
  }
  const topVersion = topMatch[1];
  // §0.3 历史里"v0.X（当前）"
  const historyCurrent = text.match(/-\s*v(\d+\.\d+)（当前）/);
  if (!historyCurrent) {
    issues.push({ msg: "PLAN.md §0.3 没标记任何 v0.X（当前）" });
    return issues;
  }
  if (topVersion !== historyCurrent[1]) {
    issues.push({
      msg: `PLAN 顶部 v${topVersion} ≠ §0.3 当前 v${historyCurrent[1]}`,
    });
  }
  return issues;
});

// CHK-06: knowledge-graph 关键数字一致（节点 / 边 / 厂商 / features 域）
check("CHK-06", "knowledge-graph 数据点跨文档一致", () => {
  const issues = [];
  const filesToScan = [
    "ARCHITECTURE.md",
    "CLAUDE.md",
    "PLAN.md",
    "PRD-admin.md",
    "STATE.md",
    "knowledge-graph/INDEX.md",
    "knowledge-graph/sources.md",
  ];

  const metrics = {
    "总节点数": /(\d{4,})\s*节点/g,
    "总边数": /(\d{4,})\s*边/g,
    "层数": /(\d{1,2})\s*层架构/g,
    "厂商数": /(\d{1,3})\s*家(?:厂商|adapter|channel|LLM)/g,
    "组件数": /(\d{1,4})\s*个?\s*shadcn/g,
    "i18n 语言": /(\d+)\s*语言|(\d+)\s*种语言/g,
  };
  // 全项目图谱 vs relay 子图谱 各自合法值
  const expected = {
    "总节点数": ["6749", "1178"],     // 全项目 / relay 子集
    "总边数":   ["29338", "3481"],
    "层数":     ["30", "6", "12"],     // 全项目 / relay / 后端或前端
    "厂商数":   ["31"],
    "组件数":   ["169"],
    "i18n 语言": ["6"],
  };
  filesToScan.forEach((f) => {
    if (!fs.existsSync(path.join(ROOT, f))) return;
    const text = read(f);
    Object.entries(metrics).forEach(([metric, regex]) => {
      const found = [...text.matchAll(regex)];
      found.forEach((m) => {
        const value = m[1] || m[2];
        if (!value) return;
        if (!expected[metric].includes(value)) {
          issues.push({
            msg: `${f}: ${metric} 写 ${value} 但允许的值是 [${expected[metric].join(", ")}]（上下文: "${m[0]}"）`,
          });
        }
      });
    });
  });
  return issues;
});

// CHK-07: TASKS.md 燃尽快报 M1 数字内部一致
check("CHK-07", "TASKS.md 燃尽快报 M1 任务数内部一致", () => {
  const issues = [];
  const text = read("TASKS.md");

  // 燃尽快报表格里 M1 那行的任务总数列
  const burndownM1 = text.match(
    /\|\s*\*\*M1\*\*\s*\|[^|]+\|[^|]+\|\s*\*?\*?(\d+)\*?\*?\s*\|/
  );
  // 正文里 "M1 任务 NN → **MM**" 的最终数
  const proseM1 = text.match(/M1 任务\s*\d+\s*→\s*\*?\*?(\d+)/);

  if (burndownM1 && proseM1) {
    const a = parseInt(burndownM1[1]);
    const b = parseInt(proseM1[1]);
    if (a !== b) {
      issues.push({
        msg: `TASKS 燃尽快报 M1=${a} ≠ 正文 "M1 任务 → ${b}"`,
      });
    }
  } else {
    if (!burndownM1)
      issues.push({ msg: "TASKS 燃尽快报没找到 M1 行" });
  }
  return issues;
});

// CHK-08: DLP 内容没有泄漏回 PLAN/PRD/ARCH（已搬到 DLP-deferred.md）
check("CHK-08", "DLP 内容无泄漏回主文档", () => {
  const issues = [];
  const dlpKeywords = ["dlp_rule", "dlp_audit", "dlp_alert"];
  const filesToCheck = ["PLAN.md", "PRD-admin.md", "ARCHITECTURE.md"];
  filesToCheck.forEach((f) => {
    const text = read(f);
    dlpKeywords.forEach((kw) => {
      const matches = findLines(text, new RegExp(kw, "i"));
      matches.forEach((m) => {
        // 如果这一行只是引用 DLP-deferred.md 是 OK
        if (
          !m.line.includes("DLP-deferred.md") &&
          !m.line.includes("→ 见") &&
          !m.line.includes("dlp/审计")
        ) {
          issues.push({
            msg: `${f}:${m.ln} 含 DLP 关键字 "${kw}" 但本文档不应讨论 DLP`,
            line: m.line.trim().slice(0, 100),
          });
        }
      });
    });
  });
  return issues;
});

// CHK-09: 必要文件存在
check("CHK-09", "所有必要文件存在", () => {
  const issues = [];
  const required = [
    "CLAUDE.md",
    "STATE.md",
    "TASKS.md",
    "DECISIONS.md",
    "PLAN.md",
    "PRD-admin.md",
    "ARCHITECTURE.md",
    "DLP-deferred.md",
    "docs/workflow.md",
    "docs/session-handoff.md",
    "knowledge-graph/INDEX.md",
    "knowledge-graph/README.md",
    "knowledge-graph/query.js",
    "knowledge-graph/sources.md",
    // S-003 新增
    "PAGES-admin.md",
    "SESSION-S003-handoff.md",
    "spec/error-rules.yaml",
    "docs/agent-collaboration.md",
    "docs/coding-principles.md",
    "scripts/check-consistency.js",
  ];
  required.forEach((f) => {
    if (!fs.existsSync(path.join(ROOT, f))) {
      issues.push({ msg: `必要文件 ${f} 不存在` });
    }
  });
  return issues;
});

// CHK-10: PRD + PAGES 覆盖全部 6 角色（英文名，ADR-013）
check("CHK-10", "PRD/PAGES 6 角色都齐", () => {
  const issues = [];
  const roles = [
    "root",
    "group_admin",
    "dept_admin",
    "ai_liaison",
    "compliance_auditor",
    "common",
  ];
  ["PRD-admin.md", "PAGES-admin.md"].forEach((f) => {
    const text = read(f);
    roles.forEach((r) => {
      if (!text.includes(r)) {
        issues.push({ msg: `${f} 没出现角色 "${r}"` });
      }
    });
  });
  return issues;
});

// CHK-12: PAGES 页面数与 CLAUDE/STATE 声明一致
check("CHK-12", "PAGES 页面数与文档声明一致", () => {
  const issues = [];
  const pagesText = read("PAGES-admin.md");
  // 标准页面 ID：P-Mx-XX-NN（企业域）+ P-S-NN（系统域）
  const enterprisePages = new Set(
    (pagesText.match(/P-M[1-3]-[A-Z]{2}-\d+/g) || [])
  );
  const sysPages = new Set((pagesText.match(/P-S-\d+/g) || []));
  const total = enterprisePages.size + sysPages.size;

  // CLAUDE §8 + STATE 里 "NN 页" 的声明
  ["CLAUDE.md", "STATE.md"].forEach((f) => {
    const text = read(f);
    const matches = findLines(text, /(\d+)\s*页/);
    matches.forEach((m) => {
      const n = parseInt(m.line.match(/(\d+)\s*页/)[1]);
      // 容忍 ±2（小幅增减不强制同步）
      if (Math.abs(n - total) > 2) {
        issues.push({
          msg: `${f}:${m.ln} 声明 "${n} 页"，但 PAGES 实际 ${total} 页（企业 ${enterprisePages.size} + 系统 ${sysPages.size}）`,
        });
      }
    });
  });
  return issues;
});

// CHK-13: CLAUDE "AP 原则 N 条" 与 PLAN §2 实际定义数一致
check("CHK-13", 'CLAUDE "AP 原则 N 条" 与 PLAN 实际一致', () => {
  const issues = [];
  const planText = read("PLAN.md");
  const apCount = countMatches(planText, /^\|\s*\*\*AP\d+/gm);

  const claudeText = read("CLAUDE.md");
  const m = claudeText.match(/AP 原则\s*(\d+)\s*条/);
  if (m) {
    const declared = parseInt(m[1]);
    if (declared !== apCount) {
      issues.push({
        msg: `CLAUDE 说 "AP 原则 ${declared} 条"，但 PLAN §2 实际定义 ${apCount} 条（编号最大到 AP27，AP2/3/4/9/10 已移 DLP-deferred）`,
      });
    }
  }
  return issues;
});

// CHK-14: STATE 引用的任务总数与 TASKS 燃尽一致
check("CHK-14", "STATE 任务数引用与 TASKS 燃尽一致", () => {
  const issues = [];
  const tasksText = read("TASKS.md");
  // TASKS 燃尽快报里 M0/Spec/Phase0/M1 四行的任务数之和
  const rows = ["M0", "Spec 重写", "Phase 0 Harness", "M1"];
  let sum = 0;
  let found = 0;
  tasksText.split(/\r?\n/).forEach((line) => {
    const m = line.match(
      /^\|\s*\*?\*?(M0|Spec[^|]*|Phase 0[^|]*|M1)\*?\*?\s*\|[^|]+\|[^|]+\|\s*\*?\*?(\d+)\*?\*?\s*\|/
    );
    if (m) {
      sum += parseInt(m[2]);
      found++;
    }
  });
  // STATE 里 "NNN 任务" 的声明
  const stateText = read("STATE.md");
  const stateMatches = findLines(stateText, /(\d+)\s*任务/);
  stateMatches.forEach((sm) => {
    const n = parseInt(sm.line.match(/(\d+)\s*任务/)[1]);
    // 只校验明显是"总数"语义的（≥ 50），且与燃尽和差距大
    if (n >= 50 && found >= 3 && Math.abs(n - sum) > 5) {
      issues.push({
        msg: `STATE:${sm.ln} 声明 "${n} 任务"，但 TASKS 燃尽 M0+Spec+Phase0+M1 = ${sum}`,
      });
    }
  });
  return issues;
});

// CHK-11: M1 13 张表 vs PLAN §10.0 总览表"M1 实现"行数
check("CHK-11", "PLAN §10.0 总览中 M1 实现表数 = 实际 M1 表数", () => {
  const issues = [];
  const text = read("PLAN.md");
  // PLAN §10.0 总览表，"M1 实现"或"一期实现"标记的行
  const m1Rows = text.match(/\|\s*`\w+`\s*\|\s*新表\s*\|\s*enterprise\/.+M1\s*实现/gm);
  const m1Count = m1Rows ? m1Rows.length : 0;
  // 加上"一期实现"（早期 v0.3 的措辞，跟 M1 等价）
  const earlyRows = text.match(/\|\s*`\w+`\s*\|\s*新表\s*\|\s*enterprise\/.+一期\s*实现/gm);
  const earlyCount = earlyRows ? earlyRows.length : 0;

  // 期望：m1 + 一期 = M1 实施的表数（应该是 8 张：dept/user_dept/dept_budget/svc/hr_sync/audit_log/audit_attach/device/admin_action_log/export_task）
  // 数实际 M1 ★ 表
  const m1StarTables = text.match(/^####\s*10\.1\.\d+\s*`\w+`.*★.*M1/gm);
  const expectedM1 = m1StarTables ? m1StarTables.length : 0;

  // 不严格判断，仅信息性提示
  if (expectedM1 > 0 && m1Count + earlyCount === 0) {
    issues.push({
      msg: `PLAN §10.0 总览表里没标 M1 实现的表，但 §10.1 标了 ★ M1 的表 ${expectedM1} 张`,
    });
  }
  return issues;
});

// ════════════════════════════════════════════════════════
// OUTPUT
// ════════════════════════════════════════════════════════
const failed = results.filter((r) => r.status !== "✅ pass");
const passed = results.filter((r) => r.status === "✅ pass");

if (!QUIET) {
  console.log("=".repeat(70));
  console.log("hmrouter 文档跨文件一致性检查");
  console.log("=".repeat(70));
  console.log(`总检查项: ${results.length}`);
  console.log(`通过: ${passed.length}`);
  console.log(`失败: ${failed.length}`);
  console.log();
  results.forEach((r) => {
    console.log(`${r.status} ${r.id} ${r.name}`);
    if (r.issues.length > 0) {
      r.issues.forEach((i) => {
        console.log(`        ↳ ${i.msg}`);
        if (i.line) console.log(`          | ${i.line}`);
      });
    }
  });
  console.log();
}

if (failed.length > 0) {
  console.log(`❌ ${failed.length} / ${results.length} 检查项失败`);
  process.exit(1);
} else {
  console.log(`✅ ${results.length} / ${results.length} 检查项全部通过`);
  process.exit(0);
}
