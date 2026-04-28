# Fast News - Neo Editorial Revolution

**Date**: 2026-04-28
**Status**: Draft

## 1. Concept & Vision

Uma fusão entre design editorial de revistas digitais premium e elementos cyberpunk sutis. O resultado é uma interface que respira profissionalismo e modernidade - onde a elegância tipográfica encontra interfaces do futuro. Cada notícia é tratada como uma história importante, apresentada com a reverência que merece.

A experiência é **imersion-inducing mas não sobrecarregante** - animações fluidas, micro-interações significativas, e uma hierarquia visual clara que guia o olhar naturalmente.

## 2. Design Language

### Aesthetic Direction
**Neo Editorial Cyberpunk** - Inspirado em publicações como The Verge, Bloomberg, e Stripe, com acentos sutis de futurismo. Nada de neon gritante demais - cyberpunk como tempero, não como prato principal.

### Color Palette
```
Primary Background:     #0A0A0B (quase preto, rico)
Secondary Background:   #141416 (cards, elevated surfaces)
Tertiary Background:    #1C1C1F (hover states)
Primary Text:           #FAFAFA (branco suave)
Secondary Text:        #A1A1A6 (cinza médio)
Accent Primary:        #6366F1 (indigo vibrante)
Accent Secondary:      #22D3EE (cyan sutil)
Accent Tertiary:       #F472B6 (pink para categorias)
Glow Effect:           rgba(99, 102, 241, 0.15)
Border Subtle:         rgba(255, 255, 255, 0.06)
```

### Typography
- **Headlines**: "Playfair Display" (serif elegante) - fallback: Georgia
- **Body/UI**: "Inter" (clean sans-serif) - fallback: system-ui
- **Code/Tech**: "JetBrains Mono" - fallback: monospace
- **Display Numbers**: "Space Grotesk" para métricas e números grandes

### Spatial System
- Base unit: 4px
- Content max-width: 1400px
- Card padding: 24px (desktop), 16px (mobile)
- Grid gap: 24px
- Section spacing: 64px

### Motion Philosophy
- **Page transitions**: Fade + subtle slide (300ms ease-out)
- **Card hover**: Lift (translateY -4px) + glow border (200ms)
- **Content reveal**: Staggered fade-in (100ms delay between items)
- **Scroll animations**: Parallax sutil em hero, intersection observer para cards
- **Loading states**: Skeleton com shimmer gradient

### Visual Assets
- **Icons**: Lucide React (mantendo) + custom glow effects
- **Images**: Aspect ratio 16:9 para thumbnails, blur placeholder
- **Decorative**: Subtle grid pattern no background, glow orbs em hover states

## 3. Layout & Structure

