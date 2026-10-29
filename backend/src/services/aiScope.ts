import { stripAccents } from "./textSimilarity.js";

// Whole-word matches only: "ai" inside "said" or "main" must not count.
const AI_TERMS = [
	"artificial intelligence",
	"inteligencia artificial",
	"machine learning",
	"aprendizado de maquina",
	"deep learning",
	"llm",
	"llms",
	"large language model",
	"modelo de linguagem",
	"generative",
	"generativa",
	"generativo",
	"chatgpt",
	"gpt",
	"openai",
	"anthropic",
	"claude ai",
	"claude code",
	"claude opus",
	"claude sonnet",
	"google gemini",
	"deepmind",
	"copilot",
	"mistral ai",
	"llama",
	"neural",
	"redes neurais",
	"transformer",
	"transformers",
	"diffusion",
	"agentic",
	"agente de ia",
	"ai agent",
	"ai agents",
	"fine-tuning",
	"nvidia",
	"hugging face",
	"huggingface",
	"midjourney",
	"stable diffusion",
	"deepseek",
	"grok",
	"xai",
	"perplexity",
	"robotica",
	"robotics",
	"arxiv",
];

const AI_REGEX = new RegExp(
	`(?:^|[^a-z0-9])(?:${AI_TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![a-z0-9])`,
);

// Uppercase acronym only: lowercase "ia" is also a Portuguese verb form.
const ACRONYM = /(?:^|[^A-Za-z0-9])(?:IA|AI|A\.I\.)(?![A-Za-z0-9])/;

/**
 * Keyword-based "is this about AI" check. Deterministic and free: it only
 * decides the AI-only view, never what gets stored or scored.
 * Title matches count; body matches need two distinct hits to avoid a passing mention.
 */
export function isAiRelated(
	title: string,
	content = "",
	category = "",
): boolean {
	const norm = (s: string) => stripAccents(s.toLowerCase());
	if (norm(category) === "ia") return true;
	if (ACRONYM.test(title) || AI_REGEX.test(norm(title))) return true;
	const raw = content.slice(0, 1500);
	const hits = new Set<string>();
	if (ACRONYM.test(raw)) hits.add("acronym");
	const body = norm(raw);
	const g = new RegExp(AI_REGEX.source, "g");
	for (const m of body.matchAll(g)) {
		hits.add(m[0].replace(/^[^a-z0-9]/, ""));
		if (hits.size >= 2) return true;
	}
	return false;
}
