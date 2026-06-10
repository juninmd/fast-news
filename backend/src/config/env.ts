import "dotenv/config";

function required(key: string): string {
	const value = process.env[key];
	if (!value) throw new Error(`Missing required env var: ${key}`);
	return value;
}

function optional(key: string, fallback: string): string {
	return process.env[key] ?? fallback;
}

export const config = {
	port: parseInt(optional("PORT", "3001"), 10),
	nodeEnv: optional("NODE_ENV", "development"),

	databaseUrl: required("DATABASE_URL"),
	redisUrl: optional("REDIS_URL", "redis://localhost:6379"),

	// AI provider: 'ollama' | 'google' | 'openai' | 'anthropic'
	aiProvider: optional("AI_PROVIDER", "ollama"),

	ollama: {
		baseUrl: optional("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
		model: optional("OLLAMA_MODEL", "gemma4"),
		embeddingModel: optional("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text"),
		// Separate URL for embeddings — use native Ollama (no /v1) to avoid
		// encoding_format:float rejection from LiteLLM OpenAI-compat proxies.
		// Defaults to stripping /v1 from baseUrl if not explicitly set.
		embeddingBaseUrl: optional("OLLAMA_EMBEDDING_BASE_URL", ""),
	},

	geminiApiKey: optional("GEMINI_API_KEY", ""),
	openaiApiKey: optional("OPENAI_API_KEY", ""),
	anthropicApiKey: optional("ANTHROPIC_API_KEY", ""),
	openrouterApiKey: optional("OPENROUTER_API_KEY", ""),
	openrouterModel: optional("OPENROUTER_MODEL", "anthropic/claude-3-haiku"),

	telegramBotToken: optional("TELEGRAM_BOT_TOKEN", ""),
	telegramEnabled: optional("TELEGRAM_ENABLED", "false") === "true",
	telegramBotMode: optional("TELEGRAM_BOT_MODE", "polling") as
		| "polling"
		| "webhook"
		| "none",
	telegramWebhookUrl: optional("TELEGRAM_WEBHOOK_URL", ""),
	telegramChatIds: optional("TELEGRAM_CHAT_IDS", "").split(",").filter(Boolean),
	telegramNewsCategories: optional("TELEGRAM_NEWS_CATEGORIES", "")
		.split(",")
		.map((c) => c.trim())
		.filter(Boolean),
	telegramMaxNewsPerRun: parseInt(
		optional("TELEGRAM_MAX_NEWS_PER_RUN", "0"),
		10,
	),
	telegramQueue: {
		name: optional("TELEGRAM_QUEUE_NAME", "telegram:posts"),
		attempts: parseInt(optional("TELEGRAM_QUEUE_ATTEMPTS", "5"), 10),
		backoffMs: parseInt(optional("TELEGRAM_QUEUE_BACKOFF_MS", "15000"), 10),
		// 1 message every ~2.5s to avoid Telegram throttle and reduce Ollama load.
		rateLimitMax: parseInt(optional("TELEGRAM_QUEUE_RATE_LIMIT_MAX", "1"), 10),
		rateLimitDurationMs: parseInt(
			optional("TELEGRAM_QUEUE_RATE_LIMIT_DURATION_MS", "2500"),
			10,
		),
	},

	cron: {
		ingestion: optional("CRON_INGESTION", "*/30 * * * *"),
		learning: optional("CRON_LEARNING", "0 0 * * *"),
		digest: optional("CRON_DIGEST", "0 11 * * *"),
	},

	ingestion: {
		batchSize: parseInt(optional("INGESTION_BATCH_SIZE", "10"), 10),
		maxArticlesPerFeed: parseInt(optional("MAX_ARTICLES_PER_FEED", "20"), 10),
		// When false, ingestion stores + embeds articles but skips per-article
		// credibility AI analysis (digest still works via embeddings/RAG).
		credibilityEnabled:
			optional("INGESTION_CREDIBILITY_ENABLED", "true") === "true",
		// Minimum relevance score (1-10) required to post an article to Telegram.
		relevanceThreshold: parseInt(optional("RELEVANCE_THRESHOLD", "6"), 10),
	},

	rag: {
		topK: parseInt(optional("RAG_TOP_K", "10"), 10),
		embeddingDimensions: parseInt(optional("EMBEDDING_DIMENSIONS", "768"), 10),
	},

	digest: {
		ragLimit: parseInt(optional("DIGEST_RAG_LIMIT", "20"), 10),
		newsLimit: parseInt(optional("DIGEST_NEWS_LIMIT", "10"), 10),
		storiesLimit: parseInt(optional("DIGEST_STORIES_LIMIT", "8"), 10),
		analysisTopicsLimit: parseInt(
			optional("DIGEST_ANALYSIS_TOPICS_LIMIT", "4"),
			10,
		),
		financialLimit: parseInt(optional("DIGEST_FINANCIAL_LIMIT", "5"), 10),
		maxTokens: parseInt(optional("DIGEST_MAX_TOKENS", "1800"), 10),
	},

	ai: {
		analysisModel: optional("ANALYSIS_MODEL", ""),
		fastModel: optional("FAST_MODEL", ""),
		embeddingModel: optional("EMBEDDING_MODEL", ""),
		embeddingTimeoutMs: parseInt(optional("EMBEDDING_TIMEOUT_MS", "45000"), 10),
		backgroundTaskTimeoutMs: parseInt(
			optional("AI_BACKGROUND_TASK_TIMEOUT_MS", "90000"),
			10,
		),
	},
} as const;

export function validateConfig(): void {
	// DATABASE_URL is required — required() already throws if missing, this makes it explicit at startup
	if (!process.env["DATABASE_URL"])
		throw new Error("Missing required env var: DATABASE_URL");
	if (config.telegramEnabled && !config.telegramBotToken) {
		console.warn(
			"[config] TELEGRAM_ENABLED=true but TELEGRAM_BOT_TOKEN is not set — Telegram will be disabled",
		);
	}
	if (config.telegramEnabled && !config.telegramChatIds.length) {
		console.warn(
			"[config] TELEGRAM_ENABLED=true but TELEGRAM_CHAT_IDS is empty — no messages will be sent",
		);
	}
	if (
		config.telegramEnabled &&
		config.telegramBotMode === "webhook" &&
		!config.telegramWebhookUrl
	) {
		console.warn(
			"[config] TELEGRAM_BOT_MODE=webhook but TELEGRAM_WEBHOOK_URL is not set — webhook cannot be registered",
		);
	}
}