### Page Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER (sticky, blur backdrop)                             │
│  Logo | Search (expandível) | Categories | Settings | Theme │
├─────────────────────────────────────────────────────────────┤
│  HERO SECTION (featured article, full-width, parallax)      │
│  Large image, overlay gradient, headline + excerpt           │
├─────────────────────────────────────────────────────────────┤
│  TRENDING BAR (horizontal scroll, tags hottest)              │
│  #GitHub | #Anthropic | #AI | #Gaming | #Tech               │
├─────────────────────────────────────────────────────────────┤
│  MAIN CONTENT AREA                                          │
│  ┌─────────────────────────────┬───────────────────────┐    │
│  │  FEED GRID (masonry/grid)   │  SIDEBAR              │    │
│  │  - NewsCards                │  - Trending Topics    │    │
│  │  - Infinite scroll          │  - Quick Filters      │    │
│  │  - Category tabs            │  - AI Summary Panel   │    │
│  │                             │  - Source Stats       │    │
│  └─────────────────────────────┴───────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  FOOTER (minimal, links + credits)                          │
└─────────────────────────────────────────────────────────────┘
```

### Responsive Strategy
- **Desktop (1200px+)**: 3-column grid + sidebar
- **Tablet (768-1199px)**: 2-column grid, sidebar collapses
- **Mobile (<768px)**: Single column, bottom nav, drawer sidebar

## 4. Features & Interactions

### Core Features

#### 4.1 News Feed
- Masonry grid com cards de tamanhos variados (featured = 2x)
- Infinite scroll com intersection observer
- Pull-to-refresh em mobile
- Filtro por categoria/tag com tabs horizontais
- Ordenação: Recentes | Populares | Relevância (AI)

#### 4.2 Search
- Command palette style (Ctrl+K)
- Busca semântica usando embeddings (quando disponível)
- Filtros: categoria, data, fonte, idioma
- Histórico de buscas recentes

#### 4.3 Article View
- Modal/drawer para preview rápido
- View completa com reader mode
- Botão de summarize (via AI)
- Share buttons
- Related articles (RAG-powered)
- Save to bookmarks

#### 4.4 Categories (novas + existentes)
**Mantidas**: Tecnologia, IA, Brasil, Mundo, Negocios, Cripto, Ciencia, Games, Esportes

**Novas categorias**:
- **Big Techs**: GitHub, Google, Microsoft, Meta, Apple, Amazon, Nvidia
- **AI Frontier**: OpenAI, Anthropic, xAI (Grok), Mistral, Cohere
- **Dev Tools**: Copilot, Cursor, Vercel, Cloudflare, Supabase
- **Gaming**: Steam, Xbox, PlayStation, Nintendo, esports

#### 4.5 Trending Topics
- Google News RSS (mantido)
- Topic cards com热度 meter
- Click para filtrar feed

#### 4.6 AI Features
- Summarize articles (Ollama/Gemini)
- Topic analysis
- Auto-categorization
- Related articles via vector similarity

#### 4.7 Settings Panel
- API keys configuration
- Theme toggle (light/dark/auto)
- Feed sources management
- Notification preferences
- Data export/import

### Interaction Details

#### Card Hover
```
Default → Hover
- Scale: 1 → 1.02
- Shadow: 0 → glow shadow (accent color)
- Border: transparent → subtle accent border
- Image: static → subtle zoom (1.0 → 1.05)
```

#### Category Tab Selection
```
Inactive → Active
- Color: secondary text → accent primary
- Underline: none → 2px accent, animated slide
- Background: transparent → tertiary (subtle)
```

#### Search Modal
```
Closed → Open (Ctrl+K)
- Backdrop: fade in (150ms)
- Modal: scale 0.95→1 + fade (200ms)
- Input auto-focus
- Results appear as you type (debounced 300ms)
```

### Error Handling
- Network error: Toast + retry button
- Empty feed: Illustrated empty state + suggestions
- API failure: Graceful degradation, show cached data
- Rate limit: Queue requests, show loading state

## 5. Component Inventory

### NewsCard
- **States**: default, hover, loading (skeleton), error, bookmarked
- **Variants**: compact (list), standard (grid), featured (large)
- **Elements**: image, category badge, headline, excerpt, source, time, actions

### CategoryTabs
- **States**: default, active, hover, disabled
- **Animation**: underline slide between tabs

### SearchModal
- **States**: closed, open, loading, results, empty, error
- **Keyboard**: Ctrl+K open, Esc close, Arrow keys navigate

### Sidebar
- **States**: expanded (desktop), collapsed (tablet), drawer (mobile)
- **Sections**: Trending, Filters, Stats, AI Panel

### HeroSection
- **States**: default, loading, error (fallback gradient)
- **Parallax**: background image moves at 0.5x scroll speed

### TrendingBar
- **States**: default, scrollable
- **Elements**: tag pills with热度 indicator

### Toast
- **Variants**: success, error, warning, info
- **Animation**: slide in from top-right, auto-dismiss 5s

### SettingsModal
- **Sections**: Tabs (General, Sources, AI, About)
- **Inputs**: API key fields (masked), toggles, selectors

### BookmarkPanel
- **States**: empty, populated
- **Actions**: remove, organize, export

## 6. Technical Approach

### Frontend Architecture
```
src/
├── components/
│   ├── ui/           # Base components (Button, Input, Modal)
│   ├── feed/         # NewsCard, CategoryTabs, TrendingBar
│   ├── layout/       # Header, Sidebar, Footer
│   ├── search/       # SearchModal, SearchResults
│   └── ai/           # SummaryPanel, RelatedArticles
├── hooks/
│   ├── useNews.ts    # News fetching + caching
│   ├── useSearch.ts  # Search logic
│   └── useAI.ts      # AI operations
├── services/
│   ├── api.ts        # Backend API client
│   ├── cache.ts      # Local cache (IndexedDB)
│   └── embeddings.ts # Vector operations
├── stores/
│   └── newsStore.ts  # Zustand store
└── styles/
    └── animations.css # Custom animations
