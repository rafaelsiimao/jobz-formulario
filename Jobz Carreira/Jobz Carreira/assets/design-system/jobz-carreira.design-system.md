# Jobz Carreira - Design System

> Documento técnico da identidade visual da Jobz Carreira. A estrutura de documentação toma como referência o modelo do Airbnb, enquanto os tokens, logos, linguagem e elementos visuais pertencem exclusivamente à Jobz Carreira.

## Visão geral

**Categoria:** recrutamento, seleção, emprego e estágio  
**Papel:** aproximar talentos e empresas com clareza, organização e confiança em cada etapa.  
**Personalidade:** clara, próxima, digital e profissional.

### Princípios

1. **Clareza antes de tudo.** Vagas, dados e próximas etapas devem ser compreendidos sem esforço.
2. **Azul que orienta.** O azul Jobz destaca ações, status e pontos importantes da jornada.
3. **Informação em movimento.** Caminhos, cards e marcadores traduzem a progressão de uma candidatura.
4. **Proximidade profissional.** A comunicação acolhe pessoas sem perder objetividade e confiança.

## Cores

| Token | Valor | Uso |
| --- | --- | --- |
| `blueJobz` | `#1E81FE` | Ações, links, status ativos e sinal proprietário |
| `blueLight` | `#66A9FF` | Destaques secundários e metadados |
| `blackInstitutional` | `#111317` | Texto principal e contraste institucional |
| `textSecondary` | `#5F6673` | Textos corridos e informações complementares |
| `textTertiary` | `#8A94A3` | Legendas, estados sutis e metadados |
| `backgroundPrimary` | `#F2F5F8` | Fundo predominante |
| `surface` | `#FAFAFC` | Superfícies claras e branco frio |
| `card` | `#FFFFFF` | Cards e documentos |
| `line` | `#D7DEE7` | Bordas, grids e divisões |
| `dark` | `#080B10` | Fundos de alto contraste |
| `darkSurface` | `#121823` | Superfícies escuras |

### Distribuição

- `50%` base clara
- `30%` preto institucional
- `20%` azul Jobz

## Tipografia

### Família principal: Plus Jakarta Sans

Use em títulos, textos, site, relatórios e campanhas. O display usa peso `300`; dê ênfase com peso `800`, sem condensar nem alterar a proporção das letras.

| Estilo | Peso | Tamanho | Entrelinha | Uso |
| --- | ---: | --- | ---: | --- |
| Display | 300 / 800 | `clamp(34px, 5vw, 64px)` | 1.04 | Capas, grandes manchetes e chamadas |
| Título | 300 / 800 | `clamp(31px, 4.35vw, 58px)` | 1.05 | Títulos de seção |
| Texto | 400 | `17px` | 1.72 | Vagas, materiais e site |

### Família mono: JetBrains Mono

Use em dados, tags, etapas, status e metadados.

| Estilo | Peso | Tamanho | Entrelinha | Uso |
| --- | ---: | --- | ---: | --- |
| Rótulo | 400 | `10.5px` | 1.7 | Status, tags, etapas, dados e legendas |

## Espaçamento e layout

### Escala

| Token | Valor |
| --- | --- |
| `xxs` | `2px` |
| `xs` | `4px` |
| `sm` | `8px` |
| `md` | `12px` |
| `base` | `16px` |
| `lg` | `24px` |
| `xl` | `32px` |
| `xxl` | `48px` |
| `section` | `64px` |

- Unidade-base: `4px`.
- Padding de seção: `118px clamp(40px, 6vw, 96px)`.
- Padding de seção no mobile: `72px 26px`.
- Barra lateral: `268px`, com padding de `38px 30px`.
- Conteúdo: largura máxima de `1040px`.
- Breakpoints: `980px` e `640px`.

### Raios e efeitos

- Card: `8px`
- Documento e card de vaga: `12px`
- Tags e ações: `999px`
- Grade: linhas de `1px` em `rgba(17,19,23,.035)`, módulo de `40px` ou `64px`.
- Ruído: fractal noise sutil em `5%` de opacidade.
- Brilho do azul: `drop-shadow(0 0 70px rgba(30,129,254,.45))`.

## Logotipos

| Arquivo | Contexto |
| --- | --- |
| `assets/jobz-carreira-logo-preto.svg` | Fundos claros e materiais institucionais |
| `assets/jobz-carreira-logo.svg` | Fundos escuros |
| `assets/jobz-carreira-logo-branco.svg` | Fundo azul ou escuro |
| `assets/jobz-carreira-logo-mono-preto.svg` | Aplicações monocromáticas |
| `assets/jobz-carreira-favicon.svg` | Perfis, favicons e formatos reduzidos |

- Área de proteção: no mínimo, a altura da letra **J** em todos os lados.
- Tamanho digital recomendado: `120px`.
- Tamanho mínimo absoluto: `72px`.
- Abaixo de `72px`, use o favicon ou o monograma J.

## Sistema gráfico

### Sinal em escala

O detalhe azul do J se amplia como um quadrante circular ancorado no canto inferior direito. Ele indica direção, seleção e o próximo passo na jornada de candidatura.

- Cor: `#1E81FE`.
- Posição preferencial: canto inferior direito.
- Sangria: `20%`.
- Complementos: marcas de corte finas, grade discreta, linhas e pontos de jornada, cards de vaga e tags de status.
- Use o sinal como destaque, sem competir com a informação principal.

### Jornada de candidatura

Represente a evolução com linhas, pontos e rótulos: **vaga publicada**, **candidato inscrito**, **entrevista agendada**. O azul deve marcar o ponto ativo ou a próxima ação.

## Componentes

| Componente | Especificação | Uso |
| --- | --- | --- |
| Ação primária | Fundo `#1E81FE`, texto branco, `48px` de altura, raio pill | Candidatar-se, ver vagas e ações principais |
| Ação secundária | Transparente, borda `#D7DEE7`, `48px` de altura, raio pill | Ações complementares |
| Card de vaga | Fundo `#F2F5F8`, borda `#D7DEE7`, raio `12px`, padding `22px` | Posts, site e materiais de divulgação |
| Tag de status | Fundo claro, borda `#D7DEE7`, raio pill, padding `6px 8px` | Formato, localidade e status |
| Etapa de jornada | Marcador `#1E81FE`, gap `10px`, JetBrains Mono | Publicação, candidatura, triagem e entrevista |
| Navegação lateral | `268px`, indicador azul, item ativo em preto | Brandbooks e documentos extensos |

## Regras de uso

### Faça

- Use o azul Jobz para indicar ação, seleção e progresso.
- Priorize fundos claros para leitura de informações longas.
- Mantenha títulos leves com ênfases pontuais em peso forte.
- Use o sinal em escala em cantos ou como detalhe de direcionamento.

### Não faça

- Não incline, distorça ou redesenhe o logotipo.
- Não troque o azul principal por outra cor de destaque.
- Não use o logotipo sobre fundos ruidosos sem contraste suficiente.
- Não altere espaçamento, proporções ou área de proteção da assinatura.
