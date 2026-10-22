# AGENTS.md - Fast News

## Tech Stack
- **Language**: TypeScript (frontend com alguns módulos legados em JS)
- **Frontend**: React 19 + Vite 8 + Tailwind CSS 4
- **Mobile**: Capacitor (Android/iOS) em `src/mobile`
- **Desktop**: Tauri + React em `desktop/` (bun, fora do workspace pnpm)
- **Backend**: `backend/` (Node + tsx, PostgreSQL/Qdrant/Redis, Telegram), pacote independente (`--ignore-workspace`)
- **AI**: Vercel AI SDK (`ai`) com provedores Google, Anthropic e OpenAI
- **Testing**: Vitest + Testing Library (+ Playwright em `e2e/`)
- **Linting**: Biome
- **Docs**: VitePress em `site/`
- **Deploy**: GitHub Pages / Netlify

## Project Structure
```
src/                  # App web e mobile
  components/         # Componentes React (NeoEditorial é a UI ativa)
  hooks/              # Hooks
  mobile/             # App mobile-first (Capacitor)
  services/           # Serviços legados de API
backend/              # API, ingestão, jobs, agente de notícias
packages/
  mcp/                # Servidor MCP
  shared/             # Tipos e fontes compartilhados
scripts/              # Wrapper do agente (news-agent.js)
desktop/              # App Tauri
site/                 # Documentação VitePress
docs/                 # Documentação interna
```

## Key Commands
```bash
pnpm dev             # Vite dev server
pnpm dev:api         # Backend em modo watch
pnpm build           # Build de produção
pnpm test            # Vitest
pnpm coverage        # Cobertura (com thresholds)
pnpm lint            # Biome (aplica correções)
pnpm lint:ci         # Biome sem alterar arquivos
pnpm typecheck       # tsc no frontend e no backend
pnpm news-agent      # Roda o agente uma vez
pnpm start-agent     # Agente em loop
```

## Conventions
- pnpm é o único gerenciador (não commitar `package-lock.json`)
- Biome para lint/format, Tailwind para estilo, módulos ESM
- Rode `pnpm lint:ci`, `pnpm typecheck` e `pnpm test` antes de commitar

## Environment Variables
- `GEMINI_API_KEY` e demais chaves de IA - veja `backend/.env.example`
- `VITE_API_URL` - URL da API usada pelo frontend
