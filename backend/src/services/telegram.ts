import { Context, Telegraf } from "telegraf";
import { config } from "../config/env.js";
import { query } from "../database/client.js";
import { getFastModel } from "./aiProvider.js";
import { analyzeTopicWithRAG, getAllTrackedTopics } from "./analysis.js";
import { getStoryGraph, listActiveStories } from "./correlation.js";
import { getActiveOpportunities } from "./financial.js";
import { fetchFullArticle } from "./fullArticle.js";
import { generateGlobalPulse } from "./intelligence.js";
import { searchSimilarArticles } from "./rag.js";
import {
	CATEGORY_EMOJI,
	escapeHtml,
	formatPublishedAt,
	IMPACT_EMOJI,
	SEPARATOR,
	SIGNAL_EMOJI,
} from "./telegram_format.js";
import {
	buildCredibilityBlock,
	fetchRelatedArticles,
	generateArticleBlurb,
} from "./telegram_logic.js";
import type { TrendingVideo } from "./youtubeTrending.js";

const FAST_NEWS_URL = "https://fast-news.antonio-code.duckdns.org";
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
			/^fb:(like|dislike):(.+)$/i,
		);
		if (!match) return;
		const action = match[1];
		const articleId = match[2];
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
				{ text: `👍 Curtir (${likes})`, callback_data: `fb:like:${articleId}` },
				{
					text: `👎 Não curti (${dislikes})`,
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
	fakeNewsScore?: number | null;
	politicalBias?: string | null;
	isMilitant?: boolean;
	hasIncoherence?: boolean;
	credibilityFlags?: string[];
	credibilityReasoning?: string | null;
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
		fakeNewsScore: number | null;
		politicalBias: string | null;
		isMilitant: boolean;
		hasIncoherence: boolean;
		credibilityFlags: string[] | null;
		credibilityReasoning: string | null;
		storyId: string | null;
		sentiment: string | null;
	}>(
		`SELECT na.id, na.title, na.url, na.source, na.category, na.company,
            na.content, na.published_at AS "publishedAt", na.image_url AS "imageUrl",
            na.fake_news_score AS "fakeNewsScore", na.political_bias AS "politicalBias",
            na.is_militant AS "isMilitant", na.has_incoherence AS "hasIncoherence",
            na.credibility_flags AS "credibilityFlags",
            na.credibility_reasoning AS "credibilityReasoning",
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
		credibilityFlags: article.credibilityFlags ?? [],
	};
}

export function safeTruncateHtml(html: string, limit: number): string {
	if (html.length <= limit) return html;

	let truncIdx = limit;

	// Avoid cutting inside an HTML tag: < ... >
	const lastOpenBracket = html.lastIndexOf("<", truncIdx - 1);
	const lastCloseBracket = html.lastIndexOf(">", truncIdx - 1);
	if (lastOpenBracket > lastCloseBracket) {
		truncIdx = lastOpenBracket;
	}

	// Avoid cutting inside an HTML entity: & ... ;
	const lastAmpersand = html.lastIndexOf("&", truncIdx - 1);
	const lastSemicolon = html.lastIndexOf(";", truncIdx - 1);
	if (lastAmpersand > lastSemicolon && truncIdx - lastAmpersand < 10) {
		truncIdx = lastAmpersand;
	}

	let truncated = html.slice(0, truncIdx);

	// Close any tags left open
	const tagRegex = /<\/?([a-z1-6]+)(?:\s+[^>]*?)?>/gi;
	const openTags: string[] = [];
	let match;

	while ((match = tagRegex.exec(truncated)) !== null) {
		const isClose = match[0].startsWith("</");
		const tagName = match[1].toLowerCase();

		if (isClose) {
			const lastOpenIdx = openTags.lastIndexOf(tagName);
			if (lastOpenIdx !== -1) {
				openTags.splice(lastOpenIdx, 1);
			}
		} else {
			const voidTags = ["img", "br", "hr", "input", "meta", "link"];
			if (!voidTags.includes(tagName)) {
				openTags.push(tagName);
			}
		}
	}

	for (let i = openTags.length - 1; i >= 0; i--) {
		truncated += `</${openTags[i]}>`;
	}

	return truncated;
}

export async function postArticleToTelegram(
	article: TelegramArticle,
): Promise<void> {
	if (
		!config.telegramEnabled ||
		!config.telegramBotToken ||
		!config.telegramChatIds.length
	)
		return;
	const activeStories = await listActiveStories(50).catch(() => []);
	const storyMap = new Map(activeStories.map((s) => [s.id, s]));
	const displayTitle = article.title;
	const displayBlurb = article.content
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, FALLBACK_SUMMARY_MAX_LEN);
	const { label: ago, isBreaking: isTimeRecent } = formatPublishedAt(
		article.publishedAt,
	);
	const matchedStory = article.storyId ? storyMap.get(article.storyId) : null;
	const isBreaking =
		isTimeRecent &&
		!!(
			matchedStory &&
			(matchedStory.impactLevel === "critical" ||
				matchedStory.impactLevel === "high")
		);
	const storyGraph = matchedStory
		? await getStoryGraph(matchedStory.id).catch(() => null)
		: null;
	let storyBlock = "";
	if (matchedStory) {
		storyBlock = `\n\n${SEPARATOR}\n${IMPACT_EMOJI[matchedStory.impactLevel] ?? "📊"}${matchedStory.financialSignal && matchedStory.financialSignal !== "neutral" ? ` ${SIGNAL_EMOJI[matchedStory.financialSignal]}` : ""} <b>${escapeHtml(matchedStory.title)}</b>\n<i>Parte de uma história com ${matchedStory.articleCount} reportagens</i>`;
		if (matchedStory.affectedAssets?.length)
			storyBlock += `\n💹 <code>${matchedStory.affectedAssets.slice(0, 4).join(" · ")}</code>`;
		if (matchedStory.summary)
			storyBlock += `\n\n${escapeHtml(matchedStory.summary.slice(0, 250))}`;
		const whatChanged = storyGraph?.timeline.at(-1)?.whatChanged ?? "";
		if (whatChanged)
			storyBlock += `\n🔄 <i>${escapeHtml(whatChanged.slice(0, 160))}</i>`;
	}

	const related = await fetchRelatedArticles(article.id, article.category);
	const relatedBlock = related.length
		? `\n\n${SEPARATOR}\n🔗 <b>Você também pode se interessar por</b>\n${related.map((r) => `• <a href="${r.url}">${escapeHtml(r.title.slice(0, 72))}</a>`).join("\n")}`
		: "";

	const wordCount = (article.fullContent || article.content || "").split(
		/\s+/,
	).length;
	const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));
	const readTimeLabel = `  ·  ⏱️ <i>${readTimeMin} min de leitura</i>`;

	const breakingLabel = isBreaking ? `🔴 <b>URGENTE</b>\n` : "";
	const sourceHeader = `${CATEGORY_EMOJI[article.category] ?? "📰"} <b>${article.category.toUpperCase()}</b>  ·  ${article.company && article.company !== article.source ? `${article.company} · ` : ""}${article.source}`;
	const metaLine = `${ago ? `🕒 <i>${ago}</i>` : ""}${readTimeLabel}`.trim();

	let sentimentLabel = "";
	if (article.sentiment) {
		const s = article.sentiment.toLowerCase();
		if (s === "positive" || s === "bullish")
			sentimentLabel = "\n🎭 <b>Sentimento:</b> Otimista 🟢";
		else if (s === "negative" || s === "bearish")
			sentimentLabel = "\n🎭 <b>Sentimento:</b> Pessimista 🔴";
		else if (s === "neutral")
			sentimentLabel = "\n🎭 <b>Sentimento:</b> Neutro ⚪";
	}

	const sourceHashtag = `#${(article.company || article.source).replace(/\W+/g, "_")}`;
	const layoutFooterTags = `#${article.category.replace(/\W/g, "_")} ${sourceHashtag}`;
	const message = `${breakingLabel}${sourceHeader}${metaLine ? `\n${metaLine}` : ""}\n${SEPARATOR}\n<b>${escapeHtml(displayTitle)}</b>${sentimentLabel}\n\n<i>${escapeHtml(displayBlurb)}</i>${buildCredibilityBlock(article)}${storyBlock}${relatedBlock}\n\n${SEPARATOR}\n${layoutFooterTags}`;

	const inlineButtons = [
		[
			{ text: "👍 Curtir (0)", callback_data: `fb:like:${article.id}` },
			{ text: "👎 Não curti (0)", callback_data: `fb:dislike:${article.id}` },
		],
		[{ text: "📝 Resumir", callback_data: `sum:${article.id}` }],
		[
			{ text: "📖 Ler reportagem", url: article.url },
			{ text: "📱 Fast News", url: `${FAST_NEWS_URL}/?id=${article.id}` },
		],
	];
	if (matchedStory)
		inlineButtons.push([
			{
				text: "🕸 Ver grafo",
				url: `${FAST_NEWS_URL}/?view=stories&story=${matchedStory.id}`,
			},
		]);
	const sendOpts = {
		parse_mode: "HTML" as const,
		link_preview_options: {
			url: article.imageUrl ?? article.url,
			prefer_large_media: true,
			show_above_text: true,
		},
		reply_markup: { inline_keyboard: inlineButtons },
	};
	await Promise.allSettled(
		config.telegramChatIds.map((chatId) =>
			getBot().telegram.sendMessage(
				chatId,
				safeTruncateHtml(message, 3800),
				sendOpts,
			),
		),
	);
	await query(
		`UPDATE news_articles SET telegram_sent_at = NOW() WHERE id = $1`,
		[article.id],
	).catch(console.error);
}

