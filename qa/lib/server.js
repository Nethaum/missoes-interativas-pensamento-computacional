const http = require('http');
const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT } = require('./paths');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function resolveRequestedFile(requestUrl) {
  const pathname = decodeURIComponent(requestUrl.split('?')[0]);
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const absolutePath = path.resolve(PROJECT_ROOT, relativePath);
  const insideProject = absolutePath.startsWith(PROJECT_ROOT);
  const isFile = insideProject && fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile();
  return isFile ? absolutePath : null;
}

function handleRequest(request, response) {
  const file = resolveRequestedFile(request.url);
  if (!file) {
    response.writeHead(404);
    response.end('not found');
    return;
  }
  const contentType = CONTENT_TYPES[path.extname(file)] || 'application/octet-stream';
  response.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(file).pipe(response);
}

/** Serve o projeto numa porta livre e devolve a URL base e a função para encerrar. */
function startServer() {
  const server = http.createServer(handleRequest);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ url: `http://127.0.0.1:${port}`, close: () => new Promise((done) => server.close(done)) });
    });
  });
}

module.exports = { startServer };
