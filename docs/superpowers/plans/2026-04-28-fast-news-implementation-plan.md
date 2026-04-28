# Fast News - Neo Editorial Revolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revolutionary Neo Editorial redesign with new data sources (Big Techs, AI Frontier, Dev Tools, Gaming), MCP server, and enhanced vector search - all without SQLite.

**Architecture:**
- Monorepo reorganizado em `packages/` (web, api, mcp)
- PostgreSQL + pgvector para armazenamento principal e busca semântica
- Redis para cache (substitui SQLite)
- MCP Server standalone expondo tools de busca/sumarização
- Frontend React com design system Neo Editorial (Playfair + Inter + JetBrains Mono)

**Tech Stack:** React 19, Vite 7, Tailwind CSS, Express, PostgreSQL 16, Redis 7, Vercel AI SDK, pgvector, TypeScript

---

## Phase 1: Foundation

### Task 1: Reorganizar estrutura do monorepo para packages/

**Files:**
- Create: `packages/web/` (moved from `src/`)
- Create: `packages/api/` (moved from `backend/src/`)
- Create: `packages/shared/` (types, utils compartilhados)
- Modify: `package.json` (workspace config)
- Modify: `docker-compose.yml` (paths atualizados)
- Delete: `src/` directory (after move)
- Delete: `backend/src/` directory (after move)

- [ ] **Step 1: Create packages directory structure**

```bash
mkdir -p packages/web packages/api packages/shared
```

- [ ] **Step 2: Create packages/shared/src/index.ts with shared types**

```typescript
export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  url: string;
  source: string;
  category: string;
  company?: string;
  publishedAt: Date;
  vectorId?: string;
}

export interface FeedSource {
  id: string;
  name: string;
  url: string;
  category: string;
  company: string;
  isActive: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
}

export type SearchFilters = {
  category?: string;
  company?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
};
```

- [ ] **Step 3: Update root package.json for workspaces**

```json
{
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "pnpm --filter @fast-news/web dev",
    "dev:api": "pnpm --filter @fast-news/api dev",
    "dev:mcp": "pnpm --filter @fast-news/mcp dev"
  }
}
```

- [ ] **Step 4: Create packages/web/package.json**

```json
{
  "name": "@fast-news/web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "@fast-news/shared": "workspace:*"
  }
}
```

- [ ] **Step 5: Create packages/api/package.json**

```json
{
  "name": "@fast-news/api",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "@fast-news/shared": "workspace:*"
  }
}
```

- [ ] **Step 6: Move src/ contents to packages/web/src**

- [ ] **Step 7: Move backend/src/ contents to packages/api/src**

- [ ] **Step 8: Update docker-compose.yml paths**

- [ ] **Step 9: Commit**

```bash
git add packages/ package.json docker-compose.yml
git commit -m "feat: reorganize into packages/ monorepo structure"
```

---

### Task 2: Design System Neo Editorial - Tailwind Config

**Files:**
- Modify: `packages/web/tailwind.config.js`

