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
  const missionIds = new Set(loadConst('missions').map((mission) => mission.id));
  plans.forEach((plan) => {
    const total = plan.sequence.reduce((sum, step) => sum + parseInt(step.time, 10), 0);
    if (total !== parseInt(plan.duration, 10)) report.problem(`plano ${plan.grade}: etapas somam ${total} min e a duração é ${plan.duration}`);
    if (!plan.skills.some((skill) => skill.main)) report.problem(`plano ${plan.grade}: sem habilidade principal`);
    plan.missions
      .filter((id) => !missionIds.has(id))
      .forEach((id) => report.problem(`plano ${plan.grade}: missão recomendada inexistente (${id})`));
  });
  report.ok(`planos de aula: ${plans.length}`);
}

// ---- Modo avaliação ----
function checkAssessmentSkills() {
  const skillsByMission = loadConst('assessmentMissionSkills');
  const skillTexts = loadConst('bnccSkillTexts');
  const missionIds = new Set(loadConst('missions').map((mission) => mission.id));
  Object.entries(skillsByMission).forEach(([missionId, codes]) => {
    if (!missionIds.has(missionId)) report.problem(`avaliação: missão inexistente (${missionId})`);
    codes.filter((code) => !skillTexts[code]).forEach((code) => report.problem(`avaliação: ${missionId} cita ${code} sem texto da habilidade`));
  });
  report.ok(`modo avaliação: ${Object.keys(skillsByMission).length} missões com habilidades`);
}

// ---- Modo aula: slides de quadro negro ----
const LESSON_VISUAL_KINDS = ['flow', 'compare', 'branch', 'grid', 'code'];
const MAX_LESSON_LINES = 4;
const MAX_LESSON_LINE_LENGTH = 100;
const MAX_LESSON_SLIDES = 8;
// Missões que têm aula mas não entram no modo avaliação.
const LESSON_EXTRA_MISSIONS = ['typing'];

function checkLessonSlide(deck, slide, number) {
  const where = `aula ${deck.id}, slide ${number}`;
  if (!slide.title) report.problem(`${where}: sem título`);
  if (!slide.lines || !slide.lines.length || slide.lines.length > MAX_LESSON_LINES) report.problem(`${where}: deve ter de 1 a ${MAX_LESSON_LINES} linhas`);
  (slide.lines || []).forEach((line) => {
    if (line.length > MAX_LESSON_LINE_LENGTH) report.problem(`${where}: linha longa demais (${line.length}): ${line.slice(0, 40)}…`);
    if ((line.match(/\*\*/g) || []).length % 2) report.problem(`${where}: ** sem par em "${line.slice(0, 40)}"`);
  });
  if (slide.visual && !LESSON_VISUAL_KINDS.includes(slide.visual.kind)) report.problem(`${where}: desenho desconhecido "${slide.visual.kind}"`);
}

function checkLessonDecks() {
  const decks = loadConst('lessonDecks');
  const assessable = [...Object.keys(loadConst('assessmentMissionSkills')), ...LESSON_EXTRA_MISSIONS];
  const skillTexts = loadConst('bnccSkillTexts');
  const seen = new Set();
  decks.forEach((deck) => {
    if (seen.has(deck.id)) report.problem(`aula ${deck.id}: id repetido`);
    seen.add(deck.id);
    if (!deck.slides.length || deck.slides.length > MAX_LESSON_SLIDES) report.problem(`aula ${deck.id}: de 1 a ${MAX_LESSON_SLIDES} slides`);
    if (!deck.standalone && !deck.missions.length) report.problem(`aula ${deck.id}: sem missão e sem marcar como aula avulsa`);
    deck.missions.forEach((id) => {
      if (!assessable.includes(id)) report.problem(`aula ${deck.id}: missão ${id} não é de pensamento computacional`);
    });
    deck.skills.forEach((code) => {
      if (!skillTexts[code]) report.problem(`aula ${deck.id}: habilidade ${code} sem texto`);
    });
    deck.slides.forEach((slide, index) => checkLessonSlide(deck, slide, index + 1));
  });
  const owners = decks.flatMap((deck) => deck.missions);
  if (new Set(owners).size !== owners.length) report.problem('uma missão aparece em mais de uma aula');
  report.ok(`modo aula: ${decks.length} aulas, ${decks.reduce((sum, deck) => sum + deck.slides.length, 0)} slides`);
}

// ---- Digitação: cada exercício só usa teclas já liberadas na fase ----
const TYPING_MAX_LINE = 70;

