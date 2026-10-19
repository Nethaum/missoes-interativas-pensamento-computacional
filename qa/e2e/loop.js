// Fábrica de Laços: pedido da fábrica, execução animada (o total só aparece depois de ligar a máquina) e rodadas de prever.
const { startServer } = require('../lib/server');
const { launchBrowser, newPage, openMenu, openMission } = require('../lib/browser');
const { createReport } = require('../lib/report');

const BANDS = [0, 3];
const SETTLE_MS = 250;
const RUN_MS = 4200;
const ACTIVE_TIMEOUT_MS = 3000;
const RUN_TIMEOUT_MS = 8000;
const WRONG_REVEAL_MS = 2000;
const NEXT_ROUND_MS = 1800;
const MAX_ROUNDS = 10;
const BOXES = '.loop-box';
const TOTAL = '.loop-total';
const REPEAT_PLUS = '.loop-stepper-btn[data-stepper="repeat"][data-delta="1"]';
const EXTRA_PLUS = '.loop-stepper-btn[data-stepper="extra"][data-delta="1"]';
const ROUND_COUNTER = '#leftValue';

const counter = async (page) => (await page.innerText(ROUND_COUNTER)).replace(/\s+/g, '');
const totalText = async (page) => (await page.textContent(TOTAL)).replace(/\s+/g, ' ').trim();

async function readOrder(page) {
  const status = await page.innerText('#status');
  const [, target] = /pedido: (\d+)/i.exec(status) || [];
  const [, step] = /embala (\d+) de cada vez/i.exec(status) || [];
  return { target: Number(target), step: Number(step) };
}

async function buildLoop(page, repeat, extra) {
  for (let index = 0; index < repeat; index++) await page.locator(REPEAT_PLUS).click();
  if (extra && (await page.locator(EXTRA_PLUS).count())) {
    for (let index = 0; index < extra; index++) await page.locator(EXTRA_PLUS).click();
  }
}

// Mostra que o total e as caixas só aparecem depois de ligar a máquina, e que errar não perde o que foi montado.
async function checkWrongThenRight(page, report, where) {
  const { target, step } = await readOrder(page);
  if (!target || !step) return report.problem(`${where}: não achei o pedido no texto de apoio`);
  if (!(await totalText(page)).endsWith('?')) report.problem(`${where}: antes de ligar, o total deveria ser "?"`);
  const wrongRepeats = Math.floor(target / step) + 1;
  await buildLoop(page, wrongRepeats, 0);
  if ((await page.locator(BOXES).count()) !== 0) report.problem(`${where}: as caixas não deveriam aparecer enquanto o aluno monta o laço`);
  await page.click('.loop-confirm-button');
  await page.waitForSelector('.loop-code-line.active', { timeout: ACTIVE_TIMEOUT_MS }).catch(() => report.problem(`${where}: durante a execução a linha do laço deveria ficar acesa`));
  await page.waitForSelector(`${TOTAL}.wrong`, { timeout: RUN_TIMEOUT_MS }).catch(() => report.problem(`${where}: o erro deveria ser mostrado no fim da execução`));
  if ((await page.locator(BOXES).count()) !== wrongRepeats) report.problem(`${where}: depois da execução deveria haver ${wrongRepeats} caixas`);
  if ((await totalText(page)).endsWith('?')) report.problem(`${where}: depois de ligar, o total deveria aparecer`);
  await page.waitForTimeout(WRONG_REVEAL_MS);
  if ((await page.locator(BOXES).count()) !== 0) report.problem(`${where}: depois do erro a esteira deveria ficar vazia`);
  if ((await page.locator('.loop-stepper-value').first().innerText()) !== String(wrongRepeats)) report.problem(`${where}: o número de repetições montado deveria ser mantido depois do erro`);
  const before = await counter(page);
  await page.locator('.loop-stepper-btn[data-stepper="repeat"][data-delta="-1"]').click();
  await page.locator('.loop-stepper-btn[data-stepper="repeat"][data-delta="-1"]').click().catch(() => {});
  const have = await page.locator('.loop-stepper-value').first().innerText();
  const wanted = Math.floor(target / step);
  for (let index = Number(have); index < wanted; index++) await page.locator(REPEAT_PLUS).click();
  for (let index = Number(have); index > wanted; index--) await page.locator('.loop-stepper-btn[data-stepper="repeat"][data-delta="-1"]').click();
  const extra = target % step;
  if (extra && (await page.locator(EXTRA_PLUS).count())) for (let index = 0; index < extra; index++) await page.locator(EXTRA_PLUS).click();
  await page.click('.loop-confirm-button');
  await page.waitForTimeout(RUN_MS + NEXT_ROUND_MS);
  if ((await counter(page)) === before) report.problem(`${where}: acertar o laço deveria avançar para a próxima rodada`);
}

