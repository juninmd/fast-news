/**
 * Homologation harness for the ingestion quality changes.
 *
 * Runs against the real feed catalogue and reports, per provider, what the new
 * pipeline does differently from the old one: image coverage, how much feed
 * boilerplate is stripped, and (with --fulltext) whether fetched article bodies
 * pass the quality gate. Read-only — it never writes to the database, never
 * embeds and never posts anything.
 *
 *   pnpm tsx scripts/homolog-ingestion.ts                       # every feed
 *   pnpm tsx scripts/homolog-ingestion.ts --company="Folha,G1"  # subset
 *   pnpm tsx scripts/homolog-ingestion.ts --fulltext --sample=3 # + article bodies
 *   pnpm tsx scripts/homolog-ingestion.ts --json=report.json    # machine readable
 *
 * Flags: --company=<substrings>  --limit=<feeds>  --items=<per feed>
 *        --fulltext  --sample=<articles per feed>  --json=<path>  --verbose
 */

import { writeFileSync } from "node:fs";
import Parser from "rss-parser";
import { extractImageUrl } from "../src/services/articleImage.js";
import {
	isUsableArticleText,
	sanitizeFeedContent,
	stripHtml,
	titleCoverage,
} from "../src/services/articleText.js";
import { buildEmbeddingText } from "../src/services/embeddingText.js";
import { decodeFeedBuffer } from "../src/services/feedDecode.js";
import { FEED_SOURCES, type FeedSource } from "../src/services/feedSources.js";
import { fetchFullArticle } from "../src/services/fullArticle.js";

// ── CLI ──────────────────────────────────────────────────────────────────────

function flag(name: string): string | undefined {
	const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
	return hit?.slice(name.length + 3);
}
const has = (name: string): boolean => process.argv.includes(`--${name}`);

const options = {
	companies: (flag("company") ?? "")
		.split(",")
		.map((value) => value.trim().toLowerCase())
		.filter(Boolean),
	limit: Number.parseInt(flag("limit") ?? "0", 10),
	items: Number.parseInt(flag("items") ?? "10", 10),
	fullText: has("fulltext"),
	sample: Number.parseInt(flag("sample") ?? "2", 10),
	json: flag("json"),
	verbose: has("verbose"),
	concurrency: Number.parseInt(flag("concurrency") ?? "6", 10),
};

// ── Baseline: the pipeline as it was before this change ──────────────────────

const OLD_IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif)(\?.*)?$/i;

/** Previous image extraction: media:content `$`.url, media:content.url, enclosure.url. */
function oldExtractImageUrl(item: Record<string, unknown>): string | undefined {
	const media = item["mediaContent"] as
		| Record<string, unknown>
		| Record<string, unknown>[]
		| undefined;
	// The old parser had keepArray off, so media:content arrived as a single node.
	const single = Array.isArray(media) ? media[0] : media;
	const candidates = [
		(single as Record<string, Record<string, string>> | undefined)?.["$"]?.[
			"url"
		],
		(single as Record<string, string> | undefined)?.["url"],
		(item["enclosure"] as Record<string, string> | undefined)?.["url"],
	];
	for (const url of candidates) {
		if (typeof url === "string" && OLD_IMAGE_EXT_RE.test(url)) return url;
	}
	return undefined;
}

/** Previous content pick: contentSnippet ?? summary ?? content, stored verbatim. */
function oldContent(item: Record<string, unknown>): string {
	return (
		(item["contentSnippet"] as string | undefined) ??
		(item["summary"] as string | undefined) ??
		(item["content"] as string | undefined) ??
		""
	);
}

// ── New pipeline (mirrors backend/src/services/ingestion.ts) ─────────────────

const parser = new Parser({
	customFields: {
		item: [
			["media:content", "mediaContent", { keepArray: true }],
			["media:thumbnail", "mediaThumbnail", { keepArray: true }],
			["media:group", "mediaGroup"],
			["content:encoded", "contentEncoded"],
			["itunes:image", "itunesImage"],
			"image",
			"thumbnail",
			"enclosure",
		],
	},
});

/** Richest body the new pipeline picks, before sanitization. */
function newRawSource(item: Record<string, unknown>): string {
	return (
		(item["contentEncoded"] as string | undefined) ||
		(item["content"] as string | undefined) ||
		(item["summary"] as string | undefined) ||
		(item["contentSnippet"] as string | undefined) ||
		""
	);
}

