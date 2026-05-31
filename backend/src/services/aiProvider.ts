import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { EmbeddingModel, LanguageModel } from "ai";
import { createProviderRegistry } from "ai";
import { createOllama } from "ollama-ai-provider";
import { config } from "../config/env.js";

type Provider = "ollama" | "google" | "openai" | "anthropic" | "openrouter";

const provider = (): Provider => config.aiProvider as Provider;

// OpenRouter uses OpenAI client setup with custom endpoint/key
const openrouterProvider = createOpenAI({
	baseURL: "https://openrouter.ai/api/v1",
	apiKey: config.openrouterApiKey,
});

const ollamaProvider = config.ollama.baseUrl.includes("/v1")
	? createOpenAI({
			baseURL: config.ollama.baseUrl,
			apiKey:
				process.env["OLLAMA_API_KEY"] ||
				process.env["OPENAI_API_KEY"] ||
				"placeholder",
		})
	: createOllama({
			baseURL: config.ollama.baseUrl.replace(/\/v1$/, "/api"),
		});

// Dedicated native Ollama provider for embeddings.
// Always uses createOllama (not OpenAI-compat) to avoid the
// encoding_format:float rejection from LiteLLM / other proxies.
const _embeddingNativeBase = (() => {
	const explicit = config.ollama.embeddingBaseUrl;
	if (explicit) return explicit.replace(/\/$/, "");
	// Derive from main baseUrl: strip /v1 suffix → bare Ollama host
	return config.ollama.baseUrl.replace(/\/v1\/?$/, "");
})();
const ollamaEmbeddingProvider = createOllama({
	baseURL: `${_embeddingNativeBase}/api`,
});

const googleProvider = google;
const openaiProvider = createOpenAI({ apiKey: config.openaiApiKey });
const anthropicProvider = anthropic;

// Unified AI SDK Provider Registry
const registry = createProviderRegistry({
	google: googleProvider,
	openai: openaiProvider,
	anthropic: anthropicProvider,
	openrouter: openrouterProvider,
	ollama: ollamaProvider,
});

export async function getLanguageModel(
	modelId?: string,
): Promise<LanguageModel> {
	const p = provider();
	let id = modelId;
	if (!id) {
		if (p === "google") id = config.ai.analysisModel || "gemini-1.5-pro";
		else if (p === "openai") id = config.ai.analysisModel || "gpt-4o-mini";
		else if (p === "anthropic")
			id = config.ai.analysisModel || "claude-3-5-haiku-20241022";
		else if (p === "openrouter") id = config.openrouterModel;
		else id = config.ollama.model;
	}
	return registry.languageModel(`${p}:${id}`);
}

export async function getFastModel(): Promise<LanguageModel> {
	const p = provider();
	let id;
	if (p === "google") id = config.ai.fastModel || "gemini-1.5-flash";
	else if (p === "openai") id = config.ai.fastModel || "gpt-4o-mini";
	else if (p === "anthropic")
		id = config.ai.fastModel || "claude-3-5-haiku-20241022";
	else if (p === "openrouter")
		id = config.ai.fastModel || "anthropic/claude-3-haiku";
	else id = config.ollama.model;
	return registry.languageModel(`${p}:${id}`);
}

export async function getEmbeddingModel(): Promise<EmbeddingModel<string>> {
	const p = provider();
	if (p === "google") {
		return google.textEmbeddingModel(
			config.ai.embeddingModel || "text-embedding-004",
		);
	}
	if (p === "openai") {
		return openaiProvider.embedding(
			config.ai.embeddingModel || "text-embedding-3-small",
		);
	}
	// Always use native Ollama (createOllama) for embeddings, even when the
	// main inference provider points to LiteLLM/OpenAI-compat endpoint.
	// This avoids the encoding_format:float UnsupportedParamsError from proxies.
	return ollamaEmbeddingProvider.embedding(config.ollama.embeddingModel);
}

export async function getCloudFallbackModel(): Promise<LanguageModel | null> {
	if (config.aiProvider === "ollama") {
		const fallbackModel = config.ai.fastModel || "z-ai/glm-4-32b";
		return registry.languageModel(`ollama:${fallbackModel}`);
	}
	if (config.geminiApiKey) {
		return registry.languageModel(
			`google:${config.ai.fastModel || "gemini-1.5-flash"}`,
		);
	}
	if (config.openaiApiKey) {
		return registry.languageModel(
			`openai:${config.ai.fastModel || "gpt-4o-mini"}`,
		);
	}
	if (config.anthropicApiKey) {
		return registry.languageModel(
			`anthropic:${config.ai.fastModel || "claude-3-5-haiku-20241022"}`,
		);
	}
	return null;
}

