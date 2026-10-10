const { extractInlineScripts } = require('../lib/extract');
const { createReport } = require('../lib/report');

const report = createReport('syntax');
extractInlineScripts().forEach((source, index) => {
  try {
    new Function(source);
    report.ok(`script ${index + 1} (${source.length} caracteres)`);
  } catch (error) {
    report.problem(`script ${index + 1}: ${error.message}`);
  }
});
report.finish();
