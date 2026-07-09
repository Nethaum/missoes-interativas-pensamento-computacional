# Missões Interativas - Pensamento Computacional

Material em HTML para aulas de Pensamento Computacional nos anos iniciais do Ensino Fundamental.

Versão atual: 2.3.16

## Acesse

Página pública:

https://nethaum.github.io/missoes-interativas-pensamento-computacional/missoes_interativas_pensamento_computacional.html

O arquivo também pode ser aberto localmente em qualquer navegador moderno, sem instalação.

## Objetivo

Reunir missões curtas, visuais e interativas para trabalhar raciocínio lógico, sequências, padrões, dados, gráficos, matemática, bandeiras, natureza, biologia, saúde, ambiente e segurança no trânsito.

As atividades foram pensadas para uso direto em sala, com linguagem simples, pouco texto e interação por teclado, mouse ou toque conforme a missão.

## Alinhamento pedagógico

O material foi organizado para apoiar aulas de Pensamento Computacional nos anos iniciais, em diálogo com a BNCC, com as normas de Computação na Educação Básica e com temas contemporâneos transversais como saúde, meio ambiente, cidadania e segurança.

As missões interativas usam referências oficiais como eixo de conteúdo:

- Educação e computação: BNCC e normas nacionais de Computação na Educação Básica.
- Saúde e ambiente: orientações do Ministério da Saúde sobre prevenção da dengue e eliminação de criadouros do Aedes aegypti.
- Trânsito e mobilidade: orientações nacionais de trânsito para condutas seguras de pedestres e ciclistas.

O conteúdo evita coleta de dados dos alunos, cadastro, login, câmera, microfone e geolocalização. A página funciona como um arquivo HTML estático e não envia dados automaticamente.

Referências oficiais:

- BNCC: https://www.gov.br/mec/pt-br/cne/base-nacional-comum-curricular-bncc
- Computação na Educação Básica: https://www.gov.br/mec/pt-br/cne/resolucoes/resolucoes-ceb-2022
- Temas Contemporâneos Transversais: https://www.gov.br/mec/pt-br/assuntos/eb/guia_pratico_temas_contemporaneos.pdf
- Dengue e Aedes aegypti: https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/d/dengue
- Programa Saúde na Escola: https://www.gov.br/mec/pt-br/programa-saude-na-escola/tematicas
- Segurança de ciclistas: https://www.gov.br/transportes/pt-br/assuntos/transito/arquivos-senatran/docs/CartilhaCiclistaatualizada.pdf

## Dispositivos

O projeto foi pensado para desktop, notebook, painel interativo e celular. Em telas pequenas, a orientação horizontal costuma oferecer a melhor experiência.

## Projetos destaque

A **Copa da Matemática** combina futebol, estratégia, cálculo mental, tomada de decisão e probabilidade em uma campanha com seleções da Copa do Mundo.

A **Corrida contra o Aedes** trabalha saúde, ambiente e prevenção em formato de percurso interativo, com foco em reconhecer e eliminar pontos de água parada.

Essas missões contam com visual mais elaborado e foram pensadas também para apresentações, feiras e aulas especiais.

## Destaques da versão 2.3.16

- Redesenhadas as telas "Projeto destaque" e "Como funciona" da Copa da Matemática: as etiquetas informativas (Cálculo mental, Estratégia etc.) tinham o mesmo visual de botão 3D dos botões clicáveis de verdade, levando crianças a tentar tocar nelas — agora são pílulas planas, claramente não-clicáveis. Texto bem mais curto nas duas telas. Bolinha do campo em miniatura ganhou uma animação suave de quicar.

## Destaques da versão 2.3.15

- Dificuldade dos enigmas da Copa da Matemática agora também escala pela fase do campeonato: a partir dos 16 avos (round32) a dificuldade sobe um degrau, e das quartas em diante mais um, até o teto da faixa etária escolhida — antes era igual do primeiro jogo de grupo até a final. O parâmetro que já existia pra isso (`matchIndex`) nunca era usado; agora aproveita o mesmo sistema de fases já usado no risco de erro do adversário.

## Destaques da versão 2.3.14

- O tempo total de partida da Copa da Matemática agora escala por faixa etária, na mesma proporção do tempo por enigma: 2:40 (6-7 anos) → 2:15 → 1:55 → 1:40 → 1:30 (10+ anos, valor original). Antes era fixo em 1:30 para todos os níveis.

## Destaques da versão 2.3.13

- Corrigido texto incorreto na tela "Para quem vai?" da Copa da Matemática: dizia "OK" quando a tecla real de confirmação é "Enter" — não existe nenhum botão "OK" na interface.

## Destaques da versão 2.3.12

- Corrigida confusão visual na tela "Para quem vai?" da Copa da Matemática: o texto instrutivo (explicando as duas formas de escolher o jogador — tocar ou usar as setas) usava a mesma aparência de botão 3D das respostas clicáveis de verdade, levando crianças a tentar tocar nele. Agora tem visual claramente diferente (sem borda nem sombra de botão) e o texto ficou mais direto, com ícones indicando toque vs. teclado.

## Destaques da versão 2.3.11

- Revertida por completo a sincronização de tela com o próximo quadro do navegador na Copa da Matemática (experimento das versões 2.3.6 a 2.3.10): causava um "pulinho" constante no campo e nos jogadores durante a partida. O desenho de tela volta a ser imediato/síncrono, exatamente como era antes de qualquer ajuste desta rodada de correções. O bug ocasional de mistura de conteúdo entre telas (visto no painel interativo grande) pode voltar a acontecer — é uma troca consciente, já que o pulinho constante durante o jogo é pior do que uma mistura rara numa transição de tela.

## Destaques da versão 2.3.10

