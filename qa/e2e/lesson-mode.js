// Modo aula: quadro negro com slides que aparecem linha por linha e terminam abrindo a missão.
const { loadConst } = require('../lib/extract');
const { startServer } = require('../lib/server');
const { launchBrowser, newPage, openMenu, openMission, unlockTeacherArea } = require('../lib/browser');
const { createReport } = require('../lib/report');

const BAND_USED = 2;
const SLIDE = '.lesson-slide';
const SHOWN_LINES = '.lesson-line.shown';
const SHOWN_VISUAL = '.lesson-visual.shown';
const SETTLE_MS = 150;
// Missão do painel que abre cada aula.
const DECK_ENTRY = {
  algoritmo: 'Robô coletor',
  lacos: 'Fábrica de Laços',
  condicionais: 'Portão Lógico',
  computador: 'Computador por dentro',
  padroes: 'Padrão Perfeito',
  decomposicao: 'Divida a Tarefa',
  depuracao: 'Caça ao Bug',
  variaveis: 'Tradutor de Sinais',
  ordenacao: 'Estante Organizada',
  dados: 'Dados e gráficos',
  pixels: 'Desmistificador de Pixels',
  codigos: 'Mensagem secreta',
  programador: 'Robô Programador',
  leitura: 'Leia o código',
  estruturas: 'Organize os dados',
  seguranca: 'Navegação segura',
  ia: 'Dados, algoritmos e IA',
};

async function setMode(page, buttonId, wanted) {
  await unlockTeacherArea(page);
  const pressed = (await page.getAttribute(buttonId, 'aria-pressed')) === 'true';
  if (pressed !== wanted) await page.click(buttonId);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

const press = async (page, key) => {
  await page.keyboard.press(key);
  await page.waitForTimeout(SETTLE_MS);
};

const beatsShown = async (page) => (await page.locator(SHOWN_LINES).count()) + (await page.locator(SHOWN_VISUAL).count());

// Passa por todos os toques de um slide e confere que cada um mostra mais uma coisa.
async function revealSlide(page, report, deckId, slide, number) {
  const beats = slide.lines.length + (slide.visual ? 1 : 0);
  const title = await page.$eval('.lesson-slide-title', (node) => node.textContent.trim());
  if (title !== slide.title) report.problem(`${deckId} slide ${number}: título "${title}" em vez de "${slide.title}"`);
  if ((await beatsShown(page)) !== 0) report.problem(`${deckId} slide ${number}: deveria começar sem nada escrito`);
  for (let beat = 1; beat <= beats; beat++) {
    await press(page, 'ArrowRight');
    if ((await beatsShown(page)) !== beat) report.problem(`${deckId} slide ${number}: toque ${beat} deveria mostrar ${beat} item(ns)`);
  }
}

async function checkDeck(page, report, deck) {
  const entry = deck.standalone ? deck.title : DECK_ENTRY[deck.id];
  if (!entry) return report.problem(`aula ${deck.id}: falta incluir no teste (DECK_ENTRY)`);
  await openMission(page, entry);
  await page.waitForSelector(SLIDE);
  for (let index = 0; index < deck.slides.length; index++) {
    await revealSlide(page, report, deck.id, deck.slides[index], index + 1);
    if (index < deck.slides.length - 1) await press(page, 'ArrowRight');
  }
  const endButton = deck.standalone ? '.lesson-close' : '.lesson-play';
  if (!(await page.isVisible(endButton))) report.problem(`${deck.id}: no fim deveria aparecer o botão final (${endButton})`);
  if (deck.skills.length && !(await page.innerText('.lesson-skills')).includes(deck.skills[0])) report.problem(`${deck.id}: habilidades da BNCC fora do último slide`);
  await press(page, 'ArrowLeft');
  if ((await page.locator('.lesson-play, .lesson-close').count()) !== 0) report.problem(`${deck.id}: voltar um toque deveria esconder o botão final`);
  return null;
}

async function checkNavigation(page, report) {
  await openMission(page, 'Robô coletor');
  await page.waitForSelector(SLIDE);
  await page.locator(SLIDE).click({ position: { x: 40, y: 200 } });
  if ((await page.locator(SHOWN_LINES).count()) !== 1) report.problem('tocar no slide deveria avançar um item');
  await page.click('.lesson-next');
  await page.click('.lesson-prev');
  await page.click('.lesson-prev');
  if ((await beatsShown(page)) !== 0) report.problem('os botões avançar e voltar deveriam desfazer o toque');
  if (await page.isEnabled('.lesson-prev')) report.problem('no começo da aula o botão voltar deveria estar desativado');
  await press(page, 'r');
  if (!(await page.$(SLIDE))) report.problem('a tecla R não deveria sair da aula');
  await press(page, 'Escape');
  if (!(await page.$('.menu-tile'))) report.problem('Esc deveria voltar ao painel');
}

async function checkPlayButton(page, report, deck) {
  await openMission(page, 'Robô coletor');
  await page.waitForSelector(SLIDE);
  const total = deck.slides.reduce((sum, slide) => sum + slide.lines.length + (slide.visual ? 1 : 0) + 1, 0);
  for (let step = 0; step < total && !(await page.$('.lesson-play')); step++) await press(page, 'ArrowRight');
  await press(page, 'Enter');
  await page.waitForSelector('.robot-playfield', { timeout: 3000 }).catch(() => report.problem('Enter no fim da aula deveria abrir a missão'));
}

async function main() {
  const report = createReport('lesson-mode');
  const decks = loadConst('lessonDecks');
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    const page = await newPage(browser);
    await openMenu(page, server.url, BAND_USED);
    await setMode(page, '#lessonModeButton', true);
    const expected = decks.flatMap((deck) => deck.missions).length + decks.filter((deck) => deck.standalone).length;
    const shown = await page.locator('.menu-tile').count();
    if (shown !== expected) report.problem(`o painel deveria mostrar ${expected} missões com aula e mostra ${shown}`);
    for (const deck of decks) {
      await checkDeck(page, report, deck);
      await press(page, 'Escape');
    }
    await checkNavigation(page, report);
    await checkPlayButton(page, report, decks[0]);
    await page.keyboard.press('Escape');
    await setMode(page, '#assessmentModeButton', true);
    if ((await page.getAttribute('#lessonModeButton', 'aria-pressed')) !== 'false') report.problem('ligar a avaliação deveria desligar o modo aula');
    await setMode(page, '#assessmentModeButton', false);
    page.collectedErrors.forEach((error) => report.problem(error));
    report.ok(`modo aula: ${decks.length} aulas percorridas`);
  } finally {
    await browser.close();
    await server.close();
  }
  report.finish();
}

main();
