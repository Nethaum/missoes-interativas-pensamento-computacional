# Verificações automáticas

Conjunto de testes do Missões Interativas. Rodam no Node 20 ou superior e usam o Google Chrome instalado no computador (via `playwright-core`). Nenhum teste altera o projeto.

```bash
cd qa
npm install
npm run static     # sintaxe, lint, dados e emojis (segundos)
npm run e2e:quick  # uma amostra das missões, os quizzes e a área do professor (alguns minutos)
npm run e2e        # tudo, incluindo todas as missões em todas as faixas, acessibilidade e modo offline (longo)
```

## O que cada verificação cobre

| Arquivo | Verifica |
|---|---|
| `static/syntax.js` | Se o JavaScript do `index.html` é válido |
| `static/lint.js` | ESLint: variáveis não declaradas ou sem uso, chaves duplicadas e outros erros comuns |
| `static/data.js` | Integridade dos dados: Jogo da Velha, quizzes, Som Inicial, Monte a Palavra e planos de aula (tempos, habilidades, viés de tamanho da resposta certa) , slides do modo aula (tamanho das linhas, desenhos, missões e habilidades) e exercícios de digitação (só teclas já liberadas na fase) |
| `static/emoji.js` | Política de emojis: no máximo Unicode 12, para aparecer em aparelhos mais antigos |
| `e2e/smoke.js` | Abre cada missão em cada faixa etária e interage ao acaso, procurando erros de JavaScript |
| `e2e/keyboard.js` | Navegação por teclado em cada missão e saída pelo botão voltar (toque longo) |
| `e2e/quizzes.js` | Joga as missões de perguntas e respostas: erro, acerto, explicação e avanço só com o botão Continuar |
| `e2e/continue-flow.js` | Dados e gráficos, Portão Lógico, Tradutor de Sinais, Mensagem secreta, Desmistificador de Pixels e Caça ao Bug: a resolução fica na tela até o aluno tocar em Continuar |
| `e2e/teacher-area.js` | Planos, fichas, plano mensal e orientações no celular e no desktop (acessibilidade e vazamento horizontal) |
| `e2e/lesson-missions.js` | Missões da aula: planos enviados ao painel, filtro "Da aula", "Todas" e limpeza |
| `e2e/assessment.js` | Modo avaliação: 10 perguntas, uma tentativa, botões desativados, resultado com perguntas erradas e habilidades |
| `e2e/assessment-puzzles.js` | Modo avaliação em Chef, Ciclos, Caderneta, Padrão, Divida a Tarefa, Estante, Robô coletor e Robô Programador |
| `e2e/mobile-notice.js` | Aviso discreto de "feito para o computador": aparece no celular, some sozinho ou ao fechar, e não aparece no desktop |
| `e2e/lesson-mode.js` | Modo aula (todas as aulas, inclusive as sem missão): painel só com as missões que têm aula, slides que aparecem linha por linha, voltar, tocar para avançar, botão de jogar no fim e exclusão com o modo avaliação |
| `e2e/speech.js` | Leitura em voz alta: Som Inicial, Monte a Palavra, Vertebrados e Fábrica de Laços não leem o título repetido, e as outras missões continuam lendo |
| `e2e/loop.js` | Fábrica de Laços: pedido da fábrica, execução animada (o total só aparece depois de ligar a máquina) e rodadas de prever |
| `e2e/typing.js` | Digitação: dica do dedo, erro sem punição, estrelas por precisão, Shift nas maiúsculas, acentos (tecla morta e letra), teclado escondido nas fases de frases, exercícios gerados (160 a 999 por faixa), pular de fase e terminar |
| `e2e/a11y.js` | Auditoria axe-core de todas as telas no celular |
| `e2e/offline.js` | Se o material abre e funciona sem internet depois da primeira visita |

## Organização

- `lib/` reúne o que os testes compartilham: servidor local, navegador, leitura dos dados do `index.html` e relatório.
- Cada verificação termina com código de saída diferente de zero quando encontra problema, para funcionar em integração contínua (`.github/workflows/qa.yml`).

## Ao criar uma missão de perguntas e respostas

1. Inclua o nome da constante dos níveis em `QUIZ_MISSION_IDS` (`static/data.js`) e em `QUIZ_MISSIONS` (`e2e/quizzes.js`).
2. Rode `npm run static`: o teste de viés confere se a resposta certa não é sempre a mais longa.
