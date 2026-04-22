import { generateText } from 'ai';
import { query } from '../database/client.js';
import { embedDocument, vectorToSQL } from './embeddings.js';
import { searchSimilarArticles, searchSimilarInsights, buildRagContext } from './rag.js';
import { cacheGet, cacheSet } from './cache.js';
import { getLanguageModel } from './aiProvider.js';

const ANALYSIS_PROMPT = `Você é um analista sênior de geopolítica, economia e mercados financeiros.

TÓPICO: {topic}

{ragContext}

NOTÍCIAS RECENTES (últimas 24h):
{recentNews}

Forneça análise completa em português:

## 🔍 SITUAÇÃO ATUAL
Resumo dos principais acontecimentos.

## 📊 ANÁLISE DE IMPACTO
Impactos políticos, econômicos e sociais.

## 🔗 CONEXÕES HISTÓRICAS
Como se relaciona com eventos passados similares.

## 🔮 PREVISÕES (próximas 24-72h)
- Cenário mais provável (confiança: X/10)
- Cenário alternativo (confiança: X/10)

## 💰 OPORTUNIDADES FINANCEIRAS
Ativos afetados e direção sugerida com justificativa.

## ⚠️ NÍVEL DE RISCO: [BAIXO/MÉDIO/ALTO]
Justificativa do risco.`;

export interface TrackedTopic {
  id: string;
  name: string;
  description: string;
  keywords: string[];
}

export async function analyzeTopicWithRAG(topic: TrackedTopic): Promise<string> {
  const cacheKey = `analysis:${topic.id}:${new Date().toISOString().slice(0, 10)}`;
  const cached = await cacheGet<string>(cacheKey);
  if (cached) return cached;

  const queryText = `${topic.name} ${topic.keywords.join(' ')}`;
  const [articles, insights] = await Promise.all([
    searchSimilarArticles(queryText, 1),
    searchSimilarInsights(queryText, 5),
  ]);

  const ragContext = buildRagContext(articles, insights);
  const recentArticles = articles.slice(0, 5)
    .map((a) => `• ${a.title} (${a.source})`)
    .join('\n');

  const prompt = ANALYSIS_PROMPT
    .replace('{topic}', topic.name)
    .replace('{ragContext}', ragContext)
    .replace('{recentNews}', recentArticles || 'Sem notícias recentes disponíveis.');

  const model = await getLanguageModel();
  const { text } = await generateText({ model, prompt, maxTokens: 2000 });

  const embedding = await embedDocument(text.slice(0, 2000));
  const inserted = await query<{ id: string }>(
    `INSERT INTO ai_analyses (topic_id, analysis_type, content, embedding)
     VALUES ($1, 'daily', $2, $3) RETURNING id`,
    [topic.id, text, vectorToSQL(embedding)]
  );

  const analysisId = inserted.rows[0]?.id;
  if (analysisId) await cacheSet(`analysis:latest:${topic.id}`, { id: analysisId, content: text }, 3600 * 6);
  await cacheSet(cacheKey, text, 3600 * 6);
  return text;
}

export async function getAllTrackedTopics(): Promise<TrackedTopic[]> {
  const result = await query<TrackedTopic>(
    'SELECT id, name, description, keywords FROM tracked_topics WHERE is_active = TRUE ORDER BY name'
  );
  return result.rows;
}

export async function getTopicLatestAnalysis(topicId: string): Promise<string | null> {
  const result = await query<{ content: string }>(
    'SELECT content FROM ai_analyses WHERE topic_id = $1 ORDER BY created_at DESC LIMIT 1',
    [topicId]
  );
  return result.rows[0]?.content ?? null;
}

export async function runDailyAnalysis(): Promise<void> {
  const topics = await getAllTrackedTopics();
  console.log(`[analysis] Analyzing ${topics.length} topics...`);
  for (const topic of topics) {
    try {
      await analyzeTopicWithRAG(topic);
      console.log(`[analysis] Completed: ${topic.name}`);
    } catch (err) {
      console.error(`[analysis] Failed for ${topic.name}:`, err);
    }
  }
}