- Corrigido "pulinho" visual na Copa da Matemática durante a partida: removido um passo de limpar-e-recalcular o layout antes de cada redesenho que, sem a transição de esmaecer (revertida na 2.3.9), ficava visível como um salto no campo e no placar a cada tick do cronômetro. A sincronização com o próximo quadro (2.3.6) continua ativa e é o que resolve o problema original de mistura de telas.

## Destaques da versão 2.3.9

- Revertida a transição de esmaecer entre telas da Copa da Matemática (introduzida na 2.3.7): causava piscar constante durante a partida, já que o campo e os placares são redesenhados a cada segundo pelo cronômetro. Mantida apenas a sincronização com o próximo quadro do navegador (2.3.6), que resolveu o problema real de mistura de conteúdo entre telas sem esse efeito colateral.

## Destaques da versão 2.3.8

- Corrigido bug em que o cronômetro do enigma da Copa da Matemática podia travar após uma resposta correta: a proteção contra clique duplo (adicionada na 2.3.4) usava a mesma bandeira que pausa o cronômetro durante o feedback de erro, e às vezes matava o cronômetro do enigma seguinte antes mesmo dele começar a contar. Agora usam bandeiras separadas.

## Destaques da versão 2.3.7

- Terceira tentativa para o artefato visual no painel interativo grande: as trocas de tela da Copa da Matemática agora esmaecem antes de trocar o conteúdo e surgem depois, em vez de trocar tudo de uma vez — testando se uma mudança mais gradual reduz o ruído visual observado no processador de imagem do painel. Segue com escopo limitado à Copa da Matemática.

## Destaques da versão 2.3.6

- Nova tentativa de correção para a mistura visual entre telas da Copa da Matemática no painel interativo grande: o desenho de cada tela agora é sincronizado com o próximo quadro do navegador (em vez de imediato), reduzindo o risco de tearing/mistura entre a tela antiga e a nova. Escopo limitado à Copa da Matemática; as demais missões não foram alteradas.

## Destaques da versão 2.3.5

- Correção para conteúdo residual de uma tela anterior ficando visível junto com a tela nova em navegadores mais lentos (observado no painel interativo grande): a troca de tela agora força a limpeza e o recálculo de layout antes de desenhar a nova tela, evitando "fantasmas" da tela anterior.

## Destaques da versão 2.3.4

- Tempo para resolver cada enigma da Copa da Matemática agora varia por faixa etária (35s para 6-7 anos até 20s para 10+ anos), em vez de 20s fixos para todos os níveis.
- Corrigido bug de clique duplo na Copa da Matemática: respostas corretas agora têm uma breve janela de proteção contra toques repetidos, evitando que um segundo toque acidental seja registrado como resposta do enigma seguinte.

## Destaques da versão 2.3.3

- Corrigido bug de recorte de texto no título superior em telas largas (ex.: painéis interativos grandes): o CSS declarava `text-overflow: ellipsis` sem o `overflow: hidden` necessário para funcionar, então o título era cortado bruscamente em vez de truncar com reticências.
- Aviso de "segure para voltar" com visual mais discreto, evitando parecer um alerta de erro cobrindo a tela em painéis grandes.
- Remoção de CSS morto: um sistema antigo de seleção de atividades (`legacy-menu`/`legacy-card`) e duas classes órfãs da Copa da Matemática, sem nenhuma referência no código.

## Destaques da versão 2.3.2

- Corrida contra o Aedes ampliada: de 20 para 36 cenários únicos, organizados em três fases (casa, escola e bairro), sem repetição numa mesma partida.
- Nova barra de corrida visual na Corrida contra o Aedes: cada erro faz o mosquito avançar rumo à casa, cada acerto mantém distância — sem cronômetro nem fim de jogo punitivo.
- Sequência de acertos na Corrida contra o Aedes, com reforço visual leve e sem cronômetro ou penalidade de tempo.
- Publicação da página (gh-pages) sincronizada com a versão mais recente do código-fonte.
- Padronização de quebras de linha entre editores (.gitattributes) para evitar divergências de formatação no repositório.

## Missões

- Copa da Matemática: futebol, estratégia, cálculo mental e probabilidade.
- Corrida contra o Aedes: prevenção da dengue, observação do ambiente e tomada de decisão.
- Robô Coletor: sequência de comandos e planejamento de caminho.
- Matemática Colorida: cálculo mental com dificuldade progressiva.
- Copa das Bandeiras: reconhecimento de países e bandeiras.
- Setas e Comandos: direção, sequência e leitura de instruções.
- Padrões e Regras: repetição, lógica visual e descoberta de regras.
- Meu Caminho Seguro: decisões simples de segurança no trânsito.
- Habitats dos Animais: relação entre seres vivos e ambientes.
- Ciclos da Natureza: ordenação de etapas de fenômenos naturais.
- Dados e Gráficos: contagem, comparação e leitura de informações.

## Como usar em sala

1. Abra a página pública ou o arquivo HTML local.
2. Escolha uma missão no menu principal.
3. Oriente a turma a observar antes de responder.
4. Use as faixas de idade como referência flexível, ajustando conforme a turma.

## Controles

- Toque, mouse ou painel interativo: selecionar cartões, respostas e botões na tela.
- Setas na tela ou no teclado: mover, navegar e escolher.
- Enter ou botão de continuar: confirmar quando a missão estiver aguardando.
- Voltar: segure o botão de voltar ou segure Esc para evitar saídas acidentais.
- R: reiniciar a missão atual.
- F: alternar tela cheia.

## Uso educacional

O material é gratuito para uso educacional. A área "Sobre" reúne informações para adultos, apoio voluntário e canais para comentários, sugestões e relatos de problemas.

Criado por Prof. Amilcar Notari Neto.
