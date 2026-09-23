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
# @juninmd/digest-kit vem do GitHub Packages, que exige token mesmo para pacote
# público: PAT classic com read:packages no seu ~/.npmrc (também usado pelo compose)
npm config set //npm.pkg.github.com/:_authToken <PAT>
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

## 🗞 O Fio: edições diárias no Telegram

Duas edições de jornal por dia, montadas por LLM a partir das notícias captadas e enviadas ao `TELEGRAM_CHAT_IDS` como mensagem-resumo mais o jornal completo em `.html`.

| Edição | Horário (CronJob) | Cobre |
|---|---|---|
| Manhã | 07h05 | 19h do dia anterior até 07h |
| Noite | 19h05 | 07h até 19h |

```bash
cd backend && pnpm build
node dist/runners/runEdition.js manha   # ou: noite
```

A tabela `news_editions` impede envio duplicado em retentativas. Variáveis opcionais: `EDITION_MAX_HEADLINES` (350), `EDITION_PER_SOURCE` (12), `EDITION_EXCLUDED_CATEGORIES` (`Gaming,Games,Anime`), `EDITION_AI_TIMEOUT_MS` (300000). Os CronJobs ficam em `app-charts/fast-news/cronjobs.yaml`.

## 📜 Licença

MIT
