import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../config/env.js";
import { tryConsume } from "./llmBudget.js";

export function ttsEnabled(cfg = config.tts): boolean {
	return Boolean(cfg.apiUrl);
}

export function scriptHash(script: string): string {
	return createHash("sha1").update(script).digest("hex").slice(0, 16);
}

// OpenAI /audio/speech accepts up to 4096 characters of input.
const MAX_INPUT = 4000;

/**
 * Audio for a digest script from an OpenAI-compatible TTS endpoint, cached on
 * disk by script hash: a given digest is synthesized once no matter how many
 * podcast clients fetch it. Returns null when disabled or over the daily cap.
 */
export async function synthesize(script: string): Promise<Buffer | null> {
	if (!ttsEnabled()) return null;
	const file = join(config.tts.cacheDir, `${scriptHash(script)}.mp3`);
	try {
		return await readFile(file);
	} catch {
		// not cached yet
	}
	if (!tryConsume("tts", config.tts.dailyLimit)) return null;
	const res = await fetch(
		`${config.tts.apiUrl.replace(/\/$/, "")}/audio/speech`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(config.tts.apiKey
					? { Authorization: `Bearer ${config.tts.apiKey}` }
					: {}),
			},
			body: JSON.stringify({
				model: config.tts.model,
				voice: config.tts.voice,
				input: script.slice(0, MAX_INPUT),
				response_format: "mp3",
			}),
		},
	);
	if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
	const audio = Buffer.from(await res.arrayBuffer());
	await mkdir(config.tts.cacheDir, { recursive: true });
	await writeFile(file, audio);
	return audio;
}
