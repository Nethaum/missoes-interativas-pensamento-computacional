// Abre cada missão em cada faixa etária e interage ao acaso, procurando erros de JavaScript.
const { startServer } = require('../lib/server');
const { AGE_BAND_COUNT, launchBrowser, newPage, openMenu, goHome } = require('../lib/browser');
const { createReport, parseOptions } = require('../lib/report');

const INTERACTIVE_TARGETS = [
  '#content button:not([disabled])',
  '#content .option',
  '#content [class*="card"]',
  '#content [class*="cell"]',
  '#content [class*="item"]',
  '#content [class*="choice"]',
  '#content [class*="answer"]',
].join(', ');
const CLICK_TIMEOUT_MS = 800;
const STEP_PAUSE_MS = 120;
const KEYS = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Enter', ' '];

async function interactOnce(page, step) {
  const targets = await page.$$(INTERACTIVE_TARGETS);
  if (targets.length) {
    const target = targets[Math.floor(Math.random() * targets.length)];
    await target.click({ timeout: CLICK_TIMEOUT_MS, force: true }).catch(() => {});
  } else {
    await page.keyboard.press('Enter');
  }
  if (step % 7 === 3) await page.keyboard.press(KEYS[step % KEYS.length]);
  await page.waitForTimeout(STEP_PAUSE_MS);
}

async function exerciseMission(page, baseUrl, band, cardIndex, steps) {
  const card = (await page.$$('.menu-card'))[cardIndex];
  const title = (await card.textContent()).trim().replace(/\s+/g, ' ').slice(0, 40);
  const errorsBefore = page.collectedErrors.length;
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await page.waitForTimeout(250);
  for (let step = 0; step < steps; step++) await interactOnce(page, step);
  if (!(await goHome(page))) await openMenu(page, baseUrl, band);
  return { title, errors: [...new Set(page.collectedErrors.slice(errorsBefore))].slice(0, 5) };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const bands = options.bands ? options.bands.split(',').map(Number) : [...Array(AGE_BAND_COUNT).keys()];
  const steps = Number(options.steps || 40);
  const report = createReport('smoke');
  const server = await startServer();
  const browser = await launchBrowser();
  let missionsTested = 0;
  for (const band of bands) {
    const page = await newPage(browser);
    await openMenu(page, server.url, band);
    const cardCount = (await page.$$('.menu-card')).length;
    for (let cardIndex = 0; cardIndex < cardCount; cardIndex++) {
      const { title, errors } = await exerciseMission(page, server.url, band, cardIndex, steps);
      missionsTested++;
      errors.forEach((error) => report.problem(`faixa ${band}, "${title}": ${error}`));
    }
    await page.context().close();
  }
  await browser.close();
  await server.close();
  report.ok(`${missionsTested} missões exercitadas em ${bands.length} faixa(s) etária(s)`);
  report.finish();
}

main();
