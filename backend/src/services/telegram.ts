import { Context, Telegraf } from "telegraf";
import { config } from "../config/env.js";
import { query } from "../database/client.js";
import {
	getArticleEmbedding,
	updateUserPreference,
} from "../database/vectorStore.js";
import { getFastModel } from "./aiProvider.js";
import { analyzeTopicWithRAG, getAllTrackedTopics } from "./analysis.js";
import { listActiveStories } from "./correlation.js";
import { getActiveOpportunities } from "./financial.js";
import { fetchFullArticle } from "./fullArticle.js";
import { generateGlobalPulse } from "./intelligence.js";
import { searchSimilarArticles } from "./rag.js";
import {
	escapeHtml,
	IMPACT_EMOJI,
	SEPARATOR,
	SIGNAL_EMOJI,
} from "./telegram_format.js";
import { generateArticleBlurb } from "./telegram_logic.js";

/** Shared by the interactive bot (/stories) and telegramBroadcast.ts (article cards). */
export const FAST_NEWS_URL = "https://fast-news.antonio-code.duckdns.org";
const FALLBACK_SUMMARY_MAX_LEN = 200;
let bot: Telegraf | null = null;

export function getBot(): Telegraf {
	if (!config.telegramBotToken)
		throw new Error("TELEGRAM_BOT_TOKEN is not configured");
	if (!bot) {
		bot = new Telegraf(config.telegramBotToken);
		setupCommands(bot);
	}
	return bot;
}

