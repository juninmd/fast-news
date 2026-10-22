import { z } from "zod";
import { config } from "../config/env.js";
import { query } from "../database/client.js";
import { tryConsume } from "./llmBudget.js";
import { generateWithFallback } from "./llmWithFallback.js";

export const RelevanceSchema = z.object({
	relevanceScore: z
		.number()
		.min(1)
		.max(10)
		.describe("1 = trivial/irrelevante, 10 = crítico/urgente/alto impacto"),
	isSpamOrPromo: z
		.boolean()
		.describe(
			"True se for propaganda, press release corporativo genérico, autopromoção, spam, SEO clickbait ou fofoca",
		),
	isDuplicateOrRehash: z
		.boolean()
		.describe(
			"True se apenas repete informações rotineiras ou fatos já amplamente conhecidos sem nenhuma novidade real",
		),
	shouldPostTelegram: z
		.boolean()
		.describe(
			"Decisão final se a notícia é realmente interessante/diferenciada para merecer uma notificação no Telegram",
		),
	reason: z
		.string()
		.describe(
			"Justificativa da pontuação e da decisão de postagem em 1 frase curta",
		),
});

export type RelevanceResult = z.infer<typeof RelevanceSchema>;

const RELEVANCE_PROMPT = `Você é um editor-chefe de notícias sênior avaliando se uma notícia merece ser postada no canal oficial do Telegram do Fast News.
Nosso público busca informações de alto valor, insights estratégicos, notícias de mercado impactantes, geopolítica, cibersegurança e tecnologia profunda. Queremos evitar qualquer tipo de spam, lixo editorial ou conteúdo irrelevante.

TÍTULO: {title}
CATEGORIA: {category}
CONTEÚDO: {content}

Critérios de Avaliação:
1. SPAM / PROPAGANDA / PR (isSpamOrPromo):
   - Marque como true se o artigo for um press release de empresa (ex: "Empresa X lança nova versão do produto Y"), anúncio de marketing, propaganda disfarçada de notícia, publipost, fofocas de celebridades, guias de compras puramente comerciais, ou SEO clickbait sem valor jornalístico real.
2. RELEITURA / ROTINEIRO (isDuplicateOrRehash):
   - Marque como true se a notícia for apenas rotineira (ex: cotação diária padrão sem eventos excepcionais, previsão do tempo padrão, anúncio de evento local rotineiro) ou se for um rehash de informações antigas sem fatos novos relevantes.
3. RELEVÂNCIA (relevanceScore) de 1 a 10:
   - 1-3: Lixo editorial, spam, fofoca, entretenimento fútil, dicas cotidianas, guias genéricos.
   - 4-5: Informação útil ou verídica, mas de baixo impacto/interesse geral (ex: notícias corporativas rotineiras, atualizações de softwares menores).
   - 6-7: Relevante. Traz novidades que afetam mercados, empresas, política ou tecnologia de forma concreta.
   - 8-10: Alta relevância / Urgente. Decisões macroeconômicas cruciais, crises de segurança (ex: zero-day explorado em massa), geopolítica de grande impacto, eventos corporativos massivos (M&A bilionários, falências).
4. POSTAR NO TELEGRAM (shouldPostTelegram):
   - Deve ser TRUE apenas se a notícia for de fato interessante para o leitor (score >= 6) E não for spam/propaganda/rotineira. Queremos poupar a atenção do usuário no Telegram, enviando apenas o que é verdadeiramente relevante.

Considere: impacto financeiro/mercado, novidade real, utilidade para tomadores de decisão, cibersegurança ou geopolítica relevante.`;

// Titles that are never worth a model call: scored as spam locally.
const JUNK_TITLE =
	/hor[óo]scopo|frase do dia|previs[ãa]o para os \d+ signos|\btarot\b|\bbbb ?\d{0,2}\b|cupom de desconto|\bofertas? (?:do dia|imperd[ií]veis?)\b|promo[çc][ãa]o imperd[ií]vel|melhores? (?:ofertas|promo[çc][õo]es)|sorteio/i;

/** Obvious junk is scored without a model call; null means "ask the model". */
export function heuristicRelevance(title: string): RelevanceResult | null {
	if (!JUNK_TITLE.test(title)) return null;
	return {
		relevanceScore: 2,
		isSpamOrPromo: true,
		isDuplicateOrRehash: false,
		shouldPostTelegram: false,
		reason: "Título de baixo valor editorial (filtro local, sem LLM)",
	};
}

export function buildRelevancePrompt(
	title: string,
	content: string,
	category: string,
	promptHint?: string | null,
): string {
	const hint = promptHint?.trim()
		? `\n\nCritério adicional desta fonte (prioridade sobre os critérios acima quando houver conflito): ${promptHint.trim().slice(0, 500)}`
		: "";
	return (
		RELEVANCE_PROMPT.replace("{title}", () => title)
			.replace("{category}", () => category)
			.replace("{content}", () => (content ?? "").slice(0, 3000)) + hint
	);
}

async function persist(
	articleId: string,
	object: RelevanceResult,
): Promise<void> {
	await query(
		`UPDATE news_articles SET
			relevance_score = $1,
			relevance_reasoning = $2,
			is_spam_or_promo = $3,
			should_post_telegram = $4
		 WHERE id = $5`,
		[
			object.relevanceScore,
			object.reason,
			object.isSpamOrPromo,
			object.shouldPostTelegram,
			articleId,
		],
	).catch(console.error);
}

export async function scoreRelevance(
	articleId: string,
	title: string,
	content: string,
	category: string,
	promptHint?: string | null,
): Promise<RelevanceResult> {
	const local = heuristicRelevance(title);
	if (local) {
		await persist(articleId, local);
		return local;
	}
	const prompt = buildRelevancePrompt(title, content, category, promptHint);

	const defaultResult: RelevanceResult = {
		relevanceScore: 5,
		isSpamOrPromo: false,
		isDuplicateOrRehash: false,
		shouldPostTelegram: false,
		reason: "Falha na análise de relevância",
	};

	// 0 = unlimited. Past the cap the article keeps the neutral default instead
	// of costing a model call for every feed item.
	const cap = config.llmBudget.relevancePerDay;
	if (cap > 0 && !tryConsume("relevance", cap)) {
		return { ...defaultResult, reason: "Limite diário de análise atingido" };
	}

	const object = await generateWithFallback({
		schema: RelevanceSchema,
		prompt,
		logTag: "relevance",
	});
	if (!object) {
		console.warn(`[relevance] No model available for ${articleId}, defaulting`);
		return defaultResult;
	}

	await persist(articleId, object);

	console.log(
		`[relevance] ${articleId} score=${object.relevanceScore} spam=${object.isSpamOrPromo} shouldPost=${object.shouldPostTelegram} reason=${object.reason}`,
	);
	return object;
}