function newContent(item: Record<string, unknown>): string {
	return sanitizeFeedContent(newRawSource(item));
}

// ── Metrics ──────────────────────────────────────────────────────────────────

interface FeedReport {
	company: string;
	url: string;
	ok: boolean;
	error?: string;
	items: number;
	imagesOld: number;
	imagesNew: number;
	imagesRecovered: number;
	imagesDropped: number;
	imagesUpgraded: number;
	droppedSamples: string[];
	upgradeSamples: Array<{ before: string; after: string }>;
	/** Items whose old stored content still carried raw HTML. */
	contentWithMarkup: number;
	/** Items whose source body carries a feed trailer the new cleaner removes. */
	contentWithTrailer: number;
	/** Chars of boilerplate removed from the same source body. */
	boilerplateRemoved: number;
	oldChars: number;
	newChars: number;
	emptyContent: number;
	/** Total chars of the text that would actually be embedded. */
	embedChars: number;
	embedSamples: string[];
	fullTextTried: number;
	fullTextAccepted: number;
	fullTextSamples: Array<{
		title: string;
		url: string;
		rssChars: number;
		bodyChars: number;
		accepted: boolean;
		coverage: number;
		head: string;
	}>;
}

const TRAILER_RE =
	/\b(the post|o post|o artigo)\b[\s\S]*?\b(appeared first on|apareceu primeiro em)\b|\bcontinue (lendo|reading)\b|\b(leia (mais|também|tambem)|read more)\b\s*[:.]?\s*https?:\/\//i;

async function fetchFeedXml(url: string): Promise<string> {
	const response = await fetch(url, {
		signal: AbortSignal.timeout(20_000),
		headers: { "User-Agent": "FastNews/1.0 (homologation)" },
	});
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	return decodeFeedBuffer(
		await response.arrayBuffer(),
		response.headers.get("content-type") ?? "",
	);
}

async function homologateFeed(source: FeedSource): Promise<FeedReport> {
	const report: FeedReport = {
		company: source.company ?? new URL(source.url).hostname,
		url: source.url,
		ok: false,
		items: 0,
		imagesOld: 0,
		imagesNew: 0,
		imagesRecovered: 0,
		imagesDropped: 0,
		imagesUpgraded: 0,
		droppedSamples: [],
		upgradeSamples: [],
		contentWithMarkup: 0,
		contentWithTrailer: 0,
		boilerplateRemoved: 0,
		oldChars: 0,
		newChars: 0,
		emptyContent: 0,
		embedChars: 0,
		embedSamples: [],
		fullTextTried: 0,
		fullTextAccepted: 0,
		fullTextSamples: [],
	};

	let feed: Awaited<ReturnType<typeof parser.parseString>>;
	try {
		feed = await parser.parseString(await fetchFeedXml(source.url));
	} catch (err) {
		report.error = (err as Error).message.slice(0, 120);
		return report;
	}
	report.ok = true;

	const items = (feed.items ?? []).slice(0, options.items);
	report.items = items.length;

	for (const item of items) {
		const record = item as unknown as Record<string, unknown>;
		const link = (record["link"] as string | undefined) ?? "";

		const before = oldExtractImageUrl(record);
		const after = extractImageUrl(record, link || undefined);
		if (before) report.imagesOld++;
		if (after) report.imagesNew++;
		if (!before && after) report.imagesRecovered++;
		if (before && !after) {
			report.imagesDropped++;
			if (report.droppedSamples.length < 3) report.droppedSamples.push(before);
		}
		if (before && after && before !== after) {
			report.imagesUpgraded++;
			if (report.upgradeSamples.length < 2)
				report.upgradeSamples.push({ before, after });
		}

		const rawOld = oldContent(record);
		const rawSource = newRawSource(record);
		const cleaned = newContent(record);
		report.oldChars += rawOld.length;
		report.newChars += cleaned.length;
		// Boilerplate is measured inside the same body: plain text before the
		// cleaner vs after it. Comparing against the old field would mix in the
		// extra content:encoded body the old pipeline never read.
		report.boilerplateRemoved += Math.max(
			0,
			stripHtml(rawSource).length - cleaned.length,
		);
		if (/<[a-z][^>]*>/i.test(rawOld)) report.contentWithMarkup++;
		if (TRAILER_RE.test(stripHtml(rawSource))) report.contentWithTrailer++;
		if (!cleaned) report.emptyContent++;

		// What the vector is actually built from — the end of the whole chain.
		const embedText = buildEmbeddingText({
			title: (record["title"] as string | undefined) ?? "",
			content: cleaned,
			source: report.company,
			category: source.category,
		});
		report.embedChars += embedText.length;
		if (report.embedSamples.length < 1)
			report.embedSamples.push(embedText.replace(/\n/g, " ⏎ ").slice(0, 260));
	}

	if (options.fullText) {
		for (const item of items.slice(0, options.sample)) {
			const record = item as unknown as Record<string, unknown>;
			const url = (record["link"] as string | undefined) ?? "";
			const title = (record["title"] as string | undefined) ?? "";
			if (!url) continue;
			report.fullTextTried++;
			const rss = newContent(record);
			const body = await fetchFullArticle(url, { title, fallback: rss });
			// fetchFullArticle already falls back to the RSS summary when the page
			// fails the gate — a longer result means a real body came back.
			const accepted =
				body.length > rss.length && isUsableArticleText(body, { title });
			if (accepted) report.fullTextAccepted++;
			report.fullTextSamples.push({
				title: title.slice(0, 90),
				url,
				rssChars: rss.length,
				bodyChars: body.length,
				accepted,
				coverage: Number(titleCoverage(body, title).toFixed(2)),
				head: body.slice(0, 220).replace(/\s+/g, " "),
			});
		}
	}

	return report;
}

