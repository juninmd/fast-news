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
  if (!config.telegramBotToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  }
  if (!bot) {
    bot = new Telegraf(config.telegramBotToken);
    setupCommands(bot);
  }
  return bot;
}

function setupCommands(bot: Telegraf): void {
  bot.start((ctx: Context) =>
    ctx.replyWithHTML(
      `📰 <b>FAST NEWS AI</b>\n` +
      `──────────────────────\n` +
      `Bem-vindo ao centro de inteligência financeira.\n\n` +
      `📌 <b>Comandos:</b>\n` +
      `• /news — Principais notícias\n` +
      `• /topics — Tópicos monitorados\n` +
      `• /analysis — Análise profunda\n` +
      `• /financial — Oportunidades\n` +
      `• /ask — Perguntar à IA\n\n` +
      `──────────────────────\n` +
      `<i>Sempre à frente do mercado.</i>`
    )
  );

  bot.command('topics', async (ctx: Context) => {
    const topics = await getAllTrackedTopics();
    const list = topics.map((t, i) => `• <b>${t.name}</b>`).join('\n');
    await ctx.replyWithHTML(
      `📊 <b>TÓPICOS MONITORADOS</b>\n` +
      `──────────────────────\n` +
      `${list}\n` +
      `──────────────────────`
    );
  });

  bot.command('financial', async (ctx: Context) => {
    const opps = await getActiveOpportunities() as Record<string, unknown>[];
    if (!opps.length) return ctx.reply('📉 Nenhuma oportunidade ativa no momento.');
    const text = opps.slice(0, 6).map((o) =>
      `${o['direction'] === 'buy' ? '📈' : o['direction'] === 'sell' ? '📉' : '👀'} <b>${o['asset']}</b>\n${String(o['reasoning']).slice(0, 120)}...`
    ).join('\n\n');
    await ctx.replyWithHTML(
      `💰 <b>OPORTUNIDADES FINANCEIRAS</b>\n` +
      `──────────────────────\n` +
      `${text}\n` +
      `──────────────────────`
    );
  });

  bot.command('news', async (ctx: Context) => {
    const articles = await searchSimilarArticles('principais notícias', 1, 8);
    const text = articles.map((a, i) =>
      `${i + 1}. <b>${a.title.slice(0, 80)}</b>\n   📰 ${a.source} — <a href="${a.url}">ler</a>`
    ).join('\n\n');
    await ctx.replyWithHTML(
      `📰 <b>TOP NOTÍCIAS</b>\n` +
      `──────────────────────\n` +
      `${text || 'Sem notícias recentes.'}\n` +
      `──────────────────────`,
      { link_preview_options: { is_disabled: true } }
    );
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

function formatArticle(article: { title: string; url: string; source: string; category: string }): string {
  const emoji = CATEGORY_EMOJI[article.category] ?? '📰';
  const title = article.title.slice(0, 200);
  return `${emoji} <b>${escapeHtml(title)}</b>\n` +
         `──────────────────────\n` +
         `📌 <b>Fonte:</b> ${escapeHtml(article.source)}\n` +
         `🏷️ <b>Categoria:</b> ${article.category}\n` +
         `🔗 <a href="${article.url}">Ler notícia completa</a>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Posta novas notícias no Telegram após ingestion */
export async function postNewArticles(
  articles: Array<{ id: string; title: string; url: string; source: string; category: string }>
): Promise<void> {
  if (!config.telegramEnabled || !config.telegramBotToken || !config.telegramChatIds.length) return;

  const eligible = articles
    .filter((a) => config.telegramNewsCategories.includes(a.category))
    .slice(0, config.telegramMaxNewsPerRun);

  for (const article of eligible) {
    const message = formatArticle(article);
    for (const chatId of config.telegramChatIds) {
      await getBot().telegram.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      }).catch(console.error);
    }
    await sleep(1500); // respeita rate limit Telegram (30 msg/seg)
  }
}

export async function sendDigest(content: string): Promise<void> {
  if (!config.telegramEnabled || !config.telegramBotToken || !config.telegramChatIds.length) return;
  const chunks = content.match(/[\s\S]{1,4000}/g) ?? [];
  for (const chatId of config.telegramChatIds) {
    for (const chunk of chunks) {
      await getBot().telegram.sendMessage(chatId, chunk, { parse_mode: 'HTML' })
        .catch(() => getBot().telegram.sendMessage(chatId, chunk));
      await sleep(500);
    }
  }
}

async function sendLongMessage(ctx: Context, text: string): Promise<void> {
  const chunks = text.match(/[\s\S]{1,4000}/g) ?? [];
  for (const chunk of chunks) {
    await ctx.reply(chunk, { parse_mode: 'HTML' }).catch(() => ctx.reply(chunk));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startBot(): Promise<void> {
  if (!config.telegramEnabled || !config.telegramBotToken) {
    console.log('[Telegram] Bot is disabled or missing token. Skipping start.');
    return;
  }
  const b = getBot();
  await b.launch();
  console.log('[Telegram] Bot started.');
}

export async function stopBot(): Promise<void> {
  bot?.stop('SIGTERM');
}
