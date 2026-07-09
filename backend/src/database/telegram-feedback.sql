CREATE TABLE IF NOT EXISTS telegram_article_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  chat_id TEXT NOT NULL,
  user_id TEXT,
  username TEXT,
  reaction TEXT NOT NULL CHECK (reaction IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(article_id, chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_feedback_article
  ON telegram_article_feedback(article_id);

CREATE TABLE IF NOT EXISTS telegram_user_preferences (
  user_id TEXT PRIMARY KEY,
  preference_vector vector(768),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS telegram_user_blocklist (
  user_id TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, source)
);
