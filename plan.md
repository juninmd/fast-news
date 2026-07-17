1. **Adicionar novos Portais (Expansão Contínua)**
   - Adicionar "Gizmodo Brasil" e "CNN Brasil" em `src/services/newsService.js` e `backend/src/services/sources.ts`.
2. **Otimização de Embeddings (Resumo enxuto antes de vetorizar)**
   - No `backend/src/services/ingestion.ts`, antes de chamar `embedDocument`, criar uma função `summarizeForEmbedding` que usa `generateText` com o `getFastModel` para extrair entidades e contexto principal da notícia, evitando HTML e ruídos, e retornar um resumo conciso.
   - Atualizar a função `upsertArticle` para passar o resumo gerado para `embedDocument`, em vez do conteúdo bruto concatenado com o título.
3. **Verificação de Caching (Otimização do Site/Backend)**
   - Verificar se as buscas semânticas estão usando o cache. O RAG context no Telegram (`fetchRelatedArticles` em `backend/src/services/telegram_logic.ts`) já usa `ragCache.get("related:id")`, então isso está de acordo com as regras de performance do prompt.
4. **Validar Perfil do Usuário e RAG**
   - O RAG de envio e botões de `like`/`dislike` estão implementados em `backend/src/services/telegram.ts`, que chama `updateUserPreference`.
