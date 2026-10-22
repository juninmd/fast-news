# Project Health

This document records the repository improvement pass applied on 2026-05-17.

## Detected Surface

- Node.js / TypeScript / JavaScript
- Docker
- Docker Compose
- GitHub Actions

## Automation Added Or Confirmed

- Security policy: Already present before this pass.
- Dependabot: Already present before this pass.
- EditorConfig: Already present before this pass.
- Project Health workflow: Existing workflows were present; added a dedicated Project Health workflow.
- Pull request quality checklist: Added in this pass.

## Available Root Commands

- package script: build
- package script: coverage
- package script: dev
- package script: dev:api
- package script: dev:mcp
- package script: lint
- package script: news-agent
- package script: preview
- package script: start-agent
- package script: test

## Improvement Plan

1. Keep dependency drift visible through weekly Dependabot pull requests.
2. Keep runtime secrets out of git through the Project Health guardrail.
3. Use .editorconfig to reduce formatting churn across agents and local editors.
4. Treat this file as the lightweight audit entry for future improvements.

## Update 2026-10-22

- Root `tsconfig.json` and `pnpm typecheck` (frontend + backend) added; CI typechecks the frontend.
- Coverage thresholds enforced in CI; `lint:ci` (`biome ci`) replaces the mutating `lint` in CI; pnpm store cached.
- `coverage/` untracked; AGENTS.md rewritten to match the real stack.
- Backend already exposes a health endpoint (`backend/src/api/health.ts`).

## Suggested Next Improvements

- Add project-specific tests to the Project Health workflow once the default branch is stable.
- Add CodeQL or language-native security scanning where the repository has a supported build path.
- Convert manual setup notes into reproducible scripts when setup steps are repeated.
- Add structured logging to the backend.
- Remove dead frontend code (legacy `NeoPulse`, `Toast*`, old services) and migrate remaining JS to TS.
- Include `backend` in the pnpm workspace and drop duplicate lockfiles.