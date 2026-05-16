import { Telegraf, Context } from 'telegraf';
import { generateText } from 'ai';
import { config } from '../config/env.js';
import { getAllTrackedTopics, analyzeTopicWithRAG } from './analysis.js';
import { getActiveOpportunities } from './financial.js';
import { searchSimilarArticles } from './rag.js';
import { getFastModel } from './aiProvider.js';
import { listActiveStories, getStoryGraph } from './correlation.js';
import { generateGlobalPulse } from './intelligence.js';
import { query } from '../database/client.js';

const FAST_NEWS_URL = 'https://fast-news.antonio-code.duckdns.org';

let bot: Telegraf | null = null;

const CATEGORY_EMOJI: Record<string, string> = {
  'Mundo': '🌍', 'Negócios': '💼', 'Brasil': '🇧🇷', 'Tecnologia': '💻',
  'Ciência': '🔬', 'Esportes': '⚽', 'Entretenimento': '🎬', 'Games': '🎮', 'Saúde': '🏥',
  'AI Frontier': '🤖', 'Big Techs': '🏢', 'Dev Tools': '🛠️', 'Gaming': '🎮',
  'Negocios': '💼', 'Ciencia': '🔬', 'Engenharia': '⚙️', 'Open Source': '🐧',
  'Segurança': '🔐', 'Startups': '🚀',
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
  const mainKeyboard = {
    keyboard: [
      [{ text: '🌌 Neo-Pulse' }, { text: '📰 Top Notícias' }],
      [{ text: '🔗 Histórias' }, { text: '📊 Tópicos' }],
      [{ text: '💰 Financeiro' }, { text: '❓ Ajuda' }],
    ],
    resize_keyboard: true,
  };

  bot.start((ctx: Context) =>
    ctx.replyWithHTML(
      `🌌 <b>NEO-EDITORIAL INTEL</b>\n` +
      `──────────────────────\n` +
      `O futuro do jornalismo financeiro está aqui.\n\n` +
      `Explore o pulso do mercado através dos botões abaixo.\n\n` +
      `<i>Sempre à frente do mercado.</i>`,
      { reply_markup: mainKeyboard }
    )
  );

  bot.hears('🌌 Neo-Pulse', (ctx) => (ctx as any).replyWithCommand('/pulse'));
  bot.hears('📰 Top Notícias', (ctx) => (ctx as any).replyWithCommand('/news'));
  bot.hears('🔗 Histórias', (ctx) => (ctx as any).replyWithCommand('/stories'));
  bot.hears('📊 Tópicos', (ctx) => (ctx as any).replyWithCommand('/topics'));
  bot.hears('💰 Financeiro', (ctx) => (ctx as any).replyWithCommand('/financial'));
  bot.hears('❓ Ajuda', (ctx) => (ctx as any).replyWithCommand('/start'));

  bot.command('pulse', async (ctx: Context) => {
    await ctx.reply('🌌 Gerando Neo-Pulse Global...');
    try {
      const pulse = await generateGlobalPulse();
      await ctx.reply(pulse, { parse_mode: 'Markdown' });
    } catch (err: any) {
      await ctx.reply(`❌ Falha ao gerar Pulse: ${err.message}`);
    }
  });

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
         `<b>FONTE:</b> ${escapeHtml(article.source).toUpperCase()}\n` +
         `<b>EDITORIA:</b> ${article.category.toUpperCase()}\n` +
         `──────────────────────\n` +
         `🔗 <a href="${article.url}">ACESSAR REPORTAGEM COMPLETA</a>`;
}