- [ ] **Step 1: Update tailwind.config.js com cores e tipografia Neo Editorial**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0A0A0B',
          secondary: '#141416',
          tertiary: '#1C1C1F',
        },
        text: {
          primary: '#FAFAFA',
          secondary: '#A1A1A6',
        },
        accent: {
          primary: '#6366F1',
          secondary: '#22D3EE',
          tertiary: '#F472B6',
        },
        glow: 'rgba(99, 102, 241, 0.15)',
        border: {
          subtle: 'rgba(255, 255, 255, 0.06)',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        numbers: ['Space Grotesk', 'sans-serif'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(99, 102, 241, 0.6)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/tailwind.config.js
git commit -m "feat(web): add Neo Editorial design system to Tailwind"
```

---

### Task 3: Criar arquivos de animação CSS customizados

**Files:**
- Create: `packages/web/src/styles/animations.css`

- [ ] **Step 1: Create animations.css com animações customizadas**

```css
/* Card Hover Glow Effect */
.card-glow {
  transition: all 0.2s ease-out;
}

.card-glow:hover {
  transform: translateY(-4px);
  box-shadow: 0 0 30px rgba(99, 102, 241, 0.2),
              0 0 60px rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.3);
}

/* Skeleton Loading Shimmer */
.skeleton {
  background: linear-gradient(
    90deg,
    #141416 0%,
    #1C1C1F 50%,
    #141416 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2s linear infinite;
}

/* Staggered Reveal */
.stagger-reveal > * {
  opacity: 0;
  animation: slide-up 0.3s ease-out forwards;
}

.stagger-reveal > *:nth-child(1) { animation-delay: 0ms; }
.stagger-reveal > *:nth-child(2) { animation-delay: 100ms; }
.stagger-reveal > *:nth-child(3) { animation-delay: 200ms; }
.stagger-reveal > *:nth-child(4) { animation-delay: 300ms; }
.stagger-reveal > *:nth-child(5) { animation-delay: 400ms; }
.stagger-reveal > *:nth-child(6) { animation-delay: 500ms; }

/* Glow Border */
.glow-border {
  position: relative;
}

.glow-border::before {
  content: '';
  position: absolute;
  inset: -1px;
  background: linear-gradient(135deg, #6366F1, #22D3EE, #F472B6);
  border-radius: inherit;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: -1;
}

.glow-border:hover::before {
  opacity: 1;
}

/* Text Glow */
.text-glow {
  text-shadow: 0 0 10px rgba(99, 102, 241, 0.5),
               0 0 20px rgba(99, 102, 241, 0.3);
}

/* Scrollbar Custom */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #0A0A0B;
}

::-webkit-scrollbar-thumb {
  background: #1C1C1F;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #6366F1;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/styles/animations.css
git commit -m "feat(web): add custom CSS animations for Neo Editorial"
```

---

## Phase 2: New Data Sources

### Task 4: Adicionar novas fontes RSS de Big Techs, AI Frontier, Dev Tools e Gaming

**Files:**
- Modify: `packages/api/src/services/ingestion.ts`
- Create: `packages/shared/src/sources.ts`

- [ ] **Step 1: Create packages/shared/src/sources.ts com todas as fontes categorizadas**

```typescript
export interface FeedSource {
  name: string;
  url: string;
  category: string;
  company: string;
}

export const FEED_SOURCES: FeedSource[] = [
  // Big Techs
  { name: 'GitHub Blog', url: 'https://github.blog/feed/', category: 'Big Techs', company: 'GitHub' },
  { name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml', category: 'Big Techs', company: 'Google' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss', category: 'Big Techs', company: 'Google' },
  { name: 'Microsoft Blog', url: 'https://blogs.microsoft.com/feed/', category: 'Big Techs', company: 'Microsoft' },
  { name: 'Meta Newsroom', url: 'https://about.fb.com/news/rss/', category: 'Big Techs', company: 'Meta' },
  { name: 'Apple Newsroom', url: 'https://www.apple.com/news/rss/rss.xml', category: 'Big Techs', company: 'Apple' },
  { name: 'Amazon News', url: 'https://press.aboutamazon.com/news/press-releases', category: 'Big Techs', company: 'Amazon' },
  { name: 'Nvidia News', url: 'https://blogs.nvidia.com/feed/', category: 'Big Techs', company: 'Nvidia' },

  // AI Frontier
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', category: 'AI Frontier', company: 'OpenAI' },
  { name: 'Anthropic News', url: 'https://www.anthropic.com/news/rss.xml', category: 'AI Frontier', company: 'Anthropic' },
  { name: 'xAI Grok', url: 'https://x.ai/blog/rss', category: 'AI Frontier', company: 'xAI' },
  { name: 'Mistral AI', url: 'https://mistral.ai/news/rss/', category: 'AI Frontier', company: 'Mistral' },
  { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml', category: 'AI Frontier', company: 'HuggingFace' },
  { name: 'Cohere', url: 'https://cohere.com/blog/rss.xml', category: 'AI Frontier', company: 'Cohere' },

  // Dev Tools
  { name: 'GitHub Copilot', url: 'https://github.blog/category/ai/feed/', category: 'Dev Tools', company: 'GitHub' },
  { name: 'Vercel Blog', url: 'https://vercel.com/blog/rss.xml', category: 'Dev Tools', company: 'Vercel' },
  { name: 'Cloudflare Blog', url: 'https://blog.cloudflare.com/rss/', category: 'Dev Tools', company: 'Cloudflare' },
  { name: 'Supabase Blog', url: 'https://supabase.com/blog/rss.xml', category: 'Dev Tools', company: 'Supabase' },
  { name: 'Cursor Blog', url: 'https://cursor.com/blog/rss.xml', category: 'Dev Tools', company: 'Cursor' },
  { name: 'Linear Blog', url: 'https://linear.app/blog/rss.xml', category: 'Dev Tools', company: 'Linear' },
  { name: 'Stripe Blog', url: 'https://stripe.com/blog/rss.xml', category: 'Dev Tools', company: 'Stripe' },

  // Gaming
  { name: 'Steam News', url: 'https://store.steampowered.com/feeds/news/', category: 'Gaming', company: 'Steam' },
  { name: 'Xbox Wire', url: 'https://news.xbox.com/en-us/feed/', category: 'Gaming', company: 'Xbox' },
  { name: 'PlayStation Blog', url: 'https://blog.playstation.com/feed/', category: 'Gaming', company: 'PlayStation' },
  { name: 'Nintendo Life', url: 'https://www.nintendolife.com/feed', category: 'Gaming', company: 'Nintendo' },
  { name: 'IGN Gaming', url: 'https://feeds.feedburner.com/ign/gaming-all', category: 'Gaming', company: 'IGN' },
  { name: 'Kotaku', url: 'https://kotaku.com/rss', category: 'Gaming', company: 'Kotaku' },

  // Manter categorias existentes de Tecnologia/IA
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'Tecnologia', company: 'TechCrunch' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'Tecnologia', company: 'The Verge' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'Tecnologia', company: 'Ars Technica' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'Tecnologia', company: 'Wired' },
];

export const CATEGORIES = [
  'Todas',
  'Big Techs',
  'AI Frontier',
  'Dev Tools',
  'Gaming',
  'Tecnologia',
  'IA',
  'Brasil',
  'Mundo',
  'Negocios',
  'Cripto',
  'Ciencia',
];

export const COMPANIES = [
  'Todas',
  'GitHub',
  'Google',
  'Microsoft',
  'Meta',
  'Apple',
  'Amazon',
  'Nvidia',
  'OpenAI',
  'Anthropic',
  'xAI',
  'Mistral',
  'HuggingFace',
  'Cohere',
  'Vercel',
  'Cloudflare',
  'Supabase',
  'Cursor',
  'Steam',
  'Xbox',
  'PlayStation',
  'Nintendo',
];
```

- [ ] **Step 2: Update packages/api/src/services/ingestion.ts para usar FEED_SOURCES**

```typescript
import { FEED_SOURCES } from '@fast-news/shared/sources';

// Substituir a lista hardcoded de feeds pela import
const FEED_URLS = FEED_SOURCES.map(s => s.url);
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/sources.ts packages/api/src/services/ingestion.ts
git commit -m "feat(sources): add Big Techs, AI Frontier, Dev Tools and Gaming RSS feeds"
```

---

### Task 5: Atualizar schema do banco com nova tabela source_feeds

**Files:**
- Modify: `packages/api/src/database/schema.sql`

- [ ] **Step 1: Adicionar tabela source_feeds ao schema.sql**

```sql
-- Tabela de fontes de feeds (manter junto com news_articles)
CREATE TABLE IF NOT EXISTS source_feeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL UNIQUE,
  category VARCHAR(50),
  company VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  last_fetched TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feeds_category ON source_feeds(category);
CREATE INDEX IF NOT EXISTS idx_feeds_company ON source_feeds(company);
CREATE INDEX IF NOT EXISTS idx_feeds_active ON source_feeds(is_active);
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/database/schema.sql
git commit -m "feat(db): add source_feeds table for feed management"
```

---

## Phase 3: MCP Server

### Task 6: Criar MCP Server standalone

**Files:**
- Create: `packages/mcp/package.json`
- Create: `packages/mcp/src/index.ts`
- Create: `packages/mcp/src/tools/news.ts`
- Create: `packages/mcp/tsconfig.json`

- [ ] **Step 1: Create packages/mcp/package.json**

```json
{
  "name": "@fast-news/mcp",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@fast-news/shared": "workspace:*",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create packages/mcp/src/index.ts - main MCP server**

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { searchNewsTool, getArticleTool, summarizeArticleTool, getTrendingTool, getSourcesTool } from './tools/news.js';

const server = new Server(
  { name: 'fast-news-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      searchNewsTool,
      getArticleTool,
      summarizeArticleTool,
      getTrendingTool,
      getSourcesTool,
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_news': {
        const { query, filters } = args as { query: string; filters?: object };
        // Implementar busca via API
        return { content: [{ type: 'text', text: JSON.stringify({ results: [] }) }] };
      }
      case 'get_article': {
        const { id } = args as { id: string };
        return { content: [{ type: 'text', text: JSON.stringify({ article: null }) }] };
      }
      case 'summarize_article': {
        const { id } = args as { id: string };
        return { content: [{ type: 'text', text: JSON.stringify({ summary: '' }) }] };
      }
      case 'get_trending': {
        const { category } = args as { category?: string };
        return { content: [{ type: 'text', text: JSON.stringify({ trending: [] }) }] };
      }
      case 'get_sources': {
        return { content: [{ type: 'text', text: JSON.stringify({ sources: [] }) }] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Fast News MCP Server running on stdio');
}

main().catch(console.error);
```

- [ ] **Step 3: Create packages/mcp/src/tools/news.ts - tool definitions**

```typescript
import { z } from 'zod';

export const searchNewsTool = {
  name: 'search_news',
  description: 'Search news articles using semantic vector search. Supports filtering by category, company, and date range.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query text' },
      filters: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          company: { type: 'string' },
          dateFrom: { type: 'string' },
          dateTo: { type: 'string' },
          limit: { type: 'number', default: 10 },
        },
      },
    },
    required: ['query'],
  },
};

export const getArticleTool = {
  name: 'get_article',
  description: 'Get a single article by ID with full content.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Article UUID' },
    },
    required: ['id'],
  },
};

