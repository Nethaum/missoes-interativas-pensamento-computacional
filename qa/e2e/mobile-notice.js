// Aviso "feito para o computador": aparece só no celular, fecha no ✕ e não volta ao recarregar.
const { startServer } = require('../lib/server');
const { launchBrowser } = require('../lib/browser');
const { createReport } = require('../lib/report');

const PHONE = { isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } };
const DESKTOP = { viewport: { width: 1280, height: 800 } };
const AUTO_HIDE_WAIT_MS = 10500;

const noticeIsVisible = (page) => page.evaluate(() => !document.getElementById('mobileNotice').hidden);

async function openApp(browser, url, options) {
  const page = await (await browser.newContext(options)).newPage();
  await page.goto(`${url}/?qa=${Date.now()}`);
  await page.waitForSelector('.age-picker-card');
  return page;
}

async function main() {
  const report = createReport('mobile-notice');
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    const desktop = await openApp(browser, server.url, DESKTOP);
    if (await noticeIsVisible(desktop)) report.problem('o aviso não deveria aparecer no computador');

    const phone = await openApp(browser, server.url, PHONE);
    if (!(await noticeIsVisible(phone))) report.problem('o aviso deveria aparecer no celular');
    await phone.click('#mobileNoticeDismiss');
    if (await noticeIsVisible(phone)) report.problem('o aviso deveria sumir ao tocar no ✕');
    await phone.reload();
    await phone.waitForSelector('.age-picker-card');
    if (await noticeIsVisible(phone)) report.problem('o aviso não deveria voltar ao recarregar na mesma sessão');

    const second = await openApp(browser, server.url, PHONE);
    await second.waitForTimeout(AUTO_HIDE_WAIT_MS);
    if (await noticeIsVisible(second)) report.problem('o aviso deveria sumir sozinho depois de alguns segundos');
    report.ok('aviso do celular: aparece, fecha, some sozinho e não aparece no computador');
  } finally {
    await browser.close();
    await server.close();
  }
  report.finish();
}

main();
