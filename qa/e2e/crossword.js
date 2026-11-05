// Cruzadinha: resolve as 15 cruzadinhas (3 por faixa etária) pelo teclado e confere erro, apagar, dica, troca de direção,
// letras acentuadas, F e R como letras e a tela de conclusão com as habilidades da BNCC.
const { loadConst } = require('../lib/extract');
const { startServer } = require('../lib/server');
const { launchBrowser, newPage, openMenu, openMission, goHome } = require('../lib/browser');
const { createReport } = require('../lib/report');

const MISSION = 'Cruzadinha';
const SETTLE_MS = 80;
const COMPLETE_MS = 3000;
const INTERACTION_BANDS = [0, 3];
const WRONG_LETTER = 'Q';
const OTHER_WRONG_LETTER = 'W';

const buildLayout = loadConst('crosswordBuildLayout', {
  CROSSWORD_LAYOUT_TRIES: loadConst('CROSSWORD_LAYOUT_TRIES'),
  CROSSWORD_MAX_ROWS: loadConst('CROSSWORD_MAX_ROWS'),
  CROSSWORD_MAX_COLS: loadConst('CROSSWORD_MAX_COLS'),
});

// A mesma grade que o app monta: casas de cada palavra, na ordem em que as pistas aparecem.
function layoutOf(puzzle) {
  const layout = buildLayout(puzzle.words.map((entry) => entry.a));
  layout.words.forEach((word, position) => {
    word.position = position;
    word.entry = puzzle.words[word.index];
    word.cells = [...word.entry.a].map((letter, step) => ({
      row: word.row + (word.dir === 'down' ? step : 0),
      col: word.col + (word.dir === 'across' ? step : 0),
      letter,
    }));
  });
  return layout;
}

const cellSelector = (cell) => `.cw-cell[data-row="${cell.row}"][data-col="${cell.col}"]`;
const letterIn = (page, cell) => page.$eval(cellSelector(cell), (node) => [...node.childNodes].filter((part) => part.nodeType === 3).map((part) => part.textContent).join('').trim());
const press = async (page, key) => {
  await page.keyboard.press(key);
  await page.waitForTimeout(SETTLE_MS);
};
const status = (page) => page.innerText('#status');
const sendKey = (page, key) => page.evaluate(
  (value) => document.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })),
  key,
);

// Seleciona a pista e digita as letras que faltam (as casas já certas pelo cruzamento ficam como estão).
async function solveWord(page, word) {
  const clue = page.locator('.cw-clue').nth(word.position);
  if ((await clue.getAttribute('class')).includes('solved')) return;
  await clue.click();
  // a casa selecionada é a primeira vazia: as letras certas que vêm antes dela não precisam ser digitadas de novo
  const active = await page.$eval('.cw-cell.active', (node) => [Number(node.dataset.row), Number(node.dataset.col)]);
  const startAt = word.cells.findIndex((cell) => cell.row === active[0] && cell.col === active[1]);
  const typed = [];
  for (const [index, cell] of word.cells.entries()) {
    if (index < startAt) continue;
    const solved = await page.$eval(cellSelector(cell), (node) => node.classList.contains('solved'));
    if (!solved) typed.push(cell.letter);
  }
  await page.keyboard.type(typed.join(''));
  await page.waitForTimeout(SETTLE_MS);
}

// Erro, apagar, dica, troca de direção, acentos e teclas F/R: tudo na primeira cruzadinha da faixa.
async function checkInteractions(page, report, layout, where) {
  const first = layout.words[0];
  const length = first.cells.length;

  await page.locator('.cw-key[data-letter="F"]').click();
  if ((await letterIn(page, first.cells[0])) !== 'F') report.problem(`${where}: o teclado da tela deveria escrever a letra F`);
  await press(page, 'Backspace');
  await page.keyboard.type('r');
  await page.waitForTimeout(SETTLE_MS);
  if ((await letterIn(page, first.cells[0])) !== 'R') report.problem(`${where}: a tecla R deveria escrever a letra R (e não reiniciar a missão)`);
  if (!(await page.$('.cw-grid'))) report.problem(`${where}: apertar F ou R não deveria sair da missão`);
  await press(page, 'Backspace');

  await sendKey(page, 'é');
  await sendKey(page, 'ç');
  await page.waitForTimeout(SETTLE_MS);
  if ((await letterIn(page, first.cells[0])) !== 'E' || (await letterIn(page, first.cells[1])) !== 'C') report.problem(`${where}: "é" e "ç" deveriam virar E e C`);
  await press(page, 'Backspace');
  await press(page, 'Backspace');

  const wrong = first.cells.map((cell) => (cell.letter === WRONG_LETTER ? OTHER_WRONG_LETTER : WRONG_LETTER)).join('');
  await page.keyboard.type(wrong);
  await page.waitForTimeout(SETTLE_MS);
  if ((await page.locator('.cw-cell.miss').count()) !== length) report.problem(`${where}: uma palavra completa e errada deveria marcar as ${length} letras`);
  if (await page.$('.cw-result')) report.problem(`${where}: uma palavra errada não deveria concluir a cruzadinha`);
  for (let index = 0; index < length; index++) await press(page, 'Backspace');
  for (const cell of first.cells) {
    if (await letterIn(page, cell)) report.problem(`${where}: Backspace deveria apagar a palavra inteira, de trás para frente`);
  }
  if ((await page.locator('.cw-cell.miss').count()) !== 0) report.problem(`${where}: depois de apagar não deveria sobrar letra marcada como errada`);

  await page.click('.cw-hint-button');
  await page.waitForTimeout(SETTLE_MS);
  if ((await page.innerText('#rightValue')).trim() !== '1') report.problem(`${where}: a dica deveria contar no placar`);
  if ((await page.locator('.cw-cell.hinted').count()) !== 1) report.problem(`${where}: a letra de dica deveria ficar destacada`);
  if ((await letterIn(page, first.cells[0])) !== first.cells[0].letter) report.problem(`${where}: a dica deveria revelar a letra certa da primeira casa`);

  const crossing = layout.words.flatMap((word) => word.cells).find((cell, index, all) => all.findIndex((other) => other.row === cell.row && other.col === cell.col) !== index);
  if (crossing) {
    await page.click(cellSelector(crossing));
    const firstDirection = await status(page);
    await page.click(cellSelector(crossing));
    const secondDirection = await status(page);
    if (firstDirection === secondDirection) report.problem(`${where}: tocar de novo numa casa de cruzamento deveria trocar horizontal e vertical`);
  } else report.problem(`${where}: a grade deveria ter pelo menos um cruzamento`);

  const before = await status(page);
  await press(page, 'Tab');
  if ((await status(page)) === before) report.problem(`${where}: Tab deveria ir para a próxima pista`);
}

