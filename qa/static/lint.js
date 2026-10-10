const fs = require('fs');
const os = require('os');
const path = require('path');
const { ESLint } = require('eslint');
const { extractInlineScripts } = require('../lib/extract');
const { createReport } = require('../lib/report');

const CONFIG_PATH = path.join(__dirname, 'eslint.config.js');

async function lintSource(source, scratchDir) {
  const file = path.join(scratchDir, 'app.js');
  fs.writeFileSync(file, source);
  const eslint = new ESLint({ overrideConfigFile: CONFIG_PATH, cwd: scratchDir });
  return (await eslint.lintFiles([file]))[0].messages;
}

async function main() {
  const report = createReport('lint');
  const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'missoes-lint-'));
  const scripts = extractInlineScripts();
  for (const [index, source] of scripts.entries()) {
    const messages = await lintSource(source, scratchDir);
    messages.forEach((message) => report.problem(`script ${index + 1} linha ${message.line}: ${message.message} (${message.ruleId})`));
    if (!messages.length) report.ok(`script ${index + 1} sem avisos`);
  }
  fs.rmSync(scratchDir, { recursive: true, force: true });
  report.finish();
}

main();
