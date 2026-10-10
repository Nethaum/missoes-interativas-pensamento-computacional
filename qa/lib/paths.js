const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const INDEX_HTML_PATH = path.join(PROJECT_ROOT, 'index.html');

module.exports = { PROJECT_ROOT, INDEX_HTML_PATH };