export async function skipArticleFromTelegram(
	articleId: string,
): Promise<void> {
	await query(
		`UPDATE news_articles SET telegram_skipped_at = NOW() WHERE id = $1`,
		[articleId],
	).catch(console.error);
}

export async function isSimilarArticleAlreadySent(
	articleId: string,
): Promise<boolean> {
	try {
		const threshold = config.telegram.similarThreshold;
		const interval = config.telegram.similarInterval;
		const res = await query<{ title: string; similarity: number }>(
			`SELECT na.title, 1 - (na.embedding <=> curr.embedding) AS similarity
			 FROM news_articles na
			 JOIN news_articles curr ON curr.id = $1
			 WHERE na.telegram_sent_at > NOW() - CAST($2 AS INTERVAL)
			   AND na.id != $1
			   AND na.embedding IS NOT NULL
			   AND curr.embedding IS NOT NULL
			   AND 1 - (na.embedding <=> curr.embedding) >= $3
			 ORDER BY na.embedding <=> curr.embedding
			 LIMIT 1`,
			[articleId, interval, threshold],
		);
		if (res.rows.length > 0) {
			console.log(
				`[Telegram] Article ${articleId} skipped. Similar article already sent: "${res.rows[0].title}" (similarity: ${res.rows[0].similarity.toFixed(3)})`,
			);
			return true;
		}
	} catch (err) {
		console.warn(
			"[Telegram] Error checking similar articles sent:",
			(err as Error).message,
		);
	}
	return false;
}