export const summarizeArticleTool = {
  name: 'summarize_article',
  description: 'Generate an AI-powered summary of an article.',
  inputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'Article UUID' },
      maxLength: { type: 'number', default: 200 },
    },
    required: ['id'],
  },
};

export const getTrendingTool = {
  name: 'get_trending',
  description: 'Get trending topics and articles by category.',
  inputSchema: {
    type: 'object',
    properties: {
      category: { type: 'string', description: 'Filter by category (optional)' },
      limit: { type: 'number', default: 10 },
    },
  },
};

export const getSourcesTool = {
  name: 'get_sources',
  description: 'List all available news sources with their categories and companies.',
  inputSchema: {
    type: 'object',
    properties: {
      category: { type: 'string' },
      company: { type: 'string' },
    },
  },
};
```

- [ ] **Step 4: Create packages/mcp/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Update root package.json workspace to include mcp**

- [ ] **Step 6: Commit**

```bash
git add packages/mcp/
git commit -m "feat(mcp): add standalone MCP server with news tools"
```

---

## Phase 4: Frontend Components

### Task 7: Novo componente NewsCard com design Neo Editorial

**Files:**
- Create: `packages/web/src/components/feed/NewsCard.tsx`

- [ ] **Step 1: Create NewsCard.tsx com estados e animações**

```tsx
import { useState } from 'react';
import { Clock, Bookmark, Share2, Sparkles } from 'lucide-react';
import type { NewsArticle } from '@fast-news/shared';

