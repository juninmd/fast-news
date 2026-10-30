import { generateObject, type RepairTextFunction } from "ai";
import type { z } from "zod";
import { getCloudFallbackModel, getFastModel } from "./aiProvider.js";

/**
 * Runs generateObject against the primary (local/fast) model, falling back to a
 * cloud model on failure. Used by credibility/relevance scoring so both share one
 * fallback path instead of duplicating the try/catch chain.
 */
/**
 * Disjuntor por processo: quando primario e fallback falham varias vezes
 * seguidas (ex.: LiteLLM sem deployment ou cota estourada), as chamadas
 * seguintes do mesmo run falham rapido em vez de gastar timeout por artigo.
 * O processo do CronJob e novo a cada execucao, entao o estado nao vaza.
 */
const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 5 * 60_000;
let consecutiveFailures = 0;
let openUntil = 0;

export function isLlmUnavailable(): boolean {
	return Date.now() < openUntil;
}

function recordSuccess(): void {
	consecutiveFailures = 0;
	openUntil = 0;
}

function recordFailure(): void {
	consecutiveFailures += 1;
	if (consecutiveFailures >= FAILURE_THRESHOLD) {
		openUntil = Date.now() + COOLDOWN_MS;
		console.error(
			`[llm] ${consecutiveFailures} falhas seguidas; pausando chamadas por ${COOLDOWN_MS / 1000}s`,
		);
	}
}

export async function generateWithFallback<T>({
	schema,
	prompt,
	abortSignal,
	logTag,
	mode,
	maxTokens,
	repairText,
}: {
	schema: z.ZodType<T>;
	prompt: string;
	abortSignal?: AbortSignal;
	logTag: string;
	/** "json" suits pools where some backends never call tools. */
	mode?: "auto" | "json" | "tool";
	maxTokens?: number;
	repairText?: RepairTextFunction;
}): Promise<T | null> {
	if (isLlmUnavailable()) {
		return null;
	}
	const model = await getFastModel();
	try {
		const res = await generateObject({
			model,
			schema,
			prompt,
			abortSignal,
			mode,
			maxTokens,
			maxRetries: 0,
			experimental_repairText: repairText,
		});
		recordSuccess();
		return res.object;
	} catch (err) {
		console.warn(
			`[${logTag}] Primary model failed: ${(err as Error).message}. Attempting cloud fallback...`,
		);
		const fallbackModel = await getCloudFallbackModel();
		if (!fallbackModel) {
			console.error(`[${logTag}] No cloud fallback model available`);
			return null;
		}
		try {
			const res = await generateObject({
				model: fallbackModel,
				schema,
				prompt,
				abortSignal,
				mode,
				maxTokens,
				maxRetries: 0,
				experimental_repairText: repairText,
			});
			console.log(`[${logTag}] Analysis succeeded using cloud fallback model`);
			recordSuccess();
			return res.object;
		} catch (fallbackErr) {
			console.error(
				`[${logTag}] Cloud fallback model also failed:`,
				(fallbackErr as Error).message,
			);
			recordFailure();
			return null;
		}
	}
}
