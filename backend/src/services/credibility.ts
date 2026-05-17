import { generateObject } from 'ai';
import { z } from 'zod';
import { query } from '../database/client.js';
import { getFastModel } from './aiProvider.js';

const CredibilitySchema = z.object({
  fakeNewsScore: z
    .number()
    .min(1)
    .max(10)
    .describe('1 = totalmente confiável, 10 = altamente suspeito/desinformação'),
  politicalBias: z
    .enum(['neutral', 'left', 'far_left', 'right', 'far_right'])
    .describe('Viés político do conteúdo'),
  isMilitant: z
    .boolean()
    .describe('É um post de cunho panfletário/militante, com intenção clara de mobilizar ou atacar'),
  hasIncoherence: z
    .boolean()
    .describe('Contém afirmações incoerentes, contraditórias ou inverificáveis'),
  credibilityFlags: z
    .array(z.enum([
      'misleading_headline',
      'missing_sources',
      'emotional_language',
      'unverified_claims',
      'conspiracy_theory',
      'satire',
      'opinion_as_fact',
      'selective_data',
      'out_of_context',
      'fake_news',
      'lie',
      'hypocrisy',
      'incoherence',
    ]))
    .describe('Problemas detectados: incoerência, fake news, hipocrisia, mentira ou sinais editoriais'),
  reasoning: z.string().describe('Justificativa breve (1 frase) da pontuação atribuída'),
});

const CREDIBILITY_PROMPT = `Você é um fact-checker especialista. Analise a credibilidade desta notícia de forma objetiva e imparcial.

TÍTULO: {title}
FONTE: {source}
CATEGORIA: {category}
CONTEÚDO: {content}

Avalie:
1. Score de fake news (1=confiável, 10=desinformação)
2. Viés político do conteúdo (não da fonte, mas do texto em si)
3. Se é panfletário/militante
4. Se há incoerências internas, hipocrisia, mentiras ou alegações não sustentadas
5. Flags de problemas, usando fake_news, lie, hypocrisy ou incoherence quando houver evidência

Seja rigoroso mas justo. Notícias factuais de grandes veículos tendem a score 1-3.`;

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
  try {
    const model = await getFastModel();
    const { object } = await generateObject({
      model,
      schema: CredibilitySchema,
      prompt: CREDIBILITY_PROMPT
        .replace('{title}', title)
        .replace('{source}', source)
        .replace('{category}', category)
        .replace('{content}', (content ?? '').slice(0, 1200)),
      abortSignal,
    });

    await query(
      `UPDATE news_articles SET
         fake_news_score = $1, political_bias = $2, is_militant = $3,
         has_incoherence = $4, credibility_flags = $5, credibility_reasoning = $6
       WHERE id = $7`,
      [
        object.fakeNewsScore, object.politicalBias, object.isMilitant,
        object.hasIncoherence, object.credibilityFlags, object.reasoning, articleId,
      ],
    );

    return object;
  } catch (err) {
    console.error('[credibility] analysis failed:', (err as Error).message);
    return null;
  }
}