async function solveBuildRound(page) {
  const { target, step } = await readOrder(page);
  await buildLoop(page, Math.floor(target / step), target % step);
  await page.click('.loop-confirm-button');
  await page.waitForTimeout(RUN_MS + NEXT_ROUND_MS);
}

// Rodada de prever: lê o laço pronto na tela, clica uma alternativa errada e depois a certa.
async function checkPredict(page, report, where) {
  if (await page.$('.loop-stepper-btn')) report.problem(`${where}: na rodada de prever não deveria haver botões de repetição`);
  const code = await page.innerText('.loop-code');
  const repeat = Number((/repita\s+(\d+)\s+vezes/i.exec(code) || [])[1]);
  const step = Number((/embalar\s+(\d+)/i.exec(code) || [])[1]);
  const extra = Number((/depois,\s*embalar\s+(\d+)/i.exec(code) || [, 0])[1]);
  const answer = repeat * step + extra;
  const options = await page.$$eval('.loop-choice', (nodes) => nodes.map((node) => node.textContent.trim()));
  if (!options.includes(String(answer))) return report.problem(`${where}: o resultado certo (${answer}) não está nas alternativas ${options.join(', ')}`);
  const before = await counter(page);
  const wrongIndex = options.findIndex((text) => text !== String(answer));
  await page.locator('.loop-choice').nth(wrongIndex).click();
  await page.waitForTimeout(SETTLE_MS);
  if (!(await page.$('.loop-choice.wrong'))) report.problem(`${where}: uma alternativa errada deveria ficar marcada`);
  await page.waitForTimeout(1800);
  const refreshed = await page.$$eval('.loop-choice', (nodes) => nodes.map((node) => node.textContent.trim()));
  await page.locator('.loop-choice').nth(refreshed.indexOf(String(answer))).click();
  await page.waitForTimeout(NEXT_ROUND_MS + 400);
  if ((await counter(page)) === before) report.problem(`${where}: acertar a previsão deveria avançar para a próxima rodada`);
}

// Acerta uma rodada de prever sem conferir nada: lê o laço na tela e clica no resultado certo.
async function solvePredictRound(page) {
  const code = await page.innerText('.loop-code');
  const repeat = Number((/repita\s+(\d+)\s+vezes/i.exec(code) || [])[1]);
  const step = Number((/embalar\s+(\d+)/i.exec(code) || [])[1]);
  const extra = Number((/depois,\s*embalar\s+(\d+)/i.exec(code) || [, 0])[1]);
  const options = await page.$$eval('.loop-choice', (nodes) => nodes.map((node) => node.textContent.trim()));
  await page.locator('.loop-choice').nth(options.indexOf(String(repeat * step + extra))).click();
  await page.waitForTimeout(NEXT_ROUND_MS + 400);
}

// As rodadas vêm sorteadas: joga até ter conferido uma rodada de montar e uma de prever.
async function checkBand(browser, report, server, band) {
  const where = `faixa ${band}`;
  const page = await newPage(browser);
  await openMenu(page, server.url, band);
  await openMission(page, 'Fábrica de Laços');
  await page.waitForSelector('.loop-code');
  let checkedBuild = false;
  let checkedPredict = false;
  for (let round = 0; round < MAX_ROUNDS && !(checkedBuild && checkedPredict); round++) {
    if (await page.$('.loop-choice')) {
      if (checkedPredict) await solvePredictRound(page);
      else await checkPredict(page, report, where);
      checkedPredict = true;
    } else {
      if (!(await page.innerText('.loop-order')).toLowerCase().includes('pedido')) report.problem(`${where}: o pedido da fábrica deveria aparecer`);
      if (checkedBuild) await solveBuildRound(page);
      else await checkWrongThenRight(page, report, where);
      checkedBuild = true;
    }
  }
  if (!checkedBuild || !checkedPredict) report.problem(`${where}: em ${MAX_ROUNDS} rodadas não apareceram os dois tipos (montar e prever)`);
  page.collectedErrors.forEach((error) => report.problem(`${where}: ${error}`));
  await page.close();
}

async function main() {
  const report = createReport('loop');
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    for (const band of BANDS) await checkBand(browser, report, server, band);
    report.ok('Fábrica de Laços: pedido, execução animada e rodadas de prever');
  } finally {
    await browser.close();
    await server.close();
  }
  report.finish();
}

main();