function setupCommands(bot: Telegraf): void {
	const mainKeyboard = {
		keyboard: [
			[{ text: "🌌 Neo-Pulse" }, { text: "📰 Top Notícias" }],
			[{ text: "🔗 Histórias" }, { text: "📊 Tópicos" }],
			[{ text: "💰 Financeiro" }, { text: "❓ Ajuda" }],
		],
		resize_keyboard: true,
	};
	bot.start((ctx: Context) =>
		ctx.replyWithHTML(
			`🌌 <b>NEO-EDITORIAL INTEL</b>\n${SEPARATOR}\nO futuro do jornalismo financeiro está aqui.\n\nExplore o pulso do mercado através dos botões abaixo.\n\n<i>Sempre à frente do mercado.</i>`,
			{ reply_markup: mainKeyboard },
		),
	);
	bot.hears("🌌 Neo-Pulse", (ctx) => (ctx as any).replyWithCommand("/pulse"));
	bot.hears("📰 Top Notícias", (ctx) => (ctx as any).replyWithCommand("/news"));
	bot.hears("🔗 Histórias", (ctx) => (ctx as any).replyWithCommand("/stories"));
	bot.hears("📊 Tópicos", (ctx) => (ctx as any).replyWithCommand("/topics"));
	bot.hears("💰 Financeiro", (ctx) =>
		(ctx as any).replyWithCommand("/financial"),
	);
	bot.hears("❓ Ajuda", (ctx) => (ctx as any).replyWithCommand("/start"));
	bot.action(/^fb:(like|dislike|block):([0-9a-f-]{36})$/i, async (ctx) => {
		const match = (ctx.callbackQuery as { data?: string }).data?.match(
			/^fb:(like|dislike|block):(.+)$/i,
		);
		if (!match) return;
		const action = match[1];
		const articleId = match[2];

		if (action === "block") {
			const userId = ctx.from?.id ? String(ctx.from.id) : null;
			if (!userId) {
				await ctx.answerCbQuery("Erro: Usuário não identificado.");
				return;
			}
			const articleRes = await query<{ source: string }>(
				"SELECT source FROM news_articles WHERE id = $1",
				[articleId],
			);
			const source = articleRes.rows[0]?.source;
			if (source) {
				await query(
					"INSERT INTO telegram_user_blocklist (user_id, source) VALUES ($1, $2) ON CONFLICT DO NOTHING",
					[userId, source],
				).catch(console.error);
				await ctx.answerCbQuery(`Portal "${source}" bloqueado.`);
			} else {
				await ctx.answerCbQuery("Erro: Fonte não encontrada.");
			}
			return;
		}

		await saveFeedback(ctx, articleId, action as "like" | "dislike");
		await ctx.answerCbQuery(
			action === "like" ? "Preferência registrada." : "Dislike registrado.",
		);

		// Fetch updated counts for the keyboard
		const countRes = await query<{ likes: string; dislikes: string }>(
			`SELECT 
				COUNT(*) FILTER (WHERE reaction = 'like') AS likes, 
				COUNT(*) FILTER (WHERE reaction = 'dislike') AS dislikes 
			 FROM telegram_article_feedback 
			 WHERE article_id = $1`,
			[articleId],
		);
		const likes = countRes.rows[0]?.likes || "0";
		const dislikes = countRes.rows[0]?.dislikes || "0";

		// Update reply markup dynamically
		const oldKeyboard =
			(ctx.callbackQuery as any).message?.reply_markup?.inline_keyboard || [];
		const newKeyboard = [
			[
				{ text: `👍 [Like] (${likes})`, callback_data: `fb:like:${articleId}` },
				{
					text: `👎 [Dislike] (${dislikes})`,
					callback_data: `fb:dislike:${articleId}`,
				},
			],
			...oldKeyboard.slice(1),
		];

		await ctx
			.editMessageReplyMarkup({ inline_keyboard: newKeyboard })
			.catch(console.error);
	});
	bot.action(/^sum:([0-9a-f-]{36})$/i, async (ctx) => {
		const match = (ctx.callbackQuery as { data?: string }).data?.match(
			/^sum:(.+)$/i,
		);
		const articleId = match?.[1];
		if (!articleId) return;
		await ctx.answerCbQuery("Gerando resumo...");
		const article = await fetchTelegramArticle(articleId);
		if (!article) {
			await ctx.reply("❌ Notícia não encontrada.");
			return;
		}
		const fullContent =
			(await fetchFullArticle(article.url).catch(() => null)) ||
			article.content;
		const summary = await generateArticleBlurb(
			article.title,
			fullContent,
			article.category,
			await getFastModel(),
		);
		const text =
			summary ||
			article.content
				.replace(/\s+/g, " ")
				.trim()
				.slice(0, FALLBACK_SUMMARY_MAX_LEN);
		await ctx.replyWithHTML(
			`📝 <b>Resumo</b>\n${SEPARATOR}\n<b>${escapeHtml(article.title)}</b>\n\n<i>${escapeHtml(text)}</i>\n\n<a href="${article.url}">Ler reportagem</a>`,
			{ link_preview_options: { is_disabled: true } },
		);
	});
	bot.command("pulse", async (ctx: Context) => {
		await ctx.reply("🌌 Gerando Neo-Pulse Global...");
		try {
			const pulse = await generateGlobalPulse();
			await ctx.reply(pulse, { parse_mode: "Markdown" });
		} catch (err: any) {
			await ctx.reply(`❌ Falha ao gerar Pulse: ${err.message}`);
		}
	});
	bot.command("topics", async (ctx: Context) => {
		const topics = await getAllTrackedTopics();
		const list = topics.map((t) => `• <b>${t.name}</b>`).join("\n");
		await ctx.replyWithHTML(
			`📊 <b>TÓPICOS MONITORADOS</b>\n${SEPARATOR}\n${list}\n${SEPARATOR}`,
		);
	});
	bot.command("financial", async (ctx: Context) => {
		const opps = (await getActiveOpportunities()) as any[];
		if (!opps.length)
			return ctx.reply("📉 Nenhuma oportunidade ativa no momento.");
		const text = opps
			.slice(0, 6)
			.map(
				(o) =>
					`${o.direction === "buy" ? "📈" : "📉"} <b>${o.asset}</b>\n${o.reasoning.slice(0, 120)}...`,
			)
			.join("\n\n");
		await ctx.replyWithHTML(
			`💰 <b>OPORTUNIDADES FINANCEIRAS</b>\n${SEPARATOR}\n${text}\n${SEPARATOR}`,
		);
	});
	bot.command("news", async (ctx: Context) => {
		const articles = await searchSimilarArticles("principais notícias", 1, 8);
		const text = articles
			.map(
				(a, i) =>
					`${i + 1}. <b>${a.title.slice(0, 80)}</b>\n   📰 ${a.source} — <a href="${a.url}">ler</a>`,
			)
			.join("\n\n");
		await ctx.replyWithHTML(
			`📰 <b>TOP NOTÍCIAS</b>\n${SEPARATOR}\n${text || "Sem notícias recentes."}\n${SEPARATOR}`,
			{ link_preview_options: { is_disabled: true } },
		);
	});
	bot.command("analysis", async (ctx: Context) => {
		const args = (ctx.message as any).text.split(" ").slice(1).join(" ").trim();
		const topics = await getAllTrackedTopics();
		const topic = args
			? topics.find((t) => t.name.toLowerCase().includes(args.toLowerCase()))
			: topics[0];
		if (!topic) return ctx.reply("❌ Tópico não encontrado.");
		await ctx.reply("⏳ Analisando...");
		const analysis = await analyzeTopicWithRAG(topic);
		await sendLongMessage(ctx, analysis);
	});
	bot.command("stories", async (ctx: Context) => {
		const stories = await listActiveStories(8);
		if (!stories.length) return ctx.reply("📭 Nenhuma história ativa.");
		const text = stories
			.map(
				(s) =>
					`${IMPACT_EMOJI[s.impactLevel] ?? "📊"}${s.financialSignal ? ` ${SIGNAL_EMOJI[s.financialSignal]}` : ""} <b>${escapeHtml(s.title)}</b>\n   ${s.articleCount} artigos · ${escapeHtml(s.category)}`,
			)
			.join("\n\n");
		await ctx.replyWithHTML(
			`🔗 <b>HISTÓRIAS EM ANDAMENTO</b>\n${SEPARATOR}\n${text}\n${SEPARATOR}\n<a href="${FAST_NEWS_URL}/?view=stories">Ver grafo completo</a>`,
			{ link_preview_options: { is_disabled: true } },
		);
	});
	bot.command("ask", async (ctx: Context) => {
		const question = (ctx.message as any).text
			.split(" ")
			.slice(1)
			.join(" ")
			.trim();
		if (!question) return ctx.reply("❓ Use: /ask [pergunta]");
		const articles = await searchSimilarArticles(question, 7, 5);
		const text = articles
			.map((a) => `• [${a.title.slice(0, 70)}](${a.url}) — _${a.source}_`)
			.join("\n");
		await ctx.reply(
			`🔍 *Resultados para:* _${question}_\n\n${text || "Nenhum resultado."}`,
			{ parse_mode: "Markdown", link_preview_options: { is_disabled: true } },
		);
	});
}

