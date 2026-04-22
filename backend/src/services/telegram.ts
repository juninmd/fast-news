import { Telegraf, Context } from 'telegraf';
import { config } from '../config/env.js';
import { getAllTrackedTopics, analyzeTopicWithRAG, getTopicLatestAnalysis } from './analysis.js';
import { getActiveOpportunities } from './financial.js';
import { searchSimilarArticles } from './rag.js';

let bot: Telegraf | null = null;

const CATEGORY_EMOJI: Record<string, string> = {
  'Mundo': '🌍', 'Negócios': '💼', 'Brasil': '🇧🇷', 'Tecnologia': '💻',
  'Ciência': '🔬', 'Esportes': '⚽', 'Entretenimento': '🎬', 'Games': '🎮', 'Saúde': '🏥',
};

export function getBot(): Telegraf {
  if (!bot) {
    bot = new Telegraf(config.telegramBotToken);
    setupCommands(bot);
  }
  return bot;
}

function setupCommands(bot: Telegraf): void {
  bot.start((ctx: Context) =>
    ctx.reply('📰 *Fast News AI*\n\n/news /topics /analysis /financial /ask /digest', { parse_mode: 'Markdown' })
  );

  bot.command('topics', async (ctx: Context) => {
    const topics = await getAllTrackedTopics();
    const list = topics.map((t, i) => `${i + 1}. *${t.name}*`).join('\n');
    await ctx.reply(`📊 *Tópicos Monitorados:*\n\n${list}`, { parse_mode: 'Markdown' });
  });

  bot.command('financial', async (ctx: Context) => {
    const opps = await getActiveOpportunities() as Record<string, unknown>[];
    if (!opps.length) return ctx.reply('📉 Nenhuma oportunidade ativa.');
    const text = opps.slice(0, 6).map((o) =>
      `${o['direction'] === 'buy' ? '📈' : o['direction'] === 'sell' ? '📉' : '👀'} *${o['asset']}* — ${String(o['reasoning']).slice(0, 100)}`
    ).join('\n\n');
    await ctx.reply(`💰 *Oportunidades Financeiras:*\n\n${text}`, { parse_mode: 'Markdown' });
  });

  bot.command('news', async (ctx: Context) => {
    const articles = await searchSimilarArticles('principais notícias', 1, 8);
    const text = articles.map((a, i) =>
      `${i + 1}. *${a.title.slice(0, 80)}*\n   📰 ${a.source} — [ler](${a.url})`
    ).join('\n\n');
    await ctx.reply(`📰 *Top Notícias:*\n\n${text || 'Sem notícias.'}`, { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } });
  });

  bot.command('analysis', async (ctx: Context) => {
    const message = ctx.message as { text?: string } | undefined;
    const args = (message?.text ?? '').split(' ').slice(1).join(' ').trim();
    const topics = await getAllTrackedTopics();
    const topic = args ? topics.find((t) => t.name.toLowerCase().includes(args.toLowerCase())) : topics[0];
    if (!topic) return ctx.reply('❌ Tópico não encontrado. Use /topics.');
    await ctx.reply('⏳ Analisando...');
    const analysis = await analyzeTopicWithRAG(topic);
    await sendLongMessage(ctx, analysis);
  });

  bot.command('ask', async (ctx: Context) => {
    const message = ctx.message as { text?: string } | undefined;
    const question = (message?.text ?? '').split(' ').slice(1).join(' ').trim();
    if (!question) return ctx.reply('❓ Use: /ask [pergunta]');
    const articles = await searchSimilarArticles(question, 7, 5);
    const text = articles.map((a) => `• [${a.title.slice(0, 70)}](${a.url}) — _${a.source}_`).join('\n');
    await ctx.reply(`🔍 *Resultados para:* _${question}_\n\n${text || 'Nenhum resultado.'}`,
      { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } });
  });
}

/** Formata uma notícia para o Telegram */
function formatArticle(article: { title: string; url: string; source: string; category: string }): string {
  const emoji = CATEGORY_EMOJI[article.category] ?? '📰';
  const title = article.title.slice(0, 200);
  return `${emoji} *${escapeMarkdown(title)}*\n📌 ${escapeMarkdown(article.source)}\n🔗 [Ler notícia](${article.url})`;
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

/** Posta novas notícias no Telegram após ingestion */
export async function postNewArticles(
  articles: Array<{ id: string; title: string; url: string; source: string; category: string }>
): Promise<void> {
  if (!config.telegramChatIds.length) return;

  const eligible = articles
    .filter((a) => config.telegramNewsCategories.includes(a.category))
    .slice(0, config.telegramMaxNewsPerRun);

  for (const article of eligible) {
    const message = formatArticle(article);
    for (const chatId of config.telegramChatIds) {
      await getBot().telegram.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true },
      }).catch(console.error);
    }
    await sleep(1500); // respeita rate limit Telegram (30 msg/seg)
  }
}

export async function sendDigest(content: string): Promise<void> {
  const chunks = content.match(/[\s\S]{1,4000}/g) ?? [];
  for (const chatId of config.telegramChatIds) {
    for (const chunk of chunks) {
      await getBot().telegram.sendMessage(chatId, chunk, { parse_mode: 'Markdown' })
        .catch(() => getBot().telegram.sendMessage(chatId, chunk));
      await sleep(500);
    }
  }
}

async function sendLongMessage(ctx: Context, text: string): Promise<void> {
  const chunks = text.match(/[\s\S]{1,4000}/g) ?? [];
  for (const chunk of chunks) {
    await ctx.reply(chunk, { parse_mode: 'Markdown' }).catch(() => ctx.reply(chunk));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startBot(): Promise<void> {
  const b = getBot();
  await b.launch();
  console.log('[Telegram] Bot started.');
}

export async function stopBot(): Promise<void> {
  bot?.stop('SIGTERM');
}
