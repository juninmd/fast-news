import { createOpenAI } from "@ai-sdk/openai";
import type { EmbeddingModel, LanguageModel } from "ai";
import { config } from "../config/env.js";

/**
 * Toda chamada de IA passa pelo LiteLLM do cluster (API compatível com OpenAI):
 * ele escolhe o modelo, faz fallback entre provedores e guarda as chaves.
 * As variáveis OLLAMA_* continuam valendo por compatibilidade com o deploy
 * (OLLAMA_BASE_URL aponta para o LiteLLM).
 */
const apiKey = () =>
	process.env["LITELLM_API_KEY"] ||
	process.env["OLLAMA_API_KEY"] ||
	process.env["OPENAI_API_KEY"] ||
	"placeholder";

const litellm = createOpenAI({
	baseURL: config.ollama.baseUrl,
	apiKey: apiKey(),
});

const litellmEmbeddings = createOpenAI({
	baseURL: config.ollama.embeddingBaseUrl || config.ollama.baseUrl,
	apiKey: apiKey(),
});

export async function getLanguageModel(
	modelId?: string,
): Promise<LanguageModel> {
	return litellm(modelId || config.ai.analysisModel || config.ollama.model);
}

export async function getFastModel(): Promise<LanguageModel> {
	return litellm(config.ai.fastModel || config.ollama.model);
}

export async function getEmbeddingModel(): Promise<EmbeddingModel<string>> {
	return litellmEmbeddings.embedding(
		config.ai.embeddingModel || config.ollama.embeddingModel,
	);
}

/** Segunda tentativa no pool cloud/auto do LiteLLM quando o modelo rápido falha. */
export async function getCloudFallbackModel(): Promise<LanguageModel | null> {
	// LiteLLM virtual keys are scoped per app (see AGENTS.md): only pool aliases
	// like "cloud/auto" are callable with the fast-news key.
	return litellm(config.ai.fastModel || "cloud/auto");
}
