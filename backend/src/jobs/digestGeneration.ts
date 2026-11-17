import { generateText, type LanguageModel } from "ai";
import { config } from "../config/env.js";
import { hasTemplateMarkers } from "./digestFormat.js";

export async function generateDigestText(
	model: LanguageModel,
	prompt: string,
): Promise<string> {
	const first = await runDigestGeneration(model, prompt);
	if (!hasTemplateMarkers(first)) return first;

	const retry = await runDigestGeneration(
		model,
		`${prompt}

ERRO DA TENTATIVA ANTERIOR: você copiou placeholders/template.
Reescreva o resumo final agora com conteúdo real. Não use colchetes, "notícia 1", "alerta 1" ou exemplos.`,
	);
	if (!hasTemplateMarkers(retry)) return retry;
	throw new Error("[DigestJob] LLM returned template placeholders.");
}

async function runDigestGeneration(
	model: LanguageModel,
	prompt: string,
): Promise<string> {
	const { text } = await generateText({
		// O LiteLLM já reintenta e cai para o fallback; o retry do SDK só multiplicava a espera.
		maxRetries: 0,
		model,
		prompt,
		maxTokens: config.digest.maxTokens,
		abortSignal: AbortSignal.timeout(config.ai.backgroundTaskTimeoutMs),
	});
	return text;
}
