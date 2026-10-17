import { embed, embedMany } from "ai";
import { config } from "../config/env.js";
import { getEmbeddingModel } from "./aiProvider.js";

/**
 * Embeddings go through a LiteLLM deployment that can enter cooldown; without a
 * deadline a cold model left the HTTP request hanging until the client gave up.
 * Ingestion passes its own signal, everything else (search, analyses) gets this one.
 */
function deadline(abortSignal?: AbortSignal): AbortSignal {
	return abortSignal ?? AbortSignal.timeout(config.ai.embeddingTimeoutMs);
}

export async function embedDocument(
	text: string,
	abortSignal?: AbortSignal,
): Promise<number[]> {
	const model = await getEmbeddingModel();
	// Caller treats embedding failure as best-effort (stores without vector).
	// The AI SDK's default retries are useless against a LiteLLM deployment
	// cooldown ("try again in 300 seconds") and were adding retry/backoff
	// overhead to every article during a rate-limited window, multiplying into
	// tens of minutes across a run and starving the CronJob's time budget.
	const { embedding } = await embed({
		model,
		value: text.slice(0, 2048),
		abortSignal: deadline(abortSignal),
		maxRetries: 0,
	});
	return embedding;
}

export async function embedQuery(text: string): Promise<number[]> {
	// AI SDK handles task type internally per provider
	return embedDocument(text);
}

export async function embedBatch(
	texts: string[],
	chunkSize = 20,
): Promise<number[][]> {
	const model = await getEmbeddingModel();
	const results: number[][] = [];

	for (let i = 0; i < texts.length; i += chunkSize) {
		const chunk = texts.slice(i, i + chunkSize).map((t) => t.slice(0, 2048));
		const { embeddings } = await embedMany({
			model,
			values: chunk,
			abortSignal: deadline(),
			maxRetries: 0,
		});
		results.push(...embeddings);
	}

	return results;
}

export function vectorToSQL(embedding: number[]): string {
	return `[${embedding.join(",")}]`;
}