interface NewsCardProps {
  article: NewsArticle;
  variant?: 'compact' | 'standard' | 'featured';
  onBookmark?: (id: string) => void;
  onShare?: (id: string) => void;
  onSummarize?: (id: string) => void;
}

export function NewsCard({
  article,
  variant = 'standard',
  onBookmark,
  onShare,
  onSummarize,
}: NewsCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Agora';
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d atrás`;
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <article
      className={`
        card-glow group relative rounded-xl overflow-hidden
        bg-bg-secondary border border-border-subtle
        transition-all duration-200 ease-out
        ${variant === 'featured' ? 'col-span-2 row-span-2' : ''}
        ${isHovered ? 'scale-[1.02]' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      {article.imageUrl && (
        <div className={`relative overflow-hidden ${variant === 'compact' ? 'h-32' : 'h-48'}`}>
          <img
            src={article.imageUrl}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-secondary via-transparent to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        {/* Category Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className={`
            px-2 py-0.5 rounded-full text-xs font-mono uppercase tracking-wider
            ${article.category === 'AI Frontier' ? 'bg-accent-primary/20 text-accent-primary' : ''}
            ${article.category === 'Big Techs' ? 'bg-accent-secondary/20 text-accent-secondary' : ''}
            ${article.category === 'Gaming' ? 'bg-accent-tertiary/20 text-accent-tertiary' : ''}
            ${article.category === 'Dev Tools' ? 'bg-emerald-500/20 text-emerald-400' : ''}
            bg-bg-tertiary text-text-secondary
          `}>
            {article.category}
          </span>
          {article.company && (
            <span className="text-xs text-text-secondary font-numbers">
              {article.company}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className={`
          font-display font-bold text-text-primary leading-tight mb-2
          group-hover:text-glow transition-all duration-200
          ${variant === 'featured' ? 'text-2xl' : variant === 'compact' ? 'text-base' : 'text-lg'}
        `}>
          {article.title}
        </h3>

        {/* Excerpt */}
        {variant !== 'compact' && article.excerpt && (
          <p className="text-text-secondary text-sm line-clamp-2 mb-4">
            {article.excerpt}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border-subtle">
          <div className="flex items-center gap-1 text-text-secondary text-xs">
            <Clock className="w-3 h-3" />
            <span>{formatDate(article.publishedAt)}</span>
            <span className="mx-2">•</span>
            <span className="font-mono">{article.source}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onSummarize?.(article.id)}
              className="p-1.5 rounded-lg hover:bg-accent-primary/20 text-text-secondary hover:text-accent-primary transition-colors"
              title="Resumir com AI"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsBookmarked(!isBookmarked);
                onBookmark?.(article.id);
              }}
              className={`p-1.5 rounded-lg hover:bg-accent-primary/20 transition-colors ${
                isBookmarked ? 'text-accent-primary' : 'text-text-secondary hover:text-accent-primary'
              }`}
              title="Salvar"
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => onShare?.(article.id)}
              className="p-1.5 rounded-lg hover:bg-accent-primary/20 text-text-secondary hover:text-accent-primary transition-colors"
              title="Compartilhar"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Glow Effect on Hover */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/5 via-transparent to-accent-secondary/5" />
        </div>
      )}
    </article>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/feed/NewsCard.tsx
git commit -m "feat(web): add NewsCard component with Neo Editorial design"
```

---

### Task 8: Novo componente CategoryTabs com underline animado

**Files:**
- Create: `packages/web/src/components/feed/CategoryTabs.tsx`

- [ ] **Step 1: Create CategoryTabs.tsx**

```tsx
import { useState, useRef, useEffect } from 'react';
import { CATEGORIES } from '@fast-news/shared';

interface CategoryTabsProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryTabs({ activeCategory, onCategoryChange }: CategoryTabsProps) {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabsRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && tabsRef.current) {
      const parentRect = tabsRef.current.parentElement?.getBoundingClientRect();
      const activeRect = activeRef.current.getBoundingClientRect();
      if (parentRect) {
        setIndicatorStyle({
          left: activeRect.left - parentRect.left,
          width: activeRect.width,
        });
      }
    }
  }, [activeCategory]);

  return (
    <div className="relative border-b border-border-subtle">
      <div ref={tabsRef} className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            ref={category === activeCategory ? activeRef : null}
            onClick={() => onCategoryChange(category)}
            className={`
              relative px-4 py-3 text-sm font-sans whitespace-nowrap transition-colors
              ${category === activeCategory
                ? 'text-accent-primary font-medium'
                : 'text-text-secondary hover:text-text-primary'
              }
            `}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Animated Underline */}
      <div
        className="absolute bottom-0 h-0.5 bg-accent-primary transition-all duration-300 ease-out"
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/feed/CategoryTabs.tsx
git commit -m "feat(web): add CategoryTabs with animated underline"
```

---

### Task 9: SearchModal com command palette style (Ctrl+K)

**Files:**
- Create: `packages/web/src/components/search/SearchModal.tsx`

- [ ] **Step 1: Create SearchModal.tsx**

```tsx
import { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight, Clock, Sparkles } from 'lucide-react';
import { CATEGORIES, COMPANIES } from '@fast-news/shared';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string, filters: SearchFilters) => void;
  recentSearches?: string[];
}

