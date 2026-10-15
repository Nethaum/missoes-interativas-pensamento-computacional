// Modo avaliação: 10 perguntas, uma tentativa, sem resposta na tela, botões de saída desativados e resultado no fim.
const { loadConst } = require('../lib/extract');
const { startServer } = require('../lib/server');
const { launchBrowser, newPage, openMenu, openMission } = require('../lib/browser');
const { setAssessmentMode } = require('../lib/assessment');
const { createReport } = require('../lib/report');

const BAND_USED = 3;
const QUESTIONS = 10;
const HITS_PLANNED = 7;
const ASSESSABLE_MISSIONS = 20;
const MAX_CLICKS = QUESTIONS * 2 + 3;
const ROBOT_WALK_MS = 4500;
const OPTION = '.decompose-option';
const OPTION_TEXT = '.decompose-option-step';
const QUESTION = '.decompose-task-title';
const RESULT_SCORE = '#lessonPlanModal .assessment-score';
const ANSWER_SETTLE_MS = 700;
const GUARDED_BUTTONS = ['#homeButton', '#resetButton', '#backButton'];

const buttonsDisabled = (page) => page.evaluate((selectors) => selectors.map((selector) => document.querySelector(selector).disabled), GUARDED_BUTTONS);

// Responde uma pergunta e devolve o enunciado quando a resposta dada foi errada.
async function answerQuizQuestion(page, rounds, wantCorrect, report, where) {
  const question = await page.$eval(QUESTION, (node) => node.textContent.trim());
  const round = rounds.find((candidate) => candidate.question === question);
  if (!round) return report.problem(`${where}: pergunta fora dos dados: ${question}`);
  const correctText = round.options[round.answer];
  const texts = await page.$$eval(OPTION_TEXT, (nodes) => nodes.map((node) => node.textContent.trim()));
  const index = wantCorrect ? texts.indexOf(correctText) : texts.findIndex((text) => text !== correctText);
  await page.locator(OPTION).nth(index).click();
  await page.waitForTimeout(ANSWER_SETTLE_MS);
  if (await page.$('.quiz-why, .continue-button')) report.problem(`${where}: a resposta ou a explicação apareceu durante a avaliação`);
  return wantCorrect ? null : question;
}

async function checkQuizAssessment(page, report) {
  const rounds = loadConst('safeLevels')[BAND_USED].rounds;
  await openMission(page, 'Navegação segura');
  await page.waitForSelector(QUESTION);
  if (!(await buttonsDisabled(page)).every(Boolean)) report.problem('início, recomeçar e voltar deveriam estar desativados durante a avaliação');
  const counter = await page.innerText('body');
  if (!counter.includes(`1 / ${QUESTIONS}`)) report.problem('o contador deveria mostrar 1 / 10');
  const wrongQuestions = [];
  for (let asked = 0; asked < QUESTIONS; asked++) {
    if (asked === 3) await checkKeysAreBlocked(page, report);
    const wrong = await answerQuizQuestion(page, rounds, asked < HITS_PLANNED, report, `pergunta ${asked + 1}`);
    if (wrong) wrongQuestions.push(wrong);
  }
  await checkResult(page, report, HITS_PLANNED, wrongQuestions);
}

async function checkKeysAreBlocked(page, report) {
  const before = await page.$eval(QUESTION, (node) => node.textContent.trim());
  await page.keyboard.press('r');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const after = await page.$eval(QUESTION, (node) => node.textContent.trim()).catch(() => null);
  if (after !== before) report.problem('as teclas R e Esc não deveriam sair da avaliação');
}

async function checkMissedList(page, report, expectedMissed) {
  const listed = await page.$$eval('#lessonPlanModal .assessment-missed li', (items) => items.map((item) => item.textContent));
  if (listed.length !== expectedMissed.length) report.problem(`a lista de perguntas erradas tem ${listed.length} itens e deveria ter ${expectedMissed.length}`);
  expectedMissed.forEach((question) => {
    if (!listed.some((text) => text.includes(question))) report.problem(`pergunta errada fora da lista: ${question}`);
  });
  if (!(await page.$$eval('#lessonPlanModal .assessment-missed li', (items) => items.every((item) => item.textContent.includes('Resposta certa'))))) report.problem('cada pergunta errada deveria mostrar a resposta certa');
}

