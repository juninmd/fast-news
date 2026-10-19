# Fast News

![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

> Plataforma de curadoria de notícias com inteligência artificial.

## 📝 Descrição

**Fast News** é uma plataforma moderna que agrega e resume notícias utilizando IA. Com agentes autônomos de curadoria, o sistema coleta conteúdo de diversas fontes RSS, processa com modelos de linguagem (Gemini) e publica resumos inteligentes em uma interface web elegante.

## ✨ Funcionalidades

- Curadoria automatizada de notícias via agentes de IA
- Agregação de múltiplas fontes RSS
- Resumo inteligente com Google Gemini
- Interface web responsiva com React + Tailwind
- Publicação automática em Netlify
- Suporte a monorepo com workspaces

## 🛠️ Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS
- **Linguagem:** TypeScript
- **IA:** Google Generative AI (Gemini)
- **Testes:** Vitest + Testing Library
- **Linting:** Biome
- **Deploy:** Netlify
- **Package Manager:** pnpm (monorepo)

## 🚀 Instalação

```bash
# Clonar
git clone https://github.com/juninmd/fast-news.git
cd fast-news

# Instalar dependências
pnpm install

# Desenvolvimento
pnpm dev

# Build
pnpm build

# Testes
pnpm test
```

## 🤖 Agente de Notícias

```bash
# Executar agente uma vez
pnpm news-agent

# Executar agente em loop
pnpm start-agent
```

## 🗞 O Fio: jornal digital

O backend gera quatro janelas editoriais (manhã, meio-dia, tarde e noite). O padrão compatível continua enviando resumo e HTML ao `TELEGRAM_CHAT_IDS`. O modo Pages gera um snapshot imutável, publica o jornal estático no GitHub Pages, verifica a edição e só então envia o resumo com o botão **Ler o jornal completo**. A página não consulta banco, API privada nem exige download.

| Edição | Disparo do CronJob / fechamento do backend | Cobre |
|---|---|---|
| Manhã | 06h05 / 06h | 20h do dia anterior até 06h |
| Meio-dia | 11h05 / 11h | 06h até 11h |
| Tarde | 15h05 / 15h | 11h até 15h |
| Noite | 20h05 / 20h | 15h até 20h |

Os quatro horários e `America/Sao_Paulo` conferem com `app-charts/fast-news/cronjobs.yaml` no repositório local de infraestrutura. Isso valida o manifesto versionado, não o estado real do cluster.

```bash
cd backend && pnpm build
node dist/runners/runEdition.js manha   # ou: noite
```

A tabela `news_editions` impede envio duplicado em retentativas. `edition_snapshots` guarda o conteúdo editorial versionado, IDs persistentes das fontes e checksum; snapshots existentes não são substituídos silenciosamente.

Para gerar uma prévia estática sem contatar o Telegram:

```powershell
$env:EDITION_DELIVERY_MODE = 'pages_preview'
$env:EDITION_SITE_PREVIEW_DIR = 'D:\temp\o-fio-preview' # caminho absoluto dedicado
$env:EDITION_PAGES_BASE_URL = 'https://juninmd.github.io/fast-news'
node backend/dist/runners/runEdition.js noite
```

Para ativar a publicação e o botão no Telegram, configure `EDITION_DELIVERY_MODE=pages`, `EDITION_PAGES_BASE_URL`, `EDITION_PAGES_REPOSITORY=juninmd/fast-news` e `EDITION_PAGES_TOKEN` no backend (opcional: `EDITION_PAGES_BRANCH`, padrão `main`). O token precisa apenas de `Contents: write` neste repositório. Cada edição vira **um artigo markdown** (`site/edicoes/AAAA-MM-DD-<janela>.md`) commitado na branch `main`; o workflow `.github/workflows/pages.yml` compila o site [VitePress](https://vitepress.dev) (`site/`) e publica o resultado na branch `gh-pages`, servida pelo GitHub Pages (Settings → Pages → Deploy from a branch → `gh-pages` `/`), com arquivo, busca e navegação entre edições. O token deve ser um PAT (commits feitos com o `GITHUB_TOKEN` padrão não disparam workflows). Em modo `pages`, uma falha de commit ou verificação HTTP deixa o Telegram sem mensagem e mantém o snapshot para retentativa; não envia o arquivo como alternativa. Um artigo publicado é imutável. Para ver o site localmente: `pnpm docs:dev`. Para publicar no site as edições antigas já guardadas no banco (idempotente): `node dist/runners/runPagesBackfill.js` no backend, com as mesmas variáveis `EDITION_PAGES_*`.

`EDITION_DELIVERY_MODE=legacy_document` mantém o fluxo anterior. Variáveis opcionais: `EDITION_MAX_HEADLINES` (350), `EDITION_PER_SOURCE` (12), `EDITION_EXCLUDED_CATEGORIES` (`Gaming,Games,Anime`), `EDITION_AI_TIMEOUT_MS` (300000). Os CronJobs ficam em `app-charts/fast-news/cronjobs.yaml`, fora deste repositório.

Validação focada do backend: `pnpm --dir backend build` e `pnpm --dir backend test`. Os limites `EDITION_MAX_HEADLINES` e `EDITION_PER_SOURCE` controlam somente o material enviado à IA. As demais notícias elegíveis da janela entram nas editorias como matérias complementares com título, trecho e link original, sem novas chamadas de IA. A montagem preserva essas matérias além do limite editorial de três por seção e informa quantas notícias foram representadas ou descartadas pela sanitização. No Pages, as editorias são divididas em páginas de até 100 matérias, mantendo a capa na primeira página, navegação entre páginas e busca na página atual. O publicador verifica todas as páginas antes de liberar o link para o Telegram. Snapshots históricos permanecem inalterados. O agrupamento semântico, a priorização editorial auditada e a recuperação de toda notícia atrasada continuam pendentes.

## 🧬 Ingestão, mesma notícia em várias fontes e temas em alta

Nenhuma notícia é descartada por semelhança. A ingestão só pula duplicatas **exatas** (mesmo `guid`, mesma URL ou mesma URL canônica, sem `utm_*`/`fbclid`/fragmento). O que antes era cortado por similaridade de embedding agora é guardado e **agrupado numa história** (`news_stories`):

- **Agrupamento**: o vizinho mais próximo por embedding (cosseno ≥ `STORY_MATCH_THRESHOLD`, padrão 0,82, janela `STORY_WINDOW_HOURS`=72) define a história. Perto do limiar, a sobreposição de manchete desempata. Sem embedding (provedor fora do ar), o agrupamento cai para comparação lexical de manchetes. Artigos sem vetor ganham vetor e grupo na próxima rodada (`INGESTION_BACKFILL_BATCH`).
- **Imagens**: `media:content`/`media:thumbnail` (maior largura), `enclosure`, `<img>` do corpo e, por último, `og:image` da própria página (`INGESTION_OG_IMAGE_MAX` por rodada). Imagens ausentes são recuperadas depois; no front, uma história sem foto usa a de outra fonte.
- **Datas**: item sem data ou com data futura entra com a hora da coleta, em vez de sumir do feed. `MAX_ARTICLES_PER_FEED` subiu para 50.
- **API**: `GET /api/news?group=true` dobra a mesma história numa entrada (`source_count`, `also_in`) sem esconder nenhum membro; `GET /api/news/top` ranqueia histórias por nº de fontes com decaimento de 12 h; `GET /api/news/trends?hours=24` devolve termos em alta (surto entre duas janelas iguais, exigindo ≥ 2 fontes) e a participação por editoria.
- **UI**: bloco "Em alta agora" com foto e fontes por história, painel "Temas em alta" (clicar busca o termo), card com selo "N fontes" que expande os links de cada portal, e imagem em todo card, com placeholder quando a foto não carrega.

Capturas em [`docs/evidence/news-grouping/`](docs/evidence/news-grouping).

## 📜 Licença

MIT
