import { generateObject } from "ai";
import { z } from "zod";
import { query } from "../database/client.js";
import { getCloudFallbackModel, getFastModel } from "./aiProvider.js";
import { embedQuery, vectorToSQL } from "./embeddings.js";

const CredibilitySchema = z.object({
	fakeNewsScore: z
		.number()
		.min(1)
		.max(10)
		.describe(
			"1 = totalmente confiável, 10 = altamente suspeito/desinformação",
		),
	politicalBias: z
		.enum(["neutral", "left", "far_left", "right", "far_right"])
		.describe("Viés político do conteúdo"),
	isMilitant: z
		.boolean()
		.describe(
			"É um post de cunho panfletário/militante, com intenção clara de mobilizar ou atacar",
		),
	hasIncoherence: z
		.boolean()
		.describe(
			"Contém afirmações incoerentes, contraditórias ou inverificáveis",
		),
	credibilityFlags: z
		.array(
			z.enum([
				"misleading_headline",
				"missing_sources",
				"emotional_language",
				"unverified_claims",
				"conspiracy_theory",
				"satire",
				"opinion_as_fact",
				"selective_data",
				"out_of_context",
				"fake_news",
				"lie",
				"hypocrisy",
				"incoherence",
			]),
		)
		.describe(
			"Problemas detectados: incoerência, fake news, hipocrisia, mentira ou sinais editoriais",
		),
	reasoning: z
		.string()
		.describe("Justificativa breve (1 frase) da pontuação atribuída"),
});

const CREDIBILITY_PROMPT = `Você é um avaliador de credibilidade e fact-checking especialista. Analise a credibilidade desta notícia de forma objetiva, realista e imparcial, evitando o excesso de rigor acadêmico ou paranoia.

TÍTULO: {title}
FONTE: {source}
CATEGORIA: {category}
CONTEÚDO: {content}
{factCheckContext}

Instruções Cruciais para evitar Falsos Positivos:
1. Notícias de Esportes, Entretenimento, Cultura, Tecnologia Prática e Finanças: Não precisam citar fontes acadêmicas. Se forem de portais jornalísticos comuns, atribua scores baixos de fake news (1 a 3) e NÃO marque "unverified_claims" ou "missing_sources" sem necessidade.
2. Notícias Factuais Recentes (Tempo Real): É perfeitamente normal que reportagens publicadas no mesmo dia do evento apenas tragam resultados rápidos (como o placar de um jogo de tênis/futebol ocorrendo hoje). Não marque como "unverified_claims" só porque o evento é de hoje.
3. Teoria da Conspiração e Fake News (flags "conspiracy_theory", "fake_news"): Use APENAS para boatos evidentes, desinformação deliberada ou teorias bizarras não comprovadas. NUNCA use para análises financeiras corporativas legítimas ou colunas de opinião técnica.
4. Tamanho do texto: O texto pode ser curto por ser apenas um resumo. Seja justo. Atribua scores de 1 a 4 para portais de notícias jornalísticas reconhecidas nacional ou internacionalmente (ex: Folha, CNN, Metrópoles, Exame, BBC, InfoMoney).

Avalie:
1. Score de fake news (1=totalmente confiável/factual/fonte legítima, 10=desinformação deliberada/boato completo)
2. Viés político do conteúdo (não da fonte, mas do texto em si)
3. Se é panfletário/militante (linguagem muito emotiva, incitação, ataques pessoais ou ativismo explícito)
4. Se há incoerências internas, contradições, mentiras ou alegações sérias sem qualquer menção a fontes/evidências
5. Flags de problemas, usando fake_news, lie, hypocrisy ou incoherence quando houver evidência clara no texto`;

async function findRelatedFactChecks(title: string): Promise<string> {
	try {
		const embedding = await embedQuery(title);
		const res = await query<{ title: string; source: string; content: string }>(
			`SELECT title, source, content FROM news_articles
       WHERE category = 'fact_check'
         AND embedding IS NOT NULL
         AND 1 - (embedding <=> $1::vector) >= 0.60
       ORDER BY embedding <=> $1::vector
       LIMIT 3`,
			[vectorToSQL(embedding)],
		);
		if (!res.rows.length) return "";
		const snippets = res.rows
			.map(
				(r) => `• [${r.source}] ${r.title}: ${(r.content ?? "").slice(0, 200)}`,
			)
			.join("\n");
		return `\nVERIFICAÇÕES DE FACT-CHECKERS BRASILEIROS RELACIONADAS:\n${snippets}\n`;
	} catch {
		return "";
	}
}

export interface CredibilityResult {
	fakeNewsScore: number;
	politicalBias: string;
	isMilitant: boolean;
	hasIncoherence: boolean;
	credibilityFlags: string[];
	reasoning: string;
}

export async function analyzeCredibility(
	articleId: string,
	title: string,
	content: string,
	source: string,
	category: string,
	abortSignal?: AbortSignal,
): Promise<CredibilityResult | null> {
	const model = await getFastModel();
	const factCheckContext = await findRelatedFactChecks(title);

	let object;
	try {
		const res = await generateObject({
			model,
			schema: CredibilitySchema,
			prompt: CREDIBILITY_PROMPT.replace("{title}", title)
				.replace("{source}", source)
				.replace("{category}", category)
				.replace("{content}", (content ?? "").slice(0, 5000))
				.replace("{factCheckContext}", factCheckContext),
			abortSignal,
		});
		object = res.object;
	} catch (err) {
		console.warn(
			`[credibility] Primary model failed: ${(err as Error).message}. Attempting cloud fallback...`,
		);
		const fallbackModel = await getCloudFallbackModel();
		if (fallbackModel) {
			try {
				const res = await generateObject({
					model: fallbackModel,
					schema: CredibilitySchema,
					prompt: CREDIBILITY_PROMPT.replace("{title}", title)
						.replace("{source}", source)
						.replace("{category}", category)
						.replace("{content}", (content ?? "").slice(0, 5000))
						.replace("{factCheckContext}", factCheckContext),
					abortSignal,
				});
				object = res.object;
				console.log(
					"[credibility] Analysis succeeded using cloud fallback model",
				);
			} catch (fallbackErr) {
				console.error(
					"[credibility] Cloud fallback model also failed:",
					(fallbackErr as Error).message,
				);
				return null;
			}
		} else {
			console.error("[credibility] No cloud fallback model available");
			return null;
		}
	}

	try {
		await query(
			`UPDATE news_articles SET
         fake_news_score = $1, political_bias = $2, is_militant = $3,
         has_incoherence = $4, credibility_flags = $5, credibility_reasoning = $6
       WHERE id = $7`,
			[
				object.fakeNewsScore,
				object.politicalBias,
				object.isMilitant,
				object.hasIncoherence,
				object.credibilityFlags,
				object.reasoning,
				articleId,
			],
		);

		return object;
	} catch (err) {
		console.error(
			"[credibility] database save failed:",
			(err as Error).message,
		);
		return null;
	}
}
