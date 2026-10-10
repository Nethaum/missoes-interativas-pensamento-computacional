// Auditoria de acessibilidade (axe-core) do seletor de idade, dos menus e de cada missão, no celular.
const fs = require('fs');
const { startServer } = require('../lib/server');
const { AGE_BAND_COUNT, PHONE_VIEWPORT, launchBrowser, newPage, openMenu, goHome } = require('../lib/browser');
const { createReport } = require('../lib/report');

const AXE_SOURCE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'];
const ENTRANCE_ANIMATION_MS = 2200;

async function findViolations(page) {
  await page.evaluate(AXE_SOURCE);
  return page.evaluate(
    async (tags) => (await axe.run(document, { runOnly: { type: 'tag', values: tags } })).violations
      .map((rule) => ({ id: rule.id, impact: rule.impact, nodes: rule.nodes.length })),
    AXE_TAGS,
  );
}

async function auditScreen(page, report, where) {
  await page.waitForTimeout(ENTRANCE_ANIMATION_MS);
  const violations = await findViolations(page);
  violations.forEach((rule) => report.problem(`${where}: ${rule.id} (${rule.impact}, ${rule.nodes} elemento(s))`));
}

async function auditBand(page, baseUrl, band, report) {
  await openMenu(page, baseUrl, band);
  await auditScreen(page, report, `faixa ${band}, menu`);
  const cardCount = (await page.$$('.menu-card')).length;
  for (let index = 0; index < cardCount; index++) {
    const card = (await page.$$('.menu-card'))[index];
    const title = (await card.textContent()).trim().replace(/\s+/g, ' ').slice(0, 28);
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await auditScreen(page, report, `faixa ${band}, ${title}`);
    if (!(await goHome(page))) await openMenu(page, baseUrl, band);
  }
}

async function main() {
  const report = createReport('a11y');
  const server = await startServer();
  const browser = await launchBrowser();
  const page = await newPage(browser, PHONE_VIEWPORT);
  await page.goto(server.url);
  await page.waitForSelector('.age-picker-card');
  await auditScreen(page, report, 'seletor de idade');
  for (let band = 0; band < AGE_BAND_COUNT; band++) await auditBand(page, server.url, band, report);
  await browser.close();
  await server.close();
  report.ok('telas auditadas com axe-core');
  report.finish();
}

main();