```

### New Data Sources (RSS + APIs)

#### Big Techs
- GitHub Blog: https://github.blog/feed/
- Google DeepMind: https://deepmind.google/blog/rss.xml
- Google AI Blog: https://blog.google/technology/ai/rss
- Microsoft Blog: https://blogs.microsoft.com/feed/
- Meta Newsroom: https://about.fb.com/news/rss/
- Apple Newsroom: https://www.apple.com/news/rss/rss.xml
- Amazon News: https://press.aboutamazon.com/news/press-releases

#### AI Frontier
- OpenAI Blog: https://openai.com/blog/rss.xml
- Anthropic News: https://www.anthropic.com/news/rss.xml
- xAI (Grok): https://x.ai/blog/rss (se disponível)
- Mistral AI: https://mistral.ai/news/rss/
- Hugging Face: https://huggingface.co/blog/feed.xml

#### Dev Tools
- GitHub Copilot: https://github.blog/category/ai/feed/
- Vercel Blog: https://vercel.com/blog/rss.xml
- Cloudflare Blog: https://blog.cloudflare.com/rss/
- Supabase Blog: https://supabase.com/blog/rss.xml
- Cursor: https://cursor.com/blog/rss.xml (se disponível)

#### Gaming
- Steam News: https://store.steampowered.com/feeds/news/
- Xbox Wire: https://news.xbox.com/en-us/feed/
- PlayStation Blog: https://blog.playstation.com/feed/
- Nintendo Life: https://www.nintendolife.com/feed

### Backend Architecture
```
backend/
├── src/
│   ├── routes/
│   │   ├── news.ts      # CRUD + search
│   │   ├── sources.ts   # Feed management
│   │   └── ai.ts        # AI operations
│   ├── services/
│   │   ├── ingestion.ts # RSS fetching + processing
│   │   ├── embeddings.ts# Vector generation
│   │   └── rag.ts       # RAG operations
│   ├── mcp/
│   │   └── server.ts    # MCP server implementation
│   └── database/
│       ├── postgres.ts   # PostgreSQL client
│       └── sqlite.ts     # SQLite client (cache)
└── package.json
```

### Database Schema (PostgreSQL)
```sql
-- Mantido do existente, adicionando:
CREATE TABLE source_feeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL UNIQUE,
  category VARCHAR(50),
  company VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  last_fetched TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_feeds_category ON source_feeds(category);
CREATE INDEX idx_feeds_company ON source_feeds(company);
```

### SQLite Schema (Cache Local)
```sql
CREATE TABLE news_cache (
  id TEXT PRIMARY KEY,
  title TEXT,
  content TEXT,
  url TEXT UNIQUE,
  source TEXT,
  category TEXT,
  published_at DATETIME,
  vector_id TEXT,
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT,
  results_count INTEGER,
  searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### MCP Server
Exposed tools:
- `search_news(query, filters)` - Semantic search
- `get_article(id)` - Get full article
- `summarize_article(id)` - AI summary
- `get_trending(category)` - Trending articles
- `get_sources()` - List all sources

## 7. Implementation Phases

### Phase 1: Foundation
- [ ] Nova estrutura de pastas modular
- [ ] Design system base (cores, typography, spacing)
- [ ] Componentes UI base
- [ ] Layout shell (Header, Sidebar, Grid)

### Phase 2: Core Features
- [ ] NewsCard component + grid
- [ ] Category tabs
- [ ] Search modal
- [ ] Hero section

### Phase 3: Data Layer
- [ ] Novas fontes RSS (Big Techs, AI, Gaming)
- [ ] SQLite cache layer
- [ ] Backend API updates

### Phase 4: AI & MCP
- [ ] MCP Server implementation
- [ ] Embeddings pipeline
- [ ] RAG integration
- [ ] AI features (summarize, relate)

### Phase 5: Polish
- [ ] Animações e transições
- [ ] Dark/Light themes
- [ ] Mobile optimizations
- [ ] Performance tuning
