-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- News articles with vector embeddings
CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guid TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  summary TEXT,
  url TEXT NOT NULL,
  source TEXT NOT NULL,
  category TEXT NOT NULL,
  company TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  embedding vector(768),
  sentiment FLOAT DEFAULT 0,
  importance_score FLOAT DEFAULT 0.5
);

CREATE INDEX IF NOT EXISTS idx_articles_published_at ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category ON news_articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_company ON news_articles(company);
CREATE INDEX IF NOT EXISTS idx_articles_embedding ON news_articles
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Source feeds management
CREATE TABLE IF NOT EXISTS source_feeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  url TEXT NOT NULL UNIQUE,
  category VARCHAR(50),
  company VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  last_fetched TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feeds_category ON source_feeds(category);
CREATE INDEX IF NOT EXISTS idx_feeds_company ON source_feeds(company);
CREATE INDEX IF NOT EXISTS idx_feeds_active ON source_feeds(is_active);

-- Tracked topics (e.g., "Guerra EUA vs Irã", "Petróleo")
CREATE TABLE IF NOT EXISTS tracked_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI analyses per topic (daily snapshots + on-demand)
CREATE TABLE IF NOT EXISTS ai_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES tracked_topics(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL, -- 'daily', 'impact', 'prediction', 'financial'
  content TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_topic ON ai_analyses(topic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_embedding ON ai_analyses
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- Accumulated knowledge/insights (learned over time)
CREATE TABLE IF NOT EXISTS knowledge_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic TEXT NOT NULL,
  insight TEXT NOT NULL,
  evidence_article_ids UUID[] DEFAULT '{}',
  confidence FLOAT DEFAULT 0.5,
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_topic ON knowledge_insights(topic);
CREATE INDEX IF NOT EXISTS idx_insights_embedding ON knowledge_insights
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- Financial opportunities detected from news
CREATE TABLE IF NOT EXISTS financial_opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES news_articles(id) ON DELETE SET NULL,
  analysis_id UUID REFERENCES ai_analyses(id) ON DELETE SET NULL,
  asset TEXT NOT NULL,
  asset_type TEXT NOT NULL, -- 'stock', 'commodity', 'crypto', 'forex', 'etf'
  direction TEXT NOT NULL, -- 'buy', 'sell', 'watch'
  reasoning TEXT NOT NULL,
  confidence FLOAT NOT NULL,
  time_horizon TEXT NOT NULL, -- 'short', 'medium', 'long'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_created ON financial_opportunities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_active ON financial_opportunities(is_active);

-- Seed default tracked topics
INSERT INTO tracked_topics (name, description, keywords) VALUES
  ('Guerra EUA vs Irã', 'Conflito geopolítico entre Estados Unidos e Irã', ARRAY['eua', 'irã', 'iran', 'guerra', 'conflito', 'oriente médio', 'sanções', 'nuclear']),
  ('Petróleo e Energia', 'Mercado de petróleo, gás e energia global', ARRAY['petróleo', 'oil', 'opep', 'brent', 'wti', 'energia', 'gás', 'combustível']),
  ('Política Brasileira', 'Cenário político no Brasil', ARRAY['lula', 'congresso', 'stf', 'política', 'governo', 'brasil', 'câmara', 'senado']),
  ('Economia Global', 'Tendências econômicas mundiais e mercados', ARRAY['economia', 'inflação', 'juros', 'fed', 'dólar', 'recessão', 'pib', 'mercado']),
  ('Inteligência Artificial', 'Avanços e impactos da IA', ARRAY['inteligência artificial', 'ia', 'chatgpt', 'openai', 'gemini', 'llm', 'machine learning'])
ON CONFLICT DO NOTHING;
