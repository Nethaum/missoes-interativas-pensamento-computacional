// Joga as missões de perguntas e respostas: erra uma vez, acerta, confere a explicação e o avanço.
const { loadConst } = require('../lib/extract');
const { startServer } = require('../lib/server');
const { AGE_BAND_COUNT, launchBrowser, newPage, openMenu, openMission } = require('../lib/browser');
const { createReport } = require('../lib/report');

const QUIZ_MISSIONS = [
  { title: 'Computador por dentro', levelsConst: 'hardwareLevels' },
  { title: 'Navegação segura', levelsConst: 'safeLevels' },
  { title: 'Dados, algoritmos e IA', levelsConst: 'aiLevels' },
  { title: 'Organize os dados', levelsConst: 'structuresLevels' },
  { title: 'Leia o código', levelsConst: 'readingLevels' },
];
const ROUNDS_SAMPLED_PER_LEVEL = 3;
const WRONG_ANSWER_LOCK_MS = 1500;
const ROUND_ADVANCE_TIMEOUT_MS = 7000;
const STAYS_ON_ROUND_MS = 1500;

const OPTION = '.decompose-option';
const OPTION_TEXT = '.decompose-option-step';
const QUESTION = '.decompose-task-title';

const readOptionTexts = (page) => page.$$eval(OPTION_TEXT, (nodes) => nodes.map((node) => node.textContent.trim()));

async function answerRound(page, round, report, where, useKeyboardToContinue) {
  const texts = await readOptionTexts(page);
  const correctText = round.options[round.answer];
  const wrongIndex = texts.findIndex((text) => text !== correctText);
  await page.locator(OPTION).nth(wrongIndex).click();
  await page.waitForTimeout(250);
  if (!(await page.$(`${OPTION}.wrong`))) report.problem(`${where}: resposta errada não foi marcada`);
  await page.waitForTimeout(WRONG_ANSWER_LOCK_MS);
  const retryTexts = await readOptionTexts(page);
  await page.locator(OPTION).nth(retryTexts.indexOf(correctText)).click();
  const why = await page.waitForSelector('.quiz-why', { timeout: 3000 }).then((node) => node.textContent()).catch(() => null);
  if (why === null) report.problem(`${where}: sem explicação depois do acerto`);
  else if (why.trim() !== round.why) report.problem(`${where}: explicação diferente da esperada`);
  await continueAfterAnswer(page, round, report, where, useKeyboardToContinue);
}

// Depois do acerto a missão espera: a rodada só avança quando o aluno toca em Continuar (ou aperta Enter).
async function continueAfterAnswer(page, round, report, where, useKeyboard) {
  const stillShown = await readShownRoundKey(page);
  await page.waitForTimeout(STAYS_ON_ROUND_MS);
  if ((await readShownRoundKey(page)) !== stillShown) report.problem(`${where}: avançou sozinha, sem o botão Continuar`);
  if (!(await page.$('.continue-button'))) return report.problem(`${where}: sem botão Continuar`);
  if (useKeyboard) await page.keyboard.press('Enter');
  else await page.click('.continue-button');
}

// Uma rodada se identifica pela pergunta e pelo código mostrado (várias perguntas repetem o enunciado).
const roundKey = (question, code) => `${question}
${code || ''}`;

const readShownRoundKey = (page) => page.evaluate(([questionSelector]) => {
  const question = document.querySelector(questionSelector);
  const code = document.querySelector('.quiz-code');
  return question ? `${question.textContent.trim()}
${code ? code.textContent : ''}` : null;
}, [QUESTION]);

async function waitForNextRound(page, previousKey) {
  await page.waitForFunction(
    ([questionSelector, previous]) => {
      const question = document.querySelector(questionSelector);
      if (!question) return true;
      const code = document.querySelector('.quiz-code');
      return `${question.textContent.trim()}
${code ? code.textContent : ''}` !== previous;
    },
    [QUESTION, previousKey],
    { timeout: ROUND_ADVANCE_TIMEOUT_MS },
  );
}

async function playLevel(page, levels, band, report, where) {
  const rounds = levels[band].rounds;
  for (let played = 0; played < ROUNDS_SAMPLED_PER_LEVEL; played++) {
    const shownKey = await readShownRoundKey(page);
    const round = rounds.find((candidate) => roundKey(candidate.question, candidate.code) === shownKey);
    if (!round) return report.problem(`${where}: rodada fora dos dados: ${shownKey}`);
    await answerRound(page, round, report, where, played % 2 === 1);
    await waitForNextRound(page, shownKey).catch(() => report.problem(`${where}: não avançou depois de "${round.question}"`));
  }
}

async function main() {
  const report = createReport('quizzes');
  const server = await startServer();
  const browser = await launchBrowser();
  for (const { title, levelsConst } of QUIZ_MISSIONS) {
    const levels = loadConst(levelsConst);
    for (let band = 0; band < AGE_BAND_COUNT; band++) {
      const page = await newPage(browser);
      await openMenu(page, server.url, band);
      await openMission(page, title);
      await page.waitForSelector(QUESTION);
      await playLevel(page, levels, band, report, `${title}, faixa ${band}`);
      page.collectedErrors.forEach((error) => report.problem(`${title}, faixa ${band}: ${error}`));
      await page.context().close();
    }
    report.ok(`${title}: ${AGE_BAND_COUNT} faixas jogadas`);
  }
  await browser.close();
  await server.close();
  report.finish();
}

main();
