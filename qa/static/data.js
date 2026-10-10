const { loadConst } = require('../lib/extract');
const { createReport } = require('../lib/report');

const OPTIONS_PER_QUESTION = 4;
const MAX_LONGEST_ANSWER_SHARE = 0.3;
const CLEARLY_LONGER_RATIO = 1.15;
const MAX_CLEARLY_LONGEST_SHARE = 0.2;
const QUIZ_MISSION_IDS = ['hardware', 'safe', 'ai', 'structures', 'reading'];

const report = createReport('data');

const withoutAccents = (word) => word.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const normalizedQuestion = (text) => text.toLowerCase().replace(/[^a-zà-ú0-9 ]/g, '').trim();

function hasUniqueLongestOption(options, answerIndex) {
  const lengths = options.map((option) => option.length);
  const longest = Math.max(...lengths);
  return lengths[answerIndex] === longest && lengths.filter((length) => length === longest).length === 1;
}

function hasClearlyLongestAnswer(round) {
  const longestDistractor = Math.max(...round.options.filter((_, index) => index !== round.answer).map((option) => option.length));
  return round.options[round.answer].length > CLEARLY_LONGER_RATIO * longestDistractor;
}

function shareOf(rounds, predicate) {
  return rounds.filter(predicate).length / rounds.length;
}

// ---- Jogo da Velha dos Enigmas ----
function checkTicTacToeRound(round, id, seenQuestions) {
  if (!round.question || !round.options || round.options.length !== OPTIONS_PER_QUESTION) report.problem(`ttt ${id}: formato`);
  if (!(round.answer >= 0 && round.answer < round.options.length)) report.problem(`ttt ${id}: resposta fora do intervalo`);
  if (new Set(round.options.map((option) => option.toLowerCase())).size !== round.options.length) report.problem(`ttt ${id}: opções repetidas`);
  if (round.options.some((option) => option.includes(' / '))) report.problem(`ttt ${id}: opção com " / "`);
  if (/\s{2,}/.test(round.question) || /\s$/.test(round.question)) report.problem(`ttt ${id}: espaços sobrando`);
  const key = normalizedQuestion(round.question);
  if (seenQuestions.has(key)) report.problem(`ttt ${id}: pergunta repetida de ${seenQuestions.get(key)}`);
  seenQuestions.set(key, id);
}

function checkTicTacToe() {
  const levels = loadConst('tttLevelPlans');
  const seenQuestions = new Map();
  levels.forEach((level, levelIndex) => {
    level.rounds.forEach((round, roundIndex) => checkTicTacToeRound(round, `${levelIndex}.${roundIndex}`, seenQuestions));
    const share = shareOf(level.rounds, (round) => hasUniqueLongestOption(round.options, round.answer));
    if (share > MAX_LONGEST_ANSWER_SHARE) report.problem(`ttt nível ${levelIndex}: a resposta é a mais longa em ${Math.round(share * 100)}% das rodadas`);
  });
  report.ok(`jogo da velha: ${levels.length} níveis`);
}

// ---- Missões de perguntas e respostas (Computador por dentro, Navegação segura...) ----
function checkQuizMission(id) {
  const levels = loadConst(`${id}Levels`);
  const seenQuestions = new Map();
  levels.forEach((level, levelIndex) => {
    level.rounds.forEach((round, roundIndex) => {
      const where = `${id} ${levelIndex}.${roundIndex}`;
      if (!round.icon || !round.question || !round.why) report.problem(`${where}: campo vazio`);
      if (round.options.length < 3 || round.options.length > OPTIONS_PER_QUESTION) report.problem(`${where}: número de opções`);
      if (new Set(round.options).size !== round.options.length) report.problem(`${where}: opções repetidas`);
      const key = normalizedQuestion(round.question) + '|' + (round.code || '');
      if (seenQuestions.has(key)) report.problem(`${where}: pergunta repetida de ${seenQuestions.get(key)}`);
      seenQuestions.set(key, where);
    });
    const share = shareOf(level.rounds, hasClearlyLongestAnswer);
    if (share > MAX_CLEARLY_LONGEST_SHARE) report.problem(`${id} nível ${levelIndex}: a resposta é bem mais longa que as outras em ${Math.round(share * 100)}% das rodadas`);
  });
  report.ok(`${id}: ${levels.length} níveis`);
}

// ---- Som Inicial ----
function initialSound(word) {
  const letters = withoutAccents(word);
  return letters.startsWith('CH') ? 'X' : letters[0];
}

function checkPhonics() {
  const rounds = loadConst('phonicsRounds');
  const seenPrompts = new Set();
  const seenAnswers = new Set();
  rounds.forEach((round, index) => {
    const correct = round.options.filter((option) => option.correct);
    const where = `som inicial ${index} (${round.word})`;
    if (correct.length !== 1) return report.problem(`${where}: ${correct.length} respostas corretas`);
    const answer = correct[0].word;
    if (initialSound(answer) !== initialSound(round.word)) report.problem(`${where}: ${answer} não começa com o mesmo som`);
    round.options
      .filter((option) => !option.correct && withoutAccents(option.word)[0] === withoutAccents(round.word)[0])
      .forEach((option) => report.problem(`${where}: distrator ${option.word} começa com a mesma letra`));
    if (seenPrompts.has(round.word)) report.problem(`${where}: palavra repetida`);
    if (seenAnswers.has(answer)) report.problem(`${where}: resposta ${answer} já usada em outra rodada`);
    seenPrompts.add(round.word);
    seenAnswers.add(answer);
  });
  report.ok(`som inicial: ${rounds.length} rodadas`);
}

// ---- Monte a Palavra ----
function checkSyllables() {
  const words = loadConst('syllableWords');
  const seenWords = new Set();
  words.forEach((entry, index) => {
    const where = `monte a palavra ${index} (${entry.word})`;
    if (entry.syllables.join('') !== entry.word) report.problem(`${where}: sílabas não formam a palavra`);
    if (seenWords.has(entry.word)) report.problem(`${where}: palavra repetida`);
    seenWords.add(entry.word);
    entry.distractors
      .filter((distractor) => entry.syllables.includes(distractor))
      .forEach((distractor) => report.problem(`${where}: distrator ${distractor} já é sílaba da palavra`));
  });
  report.ok(`monte a palavra: ${words.length} palavras`);
}

// ---- Planos de aula ----
function checkLessonPlans() {
  const plans = loadConst('lessonPlans');
  plans.forEach((plan) => {
    const total = plan.sequence.reduce((sum, step) => sum + parseInt(step.time, 10), 0);
    if (total !== parseInt(plan.duration, 10)) report.problem(`plano ${plan.grade}: etapas somam ${total} min e a duração é ${plan.duration}`);
    if (!plan.skills.some((skill) => skill.main)) report.problem(`plano ${plan.grade}: sem habilidade principal`);
  });
  report.ok(`planos de aula: ${plans.length}`);
}

checkTicTacToe();
QUIZ_MISSION_IDS.forEach(checkQuizMission);
checkPhonics();
checkSyllables();
checkLessonPlans();
report.finish();
