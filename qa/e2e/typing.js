// Digitação: teclado na tela com o dedo certo, erro sem punição, estrelas por precisão, teclado escondido nas últimas fases.
const { startServer } = require('../lib/server');
const { launchBrowser, newPage, openMenu, openMission } = require('../lib/browser');
const { createReport } = require('../lib/report');

const MISSION = 'Digitação';
const ALL_STARS = '⭐⭐⭐';
const EXERCISES_PER_STAGE = 4;
const SETTLE_MS = 120;
const COMPLETE_MS = 1800;

const counter = async (page) => (await page.innerText('#leftValue')).replace(/\s+/g, '');
const exerciseText = async (page) => (await page.textContent('.typing-text')).replace(/ /g, ' ').trim();
const typedCount = (page) => page.locator('.typing-char.typed').count();

const ACCENTED = /[áéíóúàãõâêô]/i;

// Num teclado ABNT2 o acento é uma tecla morta ("Dead") seguida da letra, que chega já acentuada; o ç é uma tecla só.
const sendKey = (page, key) => page.evaluate(
  (value) => document.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })),
  key,
);

// `usIntl`: no teclado US-Internacional o ç também é tecla morta (apóstrofo) seguida do c.
async function pressChar(page, char, usIntl = false) {
  const cedilla = /[çÇ]/.test(char);
  if (ACCENTED.test(char) || (cedilla && usIntl)) await sendKey(page, 'Dead');
  if (ACCENTED.test(char) || cedilla) await sendKey(page, char);
  else await page.keyboard.type(char);
}

// Digita o exercício inteiro (com acentos, se houver); devolve o texto digitado.
async function typeExercise(page, usIntl = false) {
  const text = await exerciseText(page);
  for (const char of text) await pressChar(page, char, usIntl);
  await page.waitForTimeout(SETTLE_MS);
  return text;
}

async function nextExercise(page) {
  await page.keyboard.press('Enter');
  await page.waitForTimeout(SETTLE_MS);
}

async function openTyping(browser, server, band) {
  const page = await newPage(browser);
  await openMenu(page, server.url, band);
  await openMission(page, MISSION);
  await page.waitForSelector('.typing-text');
  return page;
}

// Faixa dos 6-7 anos: F e R são letras como as outras, o erro não avança o cursor e as estrelas dependem da precisão.
async function checkBasics(browser, report, server) {
  const page = await openTyping(browser, server, 0);
  const text = await exerciseText(page);
  if (!(await page.$('.typing-key.target'))) report.problem('o teclado na tela deveria destacar a próxima tecla');
  if (!(await page.innerText('.typing-hint')).toLowerCase().includes('dedo')) report.problem('a dica deveria dizer qual dedo usar');
  if (!text.startsWith('ff')) report.problem(`o primeiro exercício deveria começar com "ff" e começa com "${text.slice(0, 4)}"`);

  await page.keyboard.press('f');
  await page.waitForTimeout(SETTLE_MS);
  if ((await typedCount(page)) !== 1) report.problem('a tecla F deveria ser digitada e não ligar a tela cheia');

  await page.keyboard.press('z');
  await page.waitForTimeout(SETTLE_MS);
  if ((await typedCount(page)) !== 1) report.problem('uma tecla errada não deveria avançar o cursor');
  if (!(await page.$('.typing-char.current.wrong'))) report.problem('uma tecla errada deveria ser sinalizada com calma');
  await page.keyboard.press('x');
  await page.keyboard.press('q');
  await page.keyboard.type(text.slice(1));
  await page.waitForSelector('.typing-result');
  const stars = await page.innerText('.typing-stars');
  if (stars.includes('⭐⭐⭐')) report.problem(`com 3 erros não deveria ter 3 estrelas ("${stars}")`);
  if (!(await page.innerText('.typing-practice')).toLowerCase().includes('f')) report.problem('as teclas para treinar deveriam listar a que errou (F)');
  if (!(await page.innerText('.typing-result-text')).includes('%')) report.problem('o resultado deveria mostrar a precisão');

  const before = await counter(page);
  await nextExercise(page);
  if ((await counter(page)) === before) report.problem('Enter no resultado deveria ir para o próximo exercício');
  await typeExercise(page);
  await page.waitForSelector('.typing-result');
  if (!(await page.innerText('.typing-stars')).includes(ALL_STARS)) report.problem('sem erros deveria ter 3 estrelas');
  if (await page.$('.typing-practice')) report.problem('sem erros não deveria listar teclas para treinar');
  page.collectedErrors.forEach((error) => report.problem(`faixa 6-7: ${error}`));

  // termina a missão inteira: volta ao painel com a missão marcada como feita
  await nextExercise(page);
  for (let guard = 0; guard < 30 && (await page.$('.typing-text')); guard++) {
    await typeExercise(page);
    await nextExercise(page);
    await page.waitForTimeout(40);
  }
  await page.waitForSelector('.menu-tile', { timeout: COMPLETE_MS * 2 }).catch(() => report.problem('ao concluir todos os exercícios a missão deveria voltar ao painel'));
  await page.close();
}