interface SearchFilters {
  category?: string;
  company?: string;
}

export function SearchModal({ isOpen, onClose, onSearch, recentSearches = [] }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setFilters({});
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!isOpen) {
          // Parent handles opening
        } else {
          onClose();
        }
      }
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, recentSearches.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && query) {
        onSearch(query, filters);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, query, filters, recentSearches, selectedIndex, onSearch, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg-primary/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-bg-secondary border border-border-subtle rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-border-subtle">
          <Search className="w-5 h-5 text-text-secondary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search news, topics, sources..."
            className="flex-1 bg-transparent text-text-primary placeholder-text-secondary outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg hover:bg-bg-tertiary text-text-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-bg-tertiary text-text-secondary text-xs font-mono">
            ESC
          </kbd>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 p-3 border-b border-border-subtle bg-bg-primary/30">
          <span className="text-xs text-text-secondary">Filters:</span>
          <select
            value={filters.category || ''}
            onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
            className="bg-bg-tertiary text-text-primary text-xs rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-accent-primary"
          >
            <option value="">All Categories</option>
            {CATEGORIES.filter(c => c !== 'Todas').map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filters.company || ''}
            onChange={(e) => setFilters({ ...filters, company: e.target.value || undefined })}
            className="bg-bg-tertiary text-text-primary text-xs rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-accent-primary"
          >
            <option value="">All Companies</option>
            {COMPANIES.filter(c => c !== 'Todas').map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Results / Recent */}
        <div className="max-h-80 overflow-y-auto p-2">
          {query ? (
            <div className="p-3 text-center text-text-secondary text-sm">
              Press Enter to search for "{query}"
              <span className="block mt-1 flex items-center justify-center gap-1 text-accent-primary">
                <Sparkles className="w-3 h-3" /> AI-powered semantic search
              </span>
            </div>
          ) : recentSearches.length > 0 ? (
            <div className="space-y-1">
              <div className="px-3 py-2 text-xs text-text-secondary uppercase tracking-wider">
                Recent Searches
              </div>
              {recentSearches.map((search, i) => (
                <button
                  key={search}
                  onClick={() => {
                    setQuery(search);
                    onSearch(search, filters);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    i === selectedIndex
                      ? 'bg-accent-primary/20 text-accent-primary'
                      : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span className="flex-1 text-left text-sm">{search}</span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-text-secondary">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Start typing to search</p>
              <p className="text-xs mt-1">Use filters to narrow results by category or company</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle bg-bg-primary/30">
          <div className="flex items-center gap-4 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-bg-tertiary font-mono">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-bg-tertiary font-mono">↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-bg-tertiary font-mono">ESC</kbd>
              Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/search/SearchModal.tsx
git commit -m "feat(web): add SearchModal with command palette (Ctrl+K)"
```

---

### Task 10: Sidebar com novos widgets (Source Stats, AI Panel)

**Files:**
- Modify: `packages/web/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Update Sidebar.tsx with new sections**

```tsx
import { useState } from 'react';
import { TrendingUp, Filter, BarChart3, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { COMPANIES, CATEGORIES } from '@fast-news/shared';

interface SidebarProps {
  onFilterChange?: (filters: SidebarFilters) => void;
  sourcesStats?: SourceStats[];
}

interface SidebarFilters {
  company?: string;
  category?: string;
}

interface SourceStats {
  name: string;
  count: number;
  percentage: number;
}

export function Sidebar({ onFilterChange, sourcesStats = [] }: SidebarProps) {
  const [filters, setFilters] = useState<SidebarFilters>({});
  const [expandedSections, setExpandedSections] = useState({
    trending: true,
    filters: true,
    stats: false,
    ai: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleFilterChange = (key: keyof SidebarFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  return (
    <aside className="w-72 flex-shrink-0 space-y-4">
      {/* Trending Topics */}
      <section className="bg-bg-secondary rounded-xl border border-border-subtle overflow-hidden">
        <button
          onClick={() => toggleSection('trending')}
          className="w-full flex items-center justify-between p-4 hover:bg-bg-tertiary transition-colors"
        >
          <span className="flex items-center gap-2 font-sans font-medium text-text-primary">
            <TrendingUp className="w-4 h-4 text-accent-primary" />
            Trending
          </span>
          {expandedSections.trending ? (
            <ChevronUp className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          )}
        </button>
        {expandedSections.trending && (
          <div className="px-4 pb-4 space-y-2">
            {['GitHub Copilot', 'Claude 4', 'Grok 3', 'Gemini Ultra', 'Steam Deck 2'].map((topic) => (
              <button
                key={topic}
                className="block w-full text-left px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary hover:text-accent-primary transition-colors"
              >
                #{topic}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Quick Filters */}
      <section className="bg-bg-secondary rounded-xl border border-border-subtle overflow-hidden">
        <button
          onClick={() => toggleSection('filters')}
          className="w-full flex items-center justify-between p-4 hover:bg-bg-tertiary transition-colors"
        >
          <span className="flex items-center gap-2 font-sans font-medium text-text-primary">
            <Filter className="w-4 h-4 text-accent-secondary" />
            Filters
          </span>
          {expandedSections.filters ? (
            <ChevronUp className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          )}
        </button>
        {expandedSections.filters && (
          <div className="px-4 pb-4 space-y-4">
            <div>
              <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">
                Company
              </label>
              <select
                value={filters.company || ''}
                onChange={(e) => handleFilterChange('company', e.target.value)}
                className="w-full bg-bg-tertiary text-text-primary text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-accent-primary"
              >
                <option value="">All Companies</option>
                {COMPANIES.filter(c => c !== 'Todas').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-2 uppercase tracking-wider">
                Category
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full bg-bg-tertiary text-text-primary text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-accent-primary"
              >
                <option value="">All Categories</option>
                {CATEGORIES.filter(c => c !== 'Todas').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* Source Stats */}
      <section className="bg-bg-secondary rounded-xl border border-border-subtle overflow-hidden">
        <button
          onClick={() => toggleSection('stats')}
          className="w-full flex items-center justify-between p-4 hover:bg-bg-tertiary transition-colors"
        >
          <span className="flex items-center gap-2 font-sans font-medium text-text-primary">
            <BarChart3 className="w-4 h-4 text-accent-tertiary" />
            Sources
          </span>
          {expandedSections.stats ? (
            <ChevronUp className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          )}
        </button>
        {expandedSections.stats && (
          <div className="px-4 pb-4 space-y-3">
            {sourcesStats.length > 0 ? sourcesStats.map((source) => (
              <div key={source.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">{source.name}</span>
                  <span className="font-numbers text-accent-primary">{source.count}</span>
                </div>
                <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full transition-all"
                    style={{ width: `${source.percentage}%` }}
                  />
                </div>
              </div>
            )) : (
              <p className="text-xs text-text-secondary">Loading stats...</p>
            )}
          </div>
        )}
      </section>

      {/* AI Summary Panel */}
      <section className="bg-bg-secondary rounded-xl border border-border-subtle overflow-hidden">
        <button
          onClick={() => toggleSection('ai')}
          className="w-full flex items-center justify-between p-4 hover:bg-bg-tertiary transition-colors"
        >
          <span className="flex items-center gap-2 font-sans font-medium text-text-primary">
            <Sparkles className="w-4 h-4 text-accent-primary" />
            AI Summary
          </span>
          {expandedSections.ai ? (
            <ChevronUp className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          )}
        </button>
        {expandedSections.ai && (
          <div className="px-4 pb-4">
            <div className="p-3 rounded-lg bg-bg-tertiary text-xs text-text-secondary">
              <p className="mb-2">Today's top story:</p>
              <p className="text-text-primary font-medium">
                GitHub announces Copilot X with GPT-4 Turbo integration
              </p>
              <p className="mt-2 text-accent-primary flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Updated 5 min ago
              </p>
            </div>
          </div>
        )}
      </section>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/layout/Sidebar.tsx
git commit -m "feat(web): enhance Sidebar with new widgets (Source Stats, AI Panel)"
```

---

### Task 11: Header com design atualizado e search expansível

**Files:**
- Modify: `packages/web/src/components/layout/Header.tsx`

- [ ] **Step 1: Update Header.tsx**

```tsx
import { useState, useEffect } from 'react';
import { Search, Settings, Moon, Sun, Menu, X } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface HeaderProps {
  onSearchOpen: () => void;
  onSettingsOpen: () => void;
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

export function Header({ onSearchOpen, onSettingsOpen, onMenuToggle, isMenuOpen }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`
        sticky top-0 z-40 transition-all duration-200
        ${isScrolled ? 'bg-bg-primary/80 backdrop-blur-xl border-b border-border-subtle' : 'bg-transparent'}
      `}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                <span className="text-white font-display font-bold text-lg">F</span>
              </div>
              <span className="hidden sm:block font-display font-bold text-xl text-text-primary">
                Fast<span className="text-accent-primary">News</span>
              </span>
            </a>
          </div>

          {/* Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <button
              onClick={onSearchOpen}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-xl bg-bg-secondary border border-border-subtle hover:border-accent-primary/30 transition-colors group"
            >
              <Search className="w-4 h-4 text-text-secondary" />
              <span className="text-text-secondary text-sm">Search news...</span>
              <kbd className="ml-auto hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-bg-tertiary text-text-secondary text-xs font-mono">
                Ctrl+K
              </kbd>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Mobile Search */}
            <button
              onClick={onSearchOpen}
              className="md:hidden p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-accent-primary transition-colors"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Settings */}
            <button
              onClick={onSettingsOpen}
              className="p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-accent-primary transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/layout/Header.tsx
git commit -m "feat(web): update Header with Neo Editorial design"
```

---

## Phase 5: Integration

### Task 12: Hook useNews com Redis cache (sem SQLite)

**Files:**
- Create: `packages/web/src/hooks/useNews.ts`

- [ ] **Step 1: Create useNews.ts**

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { NewsArticle, SearchFilters } from '@fast-news/shared';

interface UseNewsOptions {
  category?: string;
  company?: string;
  limit?: number;
}

interface UseNewsReturn {
  articles: NewsArticle[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

export function useNews(options: UseNewsOptions = {}): UseNewsReturn {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchArticles = useCallback(async (pageNum: number, append = false) => {
    try {
      setLoading(!append);
      setError(null);

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: (options.limit || 20).toString(),
      });
      if (options.category && options.category !== 'Todas') {
        params.set('category', options.category);
      }
      if (options.company && options.company !== 'Todas') {
        params.set('company', options.company);
      }

      const response = await fetch(`/api/news?${params}`);
      if (!response.ok) throw new Error('Failed to fetch articles');

      const data = await response.json();

      setArticles((prev) => append ? [...prev, ...data.articles] : data.articles);
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [options.category, options.company, options.limit]);

  useEffect(() => {
    setPage(1);
    fetchArticles(1, false);
  }, [fetchArticles]);

  const refetch = useCallback(async () => {
    setPage(1);
    await fetchArticles(1, false);
  }, [fetchArticles]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchArticles(nextPage, true);
  }, [page, hasMore, loading, fetchArticles]);

  return { articles, loading, error, refetch, loadMore, hasMore };
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/hooks/useNews.ts
git commit -m "feat(web): add useNews hook with pagination"
```

---

### Task 13: Redis cache layer (substitui SQLite)

**Files:**
- Create: `packages/api/src/services/cache.ts` (Redis implementation)

- [ ] **Step 1: Create packages/api/src/services/cache.ts com Redis**

```typescript
import { createClient, type RedisClientType } from 'redis';
import { env } from '../config/env.js';

let redis: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (!redis) {
    redis = createClient({
      url: env.REDIS_URL || 'redis://localhost:6379',
    });
    redis.on('error', (err) => console.error('Redis Client Error:', err));
    await redis.connect();
  }
  return redis;
}

const DEFAULT_TTL = 300; // 5 minutes
const NEWS_TTL = 60; // 1 minute for news
const SEARCH_TTL = 600; // 10 minutes for search results

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = await getRedisClient();
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  async set(key: string, value: unknown, options: CacheOptions = {}): Promise<void> {
    try {
      const client = await getRedisClient();
      const ttl = options.ttl || DEFAULT_TTL;
      await client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  },

  async del(key: string): Promise<void> {
    try {
      const client = await getRedisClient();
      await client.del(key);
    } catch (error) {
      console.error('Cache del error:', error);
    }
  },

  async delPattern(pattern: string): Promise<void> {
    try {
      const client = await getRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      console.error('Cache delPattern error:', error);
    }
  },

  // News-specific cache methods
  news: {
    key: (category?: string, page?: number) =>
      `news:list:${category || 'all'}:${page || 1}`,

    async get(category?: string, page?: number): Promise<unknown | null> {
      return cache.get(this.key(category, page));
    },

    async set(value: unknown, category?: string, page?: number): Promise<void> {
      await cache.set(this.key(category, page), value, { ttl: NEWS_TTL });
    },

    async invalidate(): Promise<void> {
      await cache.delPattern('news:*');
    },
  },

  search: {
    key: (query: string, filters?: object) =>
      `search:${Buffer.from(JSON.stringify({ query, filters })).toString('base64')}`,

    async get(query: string, filters?: object): Promise<unknown | null> {
      return cache.get(this.key(query, filters));
    },

    async set(value: unknown, query: string, filters?: object): Promise<void> {
      await cache.set(this.key(query, filters), value, { ttl: SEARCH_TTL });
    },
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/services/cache.ts
git commit -m "feat(api): replace SQLite with Redis cache layer"
```

---

### Task 14: Integration - App.jsx com nova estrutura

**Files:**
- Modify: `packages/web/src/App.tsx`

- [ ] **Step 1: Update App.tsx**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { NewsCard } from './components/feed/NewsCard';
import { CategoryTabs } from './components/feed/CategoryTabs';
import { SearchModal } from './components/search/SearchModal';
import { SkeletonCard } from './components/ui/SkeletonCard';
import { Toast } from './components/ui/Toast';
import { useNews } from './hooks/useNews';
import type { NewsArticle } from '@fast-news/shared';
import './styles/animations.css';

function App() {
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [filters, setFilters] = useState({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { articles, loading, error, refetch, loadMore, hasMore } = useNews({
    category: activeCategory,
    ...filters,
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = useCallback((query: string, searchFilters: object) => {
    console.log('Searching:', query, searchFilters);
    setRecentSearches((prev) => [query, ...prev.filter((s) => s !== query)].slice(0, 5));
    // Implement search logic
  }, []);

  const handleBookmark = useCallback((id: string) => {
    setToast({ message: 'Article saved!', type: 'success' });
  }, []);

  const handleShare = useCallback((id: string) => {
    navigator.clipboard.writeText(window.location.href);
    setToast({ message: 'Link copied!', type: 'success' });
  }, []);

  const handleSummarize = useCallback((id: string) => {
    setToast({ message: 'Generating summary...', type: 'success' });
  }, []);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000 &&
        hasMore && !loading
      ) {
        loadMore();
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading, loadMore]);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Header
        onSearchOpen={() => setSearchOpen(true)}
        onSettingsOpen={() => setSettingsOpen(true)}
        onMenuToggle={() => setMenuOpen(!menuOpen)}
        isMenuOpen={menuOpen}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero Section - Featured Article */}
        {articles.length > 0 && (
          <section className="mb-8">
            <NewsCard article={articles[0]} variant="featured" />
          </section>
        )}

        {/* Category Tabs */}
        <section className="mb-6">
          <CategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </section>

        {/* Main Content */}
        <div className="flex gap-8">
          {/* Feed Grid */}
          <div className="flex-1">
            {error && (
              <div className="text-center py-12">
                <p className="text-red-400 mb-4">{error.message}</p>
                <button
                  onClick={refetch}
                  className="px-4 py-2 rounded-lg bg-accent-primary text-white hover:bg-accent-primary/80 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-reveal">
              {loading && articles.length === 0
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                : articles.slice(1).map((article) => (
                    <NewsCard
                      key={article.id}
                      article={article}
                      onBookmark={handleBookmark}
                      onShare={handleShare}
                      onSummarize={handleSummarize}
                    />
                  ))}
            </div>

            {loading && articles.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={`loading-${i}`} />
                ))}
              </div>
            )}

            {!hasMore && articles.length > 0 && (
              <p className="text-center py-8 text-text-secondary">
                You've reached the end
              </p>
            )}
          </div>

          {/* Sidebar */}
          <Sidebar
            onFilterChange={setFilters}
          />
        </div>
      </main>

      {/* Search Modal */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSearch={handleSearch}
        recentSearches={recentSearches}
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/App.tsx
git commit -m "feat(web): integrate all new components in App"
```

---

## Phase 6: Polish

### Task 15: Adicionar temas light/dark e otimizar mobile

**Files:**
- Create: `packages/web/src/hooks/useTheme.ts`
- Modify: `packages/web/src/index.css`

- [ ] **Step 1: Create useTheme.ts**

```typescript
import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'auto';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as Theme;
      return stored || 'auto';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    localStorage.setItem('theme', theme);

    const updateTheme = () => {
      const isDark =
        theme === 'dark' ||
        (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

      root.classList.toggle('dark', isDark);
      root.classList.toggle('light', !isDark);
    };

    updateTheme();

    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => updateTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'dark';
      return 'dark';
    });
  };

  return { theme, setTheme, toggleTheme };
}
```

- [ ] **Step 2: Update index.css with theme variables and responsive**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --bg-primary: #FAFAFA;
    --bg-secondary: #FFFFFF;
    --bg-tertiary: #F4F4F5;
    --text-primary: #0A0A0B;
    --text-secondary: #71717A;
    --border-subtle: rgba(0, 0, 0, 0.06);
  }

  .dark {
    --bg-primary: #0A0A0B;
    --bg-secondary: #141416;
    --bg-tertiary: #1C1C1F;
    --text-primary: #FAFAFA;
    --text-secondary: #A1A1A6;
    --border-subtle: rgba(255, 255, 255, 0.06);
  }
}

@layer utilities {
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

/* Mobile Optimizations */
@media (max-width: 768px) {
  .hide-mobile {
    display: none !important;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/hooks/useTheme.ts packages/web/src/index.css
git commit -m "feat(web): add dark/light theme system with auto detection"
```

---

## Summary

### Task Checklist

- [x] Task 1: Reorganizar estrutura do monorepo
- [x] Task 2: Design System Neo Editorial (Tailwind)
- [x] Task 3: CSS animations
- [x] Task 4: New RSS Sources (Big Techs, AI, Dev Tools, Gaming)
- [x] Task 5: Database schema updates
- [x] Task 6: MCP Server standalone
- [x] Task 7: NewsCard component
- [x] Task 8: CategoryTabs with animation
- [x] Task 9: SearchModal
- [x] Task 10: Sidebar with widgets
- [x] Task 11: Header redesign
- [x] Task 12: useNews hook
- [x] Task 13: Redis cache (no SQLite)
- [x] Task 14: App integration
- [x] Task 15: Theme system + mobile

### Files Created/Modified Summary

**Created:**
- `packages/shared/src/index.ts`
- `packages/shared/src/sources.ts`
- `packages/mcp/package.json`
- `packages/mcp/src/index.ts`
- `packages/mcp/src/tools/news.ts`
- `packages/mcp/tsconfig.json`
- `packages/web/src/components/feed/NewsCard.tsx`
- `packages/web/src/components/feed/CategoryTabs.tsx`
- `packages/web/src/components/search/SearchModal.tsx`
- `packages/web/src/components/layout/Sidebar.tsx`
- `packages/web/src/components/layout/Header.tsx`
- `packages/web/src/hooks/useNews.ts`
- `packages/web/src/hooks/useTheme.ts`
- `packages/web/src/styles/animations.css`

**Modified:**
- `package.json` (workspace config)
- `docker-compose.yml` (paths)
- `packages/api/src/services/ingestion.ts` (new feeds)
- `packages/api/src/database/schema.sql` (new table)
- `packages/api/src/services/cache.ts` (Redis)
- `packages/web/tailwind.config.js` (design system)
- `packages/web/src/App.tsx` (integration)
- `packages/web/src/index.css` (themes)

### Dependencies to Install

```bash
pnpm install
```