// ── Runner ───────────────────────────────────────────────────────────────────

async function mapWithConcurrency<T, R>(
	items: T[],
	limit: number,
	fn: (item: T) => Promise<R>,
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let cursor = 0;
	const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
		(async () => {
			while (cursor < items.length) {
				const index = cursor++;
				results[index] = await fn(items[index] as T);
			}
		})(),
	);
	await Promise.all(workers);
	return results;
}

function pct(part: number, total: number): string {
	if (!total) return "—";
	return `${((part / total) * 100).toFixed(0)}%`;
}

function printReport(reports: FeedReport[]): void {
	const byCompany = new Map<string, FeedReport[]>();
	for (const report of reports) {
		const list = byCompany.get(report.company) ?? [];
		list.push(report);
		byCompany.set(report.company, list);
	}

	const HEAD = [
		"provedor".padEnd(28),
		"feeds".padStart(5),
		"itens".padStart(5),
		"img-antes".padStart(9),
		"img-depois".padStart(10),
		"novas".padStart(5),
		"trocadas".padStart(8),
		"perdidas".padStart(8),
		"html".padStart(5),
		"trailer".padStart(7),
		"lixo-".padStart(7),
		"conteudo".padStart(9),
	].join(" ");
	console.log(`\n${HEAD}`);
	console.log("─".repeat(HEAD.length));

	const line = (label: string, list: FeedReport[]): void => {
		const sum = (pick: (r: FeedReport) => number): number =>
			list.reduce((total, report) => total + pick(report), 0);
		const items = sum((r) => r.items);
		const oldChars = sum((r) => r.oldChars);
		const newChars = sum((r) => r.newChars);
		const delta =
			oldChars > 0
				? `${newChars >= oldChars ? "+" : ""}${(((newChars - oldChars) / oldChars) * 100).toFixed(0)}%`
				: "—";
		console.log(
			[
				label.padEnd(28),
				String(list.length).padStart(5),
				String(items).padStart(5),
				pct(
					sum((r) => r.imagesOld),
					items,
				).padStart(9),
				pct(
					sum((r) => r.imagesNew),
					items,
				).padStart(10),
				String(sum((r) => r.imagesRecovered)).padStart(5),
				String(sum((r) => r.imagesUpgraded)).padStart(8),
				String(sum((r) => r.imagesDropped)).padStart(8),
				String(sum((r) => r.contentWithMarkup)).padStart(5),
				String(sum((r) => r.contentWithTrailer)).padStart(7),
				String(sum((r) => r.boilerplateRemoved)).padStart(7),
				delta.padStart(9),
			].join(" "),
		);
	};

	for (const [company, list] of [...byCompany.entries()].sort((a, b) =>
		a[0].localeCompare(b[0]),
	)) {
		line(company, list);
	}
	console.log("─".repeat(HEAD.length));
	line("TOTAL", reports);

	console.log(
		"\nnovas = imagem que o extrator antigo não achava · trocadas = mesma notícia," +
			" URL melhor (resolução/slot) · perdidas = antes tinha, agora não · lixo- = chars de" +
			" boilerplate removidos · conteudo = variação do corpo armazenado",
	);

	const failures = reports.filter((r) => !r.ok);
	console.log(`\nFeeds inacessíveis: ${failures.length}/${reports.length}`);
	for (const failure of failures.slice(0, 20))
		console.log(`  ✗ ${failure.company} — ${failure.url} (${failure.error})`);

	const upgraded = reports.filter((r) => r.upgradeSamples.length);
	if (upgraded.length) {
		console.log("\nTrocas de imagem (conferir se a nova é melhor):");
		for (const report of upgraded.slice(0, 12)) {
			for (const sample of report.upgradeSamples) {
				console.log(`  ${report.company}`);
				console.log(`    antes:  ${sample.before}`);
				console.log(`    depois: ${sample.after}`);
			}
		}
	}

	const dropped = reports.filter((r) => r.imagesDropped > 0);
	if (dropped.length) {
		console.log(
			"\n⚠ Imagens descartadas pelo extrator novo (confirmar que são logo/pixel/thumb):",
		);
		for (const report of dropped.slice(0, 20)) {
			for (const url of report.droppedSamples)
				console.log(`  - ${report.company}: ${url}`);
		}
	}

	const empty = reports.filter((r) => r.emptyContent > 0);
	if (empty.length) {
		console.log("\n⚠ Itens sem conteúdo após a limpeza:");
		for (const report of empty.slice(0, 20))
			console.log(
				`  - ${report.company}: ${report.emptyContent}/${report.items} — ${report.url}`,
			);
	}

	if (options.verbose) {
		console.log("\nTexto que alimenta o embedding (amostra por provedor):");
		for (const report of reports) {
			for (const sample of report.embedSamples)
				console.log(`  ${report.company}: ${sample}…`);
		}
	}

	if (options.fullText) {
		const total = (pick: (r: FeedReport) => number): number =>
			reports.reduce((sum, report) => sum + pick(report), 0);
		const tried = total((r) => r.fullTextTried);
		const accepted = total((r) => r.fullTextAccepted);
		console.log(
			`\nTexto completo: ${accepted}/${tried} aprovados no portão de qualidade (${pct(accepted, tried)});` +
				" os demais mantiveram o resumo do RSS em vez de gravar conteúdo de outra página.",
		);
		for (const report of reports) {
			for (const sample of report.fullTextSamples) {
				if (!options.verbose && sample.accepted) continue;
				console.log(
					`\n  [${sample.accepted ? "OK " : "RSS"}] ${report.company} — ${sample.title}`,
				);
				console.log(
					`        rss=${sample.rssChars}c corpo=${sample.bodyChars}c cobertura-titulo=${sample.coverage}`,
				);
				console.log(`        ${sample.head}…`);
			}
		}
	}
}

async function main(): Promise<void> {
	let feeds: FeedSource[] = FEED_SOURCES;
	if (options.companies.length) {
		feeds = feeds.filter((source) =>
			options.companies.some(
				(needle) =>
					(source.company ?? "").toLowerCase().includes(needle) ||
					source.url.toLowerCase().includes(needle),
			),
		);
	}
	if (options.limit > 0) feeds = feeds.slice(0, options.limit);

	console.log(
		`Homologando ${feeds.length} feed(s), até ${options.items} itens por feed` +
			(options.fullText
				? `, com texto completo em ${options.sample} artigo(s) por feed`
				: ""),
	);

	const started = Date.now();
	const reports = await mapWithConcurrency(
		feeds,
		options.concurrency,
		homologateFeed,
	);
	console.log(`Concluído em ${((Date.now() - started) / 1000).toFixed(1)}s`);

	printReport(reports);

	if (options.json) {
		writeFileSync(options.json, JSON.stringify(reports, null, 2));
		console.log(`\nRelatório JSON em ${options.json}`);
	}
}

main().catch((err) => {
	console.error("[homolog] falhou:", err);
	process.exit(1);
});
