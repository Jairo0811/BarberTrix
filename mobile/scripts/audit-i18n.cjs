const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
// Load only checked-in dictionary modules; never bundles or downloaded code.
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, filename);
const { dictionaries } = require('../src/i18n/dictionaries.ts');
const root = path.resolve(__dirname, '..');
const used = new Set(); const literals = []; const missing = [];
function walk(directory) {
 for (const file of fs.readdirSync(directory, { withFileTypes: true })) {
  const full = path.join(directory, file.name);
  if (file.isDirectory()) { if (file.name !== 'i18n') walk(full); continue; }
  if (!/\.tsx?$/.test(file.name)) continue;
  const source = ts.createSourceFile(full, fs.readFileSync(full, 'utf8'), ts.ScriptTarget.Latest, true, full.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const location = node => `${path.relative(root, full)}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
  function visit(node) {
   if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't' && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) used.add(node.arguments[0].text);
   if (ts.isJsxText(node) && /[\p{L}]/u.test(node.text) && node.text.trim() !== 'BarberTrix') literals.push({ location: location(node), text: node.text.trim() });
   if (ts.isJsxAttribute(node) && ['placeholder','accessibilityLabel','accessibilityHint'].includes(node.name.getText()) && node.initializer && ts.isStringLiteral(node.initializer) && /[\p{L}]/u.test(node.initializer.text)) literals.push({ location: location(node), text: node.initializer.text });
   ts.forEachChild(node, visit);
  }
  visit(source);
 }
}
walk(path.join(root, 'app')); walk(path.join(root, 'src'));
for (const key of used) for (const locale of ['es-419', 'en']) if (!dictionaries[locale][key]?.trim()) missing.push({ locale, key });
const report = { staticKeys: used.size, missing, visibleLiteralCandidates: literals, possiblyUnusedKeys: Object.keys(dictionaries.en).filter(key => !used.has(key)) };
if (process.argv.includes('--report')) console.log(JSON.stringify(report, null, 2));
else console.log(JSON.stringify({ staticKeys: used.size, missing, visibleLiteralCandidates: literals.length, possiblyUnusedKeys: report.possiblyUnusedKeys.length }));
// Dynamic keys require review; candidates are not automatically deleted.
if (missing.length) process.exitCode = 1;
