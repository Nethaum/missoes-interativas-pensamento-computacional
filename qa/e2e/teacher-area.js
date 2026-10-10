// Percorre a área do professor (planos, plano mensal, orientações, fichas) no celular e no desktop.
const fs = require('fs');
const { startServer } = require('../lib/server');
const { DESKTOP_VIEWPORT, PHONE_VIEWPORT, launchBrowser, newPage, openMenu, unlockTeacherArea } = require('../lib/browser');
const { createReport } = require('../lib/report');

const AXE_SOURCE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa'];
const MODAL = '#lessonPlanModal';
const CONTENT = '#lessonPlanContent';
const AGE_BAND_USED = 2;

async function auditModal(page, report, where) {
  await page.waitForTimeout(400);
  await page.evaluate(AXE_SOURCE);
  const violations = await page.evaluate(
    async ([selector, tags]) => (await axe.run(document.querySelector(selector), { runOnly: { type: 'tag', values: tags } })).violations.map((rule) => rule.id),
    [MODAL, AXE_TAGS],
  );
  if (violations.length) report.problem(`${where}: acessibilidade (${violations.join(', ')})`);
  const overflows = await page.evaluate((selector) => {
    const modal = document.querySelector(selector);
    return modal.scrollWidth > modal.clientWidth + 1;
  }, MODAL);
  if (overflows) report.problem(`${where}: conteúdo vaza na horizontal`);
}

async function backToPlans(page) {
  await page.click('#lessonPlanBackButton');
  await page.waitForTimeout(250);
}

async function checkPlans(page, report, device) {
  const planCount = await page.locator('.lesson-plan-button').count();
  for (let index = 0; index < planCount; index++) {
    await page.locator('.lesson-plan-button').nth(index).click();
    await auditModal(page, report, `${device}, plano ${index + 1}`);
    await checkPlanTools(page, report, device, index + 1);
    await backToPlans(page);
  }
}

async function checkPlanTools(page, report, device, planNumber) {
  for (const toolId of ['#unpluggedSheetButton', '#observationSheetButton']) {
    if (!(await page.$(toolId))) continue;
    await page.click(toolId);
    await auditModal(page, report, `${device}, plano ${planNumber}, ${toolId}`);
    await backToPlans(page);
    await page.locator('.lesson-plan-button').nth(planNumber - 1).click();
  }
}

async function checkMonthlyPlan(page, report, device) {
  await page.click('#monthlyPlanButton');
  await auditModal(page, report, `${device}, plano mensal (formulário)`);
  await page.fill('#monthlySchool', 'EEB Teste');
  await page.fill('#monthlyTeacher', 'Prof. Teste');
  await page.click('#monthlyPlanForm button[type=submit]');
  await auditModal(page, report, `${device}, plano mensal (documento)`);
  const text = (await page.innerText(CONTENT)).toUpperCase();
  if (!text.includes('EEB TESTE') || !text.includes('PROF. TESTE')) report.problem(`${device}: plano mensal sem os dados digitados`);
  await backToPlans(page);
}

async function checkGuidance(page, report, device) {
  await page.click('#guidanceButton');
  await auditModal(page, report, `${device}, orientações`);
  await backToPlans(page);
}

async function main() {
  const report = createReport('teacher-area');
  const server = await startServer();
  const browser = await launchBrowser();
  for (const [device, viewport] of [['celular', PHONE_VIEWPORT], ['desktop', DESKTOP_VIEWPORT]]) {
    const page = await newPage(browser, viewport);
    await openMenu(page, server.url, AGE_BAND_USED);
    await unlockTeacherArea(page);
    await checkPlans(page, report, device);
    await checkMonthlyPlan(page, report, device);
    await checkGuidance(page, report, device);
    page.collectedErrors.forEach((error) => report.problem(`${device}: ${error}`));
    report.ok(`${device}: área do professor percorrida`);
    await page.context().close();
  }
  await browser.close();
  await server.close();
  report.finish();
}

main();
