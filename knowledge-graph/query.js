#!/usr/bin/env node
/**
 * hmrouter 知识图谱查询工具
 *
 * 用法：
 *   node knowledge-graph/query.js <command> [args]
 *
 * 命令：
 *   stats                          总览（节点/边/层/语言/框架）
 *   layers                         列 30 个层
 *   layer <id>                     列某层所有文件（如 channel-adapters）
 *   tour                           列 36 步学习导览
 *   tour <n>                       展开第 n 步
 *   hubs [--top=N] [--in|--out]    fan-in/out 排行
 *   file <path>                    某文件信息（含其包含的函数/类）
 *   deps <path>                    某文件 import 了谁
 *   refs <path>                    谁 import 了某文件
 *   adapters                       列所有 channel adapter
 *   features                       列前端 features 22 个域
 *   grep <regex>                   按文件路径正则搜节点
 *   summary <regex>                按 summary 文本搜节点
 *
 * 选项：
 *   --relay                        用 relay 子图（更小更快），默认全项目
 *   --json                         输出 JSON 而非美化文本
 */
const fs = require("fs");
const path = require("path");

const ARGS = process.argv.slice(2);
const FLAGS = new Set(ARGS.filter((a) => a.startsWith("--")));
const POSITIONAL = ARGS.filter((a) => !a.startsWith("--"));
const cmd = POSITIONAL[0];

const useRelay = FLAGS.has("--relay");
const asJson = FLAGS.has("--json");
const top =
  parseInt((ARGS.find((a) => a.startsWith("--top=")) || "").split("=")[1]) ||
  10;

const PROJECT_ROOT = path.resolve(__dirname, "..");
const GRAPH_PATH = useRelay
  ? path.join(
      PROJECT_ROOT,
      "new-api",
      "relay",
      ".understand-anything",
      "knowledge-graph.json"
    )
  : path.join(PROJECT_ROOT, ".understand-anything", "knowledge-graph.json");

function loadGraph() {
  if (!fs.existsSync(GRAPH_PATH)) {
    console.error("图谱不存在: " + GRAPH_PATH);
    console.error("先用 Understand-Anything 工具生成。");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(GRAPH_PATH, "utf8"));
}

function out(obj) {
  if (asJson) console.log(JSON.stringify(obj, null, 2));
  else if (typeof obj === "string") console.log(obj);
  else console.log(obj);
}

