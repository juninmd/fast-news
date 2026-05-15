import cron from 'node-cron';
import { generateText, streamText } from 'ai';
import { getAllTrackedTopics, getTopicLatestAnalysis } from '../services/analysis.js';
import { getActiveOpportunities } from '../services/financial.js';
import { searchSimilarArticles } from '../services/rag.js';
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

  const model = await getFastModel();
  const fullPrompt = DIGEST_PROMPT
    .replace('{news}', newsSection || 'Sem notícias.')
    .replace('{analyses}', analysisSection.join('\n\n') || 'Sem análises.')
    .replace('{financial}', financialSection || 'Sem oportunidades.')
    .replace('{date}', new Date().toLocaleDateString('pt-BR'));

  // streamText evita timeout do SDK ao receber tokens incrementalmente
  const { textStream } = streamText({ model, prompt: fullPrompt, maxTokens: 600 });
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
