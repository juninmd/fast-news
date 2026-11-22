# AGENTS.md

Fast News: AI-curated news. React (Vite) front, Express/TypeScript backend with an ingestion agent, the "O Fio" newspaper (VitePress in `site/`), and a Capacitor mobile app.

## Stack

- Front: React 19, Vite 8, Tailwind 4, Vitest + Testing Library, Playwright (`e2e/`).
- Backend (`backend/`, its own lockfile): Express, PostgreSQL/pgvector, Redis/Bull, Vercel AI SDK.
- pnpm monorepo: `packages/mcp`, `packages/shared`. Site: `site/` (VitePress). Lint/format: Biome.
- Versions differ by place: CI (`validate.yml`) uses Node 22 and pnpm 10.33.2; Docker uses `node:26`; `.nvmrc` says v20; `package.json` `packageManager` says pnpm 10.34.5. Do not assume one; check the file you touch.

## Commands

```bash
pnpm install && pnpm --dir backend install --ignore-workspace
pnpm dev:api                              # backend, port 3001
pnpm dev                                  # front (proxies /api to 3001)
pnpm news-agent                           # ingestion agent, one run
pnpm exec biome check .                   # lint (CI gate)
pnpm exec vitest run                      # tests (root includes backend/src)
pnpm --dir backend exec tsc --noEmit      # backend types (CI gate)
pnpm build                                # front build
pnpm test:e2e                             # Playwright
```

## Structure

- `src/`: front. `backend/src/`: API, agent, and queues. `backend/src/config/env.ts`: env var source of truth.
- `scripts/`: news agent (`news-agent.js`). `packages/`: `mcp`, `shared`.
- `site/`: VitePress newspaper. `site/edicoes/*`: published editions.
- `desktop/`, `android/`, `ios/`, `capacitor.config.json`: native shells.
- `docs/`: technical notes. `e2e/`: Playwright specs.

## Conventions

- CI gates (`.github/workflows`): `validate.yml` (no tracked secret files, `biome check`, `vitest run`, backend `tsc`), `security.yml` (Gitleaks), `deploy.yml` (Docker image, publishes on push only), `mobile.yml` (APK/iOS) and `pages.yml` (VitePress to gh-pages), the last two by path.
- Lint with `biome check .` (verify only). `pnpm lint` runs `biome check --write` and changes files.

## Gotchas

- Never commit `.env`, tokens, or keys. Docs may name env vars, never values.
- Do not edit lockfiles by hand. Do not use `npm`; CI uses pnpm.
- Do not edit `site/edicoes/*`. Published articles are immutable and committed by the backend.
- Packages come from GitHub Packages (`@juninmd/*`), so CI writes an `_authToken` into `~/.npmrc` before installing.

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
