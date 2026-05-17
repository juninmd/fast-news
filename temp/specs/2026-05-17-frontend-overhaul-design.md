# Frontend Overhaul Design And Implementation Plan

Status: Temporary implementation spec and plan
Created: 2026-05-17
Delete after: implementation completes

## Request

Analyze published frontend, fix bugs, improve performance, add AI-ranked top news section,
ensure all news in PostgreSQL, keep embeddings in SQLite, move all AI integrations to backend,
improve UI/UX, add OpenRouter/Ollama support via backend only.

## Context

### Critical findings

1. **Wrong app is live**: `main.jsx` imports `AppNeo.jsx` (OLD RSS/rss2json app) — not `AppNeo.tsx` (new backend-driven app).
2. **Exposed secrets in browser**:
   - `geminiService.js` calls `generativelanguage.googleapis.com` with user's API key from localStorage
   - `AppNeo.jsx` reads/stores `rss2json_api_key` in localStorage and passes to external RSS API
   - `telegramService.js` exists in frontend (completely unnecessary)
3. **AppNeo.tsx (new app)** uses `/api/news`, `/api/stories`, `/api/rag` — zero external API calls.
   It just needs: article modal, real search, top news, live trending topics.
4. **No `GET /api/news/top`** endpoint exists. `importance_score` is populated in DB.
5. **OpenRouter** not supported in `aiProvider.ts`.
6. **Hardcoded stale data** in `Sidebar.tsx`: trending topics are fake strings.
7. **Search** in `AppNeo.tsx` does `console.log` only — never calls backend.
8. **News list** ordered by `published_at DESC` only — ignores `importance_score`.
9. **Embeddings**: already in SQLite (`backend/src/database/sqliteStore.ts`). No change needed.
10. **PostgreSQL**: ingestion already saves to `news_articles`. No change needed.

## Chosen Design

Switch the live app from `AppNeo.jsx` to `AppNeo.tsx`. Extend `AppNeo.tsx` with:
- `TopNewsSection` component consuming new `GET /api/news/top`
- `ArticleModal` for reading articles in-app
- Real search wired to `GET /api/news/search?q=`
- Sidebar trending from `GET /api/topics`

Backend: add `GET /api/news/top`, add OpenRouter to `aiProvider.ts`.
Delete dead frontend files: `geminiService.js`, `telegramService.js` (frontend), `App.jsx`.

## Implementation Scope

- `main.jsx`: switch import to `AppNeo.tsx`
- `backend/src/api/routes/news.ts`: add `GET /top`
- `backend/src/services/aiProvider.ts`: add openrouter case
- `backend/src/config/env.ts`: add OPENROUTER_API_KEY, OPENROUTER_MODEL
- `src/AppNeo.tsx`: add TopNewsSection, ArticleModal, real search, deep-link `?id=`
- `src/components/NeoEditorial/TopNewsSection.tsx`: new component
- `src/components/NeoEditorial/ArticleModal.tsx`: new component
- `src/components/NeoEditorial/Sidebar.tsx`: live trending from /api/topics
- `src/hooks/useTopNews.ts`: new hook
- DELETE: `src/services/geminiService.js`, `src/services/telegramService.js`, `src/App.jsx`

## Out Of Scope

- Changing the ingestion pipeline or DB schema
- Changing embedding storage (stays SQLite)
- Rewriting AppNeo.jsx (just stop using it)
- Changing k8s/Helm charts beyond env vars

## File Structure

```
src/
  main.jsx                          MODIFY: import AppNeo.tsx
  AppNeo.tsx                        MODIFY: add TopNewsSection, ArticleModal, search, ?id= deeplink
  App.jsx                           DELETE
  services/geminiService.js         DELETE
  services/telegramService.js       DELETE
  components/NeoEditorial/
    TopNewsSection.tsx              CREATE: AI-ranked top 10 horizontal scroll
    ArticleModal.tsx                CREATE: article detail modal
    Sidebar.tsx                     MODIFY: live topics from /api/topics
  hooks/
    useTopNews.ts                   CREATE: calls GET /api/news/top
backend/src/
  api/routes/news.ts                MODIFY: add GET /top
  services/aiProvider.ts            MODIFY: add openrouter case
  config/env.ts                     MODIFY: add openrouterApiKey, openrouterModel
```

