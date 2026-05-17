import cron from 'node-cron';
import { streamText } from 'ai';
import { getAllTrackedTopics, getTopicLatestAnalysis } from '../services/analysis.js';
import { listActiveStories } from '../services/correlation.js';
import { getActiveOpportunities } from '../services/financial.js';
import { searchSimilarArticles } from '../services/rag.js';
import { query } from '../database/client.js';
import { sendDigest } from '../services/telegram.js';
import { getFastModel } from '../services/aiProvider.js';
import { config } from '../config/env.js';

const DIGEST_PROMPT = `Você é um jornalista irônico e bem-humorado escrevendo um resumo diário para Telegram.
Use Markdown do Telegram: *negrito*, _itálico_, \`código\`. Máximo 3500 caracteres.
Tom: sarcástico e inteligente, como quem assistiu ao mundo se contradizer mais uma vez.
Use humor ácido, analogias absurdas. Português brasileiro.

REGRAS IMPORTANTES:
- Cada seção tem conteúdo ÚNICO — nunca repita informação entre seções
- AS TRAPALHADAS: comente cada notícia com ironia (1 linha por notícia)
- ANÁLISE: foque em tendências macro e contexto, NÃO nos ativos financeiros
- CASSINO FINANCEIRO: foque APENAS nos ativos/oportunidades — preços, movimentos, risco
- FIQUE DE OLHO: 2-3 alertas específicos e acionáveis (datas, eventos, gatilhos)

TOP NOTÍCIAS:
{news}

HISTÓRIAS EM DESTAQUE (correlações entre notícias):
{stories}

ANÁLISES DE TÓPICOS:
{analyses}

OPORTUNIDADES FINANCEIRAS:
{financial}

Formato EXATO (use esses emojis e títulos):
🎭 *O CIRCO DIÁRIO — {date}*
_"Mais um dia, mais uma oportunidade do mundo decepcionar"_

━━━━━━━━━━━━━━━━━━━━
🔥 *AS TRAPALHADAS DO DIA*

1. [emoji] [notícia 1 com comentário irônico]
2. [emoji] [notícia 2 com comentário irônico]
...

━━━━━━━━━━━━━━━━━━━━
📊 *ANÁLISE — TENDÊNCIAS*

[análise macro dos tópicos, sem falar de ativos financeiros específicos]

━━━━━━━━━━━━━━━━━━━━
💰 *CASSINO FINANCEIRO*

[lista de ativos com sinal e raciocínio curto, ex: 📈 *BRL/USD*: ...]

━━━━━━━━━━━━━━━━━━━━
🎪 *FIQUE DE OLHO*

• [alerta 1]
• [alerta 2]`;

export async function buildAndSendDigest(): Promise<void> {
  console.log('[DigestJob] Building daily digest...');

  const [topics, opportunities, ragArticles, activeStories] = await Promise.all([
    getAllTrackedTopics().catch(() => []),
    getActiveOpportunities().catch(() => []) as Promise<Record<string, unknown>[]>,
    searchSimilarArticles('principais notícias do dia', 1, 10).catch(() => []),
    listActiveStories(5).catch(() => []),
  ]);

  // Fallback: if RAG returns nothing (embedding unavailable), query postgres directly
  let topArticles = ragArticles;
  if (!topArticles.length) {
    const res = await query<{ id: string; title: string; url: string; source: string; category: string; content: string; published_at: string }>(
      `SELECT id, title, url, source, category, content, published_at
       FROM news_articles
       WHERE created_at > NOW() - INTERVAL '24 hours'
       ORDER BY published_at DESC NULLS LAST
       LIMIT 10`,
    ).catch(() => ({ rows: [] }));
    topArticles = res.rows.map((r) => ({ ...r, similarity: 0 })) as typeof ragArticles;
  }

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

  const usedAssets = new Set<string>();
  const financialSection = opportunities
    .filter((o) => {
      const key = String(o['asset']).toLowerCase();
      if (usedAssets.has(key)) return false;
      usedAssets.add(key);
      return true;
    })
    .slice(0, 5)
    .map((o) =>
      `${o['direction'] === 'buy' ? '📈' : o['direction'] === 'sell' ? '📉' : '👀'} *${o['asset']}*: ${String(o['reasoning']).slice(0, 100)}`
    ).join('\n');

  const storiesSection = activeStories
    .filter((s) => s.articleCount > 1)
    .slice(0, 4)
    .map((s) => {
      const impact = s.impactLevel === 'critical' ? '🚨' : s.impactLevel === 'high' ? '⚠️' : '📊';
      const assets = s.affectedAssets?.length ? ` [${s.affectedAssets.slice(0, 3).join(', ')}]` : '';
      return `${impact} ${s.title}${assets} — ${s.articleCount} artigos`;
    }).join('\n') || 'Sem histórias ativas.';

  const model = await getFastModel();
  const fullPrompt = DIGEST_PROMPT
    .replace('{news}', newsSection || 'Sem notícias.')
    .replace('{stories}', storiesSection)
    .replace('{analyses}', analysisSection.join('\n\n') || 'Sem análises.')
    .replace('{financial}', financialSection || 'Sem oportunidades.')
    .replace('{date}', new Date().toLocaleDateString('pt-BR'));

  const { textStream } = streamText({
    model,
    prompt: fullPrompt,
    maxTokens: 1000,
    abortSignal: AbortSignal.timeout(config.ai.backgroundTaskTimeoutMs),
  });
  let text = '';
  for await (const chunk of textStream) { text += chunk; }

  const topUrl = topArticles[0]?.url;
  await sendDigest(text, topUrl);
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
