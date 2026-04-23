import cron from 'node-cron';
import { generateObject } from 'ai';
import { z } from 'zod';
import { query } from '../database/client.js';
import { runDailyAnalysis, getAllTrackedTopics, getTopicLatestAnalysis } from '../services/analysis.js';
import { extractFinancialOpportunities } from '../services/financial.js';
import { embedDocument, vectorToSQL } from '../services/embeddings.js';
import { getFastModel } from '../services/aiProvider.js';
import { config } from '../config/env.js';

const InsightsSchema = z.object({
  insights: z.array(z.string().describe('Insight conciso em 1 frase')).max(3),
});

async function buildKnowledgeInsights(): Promise<void> {
  const topics = await getAllTrackedTopics();
  for (const topic of topics) {
    const latestAnalysis = await getTopicLatestAnalysis(topic.id);
    if (!latestAnalysis) continue;

    try {
      const model = await getFastModel();
      const { object } = await generateObject({
        model,
        schema: InsightsSchema,
        prompt: `Baseado nessa análise sobre "${topic.name}", extraia até 3 insights duradouros para análises futuras. Cada insight em 1 frase concisa.\n\nANÁLISE:\n${latestAnalysis.slice(0, 2000)}`,
      });

      for (const insight of object.insights) {
        const embedding = await embedDocument(insight);
        await query(
          `INSERT INTO knowledge_insights (topic, insight, confidence, embedding)
           VALUES ($1, $2, $3, $4)`,
          [topic.name, insight, 0.7, vectorToSQL(embedding)]
        );
      }
    } catch (err) {
      console.error(`[learning] Insight extraction failed for ${topic.name}:`, err);
    }
  }
}

async function processFinancialOpportunities(): Promise<void> {
  const analyses = await query<{ id: string; content: string }>(
    `SELECT id, content FROM ai_analyses
     WHERE created_at > NOW() - INTERVAL '24 hours' AND analysis_type = 'daily'
     ORDER BY created_at DESC`
  );
  for (const analysis of analyses.rows) {
    await extractFinancialOpportunities(analysis.id, analysis.content).catch(console.error);
  }
}

export async function runLearningCycle(): Promise<void> {
  console.log('[LearningJob] Starting daily learning cycle...');
  await runDailyAnalysis();
  await buildKnowledgeInsights();
  await processFinancialOpportunities();
  console.log('[LearningJob] Learning cycle complete.');
}

let task: cron.ScheduledTask | null = null;

export function startLearningJob(): void {
  task = cron.schedule(config.cron.learning, async () => {
    console.log(`[LearningJob] Running at ${new Date().toISOString()}`);
    await runLearningCycle().catch(console.error);
  });
  console.log(`[LearningJob] Scheduled: ${config.cron.learning}`);
}

export function stopLearningJob(): void {
  task?.stop();
  task = null;
}