async function saveFeedback(
	ctx: Context,
	articleId: string,
	reaction: "like" | "dislike",
): Promise<void> {
	const chatId = ctx.chat?.id ? String(ctx.chat.id) : null;
	const userId = ctx.from?.id ? String(ctx.from.id) : null;
	if (!chatId) {
		console.error("No chat_id found for telegram feedback");
		return;
	}
	await query(
		`INSERT INTO telegram_article_feedback (article_id, chat_id, user_id, username, reaction) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (article_id, chat_id, user_id) DO UPDATE SET reaction = EXCLUDED.reaction, updated_at = NOW()`,
		[articleId, chatId, userId, ctx.from?.username ?? null, reaction],
	).catch(console.error);

	if (userId) {
		const embedding = await getArticleEmbedding(articleId);
		if (embedding) {
			await updateUserPreference(userId, embedding, reaction);
		}
	}
}

export interface TelegramArticle {
	id: string;
	title: string;
	url: string;
	source: string;
	category: string;
	content: string;
	fullContent?: string;
	company?: string;
	publishedAt?: Date | null;
	imageUrl?: string | null;
	storyId?: string | null;
	sentiment?: string | null;
	relevanceScore?: number | null;
	relevanceReasoning?: string | null;
}

export async function fetchTelegramArticle(
	id: string,
): Promise<TelegramArticle | null> {
	const result = await query<{
		id: string;
		title: string;
		url: string;
		source: string;
		category: string;
		company: string | null;
		content: string;
		publishedAt: Date | null;
		imageUrl: string | null;
		storyId: string | null;
		sentiment: string | null;
	}>(
		`SELECT na.id, na.title, na.url, na.source, na.category, na.company,
            na.content, na.published_at AS "publishedAt", na.image_url AS "imageUrl",
            sa.story_id AS "storyId",
            na.sentiment AS "sentiment"
     FROM news_articles na
     LEFT JOIN LATERAL (
       SELECT story_id FROM story_articles WHERE article_id = na.id LIMIT 1
     ) sa ON true
     WHERE na.id = $1`,
		[id],
	);
	const article = result.rows[0];
	if (!article) return null;
	return {
		...article,
		company: article.company ?? undefined,
		imageUrl: article.imageUrl ?? undefined,
		storyId: article.storyId ?? undefined,
	};
}