function checkTypingStages() {
  const stages = loadConst('typingStages');
  const bands = loadConst('typingBandStages');
  const allowed = new Set([' ']);
  let capitals = false;
  stages.forEach((stage, stageIndex) => {
    [...stage.newKeys].forEach((char) => allowed.add(char));
    capitals = capitals || Boolean(stage.capitals);
    const where = `digitação, fase ${stageIndex + 1}`;
    if (!stage.tip || !stage.title) report.problem(`${where}: falta título ou dica`);
    if (!stage.exercises.length) report.problem(`${where}: sem exercícios`);
    stage.exercises.forEach((text) => {
      // fases de acento usam só letras minúsculas e espaços: servem para qualquer faixa que as inclua
      if (stage.accent && !/^[a-zçáéíóúàãõâêô ]+$/.test(text)) report.problem(`${where}: fase de acento só com letras minúsculas ("${text}")`);
      if (text.length > TYPING_MAX_LINE) report.problem(`${where}: exercício longo demais (${text.length})`);
      if (/\s{2}|^\s|\s$/.test(text)) report.problem(`${where}: espaços sobrando em "${text}"`);
      [...text].forEach((char) => {
        const isCapital = char !== char.toLowerCase();
        const ok = isCapital ? capitals && allowed.has(char.toLowerCase()) : allowed.has(char);
        if (!ok) report.problem(`${where}: "${char}" ainda não foi liberada em "${text}"`);
      });
    });
  });
  stages.forEach((stage, stageIndex) => {
    if (!bands.some((indexes) => indexes.includes(stageIndex))) report.problem(`digitação: a fase ${stageIndex + 1} não é usada por nenhuma faixa etária`);
  });
  bands.forEach((indexes, band) => {
    if (indexes.some((index) => !stages[index])) report.problem(`digitação: faixa ${band} aponta para uma fase que não existe`);
  });
  report.ok(`digitação: ${stages.length} fases, ${stages.reduce((sum, stage) => sum + stage.exercises.length, 0)} exercícios escritos à mão`);
  checkGeneratedTyping(stages, bands);
}

// Exercícios gerados: a quantidade pedida, sem repetir, sem espaços sobrando e só com teclas já liberadas na fase.
function checkGeneratedTyping(stages, bands) {
  const generate = loadConst('typingGenerateExercises');
  const bank = loadConst('typingBank');
  const kinds = loadConst('typingStageKinds');
  const perStage = loadConst('typingExercisesPerStage');
  const maxLength = loadConst('typingMaxLength');
  const limit = loadConst('TYPING_MAX_EXERCISES');
  const cumulative = stages.map((_, index) => {
    const keys = new Set([' ']);
    stages.slice(0, index + 1).forEach((stage) => [...stage.newKeys].forEach((char) => keys.add(char)));
    return { keys, capitals: stages.slice(0, index + 1).some((stage) => stage.capitals) };
  });
  if (kinds.length !== stages.length) report.problem(`digitação: ${kinds.length} tipos de fase para ${stages.length} fases`);
  let biggest = 0;
  bands.forEach((indexes, band) => {
    let total = 0;
    indexes.forEach((stageIndex) => {
      const curated = stages[stageIndex].exercises;
      const lines = generate(stages, bank, kinds, stageIndex, perStage[band], maxLength[band], curated);
      const where = `digitação, faixa ${band}, fase ${stageIndex + 1}`;
      total += curated.length + lines.length;
      if (curated.length + lines.length !== perStage[band]) report.problem(`${where}: ${curated.length + lines.length} exercícios e eram esperados ${perStage[band]}`);
      if (new Set([...curated, ...lines]).size !== curated.length + lines.length) report.problem(`${where}: exercícios repetidos`);
      const { keys, capitals } = cumulative[stageIndex];
      lines.forEach((line) => {
        if (line.length > maxLength[band]) report.problem(`${where}: linha maior que ${maxLength[band]} ("${line}")`);
        if (/\s{2}|^\s|\s$/.test(line)) report.problem(`${where}: espaços sobrando em "${line}"`);
        [...line].forEach((char) => {
          const lower = char.toLowerCase();
          const ok = char === lower ? keys.has(char) : capitals && keys.has(lower);
          if (!ok) report.problem(`${where}: "${char}" ainda não foi liberada em "${line}"`);
        });
        if (kinds[stageIndex].startsWith('accent') && !/^[A-ZÀ-Ú]?[a-zçáéíóúàãõâêô ,.!?]+$/i.test(line)) report.problem(`${where}: fase de acento com caractere inesperado em "${line}"`);
      });
    });
    biggest = Math.max(biggest, total);
    if (total > limit) report.problem(`digitação: a faixa ${band} tem ${total} exercícios e o limite é ${limit}`);
  });
  report.ok(`digitação: até ${biggest} exercícios por faixa (limite ${limit})`);
}

checkTicTacToe();
QUIZ_MISSION_IDS.forEach(checkQuizMission);
checkPhonics();
checkSyllables();
checkLessonPlans();
checkAssessmentSkills();
checkLessonDecks();
checkTypingStages();
report.finish();