const COMMANDS = {
  stats() {
    const g = loadGraph();
    const byType = {};
    g.nodes.forEach((n) => (byType[n.type] = (byType[n.type] || 0) + 1));
    const byEdge = {};
    g.edges.forEach((e) => (byEdge[e.type] = (byEdge[e.type] || 0) + 1));
    out({
      project: g.project.name,
      gitCommitHash: g.project.gitCommitHash,
      analyzedAt: g.project.analyzedAt,
      languages: g.project.languages,
      nodes: g.nodes.length,
      edges: g.edges.length,
      layers: g.layers.length,
      tour: g.tour.length,
      nodeTypes: byType,
      edgeTypes: byEdge,
    });
  },

  layers() {
    const g = loadGraph();
    g.layers.forEach((l, i) => {
      console.log(`${(i + 1).toString().padStart(2)}. ${l.id}`);
      console.log(`    ${l.name}  (${l.nodeIds.length} 节点)`);
      console.log(`    ${l.description}`);
      console.log();
    });
  },

  layer() {
    const g = loadGraph();
    const id = POSITIONAL[1];
    if (!id) {
      console.error("用法: query.js layer <layer-id>");
      console.error("先 query.js layers 看可用 id");
      process.exit(1);
    }
    const fullId = id.startsWith("layer:") ? id : "layer:" + id;
    const layer = g.layers.find((l) => l.id === fullId);
    if (!layer) {
      console.error("未找到层: " + fullId);
      process.exit(1);
    }
    const nodeMap = new Map(g.nodes.map((n) => [n.id, n]));
    console.log(`# ${layer.name} (${fullId})`);
    console.log(layer.description);
    console.log(`\n${layer.nodeIds.length} 节点：\n`);
    layer.nodeIds.forEach((nid) => {
      const n = nodeMap.get(nid);
      if (!n) return;
      const fp = n.filePath ? n.filePath : n.name;
      const sum = n.summary ? " — " + n.summary.slice(0, 80) : "";
      console.log(`  [${n.type}] ${fp}${sum}`);
    });
  },

  tour() {
    const g = loadGraph();
    const n = parseInt(POSITIONAL[1]);
    if (n) {
      const step = g.tour.find((t) => t.order === n);
      if (!step) {
        console.error("步骤不存在: " + n);
        process.exit(1);
      }
      const nodeMap = new Map(g.nodes.map((nd) => [nd.id, nd]));
      console.log(`# Step ${step.order}: ${step.title}`);
      console.log(step.description);
      console.log(`\n涉及 ${step.nodeIds.length} 节点：\n`);
      step.nodeIds.forEach((nid) => {
        const nd = nodeMap.get(nid);
        if (nd) console.log(`  [${nd.type}] ${nd.filePath || nd.name}`);
      });
      return;
    }
    g.tour.forEach((t) => {
      console.log(
        `Step ${t.order.toString().padStart(2)}: ${t.title}  (${t.nodeIds.length} 节点)`
      );
    });
  },

  hubs() {
    const g = loadGraph();
    const direction = FLAGS.has("--in") ? "in" : "out"; // 默认 out
    const deg = {};
    g.edges.forEach((e) => {
      if (e.type !== "imports") return;
      const key = direction === "out" ? e.source : e.target;
      deg[key] = (deg[key] || 0) + 1;
    });
    const nodeMap = new Map(g.nodes.map((n) => [n.id, n]));
    console.log(
      `# TOP ${top} fan-${direction} (${direction === "out" ? "调最多人" : "被最多人调"})`
    );
    Object.entries(deg)
      .sort((a, b) => b[1] - a[1])
      .slice(0, top)
      .forEach(([id, d]) => {
        const n = nodeMap.get(id);
        if (!n) return;
        const sum = n.summary ? " — " + n.summary.slice(0, 60) : "";
        console.log(
          `  ${d.toString().padStart(4)}  ${(n.filePath || n.name).padEnd(50)}${sum}`
        );
      });
  },

  file() {
    const g = loadGraph();
    const fp = POSITIONAL[1];
    if (!fp) {
      console.error("用法: query.js file <relative-path>");
      process.exit(1);
    }
    const node = g.nodes.find(
      (n) => n.type === "file" && n.filePath === fp
    );
    if (!node) {
      console.error("文件未找到: " + fp);
      console.error("提示: 用 grep 命令模糊查");
      process.exit(1);
    }
    console.log(`# ${node.filePath}`);
    console.log(node.summary || "(无 summary)");
    if (node.tags && node.tags.length) console.log("Tags: " + node.tags.join(", "));
    if (node.complexity != null) console.log("Complexity: " + node.complexity);
    const contains = g.edges.filter(
      (e) => e.source === node.id && e.type === "contains"
    );
    if (contains.length) {
      const nodeMap = new Map(g.nodes.map((n) => [n.id, n]));
      console.log(`\n包含 ${contains.length} 个子节点：`);
      contains.forEach((e) => {
        const c = nodeMap.get(e.target);
        if (c)
          console.log(
            `  [${c.type}] ${c.name}` +
              (c.summary ? "  — " + c.summary.slice(0, 60) : "")
          );
      });
    }
  },

  deps() {
    const g = loadGraph();
    const fp = POSITIONAL[1];
    if (!fp) {
      console.error("用法: query.js deps <relative-path>");
      process.exit(1);
    }
    const id = "file:" + fp;
    const nodeMap = new Map(g.nodes.map((n) => [n.id, n]));
    const deps = g.edges
      .filter((e) => e.source === id && e.type === "imports")
      .map((e) => nodeMap.get(e.target))
      .filter(Boolean);
    console.log(`# ${fp} 依赖 ${deps.length} 个目标：\n`);
    deps.forEach((n) => {
      const sum = n.summary ? "  — " + n.summary.slice(0, 60) : "";
      console.log(`  ${(n.filePath || n.name).padEnd(50)}${sum}`);
    });
  },

  refs() {
    const g = loadGraph();
    const fp = POSITIONAL[1];
    if (!fp) {
      console.error("用法: query.js refs <relative-path>");
      process.exit(1);
    }
    const id = "file:" + fp;
    const nodeMap = new Map(g.nodes.map((n) => [n.id, n]));
    const refs = g.edges
      .filter((e) => e.target === id && e.type === "imports")
      .map((e) => nodeMap.get(e.source))
      .filter(Boolean);
    console.log(`# ${fp} 被 ${refs.length} 处引用：\n`);
    refs.forEach((n) => {
      console.log(`  ${n.filePath || n.name}`);
    });
  },

  adapters() {
    const g = loadGraph();
    const adaptors = g.nodes.filter(
      (n) =>
        n.filePath &&
        n.filePath.match(/^channel\/[^/]+\/adaptor\.go$/) &&
        n.type === "file"
    );
    console.log(`# ${adaptors.length} 家 Channel Adapter\n`);
    adaptors.forEach((n) => {
      const sum = n.summary ? "  — " + n.summary.slice(0, 70) : "";
      console.log(`  ${n.filePath}${sum}`);
    });
  },

  features() {
    const g = loadGraph();
    const dirs = new Set();
    g.nodes.forEach((n) => {
      if (n.filePath) {
        const m = n.filePath.match(/^src\/features\/([^/]+)/);
        if (m) dirs.add(m[1]);
      }
    });
    const arr = [...dirs].sort();
    console.log(`# 前端 features ${arr.length} 个业务域\n`);
    arr.forEach((d) => console.log("  " + d));
  },

  grep() {
    const g = loadGraph();
    const pattern = POSITIONAL[1];
    if (!pattern) {
      console.error("用法: query.js grep <regex>");
      process.exit(1);
    }
    const re = new RegExp(pattern, "i");
    const matched = g.nodes.filter(
      (n) => n.filePath && re.test(n.filePath)
    );
    console.log(`# 匹配 ${matched.length} 节点：\n`);
    matched.forEach((n) =>
      console.log(`  [${n.type}] ${n.filePath}${n.name && n.type !== "file" ? "  ::" + n.name : ""}`)
    );
  },

  summary() {
    const g = loadGraph();
    const pattern = POSITIONAL[1];
    if (!pattern) {
      console.error("用法: query.js summary <regex>");
      process.exit(1);
    }
    const re = new RegExp(pattern, "i");
    const matched = g.nodes.filter((n) => n.summary && re.test(n.summary));
    console.log(`# summary 匹配 ${matched.length} 节点：\n`);
    matched.slice(0, 50).forEach((n) => {
      console.log(`  [${n.type}] ${n.filePath || n.name}`);
      console.log(`    ${n.summary.slice(0, 120)}`);
    });
    if (matched.length > 50) console.log(`\n... +${matched.length - 50} more`);
  },
};

if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
  // 输出文件头部注释作为 help
  const self = fs.readFileSync(__filename, "utf8");
  const m = self.match(/^\/\*\*([\s\S]+?)\*\//);
  if (m) console.log(m[1].replace(/^ ?\* ?/gm, ""));
  process.exit(0);
}

if (!COMMANDS[cmd]) {
  console.error("未知命令: " + cmd);
  console.error("看 query.js help");
  process.exit(1);
}

COMMANDS[cmd]();
