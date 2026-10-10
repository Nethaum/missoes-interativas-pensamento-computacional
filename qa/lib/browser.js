const { chromium } = require('playwright-core');

const AGE_BAND_COUNT = 5;
const DESKTOP_VIEWPORT = { width: 1024, height: 768 };
const PHONE_VIEWPORT = { width: 390, height: 844 };
const HOME_LONG_PRESS_MS = 1500;
const BACK_HOLD_ADVANCE_MS = 2000;
const IGNORED_CONSOLE_ERRORS = /ERR_CONNECTION|favicon/;

function launchBrowser() {
  return chromium.launch({ channel: 'chrome', headless: true });
}

/** Cria uma página que acumula erros de JavaScript e do console em `page.collectedErrors`. */
async function newPage(browser, viewport = DESKTOP_VIEWPORT) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.collectedErrors = [];
  page.on('pageerror', (error) => page.collectedErrors.push(`PAGEERROR ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !IGNORED_CONSOLE_ERRORS.test(message.text())) {
      page.collectedErrors.push(`CONSOLE ${message.text()}`);
    }
  });
  return page;
}

/** Abre o app, escolhe a faixa etária (0 a 4) e espera o menu aparecer. */
async function openMenu(page, baseUrl, band) {
  await page.goto(`${baseUrl}/?qa=${Date.now()}`);
  await page.waitForSelector('.age-picker-card');
  await page.locator('.age-picker-card').nth(band).click();
  await page.waitForSelector('.menu-card');
}

/** Abre uma missão pelo título que aparece no cartão do menu. */
async function openMission(page, title) {
  await page.locator('.menu-card', { hasText: title }).first().click();
}

/** Volta ao menu com o botão início (toque longo) e informa se o menu reapareceu. */
async function goHome(page) {
  const press = (type) => page.evaluate((eventType) => {
    document.getElementById('homeButton')?.dispatchEvent(new PointerEvent(eventType, { bubbles: true }));
  }, type);
  await press('pointerdown');
  await page.waitForTimeout(HOME_LONG_PRESS_MS);
  await press('pointerup');
  await page.waitForTimeout(300);
  return Boolean(await page.$('.menu-card'));
}

/** Troca o relógio da página por um controlável: o tempo só avança quando o teste manda. */
function installFakeClock(page) {
  return page.addInitScript(`
    window.__fakeNow = 1700000000000;
    Date.now = () => window.__fakeNow;
  `);
}

/** Segura o botão voltar até a ação protegida completar (exige o relógio de installFakeClock). */
async function holdBackButton(page) {
  const dispatch = (type) => page.evaluate((eventType) => {
    document.getElementById('backButton')?.dispatchEvent(new PointerEvent(eventType, { bubbles: true, cancelable: true }));
  }, type);
  await dispatch('pointerdown');
  await page.evaluate((holdMs) => { window.__fakeNow += holdMs; }, BACK_HOLD_ADVANCE_MS);
  await page.waitForTimeout(500);
  await dispatch('pointerup');
  await page.waitForTimeout(400);
  return Boolean(await page.$('.menu-card'));
}

/** Segura o botão "Sou adulto" até liberar a área do professor. */
async function unlockTeacherArea(page) {
  await page.click('#aboutButton');
  const box = await page.locator('#adultHoldButton').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(3500);
  await page.mouse.up();
  await page.waitForSelector('#lessonPlanGrid .lesson-plan-button', { state: 'visible' });
}

module.exports = {
  AGE_BAND_COUNT,
  DESKTOP_VIEWPORT,
  PHONE_VIEWPORT,
  launchBrowser,
  newPage,
  openMenu,
  openMission,
  goHome,
  installFakeClock,
  holdBackButton,
  unlockTeacherArea,
};