// Faixa dos 14 anos: as maiúsculas pedem Shift e as fases de frases e textos começam com o teclado escondido.
async function checkAdvanced(browser, report, server) {
  const page = await openTyping(browser, server, 4);
  const capital = (await exerciseText(page))[0];
  if (capital !== capital.toUpperCase() || capital === capital.toLowerCase()) report.problem(`o primeiro exercício dos 14 anos deveria começar com uma maiúscula ("${capital}")`);
  if ((await page.locator('.typing-key.shift.target').count()) !== 1) report.problem('para uma maiúscula o Shift da mão contrária deveria ficar destacado');
  for (let exercise = 0; exercise < EXERCISES_PER_STAGE * 2; exercise++) {
    await typeExercise(page);
    await nextExercise(page);
  }
  if (await page.$('.typing-keyboard')) report.problem('nas fases de frases o teclado deveria começar escondido');
  if (!(await page.$('.typing-peek-button'))) report.problem('deveria haver um botão para espiar o teclado');
  await page.click('.typing-peek-button');
  if (!(await page.$('.typing-keyboard'))) report.problem('o botão deveria mostrar o teclado');
  page.collectedErrors.forEach((error) => report.problem(`faixa 14 anos: ${error}`));
  await page.close();
}

// Faixa dos 12-13 anos: passa por todas as fases, inclusive as de acento, apertando o acento e depois a letra.
async function checkAccents(browser, report, server) {
  const page = await openTyping(browser, server, 3);
  for (let exercise = 0; exercise < EXERCISES_PER_STAGE * 4; exercise++) {
    await typeExercise(page);
    await nextExercise(page);
  }
  const text = await exerciseText(page);
  if (!text.startsWith('café')) return report.problem(`a fase do acento agudo deveria começar em "café" e começa em "${text.slice(0, 8)}"`);
  await page.keyboard.type('caf');
  await page.waitForTimeout(SETTLE_MS);
  if (!(await page.innerText('.typing-hint')).toLowerCase().includes('acento agudo')) report.problem('antes de um acento a dica deveria pedir primeiro o acento agudo');
  if ((await page.locator('.typing-key.target').first().innerText()).trim() !== '´') report.problem('a tecla do acento deveria ficar destacada');
  await sendKey(page, 'Dead');
  await page.waitForTimeout(SETTLE_MS);
  if (!(await page.innerText('.typing-hint')).toLowerCase().includes('agora a letra e')) report.problem('depois do acento a dica deveria pedir a letra E');
  const before = await typedCount(page);
  await sendKey(page, 'é');
  await page.waitForTimeout(SETTLE_MS);
  if ((await typedCount(page)) !== before + 1) report.problem('o acento seguido da letra deveria avançar o cursor');
  await page.keyboard.press(' ');
  await sendKey(page, 'Dead');
  await page.waitForTimeout(SETTLE_MS);
  if (!(await page.$('.typing-char.current.wrong'))) report.problem('apertar um acento sem precisar deveria ser sinalizado');
  for (let exercise = 0; exercise < EXERCISES_PER_STAGE * 4 && (await page.$('.typing-text')); exercise++) {
    if (await page.$('.typing-result')) {
      await nextExercise(page);
    } else {
      await page.keyboard.press(' ').catch(() => {});
      // na fase do cedilha digita como num teclado US-Internacional (acento morto antes do c)
      const usIntl = (await page.innerText('#mission')).toLowerCase().includes('cedilha');
      await typeExercise(page, usIntl);
      await nextExercise(page);
    }
  }
  page.collectedErrors.forEach((error) => report.problem(`faixa 12-13 anos: ${error}`));
  await page.close();
}

async function main() {
  const report = createReport('typing');
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    await checkBasics(browser, report, server);
    await checkAdvanced(browser, report, server);
    await checkAccents(browser, report, server);
    report.ok('Digitação: dica do dedo, erro sem punição, estrelas e teclado escondido');
  } finally {
    await browser.close();
    await server.close();
  }
  report.finish();
}

main();
