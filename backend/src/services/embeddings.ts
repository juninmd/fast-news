import { createHash } from "node:crypto";
import { embed, embedMany } from "ai";
import { config } from "../config/env.js";
import { getEmbeddingModel, getEmbeddingModelId } from "./aiProvider.js";
import { cacheGet, cacheSet } from "./cache.js";
import {
	type EmbeddingTaskType,
	normalizeVector,
	truncateOnBoundary,
	withEmbeddingPrefix,
} from "./embeddingText.js";

// Only query embeddings are cached: the same question is asked repeatedly,
// while each document is embedded once at ingestion and never again.
const QUERY_CACHE_TTL_SECONDS = 24 * 60 * 60;

function cacheKey(text: string, task: EmbeddingTaskType): string {
	const digest = createHash("sha256")
		.update(`${getEmbeddingModelId()}|${task}|${text}`)
		.digest("hex")
		.slice(0, 40);
	return `embed:${digest}`;
}

/**
 * Applies the model's task prefix and the configured character budget.
 * Truncation happens on a sentence boundary so a vector never ends mid-word.
 */
export function prepareEmbeddingInput(
	text: string,
	task: EmbeddingTaskType,
): string {
	const budget = config.ingestion.embedTruncateChars;
	const trimmed = truncateOnBoundary(text.replace(/\s+/g, " ").trim(), budget);
	return withEmbeddingPrefix(trimmed, getEmbeddingModelId(), task);
}

async function embedWithTask(
	text: string,
	task: EmbeddingTaskType,
	abortSignal?: AbortSignal,
): Promise<number[]> {
	const value = prepareEmbeddingInput(text, task);
	if (!value) throw new Error("Cannot embed empty text");

	const key = task === "query" ? cacheKey(value, task) : null;
	if (key) {
		const cached = await cacheGet<number[]>(key);
		if (cached?.length) return cached;
	}

	const model = await getEmbeddingModel();
	const { embedding } = await embed({ model, value, abortSignal });
	const normalized = normalizeVector(embedding);
	if (key) await cacheSet(key, normalized, QUERY_CACHE_TTL_SECONDS);
	return normalized;
}

export async function embedDocument(
	text: string,
	abortSignal?: AbortSignal,
): Promise<number[]> {
	return embedWithTask(text, "document", abortSignal);
}

export async function embedQuery(
	text: string,
	abortSignal?: AbortSignal,
): Promise<number[]> {
	// Asymmetric models need the query-side instruction, not the document one.
	return embedWithTask(text, "query", abortSignal);
}

export async function embedBatch(
	texts: string[],
	chunkSize = 20,
	task: EmbeddingTaskType = "document",
): Promise<number[][]> {
	const model = await getEmbeddingModel();
	const results: number[][] = [];

	for (let i = 0; i < texts.length; i += chunkSize) {
		const chunk = texts
			.slice(i, i + chunkSize)
			.map((text) => prepareEmbeddingInput(text, task));
		const { embeddings } = await embedMany({ model, values: chunk });
		results.push(...embeddings.map(normalizeVector));
	}

	return results;
}

export function vectorToSQL(embedding: number[]): string {
	return `[${embedding.join(",")}]`;
}
