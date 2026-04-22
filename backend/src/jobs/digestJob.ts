import cron from 'node-cron';
import { generateText } from 'ai';
import { getAllTrackedTopics, getTopicLatestAnalysis } from '../services/analysis.js';
import { getActiveOpportunities } from '../services/financial.js';
import { searchSimilarArticles } from '../services/rag.js';
import { sendDigest } from '../services/telegram.js';
import { getFastModel } from '../services/aiProvider.js';
import { config } from '../config/env.js';

const DIGEST_PROMPT = `Crie um briefing diário de notícias para Telegram. Use emojis e markdown Telegram.
Máximo 3500 caracteres. Seja direto e informativo.

TOP NOTÍCIAS:
{news}

ANÁLISES:
{analyses}

OPORTUNIDADES FINANCEIRAS:
{financial}

Formato obrigatório:
📰 *BRIEFING DIÁRIO — {date}*

🔥 *TOP NOTÍCIAS*
[lista]

📊 *ANÁLISES EM DESTAQUE*
[resumos dos tópicos]

💰 *RADAR FINANCEIRO*
[oportunidades]

⚡ *FIQUE DE OLHO*
[o que monitorar hoje]`;

export async function buildAndSendDigest(): Promise<void> {
  console.log('[DigestJob] Building daily digest...');

  const [topics, opportunities, topArticles] = await Promise.all([
    getAllTrackedTopics(),
    getActiveOpportunities() as Promise<Record<string, unknown>[]>,
    searchSimilarArticles('principais notícias do dia', 1, 10),
  ]);

  const newsSection = topArticles.slice(0, 5)
    .map((a, i) => `${i + 1}. ${a.title} — _${a.source}_`)
    .join('\n');

  const analysisSection: string[] = [];
  for (const topic of topics.slice(0, 3)) {
    const analysis = await getTopicLatestAnalysis(topic.id);
    if (analysis) {
      const first = analysis.split('\n\n')[0] ?? '';
      analysisSection.push(`*${topic.name}:* ${first.replace(/[#*]/g, '').slice(0, 250)}`);
    }
  }

  const financialSection = opportunities.slice(0, 5)
    .map((o) =>
      `${o['direction'] === 'buy' ? '📈' : o['direction'] === 'sell' ? '📉' : '👀'} *${o['asset']}*: ${String(o['reasoning']).slice(0, 100)}`
    ).join('\n');

  const model = await getFastModel();
  const { text } = await generateText({
    model,
    prompt: DIGEST_PROMPT
      .replace('{news}', newsSection || 'Sem notícias.')
      .replace('{analyses}', analysisSection.join('\n\n') || 'Sem análises.')
      .replace('{financial}', financialSection || 'Sem oportunidades.')
      .replace('{date}', new Date().toLocaleDateString('pt-BR')),
    maxTokens: 1200,
  });

  await sendDigest(text);
  console.log('[DigestJob] Digest sent.');
}

let task: cron.ScheduledTask | null = null;

export function startDigestJob(): void {
  task = cron.schedule(config.cron.digest, async () => {
    await buildAndSendDigest().catch(console.error);
  });
  console.log(`[DigestJob] Scheduled: ${config.cron.digest}`);
}

export function stopDigestJob(): void {
  task?.stop();
  task = null;
}
