# AGENTS.md - Fast News

Curadoria de notícias com IA: front React (Vite) + backend Express/TypeScript + agente de ingestão, jornal "O Fio" (VitePress) e app Capacitor.

## Stack
- Front: React 19, Vite 8, Tailwind 4, Vitest + Testing Library, Playwright (`e2e/`)
- Backend (`backend/`, lockfile próprio): Express, PostgreSQL/pgvector, Redis/Bull, Vercel AI SDK
- Monorepo pnpm: `packages/mcp`, `packages/shared`; site em `site/` (VitePress)
- Lint/format: Biome. Node 22 no CI/Docker, pnpm 10.33.2

## Comandos reais
```bash
pnpm install && pnpm --dir backend install --ignore-workspace
pnpm dev:api              # backend (porta 3001)
pnpm dev                  # front (proxy /api -> 3001)
pnpm news-agent           # agente, uma execução
pnpm exec biome check .   # lint (gate do CI)
pnpm exec vitest run      # testes (raiz inclui backend/src)
pnpm --dir backend exec tsc --noEmit   # tipos do backend (gate do CI)
pnpm build                # build do front
pnpm test:e2e             # Playwright
```

## Gates de CI (`.github/workflows`)
- `validate.yml`: sem arquivos de segredo rastreados, biome, vitest run, tsc do backend
- `security.yml`: Gitleaks; `deploy.yml`: build da imagem Docker (publica só em push)
- `mobile.yml` (APK/iOS) e `pages.yml` (VitePress -> gh-pages) rodam por paths

## Não fazer
- Não commitar `.env`, tokens ou chaves; só nomes de variáveis em docs (`backend/src/config/env.ts` é a fonte)
- Não editar lockfiles à mão; não usar `npm` (há `package-lock.json` legado, o CI usa pnpm)
- Não alterar `site/edicoes/*`: artigos publicados são imutáveis e commitados pelo backend
- `pnpm lint` roda `--write`; use `biome check .` para só verificar

<!-- base-actions-main-policy -->
## GitHub Actions — padrão obrigatório (@main)

- Referencie as actions internas sempre pelo branch, nunca por SHA:
  - `uses: juninmd/base-actions/<action>@main`
  - `uses: juninmd/base-actions/.github/workflows/<arquivo>.yml@main`
- Não fixe `@<sha>` em `juninmd/base-actions`: a atualização é centralizada no
  `main` e passa a valer no próximo run.
- PRs cujos checks não iniciam por billing/spending limit são mesclados pelo bot central
  `juninmd/base-actions/.github/workflows/auto-merge-billing-blocked.yml`.
  Para impedir o merge automático de um PR, aplique a label `do-not-merge`.