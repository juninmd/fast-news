# Fast News Desktop

Leitor desktop do [Fast News](../README.md), consumindo a API já publicada no cluster.
Escrito em Tauri 2 + React 19, no mesmo espírito do [canto-widget](../../canto-widget): UI em React/Vite/Tailwind,
rede e configuração em Rust, pacote gerenciado por **bun**.

## O que faz

| Seção | O que mostra |
|---|---|
| **Feed** | Lista paginada de `/api/news`, com filtro por categoria e contagem por categoria |
| **Em alta** | `/api/news/top`: uma matéria por cluster, ordenada por cobertura entre portais |
| **Busca** | Semântica (`/api/rag/search`) ou textual (`/api/news/search`) |
| **O Fio** | Edições publicadas (`/api/editions`) com link para o jornal no GitHub Pages |
| **Histórias** | Stories ativas (`/api/stories`) com impacto, ativos afetados, linha do tempo e matérias |
| **Tópicos** | Tópicos monitorados (`/api/topics`) com análise por IA gerada sob demanda |
| **Finanças** | Oportunidades (`/api/financial`) e resumo por direção (`/api/financial/summary`) |
| **Ajustes** | URL da API, tema, idioma, sempre visível e estado do pipeline (`/health`) |

Clicar em qualquer matéria abre o **leitor em tela cheia** (`/api/news/:id` + relacionadas) ou o original no navegador.

## Requisitos

- [bun](https://bun.sh) 1.3+
- Rust 1.85+ (edition 2021) e as dependências de sistema do [Tauri 2](https://v2.tauri.app/start/prerequisites/)

## Comandos

```bash
bun install
bun run lint                     # tsc --noEmit
bun test                         # testes de lógica pura
bun run build                     # tsc + vite build -> dist/ (precisa existir antes do cargo)
bun run tauri dev                 # app com hot reload
bun run tauri build              # instalador do SO atual

cd src-tauri
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test                        # testes de unidade
cargo test -- --ignored --nocapture   # testes contra a API real (precisa de rede)
```

`cargo` lê `dist/` em tempo de compilação (`generate_context!`), então rode `bun run build` uma vez antes de
`cargo test` em um clone novo.

## Configuração

A URL da API fica em `config.json`, no diretório de dados do app, e é editável em **Ajustes**.
O padrão é `https://fast-news.antonio-code.duckdns.org`. Apenas origens `http(s)` sem caminho são aceitas;
o valor é validado no Rust (`config::normalize_base`) antes de ser salvo.

## Arquitetura

```text
src/                      UI React
  App.tsx                 barra lateral, cabeçalho da seção, leitor e estado de atualização
  lib/api.ts              o único lugar que chama invoke(); os tipos vivem em lib/types.ts
  lib/                    lógica pura (format, theme, tabs, sections, hooks, toast) + testes
  sections/               um arquivo por seção (FeedTab, SearchTab, StoryView, ...)
  components/             peças reutilizáveis (Sidebar, NewsCard, ArticleReader, ...)
  i18n/                   pt-BR (fonte das chaves) + en, com teste de paridade
src-tauri/src/
  lib.rs                  plugins, tray, setup e a lista de comandos
  api.rs                  cliente HTTP único: monta path/query, lê erro da API, aceita lista ou {"data": [...]}
  config.rs               ConfigState: config.json + validação da URL base
  model.rs                tipos do wire (serde), tolerantes a número ou string
  cmd_*.rs                comandos por domínio (news, rag, editions, stories, topics, financial, settings)
  blocking.rs, net.rs     reqwest::blocking fora das threads async + rustls com ring
```

- **Toda a rede passa pelo Rust.** A CSP do webview não permite origem remota em `connect-src`; a única exceção é
  `img-src ... https:` para as miniaturas das matérias.
- **Contratos:** nome do comando em Rust == nome no `invoke`; argumentos chegam em camelCase do lado TS
  (`api_base_url` ↔ `apiBaseUrl`).
- **Erros** são strings pt-BR vindas do Rust e aparecem como toast.

### Endpoints consumidos

```text
GET /health
GET /api/news?page&limit&category            GET /api/news/top
GET /api/news/categories                     GET /api/news/search?q
GET /api/news/:id                            GET /api/news/:id/related
GET /api/rag/search?q&limit
GET /api/editions
GET /api/stories?limit&category              GET /api/stories/:id
GET /api/topics                              GET /api/topics/:id/analysis?refresh
GET /api/topics/:id/history?limit
GET /api/financial                           GET /api/financial/summary
```

### Notas sobre a API

- `/api/topics` responde um array puro quando o cache acerta e `{"data": [...]}` quando perde; o cliente aceita os
  dois formatos (`api::get_list`).
- `COUNT(*)` volta como string em `/api/news/categories` e no resumo financeiro; os tipos do wire coagem número/string.
- Quando o modelo de embedding do cluster está em cooldown, o backend responde por palavra-chave e marca
  `mode: "keyword"`; o app mostra "Resultados por palavra-chave" e esconde a similaridade (que não existe nesse modo).

## Licença

MIT.
