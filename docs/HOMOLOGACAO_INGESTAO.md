# Homologação da ingestão

Como validar, contra os provedores reais, as mudanças de qualidade da ingestão
(limpeza de texto, extração de imagem e construção do embedding).

## Rodando

```bash
cd backend
pnpm install

pnpm homolog:ingestion                                  # todos os feeds, 10 itens cada
pnpm homolog:ingestion --company="Folha,G1,TecMundo"    # subconjunto
pnpm homolog:ingestion --limit=20 --items=5             # amostra rápida
pnpm homolog:ingestion --fulltext --sample=2 --verbose  # inclui busca do corpo da matéria
pnpm homolog:ingestion --json=/tmp/homolog.json         # saída para diff entre execuções
```

O script é **somente leitura**: não escreve no banco, não gera embeddings e não
posta nada. Não precisa de `DATABASE_URL`, Redis nem Ollama — só de rede até os
portais. Sem `--fulltext` ele nem toca nas páginas das matérias, apenas nos RSS.

## Lendo o relatório

Cada linha compara o pipeline **antes** e **depois** da mudança, no mesmo item de
feed:

| coluna | o que significa | como interpretar |
| --- | --- | --- |
| `img-antes` / `img-depois` | % de itens com imagem | `depois` deve ser ≥ `antes` em todo provedor |
| `novas` | imagem que o extrator antigo não achava | ganho direto (`media:thumbnail`, `content:encoded`, enclosure sem extensão) |
| `trocadas` | mesma notícia, URL diferente | conferir na lista impressa: a nova deve ser a de maior resolução |
| `perdidas` | antes tinha imagem, agora não | **investigar**: só é aceitável se a URL antiga era logo, avatar, spacer ou pixel de rastreio |
| `html` | itens cujo conteúdo antigo ia para o banco com HTML cru | quanto maior, mais sujeira o pipeline antigo gravava |
| `trailer` | itens cujo corpo traz rabo de feed (`O post ... apareceu primeiro em ...`) | esses são limpos agora |
| `lixo-` | chars de boilerplate removidos do mesmo corpo | remoção pura de ruído |
| `conteudo` | variação do tamanho do corpo armazenado | pode subir (passou a ler `content:encoded`) ou cair (removeu boilerplate) — as duas direções são esperadas |

Com `--fulltext`, o rodapé mostra quantos corpos de matéria passaram no portão de
qualidade. Os reprovados são impressos com o motivo aparente (cobertura de título
baixa, poucos parágrafos de prosa) — nesses casos a ingestão **mantém o resumo do
RSS** em vez de gravar conteúdo de outra página, que é exatamente o comportamento
que se quer validar.

Com `--verbose`, imprime também o texto exato que alimentaria o embedding.

## O que olhar com atenção

1. **`perdidas` > 0** em algum provedor — abrir as URLs listadas. Se for foto de
   matéria legítima, o filtro em `backend/src/services/articleImage.ts`
   (`REJECT_URL_PATTERNS`, dimensões mínimas) precisa de ajuste.
2. **"Itens sem conteúdo após a limpeza"** — indica que os filtros de ruído
   comeram o resumo inteiro daquele feed.
3. **Reprovações do portão de qualidade concentradas em um portal** — normalmente
   é paywall; o esperado é cair para o resumo do RSS, não gravar a página.

## Cobertura automatizada

`backend/src/services/ingestionPipeline.test.ts` roda o mesmo caminho
(parse → limpeza → imagem → corpo da matéria) contra payloads no formato dos
provedores, servidos por um HTTP local — sem depender dos portais. Roda com
`pnpm test` na raiz.
