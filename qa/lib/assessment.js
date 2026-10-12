const { unlockTeacherArea } = require('./browser');

const RESULT_SCORE = '#lessonPlanModal .assessment-score';
const RESULT_TIMEOUT_MS = 8000;
const SCORE_PATTERN = /(\d+) de (\d+) acertos/;

/** Liga ou desliga o modo avaliação pela área do professor e fecha a área. */
async function setAssessmentMode(page, wanted) {
  await unlockTeacherArea(page);
  const pressed = (await page.getAttribute('#assessmentModeButton', 'aria-pressed')) === 'true';
  if (pressed !== wanted) await page.click('#assessmentModeButton');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

const resultIsVisible = (page) => page.locator(RESULT_SCORE).isVisible().catch(() => false);

/** Espera a tela de resultado e devolve acertos, total e quantas perguntas erradas foram listadas. */
async function readResult(page) {
  await page.waitForSelector(RESULT_SCORE, { state: 'visible', timeout: RESULT_TIMEOUT_MS });
  const score = (await page.innerText(RESULT_SCORE)).replace(/\s+/g, ' ');
  const [, hits, total] = SCORE_PATTERN.exec(score) || [null, NaN, NaN];
  const listed = await page.locator('#lessonPlanModal .assessment-missed li').count();
  return { score, hits: Number(hits), total: Number(total), listed };
}

async function closeResult(page) {
  await page.click('#lessonPlanBackButton');
  await page.waitForTimeout(300);
}

module.exports = { RESULT_SCORE, setAssessmentMode, resultIsVisible, readResult, closeResult };
