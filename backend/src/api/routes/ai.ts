import { generateText } from "ai";
import { type Request, Router } from "express";
import { config } from "../../config/env.js";
import { getFastModel } from "../../services/aiProvider.js";
import { cacheWrap, hashKey } from "../../services/cache.js";

export const aiRouter: Router = Router();

/**
 * Esta rota é pública (CORS *, sem login): sem limites ela é um proxy aberto
 * para o modelo, e qualquer um gasta a cota do LiteLLM com prompts próprios.
 * Os prompts do front (resumo, análise de matéria) cabem com folga nestes tetos.
 */
const MAX_PROMPT_CHARS = 12_000;
const MAX_SYSTEM_CHARS = 2_000;
// O front manda o mesmo prompt para a mesma matéria em todo navegador: a
// resposta de um leitor serve aos outros.
const CACHE_TTL_SECONDS = 24 * 3600;

const hits = new Map<string, { count: number; resetAt: number }>();

/** Janela fixa por IP; devolve quantos segundos faltam quando estourou. */
export function rateLimited(
	ip: string,
	now = Date.now(),
	max = config.aiGenerate.rateLimitMax,
	windowMs = config.aiGenerate.rateLimitWindowMs,
): number {
	if (max <= 0) return 0;
	const entry = hits.get(ip);
	if (!entry || entry.resetAt <= now) {
		hits.set(ip, { count: 1, resetAt: now + windowMs });
		if (hits.size > 10_000) {
			for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
		}
		return 0;
	}
	entry.count++;
	return entry.count > max ? Math.ceil((entry.resetAt - now) / 1000) : 0;
}

export function resetRateLimit(): void {
	hits.clear();
}

const clientIp = (req: Request) => req.ip ?? req.socket.remoteAddress ?? "?";

aiRouter.post("/generate", async (req, res) => {
	const { prompt, system } = req.body ?? {};

	if (!prompt || typeof prompt !== "string") {
		return res.status(400).json({ error: "Prompt is required" });
	}
	if (
		prompt.length > MAX_PROMPT_CHARS ||
		(system != null &&
			(typeof system !== "string" || system.length > MAX_SYSTEM_CHARS))
	) {
		return res.status(413).json({ error: "Prompt too large" });
	}

	const key = hashKey("ai:generate", system ?? "", prompt);
	try {
		const text = await cacheWrap(key, CACHE_TTL_SECONDS, async () => {
			// Só quem vai de fato chamar o modelo conta para o limite.
			const wait = rateLimited(clientIp(req));
			if (wait) throw Object.assign(new Error("rate limited"), { wait });
			const model = await getFastModel();
			const result = await generateText({
				model,
				prompt,
				system,
				maxTokens: 512,
				maxRetries: 0,
			});
			return result.text || null;
		});
		res.json({ response: text ?? "" });
	} catch (err: any) {
		if (err?.wait) {
			res.setHeader("Retry-After", String(err.wait));
			return res.status(429).json({ error: "Too many requests" });
		}
		console.error("[AI API] Error:", err.message);
		// A mensagem do provider pode trazer URL interna ou detalhe da chave.
		res.status(502).json({ error: "AI provider unavailable" });
	}
});
