// Modo avaliação nas missões de montar, ordenar e executar: Chef, Ciclos, Caderneta, Padrão, Divida a Tarefa, Estante, Robô coletor e Robô Programador.
const { startServer } = require('../lib/server');
const { launchBrowser, newPage, openMenu, openMission } = require('../lib/browser');
const { setAssessmentMode, resultIsVisible, readResult, closeResult } = require('../lib/assessment');
const { createReport } = require('../lib/report');

const BAND_USED = 2;
const QUESTIONS = 10;
const CLICK_SETTLE_MS = 450;
const SWAP_SETTLE_MS = 600;
const MOVE_SETTLE_MS = 250;
const BUILDER_RUN_MS = 1800;
const MAX_ACTIONS = 140;
const MAX_PHASES = 8;
const ARROW_BY_STEP = { '0,-1': 'ArrowUp', '0,1': 'ArrowDown', '-1,0': 'ArrowLeft', '1,0': 'ArrowRight' };

// Clique simples: sempre a primeira opção disponível; serve para escolher passos, itens e divisões.
const firstAvailable = (selectors) => async (page) => {
  for (const selector of selectors) if (await page.$(selector)) return selector;
  return selectors[0];
};

async function clickFirstUntilResult(page, option) {
  for (let actions = 0; actions < MAX_ACTIONS && !(await resultIsVisible(page)); actions++) {
    const selector = await option(page);
    await page.locator(selector).first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(CLICK_SETTLE_MS);
  }
}

// Estante Organizada: ordena com o mínimo de trocas, então todas as fases contam como acerto.
async function solveSortUntilResult(page) {
  for (let actions = 0; actions < MAX_ACTIONS && !(await resultIsVisible(page)); actions++) {
    const values = await page.$$eval('.sort-item-value', (nodes) => nodes.map((node) => Number(node.textContent)));
    const outOfOrder = values.findIndex((value, index) => index > 0 && values[index - 1] > value);
    if (outOfOrder < 0) { await page.waitForTimeout(CLICK_SETTLE_MS); continue; }
    await page.locator('.sort-item').nth(outOfOrder - 1).click();
    await page.waitForTimeout(150);
    await page.locator('.sort-item').nth(outOfOrder).click();
    await page.waitForTimeout(SWAP_SETTLE_MS);
  }
}

// Robô coletor: lê o tabuleiro da tela e busca o caminho que recolhe todas as energias e chega ao portal sem buracos.
const readRobotLevel = (page) => page.evaluate(() => {
  const grid = document.querySelector('.robot-playfield .grid');
  const width = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  const level = { width, height: 0, walls: [], holes: [], energies: [], start: null, goal: null };
  [...grid.children].forEach((cell, index) => {
    const at = [index % width, Math.floor(index / width)];
    level.height = Math.max(level.height, at[1] + 1);
    if (cell.classList.contains('wall')) level.walls.push(at);
    if (cell.querySelector('.hole')) level.holes.push(at);
    if (cell.querySelector('.energy')) level.energies.push(at);
    if (cell.querySelector('.robot')) level.start = at;
    if (cell.querySelector('.goal')) level.goal = at;
  });
  return level;
});

function planRobotPath(level) {
  const blocked = new Set([...level.walls, ...level.holes].map((cell) => cell.join(',')));
  const energyBit = new Map(level.energies.map((cell, index) => [cell.join(','), 1 << index]));
  const allEnergies = (1 << level.energies.length) - 1;
  const start = { x: level.start[0], y: level.start[1], mask: 0, path: [] };
  const seen = new Set([`${start.x},${start.y},0`]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift();
    if (current.x === level.goal[0] && current.y === level.goal[1] && current.mask === allEnergies) return current.path;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const x = current.x + dx;
      const y = current.y + dy;
      if (x < 0 || y < 0 || x >= level.width || y >= level.height || blocked.has(`${x},${y}`)) continue;
      const mask = current.mask | (energyBit.get(`${x},${y}`) || 0);
      const key = `${x},${y},${mask}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ x, y, mask, path: [...current.path, ARROW_BY_STEP[`${dx},${dy}`]] });
    }
  }
  return [];
}

async function walkRobotLevels(page) {
  for (let phase = 0; phase < MAX_PHASES && !(await resultIsVisible(page)); phase++) {
    for (const key of planRobotPath(await readRobotLevel(page))) {
      await page.keyboard.press(key);
      await page.waitForTimeout(MOVE_SETTLE_MS);
    }
    await page.waitForTimeout(CLICK_SETTLE_MS);
  }
}

// Robô Programador: monta um bloco e executa; só a primeira execução de cada fase conta.
async function runBuilderPhases(page) {
  for (let actions = 0; actions < MAX_ACTIONS && !(await resultIsVisible(page)); actions++) {
    await page.locator('.builder-block:not(.disabled)').first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(150);
    await page.locator('.builder-run-button:not([disabled])').click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(BUILDER_RUN_MS);
  }
}

const stepMission = (title) => ({ title, ready: '.cycle-item', play: (page) => clickFirstUntilResult(page, firstAvailable(['.cycle-item'])) });

const MISSIONS = [
  stepMission('Chef Cozinheiro'),
  stepMission('Ciclos da natureza'),
  stepMission('Caderneta de vacinação'),
  { title: 'Padrão Perfeito', ready: '.pattern-option, .pattern-palette-button', play: (page) => clickFirstUntilResult(page, firstAvailable(['.pattern-option', '.pattern-palette-button'])) },
  { title: 'Divida a Tarefa', ready: '.decompose-option, .decompose-palette-button', play: (page) => clickFirstUntilResult(page, firstAvailable(['.decompose-option', '.decompose-palette-button'])) },
  { title: 'Estante Organizada', ready: '.sort-item', play: solveSortUntilResult, total: 5, perfect: true },
  { title: 'Robô coletor', ready: '.cell', play: walkRobotLevels, total: 5, perfect: true },
  { title: 'Robô Programador', ready: '.builder-block', play: runBuilderPhases, total: 3 },
];

async function checkMission(page, report, mission) {
  const expectedTotal = mission.total || QUESTIONS;
  await openMission(page, mission.title);
  await page.waitForSelector(mission.ready);
  await mission.play(page);
  const result = await readResult(page).catch(() => null);
  if (!result) return report.problem(`${mission.title}: o resultado não apareceu`);
  if (result.total !== expectedTotal) report.problem(`${mission.title}: ${result.total} perguntas e eram esperadas ${expectedTotal} ("${result.score}")`);
  if (mission.perfect && result.hits !== expectedTotal) report.problem(`${mission.title}: jogando certo, esperava ${expectedTotal} acertos e veio "${result.score}"`);
  if (result.listed !== result.total - result.hits) report.problem(`${mission.title}: ${result.total - result.hits} erros e ${result.listed} perguntas listadas`);
  return closeResult(page);
}

async function main() {
  const report = createReport('assessment-puzzles');
  const server = await startServer();
  const browser = await launchBrowser();
  try {
    const page = await newPage(browser);
    await openMenu(page, server.url, BAND_USED);
    await setAssessmentMode(page, true);
    for (const mission of MISSIONS) await checkMission(page, report, mission);
    await setAssessmentMode(page, false);
    page.collectedErrors.forEach((error) => report.problem(error));
    report.ok(`${MISSIONS.length} missões de montar e executar avaliadas`);
  } finally {
    await browser.close();
    await server.close();
  }
  report.finish();
}

main();
