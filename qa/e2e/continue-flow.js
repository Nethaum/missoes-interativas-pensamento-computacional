// Missões que mostram a resolução depois do acerto: a rodada só avança quando o aluno toca em Continuar.
const { startServer } = require('../lib/server');
const { launchBrowser, newPage, openMenu, openMission } = require('../lib/browser');
const { createReport } = require('../lib/report');

const BAND_USED = 2;
const ROUNDS_PLAYED = 3;
const WRONG_ANSWER_LOCK_MS = 1900;
const STAYS_ON_ROUND_MS = 1500;
const RESOLUTION_TIMEOUT_MS = 15000;
const ROBOT_WALK_MS = 5000;
const ROUND_COUNTER = /(\d+) \/ \d+/;

// Tradutor de Sinais pede para ver todos os comandos e esconder a caixa antes de responder.
async function revealVariableCommands(page) {
  const nextButton = '.var-next-button';
  for (let step = 0; step < 20; step++) {
    const label = await page.innerText(nextButton).catch(() => null);
    if (label === null) return;
    const readyToAnswer = label.includes('Esconder');
    await page.click(nextButton);
    await page.waitForTimeout(150);
    if (readyToAnswer) return;
  }
}

// Caça ao Bug: primeiro se acha o comando errado e depois se escolhe a direção certa.
const bugOptionSelector = async (page) => ((await page.$('.bug-fix-option')) ? '.bug-fix-option' : '.bug-chip');

// No começo de cada rodada o robô anda pelo caminho com o bug; as respostas só valem depois.
const waitForRobotWalk = (page) => page.waitForTimeout(ROBOT_WALK_MS);

// Mensagem secreta decifra uma letra por vez; a tentativa recomeça a cada letra revelada.
const revealedLetters = (page) => page.$$eval('.code-symbol-cell.revealed', (cells) => String(cells.length));

const ALL_MISSIONS = [
  { title: 'Dados e gráficos', option: '.answer-row .answer-card', explanation: '.quiz-why' },
  { title: 'Portão Lógico', option: '.cond-option', explanation: '.quiz-why' },
  { title: 'Tradutor de Sinais', option: '.var-option', prepareRound: revealVariableCommands },
  { title: 'Mensagem secreta', option: '.code-option', explanation: '.quiz-why', progress: revealedLetters, settleMs: 1300, attempts: 60 },
  { title: 'Desmistificador de Pixels', option: '.pixel-option', explanation: '.quiz-why', key: 'html' },
  { title: 'Caça ao Bug', option: bugOptionSelector, key: 'text', prepareRound: waitForRobotWalk, settleMs: 1700, attempts: 20 },
];

// ONLY="Nome da missão" roda uma missão só, útil para depurar.
const MISSIONS = process.env.ONLY ? ALL_MISSIONS.filter((mission) => mission.title === process.env.ONLY) : ALL_MISSIONS;

const readRoundNumber = async (page) => Number(ROUND_COUNTER.exec(await page.innerText('body'))[1]);
const readOptionKeys = (page, selector, key) => page.$$eval(
  selector,
  (nodes, keyKind) => nodes.map((node) => (keyKind === 'html' ? node.innerHTML : node.textContent.trim())),
  key,
);

const waitForContinueButton = (page) => page.waitForSelector('.continue-button', { timeout: RESOLUTION_TIMEOUT_MS }).then(() => true).catch(() => false);

// As opções podem girar depois de um erro: cada tentativa escolhe uma resposta ainda não testada.
async function answerCorrectly(page, mission) {
  const tried = new Set();
  let lastProgress = null;
  const attemptLimit = mission.attempts || 6;
  for (let attempt = 0; attempt < attemptLimit; attempt++) {
    const progress = mission.progress ? await mission.progress(page) : '';
    if (progress !== lastProgress) tried.clear();
    lastProgress = progress;
    const selector = typeof mission.option === 'function' ? await mission.option(page) : mission.option;
    const keys = (await readOptionKeys(page, selector, mission.key)).map((key) => `${selector}|${key}`);
    // Sem opções na tela: a missão está mostrando a resolução (por exemplo, o robô andando pelo caminho certo).
    if (keys.length === 0) return waitForContinueButton(page);
    const index = keys.findIndex((key) => !tried.has(key));
    if (index < 0) return false;
    tried.add(keys[index]);
    await page.locator(selector).nth(index).click();
    await page.waitForTimeout(300);
    if (await page.$('.continue-button')) return true;
    await page.waitForTimeout(mission.settleMs || WRONG_ANSWER_LOCK_MS);
    if (await page.$('.continue-button')) return true;
  }
  return false;
}

async function playRound(page, mission, report, played) {
  if (mission.prepareRound) await mission.prepareRound(page);
  const roundBefore = await readRoundNumber(page);
  const where = `${mission.title}, rodada ${roundBefore}`;
  if (!(await answerCorrectly(page, mission))) {
    report.problem(`${where}: nenhuma opção levou ao botão Continuar`);
    return false;
  }
  if (mission.explanation && !(await page.$(mission.explanation))) report.problem(`${where}: sem explicação depois do acerto`);
  await page.waitForTimeout(STAYS_ON_ROUND_MS);
  if ((await readRoundNumber(page)) !== roundBefore) report.problem(`${where}: avançou sozinha, sem o botão Continuar`);
  if (played % 2 === 1) await page.keyboard.press('Enter');
  else await page.click('.continue-button');
  await page.waitForTimeout(400);
  if ((await readRoundNumber(page)) !== roundBefore + 1) report.problem(`${where}: não avançou depois de Continuar`);
  return true;
}

async function playMission(browser, baseUrl, mission, report) {
  const page = await newPage(browser);
  await openMenu(page, baseUrl, BAND_USED);
  await openMission(page, mission.title);
  for (let played = 0; played < ROUNDS_PLAYED; played++) {
    if (!(await playRound(page, mission, report, played))) break;
  }
  page.collectedErrors.forEach((error) => report.problem(`${mission.title}: ${error}`));
  report.ok(`${mission.title}: rodadas jogadas com o botão Continuar`);
  await page.context().close();
}

async function main() {
  const report = createReport('continue-flow');
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    for (const mission of MISSIONS) await playMission(browser, server.url, mission, report);
  } finally {
    await browser.close();
    await server.close();
  }
  report.finish();
}

main();
