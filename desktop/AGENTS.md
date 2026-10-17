# AGENTS.md — Fast News Desktop

Guia para agentes trabalhando em `desktop/`: um leitor Tauri 2 do Fast News publicado no cluster.
Inspirado no `canto-widget` (mesma separação UI/React × rede/Rust, mesmo visual), mas sem cofre, sem cifra e
sem escrita no backend — só leitura da API.

## Stack e comandos

| Camada | Tecnologia |
|---|---|
| Shell | Tauri 2, Rust 2021 (MSRV 1.85), `src-tauri/` |
| UI | React 19 + TypeScript 5 + Vite 8 + Tailwind v4, `src/` |
| Pacote | **bun** (`bun.lock`); não use npm/yarn/pnpm aqui |
| Testes de UI | `bun test` (lógica pura, sem DOM) |
| Testes de Rust | `cargo test` (unidade) e `cargo test -- --ignored` (rede) |

```bash
bun install
bun run lint                 # tsc --noEmit
bun test
bun run build                 # gera dist/ — rode antes do cargo em clone novo
cd src-tauri
cargo fmt --check             # rustfmt.toml: max_width 120
cargo clippy --all-targets -- -D warnings
cargo test
```

## Layout

```text
src/
  lib/api.ts            único lugar que chama invoke(); tipos em lib/types.ts
  lib/                  lógica pura testável (format, tabs, theme, hooks, toast)
  sections/             uma aba por arquivo; StoryView/TopicView são os detalhes
  components/           Sidebar, AppHeader, NewsCard, ArticleReader, Badge, ...
  i18n/                 pt-BR.ts é a fonte das chaves; en.ts precisa cobrir todas
src-tauri/src/
  api.rs                get/get_list/pairs — toda chamada HTTP passa por aqui
  config.rs             ConfigState (config.json) + normalize_base
  model.rs              tipos do wire com serde
  cmd_<dominio>.rs      comandos finos por domínio
  live.rs               testes ignorados contra a API real
```

## Convenções

- **Código em inglês** (identificadores, arquivos, comentários, nomes de teste). **Texto do usuário em pt-BR.**
- Texto de UI vive no catálogo, nunca solto: `t("area.chave")` de `src/i18n`. Chave nova entra em **pt-BR.ts e en.ts**
  (o teste de paridade falha se faltar). Datas e números usam `locale()`, não literal.
- Comentários só para o *porquê*, uma linha. Sem banner de seção.
- Arquivos curtos (~200 linhas), uma responsabilidade por arquivo.
- Mudança de comportamento vem com teste que falha antes e passa depois.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).

## Contratos que não se quebram

- **Rede só no Rust.** A CSP do `tauri.conf.json` mantém `connect-src` restrito a `self`/ipc; a única exceção é
  `img-src ... https:` para as miniaturas. Não adicione origem remota em `connect-src` nem faça `fetch` no webview.
- **IPC**: nome do comando em Rust == nome em `invoke`; argumentos são camelCase no TS (`api_base_url` ↔ `apiBaseUrl`).
  Mude os dois lados juntos.
- **`api::get_list` aceita array puro e `{"data": [...]}`.** O backend responde as duas formas (ver `/api/topics`);
  não "simplifique" para uma só.
- **`mode` em busca/relacionadas** diz se o ranking foi semântico ou por palavra-chave (`keyword` quando o modelo de
  embedding está em cooldown). A UI usa isso para avisar e esconder a similaridade; não remova o campo.
- **Coerção número/string** nos tipos do wire: `COUNT(*)` chega como string. Use `flex_f64`/`flex_text` em vez de
  `f64`/`String` crus.
- **`img-src https:` é intencional.** Miniaturas vêm de hosts remotos por `<img>`; mantenha e documente se mudar.
- Erros do Rust são strings pt-BR e são exibidas como toast; não as envolva em outra mensagem.
- `identifier` é `com.junin.fastnews`. Não reutilize o mesmo app data dir de outro app.

## Armadilhas

- `cargo test` e `cargo check` precisam de `dist/`: rode `bun run build` primeiro.
- Testes marcados `#[ignore]` batem na API real (`live.rs`). A busca semântica pode cair para palavra-chave
  (`mode: "keyword"`) se o modelo de embedding do cluster estiver frio; o teste aceita os dois modos de propósito.
- O app é somente leitura: não há comando que escreva no backend. Endpoints de escrita (`POST /api/topics`,
  `/api/news/feeds/*`, `/api/ai/generate`) existem na API mas ficaram fora do escopo.
- `desktop/` está excluído do Biome e do vitest da raiz do monorepo (ver `biome.json` e `vite.config.js`): este
  pacote tem o próprio toolchain (bun + tsc + cargo).

## Definição de pronto

`bun run lint`, `bun test`, `bun run build`, `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings` e
`cargo test` verdes; comportamento novo com teste; README atualizado quando muda o que o usuário vê.
