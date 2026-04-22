import { generateObject } from 'ai';
import { z } from 'zod';
import { query } from '../database/client.js';
import { cacheGet, cacheSet } from './cache.js';
import { getFastModel } from './aiProvider.js';

const OpportunitySchema = z.object({
  opportunities: z.array(z.object({
    asset: z.string().describe('Nome do ativo (ex: PETR4, Ouro, USD/BRL)'),
    assetType: z.enum(['stock', 'commodity', 'crypto', 'forex', 'etf']),
    direction: z.enum(['buy', 'sell', 'watch']),
    reasoning: z.string().describe('Justificativa em 1-2 frases'),
    confidence: z.number().min(1).max(10),
    timeHorizon: z.enum(['short', 'medium', 'long']),
  })),
});

const FINANCIAL_PROMPT = `Com base na análise abaixo, extraia oportunidades financeiras específicas para o mercado brasileiro e global.

ANÁLISE:
{analysis}

Exemplos de ativos:
- Ações BR: PETR4, VALE3, ITUB4, BBDC4, ABEV3, WEGE3, PRIO3
- Commodities: Ouro, Prata, Petróleo Brent, Minério de Ferro
- Forex: USD/BRL, EUR/BRL
- Cripto: Bitcoin, Ethereum
- ETFs: BOVA11, IVVB11, GOLD11, HASH11

timeHorizon: short = dias, medium = semanas, long = meses`;

export interface FinancialOpportunity {
  asset: string;
  assetType: string;
  direction: string;
  reasoning: string;
  confidence: number;
  timeHorizon: string;
}

export async function extractFinancialOpportunities(
  analysisId: string,
  analysisContent: string
): Promise<FinancialOpportunity[]> {
  const cacheKey = `financial:${analysisId}`;
  const cached = await cacheGet<FinancialOpportunity[]>(cacheKey);
  if (cached) return cached;

  const model = await getFastModel();
  const { object } = await generateObject({
    model,
    schema: OpportunitySchema,
    prompt: FINANCIAL_PROMPT.replace('{analysis}', analysisContent.slice(0, 3000)),
  });

  for (const opp of object.opportunities) {
    await query(
      `INSERT INTO financial_opportunities
         (analysis_id, asset, asset_type, direction, reasoning, confidence, time_horizon)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [analysisId, opp.asset, opp.assetType, opp.direction, opp.reasoning,
       opp.confidence, opp.timeHorizon]
    );
  }

  await cacheSet(cacheKey, object.opportunities, 3600 * 12);
  return object.opportunities;
}

export async function getActiveOpportunities(): Promise<unknown[]> {
  const cached = await cacheGet<unknown[]>('financial:active');
  if (cached) return cached;

  const result = await query(
    `SELECT * FROM financial_opportunities
     WHERE is_active = TRUE AND created_at > NOW() - INTERVAL '48 hours'
     ORDER BY confidence DESC, created_at DESC
     LIMIT 20`
  );

  await cacheSet('financial:active', result.rows, 1800);
  return result.rows;
}
