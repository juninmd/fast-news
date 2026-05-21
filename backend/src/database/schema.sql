CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
  importance_score FLOAT DEFAULT 0.5,
  fake_news_score FLOAT DEFAULT NULL,         -- 1 (credível) a 10 (muito suspeito)
  political_bias TEXT DEFAULT NULL,           -- 'neutral' | 'left' | 'far_left' | 'right' | 'far_right'
  is_militant BOOLEAN DEFAULT FALSE,          -- post de cunho militante/panfletário
  has_incoherence BOOLEAN DEFAULT FALSE,      -- contém informações incoerentes/contraditórias
  credibility_flags TEXT[] DEFAULT '{}',      -- flags: 'fake_news', 'lie', 'hypocrisy', 'incoherence', etc.
  credibility_reasoning TEXT DEFAULT NULL
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

-- Story clusters: groups of related articles covering the same evolving news story
CREATE TABLE IF NOT EXISTS news_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  summary TEXT,
  category TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'resolved', 'archived'
  impact_level TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  world_impact TEXT, -- LLM-generated world impact summary
  financial_signal TEXT, -- 'bullish', 'bearish', 'neutral'
  affected_assets TEXT[], -- tickers/assets affected
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  article_count INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_stories_category ON news_stories(category);
CREATE INDEX IF NOT EXISTS idx_stories_updated ON news_stories(last_updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_status ON news_stories(status);

-- Many-to-many: articles belonging to a story
CREATE TABLE IF NOT EXISTS story_articles (
  story_id UUID REFERENCES news_stories(id) ON DELETE CASCADE,
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'update', -- 'origin', 'update', 'reaction', 'resolution'
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (story_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_story_articles_story ON story_articles(story_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_articles_article ON story_articles(article_id);

-- Pairwise article similarity edges for the graph
CREATE TABLE IF NOT EXISTS article_relations (
  article_a UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  article_b UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  similarity FLOAT NOT NULL,
  relation_type TEXT DEFAULT 'similar', -- 'similar', 'continuation', 'reaction', 'contradiction'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (article_a, article_b)
);

CREATE INDEX IF NOT EXISTS idx_relations_a ON article_relations(article_a, similarity DESC);
CREATE INDEX IF NOT EXISTS idx_relations_b ON article_relations(article_b, similarity DESC);

ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS telegram_sent_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS credibility_reasoning TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_articles_telegram_unsent ON news_articles(created_at DESC) WHERE telegram_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_articles_unsent_credible ON news_articles(published_at DESC) WHERE telegram_sent_at IS NULL AND fake_news_score IS NOT NULL AND fake_news_score <= 6;
CREATE INDEX IF NOT EXISTS idx_articles_url ON news_articles(url);
CREATE INDEX IF NOT EXISTS idx_articles_fake_news ON news_articles(fake_news_score) WHERE fake_news_score IS NOT NULL;

CREATE TABLE IF NOT EXISTS story_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES news_stories(id) ON DELETE CASCADE,
  article_id UUID REFERENCES news_articles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'new_development', 'contradiction', 'resolution', 'escalation', 'impact_update'
  headline TEXT NOT NULL,
  what_changed TEXT, -- LLM diff: what's new vs previous state
  occurred_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_timeline_story ON story_timeline(story_id, occurred_at ASC);

INSERT INTO tracked_topics (name, description, keywords) VALUES
  ('Guerra EUA vs Irã', 'Conflito geopolítico entre Estados Unidos e Irã', ARRAY['eua', 'irã', 'iran', 'guerra', 'conflito', 'oriente médio', 'sanções', 'nuclear']),
  ('Petróleo e Energia', 'Mercado de petróleo, gás e energia global', ARRAY['petróleo', 'oil', 'opep', 'brent', 'wti', 'energia', 'gás', 'combustível']),
  ('Política Brasileira', 'Cenário político no Brasil', ARRAY['lula', 'congresso', 'stf', 'política', 'governo', 'brasil', 'câmara', 'senado']),
  ('Economia Global', 'Tendências econômicas mundiais e mercados', ARRAY['economia', 'inflação', 'juros', 'fed', 'dólar', 'recessão', 'pib', 'mercado']),
  ('Inteligência Artificial', 'Avanços e impactos da IA', ARRAY['inteligência artificial', 'ia', 'chatgpt', 'openai', 'gemini', 'llm', 'machine learning']),
  ('Engenharia de Software', 'Arquitetura, sistemas distribuídos e boas práticas', ARRAY['microservices', 'kubernetes', 'docker', 'arquitetura', 'backend', 'frontend', 'distributed systems', 'engineering']),
  ('Open Source', 'Projetos e comunidades open source', ARRAY['open source', 'rust', 'golang', 'typescript', 'linux', 'nodejs', 'github', 'contribuição']),
  ('Segurança', 'Cibersegurança, vulnerabilidades e privacidade', ARRAY['segurança', 'vulnerability', 'cve', 'hack', 'privacy', 'exploit', 'breach', 'zero-day']),
  ('Startups & VC', 'Ecossistema de startups e venture capital', ARRAY['startup', 'funding', 'series a', 'ipo', 'venture capital', 'unicorn', 'vc'])
ON CONFLICT DO NOTHING;