function timeAgo(date: Date | null | undefined): string {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `há ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
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
      prompt: `Você é um editor sênior. Resuma esta notícia em 2-3 frases impactantes e profissionais em português (PT-BR). 
      Foque nos fatos e no impacto. Não use "Esta notícia fala sobre...". Vá direto ao ponto.\n\nTítulo: ${title}\n\nConteúdo: ${content.slice(0, 1500)}`,
      maxTokens: 180,
    });
    return text.trim();
  } catch {
    return '';
  }
}

function buildCredibilityBlock(article: {
  fakeNewsScore?: number | null;
  politicalBias?: string | null;
  isMilitant?: boolean;
  hasIncoherence?: boolean;
}): string {
  const parts: string[] = [];
  if (article.fakeNewsScore != null && article.fakeNewsScore > 4) {
    const icon = article.fakeNewsScore <= 6 ? '⚠️' : '🚨';
    parts.push(`${icon} <b>INTEGRIDADE:</b> ${article.fakeNewsScore}/10`);
  }
  const biasMap: Record<string, string> = {
    left: '🔵 ESQUERDA', far_left: '🔵🔵 ESQ. RADICAL',
    right: '🔴 DIREITA', far_right: '🔴🔴 DIR. RADICAL',
    neutral: '⚪ NEUTRO',
  };
  if (article.politicalBias && article.politicalBias !== 'neutral') {
    parts.push(`⚖️ <b>VIÉS:</b> ${biasMap[article.politicalBias] ?? article.politicalBias.toUpperCase()}`);
  }
  if (article.isMilitant) parts.push('📢 <b>CONTEÚDO MILITANTE</b>');
  if (article.hasIncoherence) parts.push('⚡ <b>INCOERÊNCIAS DETECTADAS</b>');
  return parts.length ? `\n\n${parts.join('\n')}` : '';
}

async function fetchRelatedArticles(
  articleId: string,
  category: string,
  limit = 2
): Promise<Array<{ title: string; url: string; source: string }>> {
  try {
    // Try vector similarity first
    const byVector = await query<{ title: string; url: string; source: string }>(
      `SELECT na.title, na.url, na.source
       FROM article_relations ar
       JOIN news_articles na ON na.id = CASE WHEN ar.article_a = $1 THEN ar.article_b ELSE ar.article_a END
       WHERE (ar.article_a = $1 OR ar.article_b = $1)
       ORDER BY ar.similarity DESC
       LIMIT $2`,
      [articleId, limit]
    );
    if (byVector.rows.length > 0) return byVector.rows;

    // Fallback: recent articles in same category
    const byCategory = await query<{ title: string; url: string; source: string }>(
      `SELECT title, url, source FROM news_articles
       WHERE category = $1 AND id != $2
         AND published_at > NOW() - INTERVAL '48 hours'
       ORDER BY published_at DESC LIMIT $3`,
      [category, articleId, limit]
    );
    return byCategory.rows;
  } catch {
    return [];
  }
}

/** Posta novas notícias no Telegram após ingestion */
export async function postNewArticles(
  articles: Array<{
    id: string; title: string; url: string; source: string; category: string; content: string;
    company?: string;
    publishedAt?: Date | null;
    imageUrl?: string;
    storyId?: string | null;
    fakeNewsScore?: number | null;
    politicalBias?: string | null;
    isMilitant?: boolean;
    hasIncoherence?: boolean;
  }>
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
    // Fallback: first 220 chars of content when AI summary unavailable
    const displaySummary = summary || article.content.replace(/\s+/g, ' ').trim().slice(0, 220);

    // Prefer storyId from enriched article, then search active stories
    const matchedStory = article.storyId
      ? storyMap.get(article.storyId) ?? activeStories.find((s) => s.id === article.storyId)
      : activeStories.find((s) => s.category === article.category && s.articleCount > 2);

    // Fetch story graph for timeline events if story matched
    const storyGraph = matchedStory
      ? await getStoryGraph(matchedStory.id).catch(() => null)
      : null;

    let storyBlock = '';
    if (matchedStory) {
      const impact = IMPACT_EMOJI[matchedStory.impactLevel] ?? '';
      const signal = matchedStory.financialSignal && matchedStory.financialSignal !== 'neutral'
        ? `${SIGNAL_EMOJI[matchedStory.financialSignal] ?? ''} ` : '';
      const assets = matchedStory.affectedAssets?.length
        ? `\n💹 <b>ATIVOS:</b> <code>${matchedStory.affectedAssets.slice(0, 4).join(' · ')}</code>` : '';

      storyBlock = `\n\n${impact} <b>DESDOBRAMENTO:</b> ${escapeHtml(matchedStory.title.toUpperCase())}` +
        `\n${signal}<i>Contexto consolidado de ${matchedStory.articleCount} reportagens</i>${assets}`;

      if (matchedStory.summary) {
        storyBlock += `\n\n📝 <b>ANÁLISE:</b> <i>${escapeHtml(matchedStory.summary.slice(0, 250))}</i>`;
      }

      // Latest timeline event (what changed)
      const lastEvent = storyGraph?.timeline.at(-1);
      if (lastEvent?.whatChanged) {
        storyBlock += `\n\n🔄 <b>ÚLTIMA ATUALIZAÇÃO:</b> <i>${escapeHtml(lastEvent.whatChanged.slice(0, 150))}</i>`;
      }
    }

    // Related articles block
    const related = await fetchRelatedArticles(article.id, article.category);
    const relatedBlock = related.length
      ? `\n\n─────────────────────\n` +
        `🔗 <b>PERSPECTIVAS RELACIONADAS:</b>\n` +
        related.map((r) => `• <a href="${r.url}">${escapeHtml(r.title.slice(0, 70))}</a> <i>(${escapeHtml(r.source)})</i>`).join('\n')
      : '';

    const credibilityBlock = buildCredibilityBlock(article);
    const ago = timeAgo(article.publishedAt);
    const companyLine = article.company && article.company !== article.source
      ? `${escapeHtml(article.company).toUpperCase()} · ` : '';

    let message =
      `${emoji} <b>${escapeHtml(article.title.toUpperCase())}</b>` +
      `\n\n${escapeHtml(displaySummary)}` +
      `\n\n─────────────────────\n` +
      `🏛️ <b>EDITORIA:</b> ${article.category.toUpperCase()}` +
      `\n📰 <b>FONTE:</b> ${companyLine}${escapeHtml(article.source).toUpperCase()}` +
      (ago ? `  ·  <i>${ago}</i>` : '') +
      credibilityBlock +
      storyBlock +
      relatedBlock;

    // Telegram max is 4096 chars — truncate gracefully
    if (message.length > 3800) {
      message = message.slice(0, 3780) + '…';
    }

    const inlineButtons = [[
      { text: '📖 LER REPORTAGEM', url: article.url },
      { text: '📱 NEO-PULSE', url: `${FAST_NEWS_URL}/?id=${article.id}` },
    ]];

    if (matchedStory) {
      inlineButtons.push([{ text: '🕸 EXPLORAR GRAFO DA HISTÓRIA', url: `${FAST_NEWS_URL}/?view=stories&story=${matchedStory.id}` }]);
    }

    const previewUrl = article.imageUrl ?? article.url;
    for (const chatId of config.telegramChatIds) {
      await getBot().telegram.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        link_preview_options: { url: previewUrl, prefer_large_media: true, show_above_text: true },
        reply_markup: { inline_keyboard: inlineButtons },
      }).catch((err) => console.error(`[Telegram] Failed to send to ${chatId}:`, err.message));
    }
    await sleep(2000);
  }
}

export async function sendDigest(content: string, topArticleUrl?: string): Promise<void> {
  if (!config.telegramEnabled || !config.telegramBotToken || !config.telegramChatIds.length) return;
  const chunks = splitMarkdown(content);
  for (const chatId of config.telegramChatIds) {
    for (let i = 0; i < chunks.length; i++) {
      const isFirst = i === 0;
      const opts: Record<string, unknown> = { parse_mode: 'Markdown' };
      if (isFirst && topArticleUrl) {
        opts.link_preview_options = { url: topArticleUrl, prefer_large_media: true, show_above_text: true };
      }
      await getBot().telegram.sendMessage(chatId, chunks[i], opts)
        .catch(() => getBot().telegram.sendMessage(chatId, chunks[i]));
      await sleep(500);
    }
  }
}

/** Split at paragraph boundaries to avoid breaking Markdown formatting mid-sentence */
function splitMarkdown(text: string, limit = 3800): string[] {
  if (text.length <= limit) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > limit) {
    let cut = remaining.lastIndexOf('\n\n', limit);
    if (cut < limit / 2) cut = remaining.lastIndexOf('\n', limit);
    if (cut < 1) cut = limit;
    chunks.push(remaining.slice(0, cut).trimEnd());
    remaining = remaining.slice(cut).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
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
