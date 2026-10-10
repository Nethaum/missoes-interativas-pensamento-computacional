// Navegação por teclado em cada missão e saída pelo botão voltar (toque longo).
const { startServer } = require('../lib/server');
const { launchBrowser, newPage, openMenu, installFakeClock, holdBackButton } = require('../lib/browser');
const { createReport, parseOptions } = require('../lib/report');

const BAND_USED = 2;
const ARROW_KEYS = ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowLeft'];
const KEY_PAUSE_MS = 100;
const MISSION_START_MS = 400;

async function exerciseKeyboard(page) {
  for (const key of ARROW_KEYS) {
    await page.keyboard.press(key);
    await page.waitForTimeout(KEY_PAUSE_MS);
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const band = Number(options.band || BAND_USED);
  const report = createReport('keyboard');
  const server = await startServer();
  const browser = await launchBrowser();
  const page = await newPage(browser);
  await installFakeClock(page);
  await openMenu(page, server.url, band);
  const cardCount = (await page.$$('.menu-card')).length;
  for (let index = 0; index < cardCount; index++) {
    const card = (await page.$$('.menu-card'))[index];
    const title = (await card.textContent()).trim().replace(/\s+/g, ' ').slice(0, 40);
    const errorsBefore = page.collectedErrors.length;
    await card.scrollIntoViewIfNeeded();
    await card.click();
    await page.waitForTimeout(MISSION_START_MS);
    await exerciseKeyboard(page);
    if (!(await holdBackButton(page))) report.problem(`"${title}": o botão voltar não levou ao menu`);
    page.collectedErrors.slice(errorsBefore).forEach((error) => report.problem(`"${title}": ${error}`));
  }
  report.ok(`${cardCount} missões percorridas com o teclado na faixa ${band}`);
  await browser.close();
  await server.close();
  report.finish();
}

main();