## Data/Control Flow

```
GET /api/news/top
  → query: SELECT ... FROM news_articles
    WHERE published_at > NOW() - INTERVAL '48 hours'
    ORDER BY importance_score DESC NULLS LAST, published_at DESC
    LIMIT 10
  → cache key: news:top (TTL 300s)
  → response: { data: Article[] }

GET /api/news/search?q=<query>
  → calls searchSimilarArticles(q) — vector search in SQLite
  → cache key: news:search:<q> (TTL 300s) — already added

ArticleModal
  → opened when user clicks NewsCard
  → fetches GET /api/news/:id (already implemented, cached 10min)
  → shows full content + related articles
  → also opened via ?id=<uuid> deep link (from Telegram)
```

## Error Handling

- `useTopNews`: returns `[]` on error, no crash
- `ArticleModal`: shows skeleton while loading, error message if 404
- OpenRouter: if `OPENROUTER_API_KEY` is empty, falls back to Ollama

## Security And Privacy

- Remove `geminiService.js` (direct browser→Gemini call with localStorage key)
- Remove `telegramService.js` from frontend
- All AI flows: browser → `/api/ai/generate` → backend → AI provider
- No API keys ever in frontend code or localStorage after this change

## Implementation Plan

### Task 1: Backend — GET /api/news/top

**Files:** Modify `backend/src/api/routes/news.ts`

- [ ] Add route before `/:id` route (Express route ordering):
  ```ts
  newsRouter.get('/top', async (_req, res) => {
    const cached = await cacheGet('news:top');
    if (cached) return res.json(cached);
    const result = await query(`
      SELECT id, title, summary, url, source, category, company,
             published_at, image_url, importance_score,
             fake_news_score, political_bias, is_militant
      FROM news_articles
      WHERE published_at > NOW() - INTERVAL '48 hours'
        AND importance_score IS NOT NULL
      ORDER BY importance_score DESC NULLS LAST, published_at DESC
      LIMIT 10
    `);
    const response = { data: result.rows };
    await cacheSet('news:top', response, 300);
    return res.json(response);
  });
  ```
- [ ] Build: `cd backend && pnpm build` — expect clean

### Task 2: Backend — OpenRouter provider

**Files:** Modify `backend/src/services/aiProvider.ts`, `backend/src/config/env.ts`

- [ ] In `env.ts` add:
  ```ts
  openrouterApiKey: optional('OPENROUTER_API_KEY', ''),
  openrouterModel: optional('OPENROUTER_MODEL', 'anthropic/claude-3-haiku'),
  ```
- [ ] In `aiProvider.ts` add openrouter case using `@ai-sdk/openai` compat:
  ```ts
  async function openrouterLanguageModel(modelId?: string): Promise<LanguageModel> {
    const { createOpenAI } = await import('@ai-sdk/openai');
    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.openrouterApiKey,
    });
    return openrouter(modelId ?? config.openrouterModel);
  }
  ```
  Add `case 'openrouter': return openrouterLanguageModel(modelId)` to all switch blocks.
  Embedding fallback for openrouter → ollamaEmbeddingModel.
- [ ] Build: `cd backend && pnpm build`

### Task 3: Frontend — useTopNews hook

**Files:** Create `src/hooks/useTopNews.ts`

- [ ] Create:
  ```ts
  export function useTopNews() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
      fetch('/api/news/top')
        .then(r => r.json())
        .then(d => setArticles(d.data ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, []);
    return { articles, loading };
  }
  ```
- [ ] Export from `src/hooks/index.ts`

### Task 4: Frontend — TopNewsSection component

**Files:** Create `src/components/NeoEditorial/TopNewsSection.tsx`

