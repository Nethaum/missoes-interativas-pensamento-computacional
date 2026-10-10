/** Acumula resultados de uma verificação e define o código de saída do processo. */
function createReport(name) {
  const problems = [];
  return {
    ok: (message) => console.log(`  ok  ${message}`),
    info: (message) => console.log(`      ${message}`),
    problem: (message) => {
      problems.push(message);
      console.log(`  ERRO ${message}`);
    },
    finish: () => {
      const summary = problems.length ? `${problems.length} problema(s)` : 'sem problemas';
      console.log(`${name}: ${summary}`);
      if (problems.length) process.exitCode = 1;
      return problems.length === 0;
    },
  };
}

function parseOptions(argv) {
  const options = {};
  argv.forEach((arg, index) => {
    if (arg.startsWith('--')) options[arg.slice(2)] = argv[index + 1];
  });
  return options;
}

module.exports = { createReport, parseOptions };
