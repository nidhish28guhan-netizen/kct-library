'use strict';
/*
 * Static code metrics (blueprint §"Quality & DevOps"): McCabe cyclomatic
 * complexity + Halstead effort/vocabulary + LOC per function, computed over
 * backend production source using acorn ASTs. Writes docs/metrics-report.json.
 * Run: npm run metrics
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
// eslint-disable-next-line import/no-absolute-path
const acorn = require(path.join(ROOT, 'backend', 'node_modules', 'acorn'));
const SRC = path.join(ROOT, 'backend', 'src');
const SKIP = /node_modules|\.test\.js$|seed\.js$/;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name))
      : e.name.endsWith('.js') && !SKIP.test(path.join(e.name)) ? [path.join(dir, e.name)] : []);
}

/* McCabe V(G) = 1 + count of decision points inside a function node. */
const DECISION = new Set(['IfStatement', 'ConditionalExpression', 'ForStatement', 'ForInStatement',
  'ForOfStatement', 'WhileStatement', 'DoWhileStatement', 'SwitchCase', 'LogicalExpression']);
function complexity(fn) {
  let v = 1;
  (function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (DECISION.has(node.type)) {
      if (node.type === 'LogicalExpression' && node.operator === '??') { /* nullish not a branch */ }
      else if (node.type === 'SwitchCase' && node.test === null) { /* default */ }
      else v++;
    }
    for (const k of Object.keys(node)) if (k !== 'type' && k !== 'loc' && k !== 'start' && k !== 'end') visit(node[k]);
  })(fn.body);
  return v;
}

/* Halstead counts over operator/punctuator tokens within a function range. */
function halstead(srcText, fn) {
  const body = srcText.slice(fn.start, fn.end);
  const operators = body.match(/\b(?:if|else|for|while|do|switch|case|return|new|typeof|instanceof|in|of|try|catch)\b|[=!]==?|[<>]=?|\+\+|--|\+=|-=|\|=|&&|\|\||\?\?|\?\./g) || [];
  const operands = body.match(/[A-Za-z_$][\w$.]*|\d+(?:\.\d+)?/g) || [];
  const uniqOps = new Set(operators); const uniqAnd = new Set(operands);
  const N1 = operators.length, N2 = operands.length;
  const n1 = uniqOps.size || 1, n2 = uniqAnd.size || 1;
  const N = N1 + N2, n = n1 + n2;
  const volume = N * Math.log2(n || 1);
  const difficulty = (n1 / 2) * (N2 / n2);
  return { vocabulary: n, length: N, volume: +volume.toFixed(1), effort: +(volume * difficulty).toFixed(0) };
}

function functionsOf(ast) {
  const out = [];
  (function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowExpression' || node.type === 'ArrowFunctionExpression') out.push(node);
    for (const k of Object.keys(node)) if (k !== 'type' && k !== 'loc') visit(node[k]);
  })(ast);
  return out;
}

const rows = [];
for (const file of walk(SRC)) {
  const text = fs.readFileSync(file, 'utf8');
  let ast; try { ast = acorn.parse(text, { ecmaVersion: 'latest', locations: true }); } catch { continue; }
  const rel = path.relative(ROOT, file);
  const loc = text.split('\n').length;
  const fns = functionsOf(ast);
  const metrics = fns.map((f) => {
    const name = f.id ? f.id.name
      : (f.parent && f.parent.key) ? f.parent.key.name
        : (f.parent && f.parent.id) ? f.parent.id.name : '(anonymous)';
    const lines = f.loc ? f.loc.end.line - f.loc.start.line + 1 : 0;
    return { name, cc: complexity(f), ...halstead(text, f), lines };
  });
  const worst = metrics.reduce((m, x) => (!m || x.cc > m.cc ? x : m), null);
  const avgCc = +(metrics.reduce((s, m) => s + m.cc, 0) / (metrics.length || 1)).toFixed(2);
  rows.push({ file: rel, loc, functions: fns.length, avgCyclomatic: avgCc,
    maxCyclomatic: worst ? worst.cc : 1, worstFn: worst ? worst.name : '—',
    totalHalsteadEffort: metrics.reduce((s, m) => s + m.effort, 0) });
}

function hotFns() {
  const hot = [];
  for (const f of walk(SRC)) {
    const t = fs.readFileSync(f, 'utf8');
    let ast; try { ast = acorn.parse(t, { ecmaVersion: 'latest' }); } catch { continue; }
    functionsOf(ast).forEach((fn) => { const cc = complexity(fn); if (cc > 10) hot.push({ file: path.relative(ROOT, f), cc }); });
  }
  return hot;
}

const totals = {
  files: rows.length,
  loc: rows.reduce((s, r) => s + r.loc, 0),
  functions: rows.reduce((s, r) => s + r.functions, 0),
  avgCyclomatic: +(rows.reduce((s, r) => s + r.avgCyclomatic * r.functions, 0) / (rows.reduce((s, r) => s + r.functions, 0) || 1)).toFixed(2),
  maxCyclomatic: Math.max(...rows.map((r) => r.maxCyclomatic)),
  highComplexityFns: hotFns()
};

const outDir = path.join(ROOT, 'docs');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'metrics-report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), totals, perFile: rows }, null, 2));
console.log(JSON.stringify(totals, null, 2));
console.log('\nPer-file (LOC · fns · avg CC · max CC):');
for (const r of rows) console.log(`  ${r.file.padEnd(48)} ${String(r.loc).padStart(5)} ${String(r.functions).padStart(4)} ${String(r.avgCyclomatic).padStart(6)} ${String(r.maxCyclomatic).padStart(4)}`);
console.log('\nWrote docs/metrics-report.json');
