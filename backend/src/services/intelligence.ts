import { generateText } from 'ai';
import { getLanguageModel } from './aiProvider.js';
import { listActiveStories } from './correlation.js';
import { searchSimilarArticles } from './rag.js';

export interface GlobalPulse {
  summary: string;
  sentiment: string;
  topStories: string[];
  marketMood: string;
  criticalRisks: string[];
  opportunities: string[];
}

export async function generateGlobalPulse(): Promise<string> {
  const stories = await listActiveStories(15);
  const recentNews = await searchSimilarArticles('principais notícias do dia', 1, 10);
  
  const context = `
STORIES EM ANDAMENTO:
${stories.map(s => `- ${s.title} (${s.impactLevel}): ${s.summary}`).join('\n')}

NOTÍCIAS RECENTES:
${recentNews.map(n => `- ${n.title} (${n.source})`).join('\n')}
`;

  const prompt = `
Você é o Chief Intelligence Officer do Fast-News AI. 
Analise o contexto acima e gere um "Intelligence Pulse" estratégico para investidores e tomadores de decisão.

${context}

Use o seguinte formato Markdown do Telegram:

🌌 *NEO-PULSE: ESTADO GLOBAL*
──────────────────────
💡 *SÍNTESE ESTRATÉGICA:*
(Um parágrafo de 3 frases com a "big picture" do dia)

📈 *SENTIMENTO DE MERCADO:* [BULLISH / BEARISH / CAUTELOSO]
(Justificativa breve de 2 frases)

🔥 *HISTÓRIAS DE ALTO IMPACTO:*
• *[Título]*: (Impacto em 1 frase)
• *[Título]*: (Impacto em 1 frase)

⚡ *SINAIS DE RISCO:*
• (Risco crítico detectado nos subtextos)

💰 *FRONT DE OPORTUNIDADE:*
• (Onde os fluxos de capital estão se movendo)

──────────────────────
_Gerado por Fast-News Intelligence v2_
`;

  const model = await getLanguageModel();
  const { text } = await generateText({
    model,
    prompt,
    maxTokens: 1500,
  });

  return text;
}