async function sendLongMessage(ctx: Context, text: string): Promise<void> {
	const chunks = text.match(/[\s\S]{1,4000}/g) ?? [];
	for (const chunk of chunks)
		await ctx
			.reply(chunk, { parse_mode: "HTML" })
			.catch(() => ctx.reply(chunk));
}
export async function startBot(): Promise<void> {
	if (!config.telegramEnabled || !config.telegramBotToken) return;

	const b = getBot();

	if (config.telegramBotMode === "webhook") {
		if (!config.telegramWebhookUrl) {
			console.warn(
				"[Telegram] TELEGRAM_BOT_MODE is webhook but TELEGRAM_WEBHOOK_URL is empty. Skipping webhook registration.",
			);
			return;
		}
		try {
			await b.telegram.setWebhook(config.telegramWebhookUrl);
			console.log(
				`[Telegram] Webhook registered successfully: ${config.telegramWebhookUrl}`,
			);
		} catch (err) {
			console.error(
				"[Telegram] Webhook registration failed:",
				(err as Error).message,
			);
		}
		return;
	}

	if (config.telegramBotMode === "none") {
		console.log("[Telegram] Bot update updates loop disabled (none mode).");
		return;
	}

	// Clear any stale webhook that may block polling
	await b.telegram.deleteWebhook({ drop_pending_updates: true }).catch(() => {
		// webhook may not exist yet; safe to ignore
	});

	async function launchWithRetry(attempt = 1): Promise<void> {
		try {
			await b.launch();
			console.log("[Telegram] Bot started successfully.");
		} catch (err) {
			const msg = (err as Error).message;
			console.error(`[Telegram] Bot launch attempt ${attempt} failed: ${msg}`);
			if (attempt < 5 && /409|Conflict/.test(msg)) {
				const delay = Math.min(1_000 * 2 ** (attempt - 1), 30_000);
				console.log(`[Telegram] Retrying in ${delay / 1000}s...`);
				await new Promise((r) => setTimeout(r, delay));
				return launchWithRetry(attempt + 1);
			}
			if (/401|Unauthorized/.test(msg)) {
				console.error("[Telegram] Invalid bot token — aborting.");
				return;
			}
		}
	}

	launchWithRetry().catch((e) =>
		console.error("[Telegram] Bot failed to start:", (e as Error).message),
	);
}
export async function stopBot(): Promise<void> {
	bot?.stop("SIGTERM");
}