export async function postNewArticles(
	articles: TelegramArticle[],
): Promise<void> {
	for (const article of articles) {
		await postArticleToTelegram(article);
		await new Promise((r) => setTimeout(r, 1500));
	}
}
const VIEWS_FORMAT = new Intl.NumberFormat("pt-BR", {
	notation: "compact",
	maximumFractionDigits: 1,
});

export async function sendTrendingVideoCards(
	videos: TrendingVideo[],
): Promise<void> {
	if (
		!config.telegramEnabled ||
		!config.telegramBotToken ||
		!config.telegramChatIds.length
	)
		return;
	for (const video of videos) {
		const regionLabel = video.region === "BR" ? "🇧🇷 Brasil" : "🌍 Mundo";
		const desc = video.description.replace(/\s+/g, " ").slice(0, 250);
		const message = `🎬 <b>EM ALTA NO YOUTUBE</b>  ·  ${regionLabel} #${video.rank}\n${SEPARATOR}\n<b>${escapeHtml(video.title)}</b>\n📺 ${escapeHtml(video.channel)}  ·  👁 ${VIEWS_FORMAT.format(video.views)} views${desc ? `\n\n<i>${escapeHtml(desc)}</i>` : ""}`;
		const sendOpts = {
			parse_mode: "HTML" as const,
			link_preview_options: {
				url: video.url,
				prefer_large_media: true,
				show_above_text: true,
			},
			reply_markup: {
				inline_keyboard: [[{ text: "▶️ Assistir no YouTube", url: video.url }]],
			},
		};
		const results = await Promise.allSettled(
			config.telegramChatIds.map((chatId) =>
				getBot().telegram.sendMessage(chatId, message, sendOpts),
			),
		);
		results.forEach((r, i) => {
			if (r.status === "rejected")
				console.error(
					`[Telegram] Video card failed (chat ${config.telegramChatIds[i]}, ${video.region} #${video.rank}):`,
					(r.reason as Error).message,
				);
		});
		await new Promise((r) => setTimeout(r, 1500));
	}
}

export async function sendDigest(
	content: string,
	_topArticleUrl?: string,
): Promise<void> {
	if (
		!config.telegramEnabled ||
		!config.telegramBotToken ||
		!config.telegramChatIds.length
	)
		return;
	const chunks = content.match(/[\s\S]{1,3800}/g) ?? [];
	for (const chatId of config.telegramChatIds) {
		for (const chunk of chunks) {
			await getBot()
				.telegram.sendMessage(chatId, chunk, { parse_mode: "Markdown" })
				.catch(() => getBot().telegram.sendMessage(chatId, chunk));
			await new Promise((r) => setTimeout(r, 500));
		}
	}
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
	await b.telegram
		.deleteWebhook({ drop_pending_updates: true })
		.catch(() => {});

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