- [ ] Horizontal scroll strip with title "🔥 Top Notícias" + importance badge
- [ ] Each card: image thumbnail, category badge, importance_score bar (0-100), title (2 lines max), source + time
- [ ] Click opens ArticleModal
- [ ] Skeleton: 4 skeleton cards while loading
- [ ] Export from `src/components/NeoEditorial/index.ts`

### Task 5: Frontend — ArticleModal component

**Files:** Create `src/components/NeoEditorial/ArticleModal.tsx`

- [ ] Props: `{ articleId: string | null; onClose: () => void }`
- [ ] Fetches `GET /api/news/:id` on open
- [ ] Shows: image, title, source/time, full content (or summary if no content), credibility badges
- [ ] Footer: "Ler original" button linking to `article.url`
- [ ] Related articles section fetching `GET /api/news/:id/related`
- [ ] Keyboard: Escape closes
- [ ] Backdrop click closes
- [ ] Export from `src/components/NeoEditorial/index.ts`

### Task 6: Frontend — Fix Sidebar trending

**Files:** Modify `src/components/NeoEditorial/Sidebar.tsx`

- [ ] Replace hardcoded `TRENDING_TOPICS` array with data from `GET /api/topics`
- [ ] `useEffect` on mount, store in local state, show top 6 topic names
- [ ] Loading state: show 5 skeleton lines
- [ ] Fix "AI Summary" section: replace hardcoded text with real `GET /api/news/top` first article

### Task 7: Frontend — Fix AppNeo.tsx

**Files:** Modify `src/AppNeo.tsx`

- [ ] Add `selectedArticleId` state (`string | null`)
- [ ] Pass `onClick={() => setSelectedArticleId(article.id)}` to all `NewsCard` components
- [ ] Read `?id=` from URL on mount: `new URLSearchParams(window.location.search).get('id')`
  → set `selectedArticleId` if present (Telegram deep link support)
- [ ] Add `<ArticleModal articleId={selectedArticleId} onClose={() => setSelectedArticleId(null)} />`
- [ ] Add `<TopNewsSection onArticleClick={setSelectedArticleId} />` before the category tabs
- [ ] Fix `handleSearch`: navigate to search results — call `fetch('/api/news/search?q=...')`, store results in `searchResults` state, show in a modal or replace feed
- [ ] Add `useTopNews` to import list

### Task 8: Frontend — Switch main.jsx + delete dead files

**Files:** Modify `src/main.jsx`, delete 3 files

- [ ] `main.jsx`: change `import App from './AppNeo.jsx'` → `import App from './AppNeo'`
- [ ] Delete `src/App.jsx`
- [ ] Delete `src/services/geminiService.js`
- [ ] Delete `src/services/telegramService.js`
- [ ] `pnpm build` — expect clean (no TypeScript errors, no missing imports)
- [ ] Verify no remaining imports of deleted files: `grep -r "geminiService\|telegramService\|from './App'" src/`

### Task 9: Cleanup

- [ ] `cd backend && pnpm build` — clean
- [ ] `pnpm build` (frontend) — clean
- [ ] Delete `temp/specs/2026-05-17-frontend-overhaul-design.md`

## Verification Plan

1. `pnpm build` (frontend) — no errors
2. `cd backend && pnpm build` — no errors
3. `curl /api/news/top` — returns JSON with `data` array, articles sorted by importance_score
4. Grep for exposed keys: `grep -r "generativelanguage\|geminiService\|rss2json\|rssKey" src/` → 0 results
5. `?id=<uuid>` in URL → ArticleModal opens with correct article

## Checklists

### Design Validation
- [x] Existing project patterns were inspected.
- [x] The chosen design is a single path, not a menu of alternatives.
- [x] Scope is small enough for one implementation pass.
- [x] Assumptions are explicit and low risk.
- [x] No placeholders such as TBD, TODO, or "decide later" remain.

### Plan Validation
- [x] Files/modules to change are named.
- [x] Every task has exact steps and expected validation output.
- [x] No step says "add appropriate", "handle edge cases", "similar to", or "implement later".
- [x] Types, function names, routes, props, and file paths are internally consistent.
- [x] Rollback or cleanup needs are noted.
- [x] Temporary spec deletion is part of the implementation cleanup.