async function checkResult(page, report, expectedHits, wrongQuestions) {
  await page.waitForSelector(RESULT_SCORE, { state: 'visible', timeout: 5000 }).catch(() => report.problem('o resultado não apareceu no fim da avaliação'));
  const score = ((await page.innerText(RESULT_SCORE).catch(() => '')) || '').replace(/\s+/g, ' ');
  if (!score.includes(`${expectedHits} de ${QUESTIONS} acertos`)) report.problem(`resultado inesperado: "${score}"`);
  await checkMissedList(page, report, wrongQuestions);
  if (!(await page.$('#lessonPlanModal .lesson-plan-list li'))) report.problem('o resultado deveria listar as habilidades da BNCC');
  if (!(await page.$('#lessonPlanPrintButton'))) report.problem('o resultado deveria ter o botão de imprimir');
  await page.click('#lessonPlanBackButton');
  await page.waitForTimeout(300);
  if ((await buttonsDisabled(page)).some(Boolean)) report.problem('os botões deveriam voltar a funcionar depois do resultado');
}

// Tradutor de Sinais: ver todos os comandos e esconder a caixa antes de responder.
async function revealVariableCommands(page) {
  for (let step = 0; step < 20; step++) {
    const label = await page.innerText('.var-next-button').catch(() => null);
    if (label === null) return;
    const readyToAnswer = label.includes('Esconder');
    await page.click('.var-next-button');
    await page.waitForTimeout(150);
    if (readyToAnswer) return;
  }
}

// Caça ao Bug: primeiro o comando errado, depois a direção certa. O robô anda no começo de cada rodada.
const bugOptionSelector = async (page) => ((await page.$('.bug-fix-option')) ? '.bug-fix-option' : '.bug-chip');
const waitForRobotWalk = async (page) => {
  if (!(await page.$('.bug-fix-option'))) await page.waitForTimeout(ROBOT_WALK_MS);
};

const GENERIC_MISSIONS = [
  { title: 'Portão Lógico', option: '.cond-option' },
  { title: 'Dados e gráficos', option: '.answer-row .answer-card' },
  { title: 'Desmistificador de Pixels', option: '.pixel-option' },
  { title: 'Fábrica de Laços', option: '.loop-confirm-button' },
  { title: 'Mensagem secreta', option: '.code-option' },
  { title: 'Tradutor de Sinais', option: '.var-option', ready: '.var-next-button', prepare: revealVariableCommands },
  { title: 'Caça ao Bug', option: bugOptionSelector, ready: '.bug-chip', prepare: waitForRobotWalk },
];

async function checkGenericAssessment(page, report, mission) {
  const { title, option, prepare, ready } = mission;
  await openMission(page, title);
  await page.waitForSelector(ready || option);
  for (let clicks = 0; clicks < MAX_CLICKS; clicks++) {
    if (await page.locator('#lessonPlanModal .assessment-score').isVisible().catch(() => false)) break;
    if (prepare) await prepare(page);
    const selector = typeof option === 'function' ? await option(page) : option;
    await page.locator(selector).first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(ANSWER_SETTLE_MS);
  }
  await page.waitForSelector(RESULT_SCORE, { state: 'visible', timeout: 5000 }).catch(() => report.problem(`${title}: o resultado não apareceu`));
  const score = ((await page.innerText(RESULT_SCORE).catch(() => '')) || '').replace(/\s+/g, ' ');
  if (!new RegExp(`de ${QUESTIONS} acertos`).test(score)) report.problem(`${title}: avaliação sem ${QUESTIONS} perguntas ("${score}")`);
  const hits = Number((/(\d+) de \d+ acertos/.exec(score) || [0, QUESTIONS])[1]);
  const listedCount = await page.locator('#lessonPlanModal .assessment-missed li').count();
  if (listedCount !== QUESTIONS - hits) report.problem(`${title}: ${QUESTIONS - hits} erros e ${listedCount} perguntas listadas`);
  await page.click('#lessonPlanBackButton');
  await page.waitForTimeout(300);
}

async function main() {
  const report = createReport('assessment');
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    const page = await newPage(browser);
    await openMenu(page, server.url, BAND_USED);
    const allMissions = await page.locator('.menu-tile').count();
    await setAssessmentMode(page, true);
    const shown = await page.locator('.menu-tile').count();
    if (shown !== ASSESSABLE_MISSIONS) report.problem(`o painel deveria mostrar ${ASSESSABLE_MISSIONS} missões avaliáveis e mostra ${shown}`);
    await checkQuizAssessment(page, report);
    for (const mission of GENERIC_MISSIONS) await checkGenericAssessment(page, report, mission);
    await setAssessmentMode(page, false);
    if ((await page.locator('.menu-tile').count()) !== allMissions) report.problem('ao desligar, o painel deveria voltar a mostrar todas as missões');
    page.collectedErrors.forEach((error) => report.problem(error));
    report.ok(`avaliação percorrida em ${GENERIC_MISSIONS.length + 1} missões`);
  } finally {
    await browser.close();
    await server.close();
  }
  report.finish();
}

main();