// Termina a cruzadinha atual: confere a tela final e passa para a próxima (ou volta ao painel na última).
async function finishPuzzle(page, report, puzzle, layout, where, isLast) {
  for (const word of layout.words) await solveWord(page, word);
  await page.waitForSelector('.cw-result', { timeout: 2000 }).catch(() => report.problem(`${where}: ao acertar todas as palavras deveria aparecer a conclusão`));
  if (!(await page.$('.cw-result'))) return false;
  if ((await page.locator('.cw-found li').count()) !== puzzle.words.length) report.problem(`${where}: a conclusão deveria listar as ${puzzle.words.length} palavras descobertas`);
  const skills = await page.$$eval('.cw-skill', (nodes) => nodes.map((node) => node.textContent.trim()));
  if (skills.join() !== puzzle.skills.join()) report.problem(`${where}: habilidades da BNCC erradas na conclusão (${skills.join(', ')})`);
  if ((await page.locator('.cw-cell.solved').count()) !== (await page.locator('.cw-cell').count())) report.problem(`${where}: todas as casas deveriam ficar verdes`);
  const buttonText = await page.innerText('.cw-next-button');
  if (isLast !== buttonText.includes('Concluir')) report.problem(`${where}: o botão final deveria ${isLast ? 'dizer Concluir' : 'levar para a próxima cruzadinha'} ("${buttonText}")`);
  return true;
}

async function playBand(browser, report, server, band, puzzles) {
  const page = await newPage(browser);
  await openMenu(page, server.url, band);
  await openMission(page, MISSION);
  await page.waitForSelector('.cw-grid');
  for (const [index, puzzle] of puzzles.entries()) {
    const where = `faixa ${band}, cruzadinha ${index + 1}`;
    const layout = layoutOf(puzzle);
    const counter = (await page.innerText('#leftValue')).replace(/\s+/g, '');
    if (counter !== `${index + 1}/${puzzles.length}`) report.problem(`${where}: o contador deveria mostrar ${index + 1}/${puzzles.length} e mostra ${counter}`);
    if (!(await page.innerText('#mission')).toLowerCase().includes(puzzle.title.toLowerCase())) report.problem(`${where}: o título "${puzzle.title}" deveria aparecer`);
    const uniqueCells = new Set(layout.words.flatMap((word) => word.cells.map((cell) => `${cell.row},${cell.col}`))).size;
    if ((await page.locator('.cw-cell').count()) !== uniqueCells) report.problem(`${where}: a grade deveria ter ${uniqueCells} casas`);
    if ((await page.locator('.cw-clue').count()) !== puzzle.words.length) report.problem(`${where}: deveria haver ${puzzle.words.length} pistas`);
    const picture = (await page.locator('.cw-clue-icon').count()) > 0;
    if (picture !== (band === 0)) report.problem(`${where}: a pista em figura é só da faixa dos 6-7 anos`);
    if (index === 0 && INTERACTION_BANDS.includes(band)) await checkInteractions(page, report, layout, where);
    const isLast = index === puzzles.length - 1;
    const finished = await finishPuzzle(page, report, puzzle, layout, where, isLast);
    if (!finished) break;
    if (isLast) {
      await press(page, 'Enter');
      await page.waitForSelector('.menu-tile', { timeout: COMPLETE_MS }).catch(() => report.problem(`faixa ${band}: concluir a última cruzadinha deveria voltar ao painel`));
    } else await press(page, 'Enter');
  }
  page.collectedErrors.forEach((error) => report.problem(`faixa ${band}: ${error}`));
  await page.close();
}

// O botão início (toque longo) continua levando ao painel mesmo com o teclado ocupado pela cruzadinha.
async function checkExit(browser, report, server) {
  const page = await newPage(browser);
  await openMenu(page, server.url, 2);
  await openMission(page, MISSION);
  await page.waitForSelector('.cw-grid');
  if (!(await goHome(page))) report.problem('o botão início deveria voltar ao painel');
  await page.close();
}

async function main() {
  const report = createReport('crossword');
  const bands = loadConst('crosswordPuzzlesByBand');
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    for (const [band, puzzles] of bands.entries()) await playBand(browser, report, server, band, puzzles);
    await checkExit(browser, report, server);
    report.ok(`Cruzadinha: ${bands.reduce((sum, puzzles) => sum + puzzles.length, 0)} cruzadinhas resolvidas pelo teclado`);
  } finally {
    await browser.close();
    await server.close();
  }
  report.finish();
}

main();
