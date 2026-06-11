import cron from "node-cron";
import { config } from "../config/env.js";
import { query } from "../database/client.js";
import { getFastModel } from "../services/aiProvider.js";
import {
	getAllTrackedTopics,
	getTopicLatestAnalysis,
} from "../services/analysis.js";
import { listActiveStories } from "../services/correlation.js";
import { getActiveOpportunities } from "../services/financial.js";
import { searchSimilarArticles } from "../services/rag.js";
import { sendDigest, sendTrendingVideoCards } from "../services/telegram.js";
import { getTrendingVideos } from "../services/youtubeTrending.js";
import { DIGEST_PROMPT, normalizeDigest } from "./digestFormat.js";
import { generateDigestText } from "./digestGeneration.js";

export async function buildAndSendDigest(): Promise<void> {
	console.log("[DigestJob] Building daily digest...");
	const { content, topUrl } = await buildDigestContent();
	await sendDigest(content, topUrl);
	console.log("[DigestJob] Digest sent.");

	const videos = await getTrendingVideos().catch(() => []);
	if (videos.length) {
		await sendTrendingVideoCards(videos);
		console.log(`[DigestJob] Sent ${videos.length} trending video cards.`);
	}
}

export async function buildDigestContent(): Promise<{
	content: string;
	topUrl?: string;
}> {
	const [topics, opportunities, ragArticles, activeStories] = await Promise.all(
		[
			getAllTrackedTopics().catch(() => []),
			getActiveOpportunities().catch(() => []) as Promise<
				Record<string, unknown>[]
			>,
			searchSimilarArticles(
				"principais notícias do dia",
				1,
				config.digest.ragLimit,
			).catch(() => []),
			listActiveStories(config.digest.storiesLimit).catch(() => []),
		],
	);

	// Fallback: if RAG returns nothing (embedding unavailable), query postgres directly
	let topArticles = ragArticles;
	if (!topArticles.length) {
		const res = await query<{
			id: string;
			title: string;
			url: string;
			source: string;
			category: string;
			content: string;
			published_at: string;
		}>(
			`SELECT id, title, url, source, category, content, published_at
       FROM news_articles
       WHERE created_at > NOW() - INTERVAL '8 hours'
       ORDER BY published_at DESC NULLS LAST
       LIMIT $1`,
			[config.digest.ragLimit],
		).catch(() => ({ rows: [] }));
		topArticles = res.rows.map((r) => ({
			...r,
			similarity: 0,
		})) as typeof ragArticles;
	}

	const JUNK_PATTERNS =
		/horóscopo|horoscopo|frase do dia|previsão para os \d+ signos|signo|tarot/i;

	const seenTitles = new Set<string>();
	const deduped = topArticles.filter((a) => {
		const key = a.title.toLowerCase().trim();
		if (seenTitles.has(key) || JUNK_PATTERNS.test(a.title)) return false;
		seenTitles.add(key);
		return true;
	});

	const newsSection = deduped
		.slice(0, config.digest.newsLimit)
		.map((a, i) => {
			const snippet =
				typeof a.content === "string" && a.content.length > 0
					? ` | Contexto: ${a.content.replace(/\s+/g, " ").slice(0, 200)}`
					: "";
			return `${i + 1}. ${a.title} — _${a.source}_${snippet}`;
		})
		.join("\n");

	const analysisSection: string[] = [];
	for (const topic of topics.slice(0, config.digest.analysisTopicsLimit)) {
		const analysis = await getTopicLatestAnalysis(topic.id);
		if (analysis) {
			const first = analysis.split("\n\n")[0] ?? "";
			analysisSection.push(
				`*${topic.name}:* ${first.replace(/[#*]/g, "").slice(0, 250)}`,
			);
		}
	}

	const usedAssets = new Set<string>();
	const financialSection = opportunities
		.filter((o) => {
			const key = String(o["asset"]).toLowerCase();
			if (usedAssets.has(key)) return false;
			usedAssets.add(key);
			return true;
		})
		.slice(0, config.digest.financialLimit)
		.map(
			(o) =>
				`${o["direction"] === "buy" ? "📈" : o["direction"] === "sell" ? "📉" : "👀"} *${o["asset"]}*: ${String(o["reasoning"]).slice(0, 100)}`,
		)
		.join("\n");

	const storiesSection =
		activeStories
			.filter((s) => s.articleCount > 1)
			.slice(0, config.digest.storiesLimit)
			.map((s) => {
				const impact =
					s.impactLevel === "critical"
						? "🚨"
						: s.impactLevel === "high"
							? "⚠️"
							: "📊";
				const assets = s.affectedAssets?.length
					? ` [${s.affectedAssets.slice(0, 3).join(", ")}]`
					: "";
				return `${impact} ${s.title}${assets} — ${s.articleCount} artigos`;
			})
			.join("\n") || "Sem histórias ativas.";

	const model = await getFastModel();
	const fullPrompt = DIGEST_PROMPT.replace(
		"{news}",
		newsSection || "Sem notícias.",
	)
		.replace("{stories}", storiesSection)
		.replace("{analyses}", analysisSection.join("\n\n") || "Sem análises.")
		.replace("{financial}", financialSection || "Sem oportunidades.")
		.replace(
			"{date}",
			new Date().toLocaleString("pt-BR", {
				day: "2-digit",
				month: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
				timeZone: "America/Sao_Paulo",
			}),
		);

	const text = await generateDigestText(model, fullPrompt);

	return { content: normalizeDigest(text), topUrl: topArticles[0]?.url };
}

let task: cron.ScheduledTask | null = null;

export function startDigestJob(): void {
	task = cron.schedule(config.cron.digest, async () => {
		await buildAndSendDigest().catch(console.error);
	});
	console.log(`[DigestJob] Scheduled: ${config.cron.digest}`);
}

export function stopDigestJob(): void {
	task?.stop();
	task = null;
}
