/**
 * Builds the text that actually gets embedded.
 *
 * Embedding models see a hard character budget, so what goes into that budget
 * decides retrieval quality. We front-load the headline (never truncated), add
 * light metadata the query side also carries, then as much clean lead prose as
 * fits — cut on a sentence boundary so the vector never ends mid-word.
 * Pure module: no config, no network, no LLM.
 */

import { normalizeForMatch, stripHtml } from "./articleText.js";

export type EmbeddingTaskType = "document" | "query";

/** Strips markup, URLs, emails and boilerplate spacing from raw article text. */
export function cleanForEmbedding(raw = ""): string {
	return stripHtml(raw)
		.replace(/https?:\/\/\S+/g, " ")
		.replace(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, " ")
		.replace(/[ \t\u00a0]+/g, " ")
		.replace(/\s*\n\s*/g, "\n")
		.replace(/\n{2,}/g, "\n")
		.trim();
}

/** Truncates at the last sentence end (or word break) inside the budget. */
export function truncateOnBoundary(text: string, maxChars: number): string {
	if (text.length <= maxChars) return text;
	const window = text.slice(0, maxChars);
	const sentenceEnd = Math.max(
		window.lastIndexOf(". "),
		window.lastIndexOf("! "),
		window.lastIndexOf("? "),
		window.lastIndexOf(".\n"),
	);
	if (sentenceEnd > maxChars * 0.5) return window.slice(0, sentenceEnd + 1);
	const wordEnd = window.lastIndexOf(" ");
	return wordEnd > 0 ? window.slice(0, wordEnd) : window;
}

export interface EmbeddingTextInput {
	title: string;
	content?: string;
	source?: string;
	category?: string;
	/** Optional entity/keyword line (e.g. distilled by an LLM). */
	keywords?: string;
	maxChars?: number;
}

/**
 * Deterministic embedding text. The headline is always present in full: a
 * summarizer that fails, or a body that is mostly boilerplate, still yields a
 * vector that represents the story.
 */
export function buildEmbeddingText({
	title,
	content = "",
	source,
	category,
	keywords,
	maxChars = 2_000,
}: EmbeddingTextInput): string {
	const cleanTitle = cleanForEmbedding(title).slice(0, 300);
	const head = [cleanTitle];
	const meta = [category, source].filter(Boolean).join(" · ");
	if (meta) head.push(meta);
	if (keywords) {
		const cleanKeywords = cleanForEmbedding(keywords).slice(0, 400);
		// Skip a "summary" that merely echoes the headline — it wastes budget.
		if (
			cleanKeywords &&
			normalizeForMatch(cleanKeywords) !== normalizeForMatch(cleanTitle)
		)
			head.push(cleanKeywords);
	}

	const prefix = head.join("\n");
	const body = cleanForEmbedding(content);
	if (!body) return truncateOnBoundary(prefix, maxChars);

	const remaining = maxChars - prefix.length - 1;
	if (remaining <= 80) return truncateOnBoundary(prefix, maxChars);
	// Drop a body that just repeats the headline (very common in short feeds).
	if (normalizeForMatch(body) === normalizeForMatch(cleanTitle)) return prefix;

	return `${prefix}\n${truncateOnBoundary(body, remaining)}`;
}

/**
 * Asymmetric-model prefixes. nomic-embed-text and E5 are trained with distinct
 * document/query instructions — omitting them measurably degrades recall.
 */
export function embeddingPrefix(modelId = "", task: EmbeddingTaskType): string {
	const id = modelId.toLowerCase();
	if (id.includes("nomic-embed"))
		return task === "query" ? "search_query: " : "search_document: ";
	if (id.includes("e5")) return task === "query" ? "query: " : "passage: ";
	if (id.includes("bge") && task === "query")
		return "Represent this sentence for searching relevant passages: ";
	return "";
}

export function withEmbeddingPrefix(
	text: string,
	modelId: string,
	task: EmbeddingTaskType,
): string {
	const prefix = embeddingPrefix(modelId, task);
	if (!prefix || text.startsWith(prefix)) return text;
	return `${prefix}${text}`;
}

/** L2 normalization so cosine similarity is a plain dot product everywhere. */
export function normalizeVector(vector: number[]): number[] {
	let sumSquares = 0;
	for (const value of vector) sumSquares += value * value;
	const magnitude = Math.sqrt(sumSquares);
	if (!magnitude || !Number.isFinite(magnitude)) return vector;
	// Already unit length (most providers normalize) — avoid pointless work.
	if (Math.abs(magnitude - 1) < 1e-6) return vector;
	return vector.map((value) => value / magnitude);
}
