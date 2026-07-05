import { generateObject } from "ai";
import type { z } from "zod";
import { getCloudFallbackModel, getFastModel } from "./aiProvider.js";

/**
 * Runs generateObject against the primary (local/fast) model, falling back to a
 * cloud model on failure. Used by credibility/relevance scoring so both share one
 * fallback path instead of duplicating the try/catch chain.
 */
export async function generateWithFallback<T>({
	schema,
	prompt,
	abortSignal,
	logTag,
}: {
	schema: z.ZodType<T>;
	prompt: string;
	abortSignal?: AbortSignal;
	logTag: string;
}): Promise<T | null> {
	const model = await getFastModel();
	try {
		const res = await generateObject({ model, schema, prompt, abortSignal });
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
			});
			console.log(`[${logTag}] Analysis succeeded using cloud fallback model`);
			return res.object;
		} catch (fallbackErr) {
			console.error(
				`[${logTag}] Cloud fallback model also failed:`,
				(fallbackErr as Error).message,
			);
			return null;
		}
	}
}
