/**
 * AI Provider factory using Vercel AI SDK.
 * Troque de provider com a env AI_PROVIDER: ollama | google | openai | anthropic
 */
import { config } from '../config/env.js';
import type { LanguageModel, EmbeddingModel } from 'ai';

type Provider = 'ollama' | 'google' | 'openai' | 'anthropic';

const provider = (): Provider => config.aiProvider as Provider;

// ── Ollama (local, nativo) ────────────────────────────────────────────────────
async function ollamaLanguageModel(modelId?: string): Promise<LanguageModel> {
  const { createOllama } = await import('@ai-sdk/ollama');
  const ollama = createOllama({ baseURL: config.ollama.baseUrl.replace(/\/v1$/, '') });
  return ollama(modelId ?? config.ollama.model);
}

async function ollamaEmbeddingModel(): Promise<EmbeddingModel<string>> {
  const { createOllama } = await import('@ai-sdk/ollama');
  const ollama = createOllama({ baseURL: config.ollama.baseUrl.replace(/\/v1$/, '') });
  return ollama.embedding(config.ollama.embeddingModel);
}

// ── Google Gemini ─────────────────────────────────────────────────────────────
async function googleLanguageModel(modelId?: string): Promise<LanguageModel> {
  process.env['GOOGLE_GENERATIVE_AI_API_KEY'] = config.geminiApiKey;
  const { google } = await import('@ai-sdk/google');
  return google(modelId ?? (config.ai.analysisModel || 'gemini-1.5-pro'));
}

async function googleEmbeddingModel(): Promise<EmbeddingModel<string>> {
  process.env['GOOGLE_GENERATIVE_AI_API_KEY'] = config.geminiApiKey;
  const { google } = await import('@ai-sdk/google');
  return google.textEmbeddingModel(config.ai.embeddingModel || 'text-embedding-004');
}

// ── OpenAI ────────────────────────────────────────────────────────────────────
async function openaiLanguageModel(modelId?: string): Promise<LanguageModel> {
  process.env['OPENAI_API_KEY'] = config.openaiApiKey;
  const { openai } = await import('@ai-sdk/openai');
  return openai(modelId ?? (config.ai.analysisModel || 'gpt-4o-mini'));
}

async function openaiEmbeddingModel(): Promise<EmbeddingModel<string>> {
  process.env['OPENAI_API_KEY'] = config.openaiApiKey;
  const { openai } = await import('@ai-sdk/openai');
  return openai.embedding(config.ai.embeddingModel || 'text-embedding-3-small');
}

// ── Anthropic ─────────────────────────────────────────────────────────────────
async function anthropicLanguageModel(modelId?: string): Promise<LanguageModel> {
  process.env['ANTHROPIC_API_KEY'] = config.anthropicApiKey;
  const { anthropic } = await import('@ai-sdk/anthropic');
  return anthropic(modelId ?? (config.ai.analysisModel || 'claude-3-5-haiku-20241022'));
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function getLanguageModel(modelId?: string): Promise<LanguageModel> {
  switch (provider()) {
    case 'google':    return googleLanguageModel(modelId);
    case 'openai':    return openaiLanguageModel(modelId);
    case 'anthropic': return anthropicLanguageModel(modelId);
    default:          return ollamaLanguageModel(modelId);  // ollama
  }
}

export async function getFastModel(): Promise<LanguageModel> {
  switch (provider()) {
    case 'google':    return googleLanguageModel(config.ai.fastModel || 'gemini-1.5-flash');
    case 'openai':    return openaiLanguageModel(config.ai.fastModel || 'gpt-4o-mini');
    case 'anthropic': return anthropicLanguageModel(config.ai.fastModel);
    default:          return ollamaLanguageModel(config.ollama.model);  // ollama
  }
}

export async function getEmbeddingModel(): Promise<EmbeddingModel<string>> {
  switch (provider()) {
    case 'google':  return googleEmbeddingModel();
    case 'openai':  return openaiEmbeddingModel();
    default:        return ollamaEmbeddingModel();  // ollama + anthropic fallback
  }
}
