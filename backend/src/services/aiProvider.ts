import { config } from '../config/env.js';
import { createProviderRegistry } from 'ai';
import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { createOllama } from 'ollama-ai-provider';
import type { LanguageModel, EmbeddingModel } from 'ai';

type Provider = 'ollama' | 'google' | 'openai' | 'anthropic' | 'openrouter';

const provider = (): Provider => config.aiProvider as Provider;

// OpenRouter uses OpenAI client setup with custom endpoint/key
const openrouterProvider = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: config.openrouterApiKey,
});

const ollamaProvider = createOllama({
  baseURL: config.ollama.baseUrl.replace(/\/v1$/, '/api'),
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

export async function getLanguageModel(modelId?: string): Promise<LanguageModel> {
  const p = provider();
  let id = modelId;
  if (!id) {
    if (p === 'google') id = config.ai.analysisModel || 'gemini-1.5-pro';
    else if (p === 'openai') id = config.ai.analysisModel || 'gpt-4o-mini';
    else if (p === 'anthropic') id = config.ai.analysisModel || 'claude-3-5-haiku-20241022';
    else if (p === 'openrouter') id = config.openrouterModel;
    else id = config.ollama.model;
  }
  return registry.languageModel(`${p}:${id}`);
}

export async function getFastModel(): Promise<LanguageModel> {
  const p = provider();
  let id;
  if (p === 'google') id = config.ai.fastModel || 'gemini-1.5-flash';
  else if (p === 'openai') id = config.ai.fastModel || 'gpt-4o-mini';
  else if (p === 'anthropic') id = config.ai.fastModel || 'claude-3-5-haiku-20241022';
  else if (p === 'openrouter') id = config.ai.fastModel || 'anthropic/claude-3-haiku';
  else id = config.ollama.model;
  return registry.languageModel(`${p}:${id}`);
}

export async function getEmbeddingModel(): Promise<EmbeddingModel<string>> {
  const p = provider();
  if (p === 'google') {
    return google.textEmbeddingModel(config.ai.embeddingModel || 'text-embedding-004');
  }
  if (p === 'openai') {
    return openaiProvider.embedding(config.ai.embeddingModel || 'text-embedding-3-small');
  }
  return ollamaProvider.embedding(config.ollama.embeddingModel);
}

export async function getCloudFallbackModel(): Promise<LanguageModel | null> {
  if (config.geminiApiKey) {
    return registry.languageModel(`google:${config.ai.fastModel || 'gemini-1.5-flash'}`);
  }
  if (config.openaiApiKey) {
    return registry.languageModel(`openai:${config.ai.fastModel || 'gpt-4o-mini'}`);
  }
  if (config.anthropicApiKey) {
    return registry.languageModel(`anthropic:${config.ai.fastModel || 'claude-3-5-haiku-20241022'}`);
  }
  return null;
}
