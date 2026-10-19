// Leitura em voz alta: Som Inicial, Monte a Palavra, Vertebrados e Fábrica de Laços não repetem o título; as outras missões continuam lendo.
const { startServer } = require('../lib/server');
const { launchBrowser, openMenu, openMission } = require('../lib/browser');
const { createReport } = require('../lib/report');

const BAND_USED = 0;
const SPEAK_BUTTON = '#speakButton';

// Troca a voz do navegador por um gravador: guarda o último texto que seria falado.
const FAKE_SPEECH = `
  window.__spoken = null;
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: { cancel() {}, speak(utterance) { window.__spoken = utterance.text; } },
  });
`;

async function spokenText(page) {
  await page.click(SPEAK_BUTTON);
  return page.evaluate(() => window.__spoken);
}

async function main() {
  const report = createReport('speech');
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
    await context.addInitScript(FAKE_SPEECH);
    const page = await context.newPage();
    await openMenu(page, server.url, BAND_USED);

    await openMission(page, 'Som Inicial');
    await page.waitForSelector('.inline-speak-button');
    const phonics = await spokenText(page);
    if (!phonics) report.problem('Som Inicial: nada foi falado');
    else if (/qual começa com o mesmo som/i.test(phonics)) report.problem(`Som Inicial: o título não deveria ser lido ("${phonics}")`);
    else if (!/toque na imagem que começa com o mesmo som de/i.test(phonics)) report.problem(`Som Inicial: a instrução deveria ser lida ("${phonics}")`);

    await openMenu(page, server.url, BAND_USED);
    await openMission(page, 'Monte a Palavra');
    await page.waitForSelector('.inline-speak-button');
    const syllables = await spokenText(page);
    if (!syllables) report.problem('Monte a Palavra: nada foi falado');
    else if (/toque as (sílabas|letras) na ordem certa/i.test(syllables)) report.problem(`Monte a Palavra: o título não deveria ser lido ("${syllables}")`);
    else if (!/monte a palavra/i.test(syllables)) report.problem(`Monte a Palavra: a instrução deveria ser lida ("${syllables}")`);

    await openMenu(page, server.url, BAND_USED);
    await openMission(page, 'Vertebrados e invertebrados');
    await page.waitForSelector(SPEAK_BUTTON);
    const vertebrates = (await spokenText(page)) || '';
    if ((vertebrates.match(/observe o animal/gi) || []).length !== 1) report.problem(`Vertebrados: "Observe o animal" deveria ser lido uma vez só ("${vertebrates}")`);

    await openMenu(page, server.url, BAND_USED);
    await openMission(page, 'Fábrica de Laços');
    await page.waitForSelector(SPEAK_BUTTON);
    const loops = (await spokenText(page)) || '';
    if ((loops.match(/monte o laço certo/gi) || []).length !== 1) report.problem(`Fábrica de Laços: "Monte o laço certo" deveria ser lido uma vez só ("${loops}")`);

    await openMenu(page, server.url, BAND_USED);
    await openMission(page, 'Caça ao Bug');
    await page.waitForSelector(SPEAK_BUTTON);
    const bug = await spokenText(page);
    if (!bug) report.problem('Caça ao Bug: nada foi falado');

    page.on('pageerror', (error) => report.problem(`PAGEERROR ${error.message}`));
    report.ok('leitura em voz alta conferida');
  } finally {
    await browser.close();
    await server.close();
  }
  report.finish();
}

main();
