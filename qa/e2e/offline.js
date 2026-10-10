// Confere que o material abre e funciona sem internet depois da primeira visita.
const { startServer } = require('../lib/server');
const { launchBrowser, newPage, openMenu, openMission, DESKTOP_VIEWPORT } = require('../lib/browser');
const { createReport } = require('../lib/report');

const BAND_USED = 0;
const MISSION_USED = 'Computador por dentro';

async function waitForServiceWorkerControl(page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
}

async function main() {
  const report = createReport('offline');
  const server = await startServer();
  const browser = await launchBrowser();
  const page = await newPage(browser, DESKTOP_VIEWPORT);
  await page.goto(server.url);
  await page.waitForSelector('.age-picker-card');
  await waitForServiceWorkerControl(page);
  report.ok('service worker ativo depois da primeira visita');

  await page.context().setOffline(true);
  await page.reload();
  await page.waitForSelector('.age-picker-card', { timeout: 10000 }).catch(() => report.problem('a página não abriu sem internet'));
  await openMenu(page, server.url, BAND_USED).catch(() => report.problem('não foi possível abrir o menu sem internet'));
  await openMission(page, MISSION_USED).catch(() => report.problem('não foi possível abrir uma missão sem internet'));
  const playable = await page.waitForSelector('.decompose-task-title', { timeout: 5000 }).then(() => true).catch(() => false);
  if (playable) report.ok('missão jogável sem internet');
  else report.problem('a missão não carregou sem internet');

  page.collectedErrors.forEach((error) => report.problem(error));
  await browser.close();
  await server.close();
  report.finish();
}

main();
