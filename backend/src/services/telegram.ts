import { Telegraf, Context } from 'telegraf';
import { generateText } from 'ai';
import { config } from '../config/env.js';
import { getAllTrackedTopics, analyzeTopicWithRAG } from './analysis.js';
import { getActiveOpportunities } from './financial.js';
import { searchSimilarArticles } from './rag.js';
import { getFastModel } from './aiProvider.js';
import { listActiveStories } from './correlation.js';

const FAST_NEWS_URL = 'https://fast-news.antonio-code.duckdns.org';

let bot: Telegraf | null = null;

const CATEGORY_EMOJI: Record<string, string> = {
  'Mundo': '🌍', 'Negócios': '💼', 'Brasil': '🇧🇷', 'Tecnologia': '💻',
  'Ciência': '🔬', 'Esportes': '⚽', 'Entretenimento': '🎬', 'Games': '🎮', 'Saúde': '🏥',
  'AI Frontier': '🤖', 'Big Techs': '🏢', 'Dev Tools': '🛠', 'Gaming': '🎮',
  'Negocios': '💼', 'Ciencia': '🔬',
};

const IMPACT_EMOJI: Record<string, string> = {
  critical: '🚨', high: '⚠️', medium: '📊', low: '📌',
};

const SIGNAL_EMOJI: Record<string, string> = {
  bullish: '📈', bearish: '📉', neutral: '➡️',
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
      `• /stories — Histórias correlacionadas\n` +
      `• /topics — Tópicos monitorados\n` +
      `• /analysis — Análise profunda\n` +
      `• /financial — Oportunidades de mercado\n` +
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

  bot.command('stories', async (ctx: Context) => {
    const stories = await listActiveStories(8);
    if (!stories.length) return ctx.reply('📭 Nenhuma história ativa no momento.');
    const text = stories.map((s) => {
      const impact = IMPACT_EMOJI[s.impactLevel] ?? '📊';
      const signal = s.financialSignal ? ` ${SIGNAL_EMOJI[s.financialSignal] ?? ''}` : '';
      const assets = s.affectedAssets?.length
        ? `\n   <code>${s.affectedAssets.slice(0, 3).join(' · ')}</code>` : '';
      return `${impact}${signal} <b>${escapeHtml(s.title)}</b>${assets}\n   ${s.articleCount} artigos · ${escapeHtml(s.category)}`;
    }).join('\n\n');
    await ctx.replyWithHTML(
      `🔗 <b>HISTÓRIAS EM ANDAMENTO</b>\n` +
      `──────────────────────\n` +
      `${text}\n` +
      `──────────────────────\n` +
      `<a href="${FAST_NEWS_URL}/?view=stories">Ver grafo completo</a>`,
      { link_preview_options: { is_disabled: true } }
    );
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

async function generateSummary(title: string, content: string): Promise<string> {
  try {
    const model = await getFastModel();
    const { text } = await generateText({
      model,
      prompt: `Resuma esta notícia em 2 frases diretas em português. Seja objetivo e informativo.\n\nTítulo: ${title}\n\nConteúdo: ${content.slice(0, 1000)}`,
      maxTokens: 120,
    });
    return text.trim();
  } catch {
    return '';
  }
}

/** Posta novas notícias no Telegram após ingestion */
export async function postNewArticles(
  articles: Array<{ id: string; title: string; url: string; source: string; category: string; content: string; storyId?: string | null }>
): Promise<void> {
  if (!config.telegramEnabled || !config.telegramBotToken || !config.telegramChatIds.length) return;

  const eligible = articles
    .filter((a) => config.telegramNewsCategories.includes(a.category))
    .slice(0, config.telegramMaxNewsPerRun);

  // Fetch active stories once for enrichment
  const activeStories = await listActiveStories(50).catch(() => []);
  const storyMap = new Map(activeStories.map((s) => [s.id, s]));

  for (const article of eligible) {
    const emoji = CATEGORY_EMOJI[article.category] ?? '📰';
    const summary = await generateSummary(article.title, article.content);

    // Find story by matching category and recent stories (best effort)
    const matchedStory = article.storyId
      ? storyMap.get(article.storyId)
      : activeStories.find((s) => s.category === article.category && s.articleCount > 1);

    let storyBlock = '';
    if (matchedStory) {
      const impact = IMPACT_EMOJI[matchedStory.impactLevel] ?? '';
      const signal = matchedStory.financialSignal ? `${SIGNAL_EMOJI[matchedStory.financialSignal]} ` : '';
      const assets = matchedStory.affectedAssets?.length
        ? `\n💹 <code>${matchedStory.affectedAssets.slice(0, 4).join(' · ')}</code>` : '';
      storyBlock =
        `\n\n${impact} <b>História:</b> ${escapeHtml(matchedStory.title.slice(0, 80))}` +
        `\n${signal}${matchedStory.articleCount} artigos correlacionados${assets}`;
      if (matchedStory.worldImpact) {
        storyBlock += `\n🌍 <i>${escapeHtml(matchedStory.worldImpact.slice(0, 150))}...</i>`;
      }
    }

    const message =
      `${emoji} <b>${escapeHtml(article.title.slice(0, 200))}</b>\n` +
      (summary ? `\n💡 <i>${escapeHtml(summary)}</i>` : '') +
      `\n\n📌 <b>${escapeHtml(article.source)}</b> · ${article.category}` +
      storyBlock;

    const inlineButtons = [[
      { text: '🔗 Ler notícia', url: article.url },
      { text: '📱 Fast-News', url: `${FAST_NEWS_URL}/?id=${article.id}` },
    ]];
    if (matchedStory) {
      inlineButtons.push([{ text: '🕸 Ver história completa', url: `${FAST_NEWS_URL}/?view=stories&story=${matchedStory.id}` }]);
    }

    for (const chatId of config.telegramChatIds) {
      await getBot().telegram.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        link_preview_options: { url: article.url, prefer_large_media: true, show_above_text: false },
        reply_markup: { inline_keyboard: inlineButtons },
      }).catch((err) => console.error(`[Telegram] Failed to send to ${chatId}:`, err.message));
    }
    await sleep(2000);
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
