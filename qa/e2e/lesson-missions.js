// Missões da aula: o professor manda planos para o painel e os alunos veem só as missões deles.
const { loadConst } = require('../lib/extract');
const { startServer } = require('../lib/server');
const { launchBrowser, newPage, openMenu, unlockTeacherArea } = require('../lib/browser');
const { createReport } = require('../lib/report');

const BAND_USED = 2;
const PLAN_INDEXES = [4, 6];
const ACTIVE_CHIP = '.menu-filter-chip.active';
const TILE = '.menu-tile';

const countTiles = (page) => page.locator(TILE).count();
const activeChipText = async (page) => (await page.locator(ACTIVE_CHIP).first().textContent()).trim();

async function closeTeacherArea(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

async function openTeacherAreaAgain(page) {
  await unlockTeacherArea(page);
}

async function sendPlanToPanel(page, planIndex) {
  await page.locator('.lesson-plan-button').nth(planIndex).click();
  await page.click('#lessonPanelButton');
  await page.click('#lessonPlanBackButton');
}

function uniqueMissionCount(plans, planIndexes) {
  return new Set(planIndexes.flatMap((index) => plans[index].missions)).size;
}

async function main() {
  const report = createReport('lesson-missions');
  const plans = loadConst('lessonPlans');
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    const page = await newPage(browser);
    await openMenu(page, server.url, BAND_USED);
    const allMissions = await countTiles(page);

    await unlockTeacherArea(page);
    for (const planIndex of PLAN_INDEXES) await sendPlanToPanel(page, planIndex);
    const status = (await page.innerText('#lessonMissionsStatus')).toUpperCase();
    const gradesShown = PLAN_INDEXES.every((index) => status.includes(plans[index].grade.toUpperCase()));
    if (!gradesShown) report.problem(`resumo do painel sem os planos escolhidos: ${status}`);
    await closeTeacherArea(page);

    const expected = uniqueMissionCount(plans, PLAN_INDEXES);
    if ((await countTiles(page)) !== expected) report.problem(`painel mostra ${await countTiles(page)} missões da aula e eram esperadas ${expected}`);
    if (!(await activeChipText(page)).includes('Da aula')) report.problem('o filtro "Da aula" deveria abrir selecionado');

    await page.locator('.menu-filter-chip', { hasText: 'Todas' }).click();
    if ((await countTiles(page)) !== allMissions) report.problem('"Todas" não voltou a mostrar todas as missões');
    await page.locator('.menu-filter-chip', { hasText: 'Da aula' }).click();
    if ((await countTiles(page)) !== expected) report.problem('"Da aula" não voltou a filtrar');

    await openTeacherAreaAgain(page);
    await page.click('#clearLessonMissionsButton');
    await closeTeacherArea(page);
    if ((await countTiles(page)) !== allMissions) report.problem('depois de limpar, o painel deveria mostrar todas as missões');
    if (await page.locator('.menu-filter-chip', { hasText: 'Da aula' }).count()) report.problem('o filtro "Da aula" deveria sumir depois de limpar');

    page.collectedErrors.forEach((error) => report.problem(error));
    report.ok(`${expected} missões da aula no painel e ${allMissions} no total`);
  } finally {
    await browser.close();
    await server.close();
  }
  report.finish();
}

main();
