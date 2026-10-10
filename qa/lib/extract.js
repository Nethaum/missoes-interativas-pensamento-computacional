const fs = require('fs');
const { INDEX_HTML_PATH } = require('./paths');

const CONST_INDENT = '\n      const ';
const INLINE_SCRIPT = /<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g;

function readIndexHtml() {
  return fs.readFileSync(INDEX_HTML_PATH, 'utf8').replace(/\r\n/g, '\n');
}

/** Lê o texto de uma constante de nível superior do script, até o `;` que a fecha. */
function sliceConstSource(html, name) {
  const declaration = CONST_INDENT + name + ' = ';
  const declarationIndex = html.indexOf(declaration);
  if (declarationIndex < 0) throw new Error(`constante não encontrada: ${name}`);
  const start = declarationIndex + declaration.length;
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const char = html[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'" || char === '`') quote = char;
    else if ('[{('.includes(char)) depth++;
    else if (']})'.includes(char)) depth--;
    else if (char === ';' && depth === 0) return html.slice(start, i);
  }
  throw new Error(`fim da constante não encontrado: ${name}`);
}

/** Avalia uma constante de dados do index.html (sem navegador). `dependencies` injeta nomes usados por ela. */
function loadConst(name, dependencies = {}) {
  const source = sliceConstSource(readIndexHtml(), name);
  const names = Object.keys(dependencies);
  return new Function(...names, `return (${source});`)(...names.map((key) => dependencies[key]));
}

/** Devolve o código de cada <script> embutido no index.html. */
function extractInlineScripts(html = readIndexHtml()) {
  return [...html.matchAll(INLINE_SCRIPT)].map((match) => match[1]);
}

module.exports = { readIndexHtml, loadConst, extractInlineScripts };
