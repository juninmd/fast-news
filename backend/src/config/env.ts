import "dotenv/config";
import cron from "node-cron";

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
	publicUrl: optional(
		"PUBLIC_URL",
		"https://fast-news.antonio-code.duckdns.org",
	),

	databaseUrl: required("DATABASE_URL"),

	// Mutating admin endpoints (OPML import, source edits). Unset = only open outside production.
	adminToken: optional("ADMIN_TOKEN", ""),

	// Push channels (all optional). Telegram stays on its own pipeline.
	notify: {
		discordWebhookUrl: optional("DISCORD_WEBHOOK_URL", ""),
		slackWebhookUrl: optional("SLACK_WEBHOOK_URL", ""),
		webhookUrl: optional("NOTIFY_WEBHOOK_URL", ""),
		// Apprise API (https://github.com/caronc/apprise-api): POST {urls|tag, body}.
		appriseUrl: optional("APPRISE_URL", ""),
		ntfyUrl: optional("NTFY_URL", ""),
		// Periods pushed by the periodic digest job, e.g. "daily,weekly". Empty = none.
		digestPeriods: optional("NOTIFY_DIGEST_PERIODS", "")
			.split(",")
			.map((p) => p.trim())
			.filter(Boolean),
	},

	// WebSub (PubSubHubbub): ping the hub when new articles land so subscribers are pushed.
	websub: {
		hubUrl: optional("WEBSUB_HUB_URL", ""),
	},

	// Optional LLM features are capped per process per day. 0 disables the feature.
	llmBudget: {
		translationPerDay: parseInt(optional("TRANSLATION_DAILY_LIMIT", "300"), 10),
		// Existing relevance scoring: 0 = unlimited (previous behavior).
		relevancePerDay: parseInt(optional("RELEVANCE_DAILY_LIMIT", "0"), 10),
	},

	// Server-side TTS for the podcast feed (OpenAI-compatible /audio/speech). Empty URL = disabled.
	tts: {
		apiUrl: optional("TTS_API_URL", ""),
		apiKey: optional("TTS_API_KEY", ""),
		model: optional("TTS_MODEL", "tts-1"),
		voice: optional("TTS_VOICE", "alloy"),
		cacheDir: optional("TTS_CACHE_DIR", "/tmp/fast-news-tts"),
		dailyLimit: parseInt(optional("TTS_DAILY_LIMIT", "6"), 10),
	},

	redisUrl: optional("REDIS_URL", "redis://localhost:6379"),

	// AI provider: 'ollama' | 'google' | 'openai' | 'anthropic'
	aiProvider: optional("AI_PROVIDER", "ollama"),

	ollama: {
		baseUrl: optional("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
		model: optional("OLLAMA_MODEL", "cloud/auto"),
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
	telegram: {
		similarThreshold: parseFloat(
			optional("TELEGRAM_SIMILAR_THRESHOLD", "0.82"),
		),
		similarInterval: optional("TELEGRAM_SIMILAR_INTERVAL", "24 hours"),
	},

	cron: {
		ingestion: optional("CRON_INGESTION", "*/30 * * * *"),
		learning: optional("CRON_LEARNING", "0 0 * * *"),
		digest: optional("CRON_DIGEST", "0 11 * * *"),
		digest4h: optional("CRON_DIGEST_4H", "0 */4 * * *"),
		digestWeekly: optional("CRON_DIGEST_WEEKLY", "0 11 * * 1"),
		digestMonthly: optional("CRON_DIGEST_MONTHLY", "0 11 1 * *"),
	},

	ingestion: {
		batchSize: parseInt(optional("INGESTION_BATCH_SIZE", "10"), 10),
		// Exact duplicates are dropped before any AI call, so a deep window only
		// costs a cheap lookup and keeps fast feeds from losing items between runs.
		maxArticlesPerFeed: parseInt(optional("MAX_ARTICLES_PER_FEED", "50"), 10),

		// Minimum relevance score (1-10) required to post an article to Telegram.
		relevanceThreshold: parseInt(optional("RELEVANCE_THRESHOLD", "6"), 10),
		feedFetchTimeoutMs: parseInt(
			optional("INGESTION_FEED_FETCH_TIMEOUT_MS", "12000"),
			10,
		),
		embedTruncateChars: parseInt(
			optional("INGESTION_EMBED_TRUNCATE_CHARS", "2000"),
			10,
		),
		// Gemini's free embedding tier allows 1000 requests/day and each chunk is
		// one request. 50 turns ~1400 articles/day into ~30 requests instead of 1400.
		embedBatchSize: parseInt(optional("INGESTION_EMBED_BATCH_SIZE", "50"), 10),
		ollamaProbeTimeoutMs: parseInt(
			optional("INGESTION_OLLAMA_PROBE_TIMEOUT_MS", "5000"),
			10,
		),
		// Embedding cosine at which two articles are the same story. Near
		// duplicates are kept and grouped, never dropped.
		storyMatchThreshold: parseFloat(optional("STORY_MATCH_THRESHOLD", "0.82")),
		storyWindowHours: parseInt(optional("STORY_WINDOW_HOURS", "72"), 10),
		// Articles whose feed carries no image get one og:image lookup, capped per run.
		ogImageMaxPerRun: parseInt(optional("INGESTION_OG_IMAGE_MAX", "150"), 10),
		// Articles stored without vector/image are retried at the start of each run.
		backfillBatch: parseInt(optional("INGESTION_BACKFILL_BATCH", "120"), 10),
		jobTimeoutMs: parseInt(
			optional("INGESTION_JOB_TIMEOUT_MS", String(25 * 60 * 1_000)),
			10,
		),
	},

	rag: {
		topK: parseInt(optional("RAG_TOP_K", "10"), 10),
		embeddingDimensions: parseInt(optional("EMBEDDING_DIMENSIONS", "768"), 10),
	},

	vectorStore: optional("VECTOR_STORE", "postgres") as
		| "qdrant"
		| "postgres"
		| "sqlite",

	qdrant: {
		url: optional("QDRANT_URL", "http://localhost:6333"),
		apiKey: optional("QDRANT_API_KEY", ""),
	},

	youtube: {
		apiKey: optional("YOUTUBE_API_KEY", ""),
		trendingLimit: parseInt(optional("YOUTUBE_TRENDING_LIMIT", "5"), 10),
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

	editions: {
		maxHeadlines: parseInt(optional("EDITION_MAX_HEADLINES", "350"), 10),
		perSource: parseInt(optional("EDITION_PER_SOURCE", "12"), 10),
		excludedCategories: optional(
			"EDITION_EXCLUDED_CATEGORIES",
			"Gaming,Games,Anime",
		)
			.split(",")
			.map((c) => c.trim())
			.filter(Boolean),
		aiTimeoutMs: parseInt(optional("EDITION_AI_TIMEOUT_MS", "300000"), 10),
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

	const nonNumericChatIds = config.telegramChatIds.filter(
		(id) => !/^-?\d+$/.test(id),
	);
	if (nonNumericChatIds.length > 0) {
		console.warn(
			`[config] TELEGRAM_CHAT_IDS contains non-numeric entries, they will be ignored by Telegram: ${nonNumericChatIds.join(", ")}`,
		);
	}

	for (const [name, expr] of Object.entries(config.cron)) {
		if (!cron.validate(expr)) {
			console.warn(
				`[config] Invalid cron expression for CRON_${name.toUpperCase()}: "${expr}" — the job will fail to schedule`,
			);
		}
	}
}
