const emojiData = require('emojibase-data/en/data.json');
const { readIndexHtml } = require('../lib/extract');
const { createReport } = require('../lib/report');

// Política do projeto: só emojis até a versão 12 do Unicode, que aparecem em aparelhos mais antigos.
const MAX_EMOJI_VERSION = 12;
const EMOJI_SEQUENCE = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator}{2})(?:️|‍\p{Extended_Pictographic}️?|[\u{1F3FB}-\u{1F3FF}])*/gu;
const INLINE_SVG = /<svg[\s\S]*?<\/svg>|"[a-z]{2}": "<svg[^"]*"/g;

const withoutVariationSelector = (emoji) => emoji.replace(/️/g, '');

function buildVersionMap() {
  const versions = new Map();
  for (const entry of emojiData) {
    versions.set(withoutVariationSelector(entry.emoji), entry.version);
    (entry.skins || []).forEach((skin) => versions.set(withoutVariationSelector(skin.emoji), skin.version));
  }
  return versions;
}

function findEmojis(html) {
  const found = new Map();
  html.replace(INLINE_SVG, '').split('\n').forEach((line, index) => {
    for (const match of line.matchAll(EMOJI_SEQUENCE)) {
      const emoji = withoutVariationSelector(match[0]);
      if (!found.has(emoji)) found.set(emoji, { count: 0, firstLine: index + 1 });
      found.get(emoji).count++;
    }
  });
  return found;
}

const report = createReport('emoji');
const versions = buildVersionMap();
const found = findEmojis(readIndexHtml());
for (const [emoji, { count, firstLine }] of found) {
  const version = versions.get(emoji);
  if (version === undefined) report.problem(`${emoji} (x${count}, linha ${firstLine}): versão desconhecida`);
  else if (Math.floor(version) > MAX_EMOJI_VERSION) report.problem(`${emoji} (x${count}, linha ${firstLine}): emoji da versão ${version}`);
}
report.ok(`${found.size} emojis distintos conferidos`);
report.finish();
