import 'dotenv/config';

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: parseInt(optional('PORT', '3001'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),

  databaseUrl: required('DATABASE_URL'),
  redisUrl: optional('REDIS_URL', 'redis://localhost:6379'),

  // AI provider: 'ollama' | 'google' | 'openai' | 'anthropic'
  aiProvider: optional('AI_PROVIDER', 'ollama'),

  ollama: {
    baseUrl: optional('OLLAMA_BASE_URL', 'http://localhost:11434/v1'),
    model: optional('OLLAMA_MODEL', 'llama3.2'),
    embeddingModel: optional('OLLAMA_EMBEDDING_MODEL', 'nomic-embed-text'),
  },

  geminiApiKey: optional('GEMINI_API_KEY', ''),
  openaiApiKey: optional('OPENAI_API_KEY', ''),
  anthropicApiKey: optional('ANTHROPIC_API_KEY', ''),

  telegramBotToken: required('TELEGRAM_BOT_TOKEN'),
  telegramChatIds: optional('TELEGRAM_CHAT_IDS', '').split(',').filter(Boolean),
  // Categorias de notícias para postar automaticamente
  telegramNewsCategories: optional('TELEGRAM_NEWS_CATEGORIES', 'Mundo,Negócios,Brasil')
    .split(',').filter(Boolean),
  telegramMaxNewsPerRun: parseInt(optional('TELEGRAM_MAX_NEWS_PER_RUN', '5'), 10),

  cron: {
    ingestion: optional('CRON_INGESTION', '*/30 * * * *'),
    learning: optional('CRON_LEARNING', '0 0 * * *'),
    digest: optional('CRON_DIGEST', '0 11 * * *'),
  },

  ingestion: {
    batchSize: parseInt(optional('INGESTION_BATCH_SIZE', '10'), 10),
    maxArticlesPerFeed: parseInt(optional('MAX_ARTICLES_PER_FEED', '20'), 10),
  },

  rag: {
    topK: parseInt(optional('RAG_TOP_K', '10'), 10),
    embeddingDimensions: parseInt(optional('EMBEDDING_DIMENSIONS', '768'), 10),
  },

  ai: {
    analysisModel: optional('ANALYSIS_MODEL', ''),
    fastModel: optional('FAST_MODEL', ''),
    embeddingModel: optional('EMBEDDING_MODEL', ''),
  },
} as const;
