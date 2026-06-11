import { generateObject } from "ai";
import { z } from "zod";
import { query } from "../database/client.js";
import { getCloudFallbackModel, getFastModel } from "./aiProvider.js";

const RelevanceSchema = z.object({
	relevanceScore: z
		.number()
		.min(1)
		.max(10)
		.describe("1 = trivial/irrelevante, 10 = crítico/urgente/alto impacto"),
	reason: z.string().describe("Justificativa em 1 frase"),
});

const RELEVANCE_PROMPT = `Você é um editor de notícias avaliando se uma notícia merece destaque imediato.

TÍTULO: {title}
CATEGORIA: {category}
CONTEÚDO: {content}

Pontue a RELEVÂNCIA de 1 a 10:
- 1-3: trivial, rotineiro, entretenimento sem impacto, fofoca, celebridades, horóscopo, curiosidade
- 4-5: informação útil mas sem urgência
- 6-7: relevante, afeta mercados, empresas ou pessoas de forma concreta
- 8-10: urgente, alto impacto econômico/político/social, evento inesperado, crise

Considere: impacto financeiro, novidade, urgência, amplitude do efeito.`;

export async function scoreRelevance(
	articleId: string,
	title: string,
	content: string,
	category: string,
): Promise<number> {
	const prompt = RELEVANCE_PROMPT.replace("{title}", title)
		.replace("{category}", category)
		.replace("{content}", (content ?? "").slice(0, 3000));

	let object: z.infer<typeof RelevanceSchema>;
	try {
		const model = await getFastModel();
		const res = await generateObject({
			model,
			schema: RelevanceSchema,
			prompt,
		});
		object = res.object;
	} catch {
		const fallback = await getCloudFallbackModel();
		if (!fallback) {
			console.warn(
				`[relevance] No model available for ${articleId}, defaulting to 5`,
			);
			return 5;
		}
		try {
			const res = await generateObject({
				model: fallback,
				schema: RelevanceSchema,
				prompt,
			});
			object = res.object;
		} catch (err) {
			console.warn(
				`[relevance] Fallback failed for ${articleId}: ${(err as Error).message}`,
			);
			return 5;
		}
	}

	await query(`UPDATE news_articles SET relevance_score = $1 WHERE id = $2`, [
		object.relevanceScore,
		articleId,
	]).catch(console.error);

	console.log(
		`[relevance] ${articleId} score=${object.relevanceScore} — ${object.reason}`,
	);
	return object.relevanceScore;
}
