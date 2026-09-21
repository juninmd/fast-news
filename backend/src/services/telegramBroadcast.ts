import { config } from "../config/env.js";
import { query } from "../database/client.js";
import { getArticleEmbedding } from "../database/vectorStore.js";
import { getStoryGraph, listActiveStories } from "./correlation.js";
import { FAST_NEWS_URL, getBot, type TelegramArticle } from "./telegram.js";
import {
	CATEGORY_EMOJI,
	escapeHtml,
	formatPublishedAt,
	IMPACT_EMOJI,
	SEPARATOR,
	SIGNAL_EMOJI,
} from "./telegram_format.js";
import { fetchRelatedArticles } from "./telegram_logic.js";
import type { TrendingVideo } from "./youtubeTrending.js";

const FALLBACK_SUMMARY_MAX_LEN = 200;

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
	const message = `${breakingLabel}${sourceHeader}${metaLine ? `\n${metaLine}` : ""}\n${SEPARATOR}\n<b>${escapeHtml(displayTitle)}</b>${sentimentLabel}\n\n<i>${escapeHtml(displayBlurb)}</i>${storyBlock}${relatedBlock}\n\n${SEPARATOR}\n${layoutFooterTags}`;

	const inlineButtons = [
		[
			{ text: "👍 [Like] (0)", callback_data: `fb:like:${article.id}` },
			{ text: "👎 [Dislike] (0)", callback_data: `fb:dislike:${article.id}` },
		],
		[
			{ text: "📝 Resumir", callback_data: `sum:${article.id}` },
			{ text: "🚫 [Excluir Portal]", callback_data: `fb:block:${article.id}` },
		],
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

	const articleEmbedding = await getArticleEmbedding(article.id);

	let blockedUsers = new Set<string>();
	let prefMap = new Map<string, number[]>();

	if (config.telegramChatIds.length > 0) {
		const stringChatIds = config.telegramChatIds.map((id) => String(id));
		const blockRes = await query<{ user_id: string }>(
			"SELECT user_id FROM telegram_user_blocklist WHERE source = $1 AND user_id = ANY($2::text[])",
			[article.source, stringChatIds],
		);
		blockedUsers = new Set(blockRes.rows.map((r) => String(r.user_id)));

		if (articleEmbedding) {
			const prefRes = await query<{
				user_id: string;
				preference_vector: string;
			}>(
				"SELECT user_id, preference_vector::text FROM telegram_user_preferences WHERE user_id = ANY($1::text[])",
				[stringChatIds],
			);
			for (const row of prefRes.rows) {
				if (row.preference_vector) {
					prefMap.set(String(row.user_id), JSON.parse(row.preference_vector));
				}
			}
		}
	}

	for (const chatId of config.telegramChatIds) {
		const chatIdStr = String(chatId);
		if (blockedUsers.has(chatIdStr)) {
			continue;
		}

		if (articleEmbedding) {
			const prefVector = prefMap.get(chatIdStr);
			if (prefVector) {
				const dotProduct = articleEmbedding.reduce(
					(sum, val, idx) => sum + val * (prefVector[idx] || 0),
					0,
				);

				const normA = Math.sqrt(
					articleEmbedding.reduce((sum, val) => sum + val * val, 0),
				);
				const normB = Math.sqrt(
					prefVector.reduce((sum, val) => sum + val * val, 0),
				);

				const similarity =
					normA > 0 && normB > 0 ? dotProduct / (normA * normB) : 0;

				// Optional threshold filter logic: if preference similarity is too low, skip
				// For now keeping threshold to a conservative 0.2 like previously considered
				if (similarity < 0.2) {
					continue;
				}
			}
		}

		try {
			await getBot().telegram.sendMessage(
				chatId,
				safeTruncateHtml(message, 3800),
				sendOpts,
			);
		} catch (err) {
			console.error(`[Telegram] Failed to send article to ${chatId}:`, err);
		}
	}

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
