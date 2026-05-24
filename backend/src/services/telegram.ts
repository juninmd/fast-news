import { Telegraf, Context } from 'telegraf';
import { config } from '../config/env.js';
import { getAllTrackedTopics, analyzeTopicWithRAG } from './analysis.js';
import { getActiveOpportunities } from './financial.js';
import { searchSimilarArticles } from './rag.js';
import { getFastModel } from './aiProvider.js';
import { listActiveStories, getStoryGraph } from './correlation.js';
import { generateGlobalPulse } from './intelligence.js';
import { query } from '../database/client.js';
import { SEPARATOR, CATEGORY_EMOJI, IMPACT_EMOJI, SIGNAL_EMOJI, escapeHtml, formatPublishedAt } from './telegram_format.js';
import { generateSummary, generateContext, buildCredibilityBlock, fetchRelatedArticles } from './telegram_logic.js';

const FAST_NEWS_URL = 'https://fast-news.antonio-code.duckdns.org';
const FALLBACK_SUMMARY_MAX_LEN = 280;
let bot: Telegraf | null = null;

export function getBot(): Telegraf {
  if (!config.telegramBotToken) throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  if (!bot) { bot = new Telegraf(config.telegramBotToken); setupCommands(bot); }
  return bot;
}

function setupCommands(bot: Telegraf): void {
  const mainKeyboard = {
    keyboard: [[{ text: '🌌 Neo-Pulse' }, { text: '📰 Top Notícias' }], [{ text: '🔗 Histórias' }, { text: '📊 Tópicos' }], [{ text: '💰 Financeiro' }, { text: '❓ Ajuda' }]],
    resize_keyboard: true,
  };
  bot.start((ctx: Context) => ctx.replyWithHTML(`🌌 <b>NEO-EDITORIAL INTEL</b>\n${SEPARATOR}\nO futuro do jornalismo financeiro está aqui.\n\nExplore o pulso do mercado através dos botões abaixo.\n\n<i>Sempre à frente do mercado.</i>`, { reply_markup: mainKeyboard }));
  bot.hears('🌌 Neo-Pulse', (ctx) => (ctx as any).replyWithCommand('/pulse'));
  bot.hears('📰 Top Notícias', (ctx) => (ctx as any).replyWithCommand('/news'));
  bot.hears('🔗 Histórias', (ctx) => (ctx as any).replyWithCommand('/stories'));
  bot.hears('📊 Tópicos', (ctx) => (ctx as any).replyWithCommand('/topics'));
  bot.hears('💰 Financeiro', (ctx) => (ctx as any).replyWithCommand('/financial'));
  bot.hears('❓ Ajuda', (ctx) => (ctx as any).replyWithCommand('/start'));
  bot.action(/^fb:(like|dislike):([0-9a-f-]{36})$/i, async (ctx) => {
    const match = (ctx.callbackQuery as { data?: string }).data?.match(/^fb:(like|dislike):(.+)$/i);
    if (!match) return;
    await saveFeedback(ctx, match[2], match[1] as 'like' | 'dislike');
    await ctx.answerCbQuery(match[1] === 'like' ? 'Preferência registrada.' : 'Dislike registrado.');
  });
  bot.command('pulse', async (ctx: Context) => { await ctx.reply('🌌 Gerando Neo-Pulse Global...'); try { const pulse = await generateGlobalPulse(); await ctx.reply(pulse, { parse_mode: 'Markdown' }); } catch (err: any) { await ctx.reply(`❌ Falha ao gerar Pulse: ${err.message}`); } });
  bot.command('topics', async (ctx: Context) => { const topics = await getAllTrackedTopics(); const list = topics.map((t) => `• <b>${t.name}</b>`).join('\n'); await ctx.replyWithHTML(`📊 <b>TÓPICOS MONITORADOS</b>\n${SEPARATOR}\n${list}\n${SEPARATOR}`); });
  bot.command('financial', async (ctx: Context) => { const opps = await getActiveOpportunities() as any[]; if (!opps.length) return ctx.reply('📉 Nenhuma oportunidade ativa no momento.'); const text = opps.slice(0, 6).map((o) => `${o.direction === 'buy' ? '📈' : '📉'} <b>${o.asset}</b>\n${o.reasoning.slice(0, 120)}...`).join('\n\n'); await ctx.replyWithHTML(`💰 <b>OPORTUNIDADES FINANCEIRAS</b>\n${SEPARATOR}\n${text}\n${SEPARATOR}`); });
  bot.command('news', async (ctx: Context) => { const articles = await searchSimilarArticles('principais notícias', 1, 8); const text = articles.map((a, i) => `${i + 1}. <b>${a.title.slice(0, 80)}</b>\n   📰 ${a.source} — <a href="${a.url}">ler</a>`).join('\n\n'); await ctx.replyWithHTML(`📰 <b>TOP NOTÍCIAS</b>\n${SEPARATOR}\n${text || 'Sem notícias recentes.'}\n${SEPARATOR}`, { link_preview_options: { is_disabled: true } }); });
  bot.command('analysis', async (ctx: Context) => { const args = (ctx.message as any).text.split(' ').slice(1).join(' ').trim(); const topics = await getAllTrackedTopics(); const topic = args ? topics.find((t) => t.name.toLowerCase().includes(args.toLowerCase())) : topics[0]; if (!topic) return ctx.reply('❌ Tópico não encontrado.'); await ctx.reply('⏳ Analisando...'); const analysis = await analyzeTopicWithRAG(topic); await sendLongMessage(ctx, analysis); });
  bot.command('stories', async (ctx: Context) => { const stories = await listActiveStories(8); if (!stories.length) return ctx.reply('📭 Nenhuma história ativa.'); const text = stories.map((s) => `${IMPACT_EMOJI[s.impactLevel] ?? '📊'}${s.financialSignal ? ` ${SIGNAL_EMOJI[s.financialSignal]}` : ''} <b>${escapeHtml(s.title)}</b>\n   ${s.articleCount} artigos · ${escapeHtml(s.category)}`).join('\n\n'); await ctx.replyWithHTML(`🔗 <b>HISTÓRIAS EM ANDAMENTO</b>\n${SEPARATOR}\n${text}\n${SEPARATOR}\n<a href="${FAST_NEWS_URL}/?view=stories">Ver grafo completo</a>`, { link_preview_options: { is_disabled: true } }); });
  bot.command('ask', async (ctx: Context) => { const question = (ctx.message as any).text.split(' ').slice(1).join(' ').trim(); if (!question) return ctx.reply('❓ Use: /ask [pergunta]'); const articles = await searchSimilarArticles(question, 7, 5); const text = articles.map((a) => `• [${a.title.slice(0, 70)}](${a.url}) — _${a.source}_`).join('\n'); await ctx.reply(`🔍 *Resultados para:* _${question}_\n\n${text || 'Nenhum resultado.'}`, { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } }); });
}

async function saveFeedback(ctx: Context, articleId: string, reaction: 'like' | 'dislike'): Promise<void> {
  await query(`INSERT INTO telegram_article_feedback (article_id, chat_id, user_id, username, reaction) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (article_id, chat_id, user_id) DO UPDATE SET reaction = EXCLUDED.reaction, updated_at = NOW()`,
    [articleId, String(ctx.chat?.id ?? ''), String(ctx.from?.id ?? ''), ctx.from?.username ?? null, reaction]).catch(console.error);
}

export interface TelegramArticle { id: string; title: string; url: string; source: string; category: string; content: string; company?: string; publishedAt?: Date | null; imageUrl?: string; storyId?: string | null; fakeNewsScore?: number | null; politicalBias?: string | null; isMilitant?: boolean; hasIncoherence?: boolean; credibilityFlags?: string[]; credibilityReasoning?: string | null; }

export function safeTruncateHtml(html: string, limit: number): string {
  if (html.length <= limit) return html;

  let truncIdx = limit;

  // Avoid cutting inside an HTML tag: < ... >
  const lastOpenBracket = html.lastIndexOf('<', truncIdx - 1);
  const lastCloseBracket = html.lastIndexOf('>', truncIdx - 1);
  if (lastOpenBracket > lastCloseBracket) {
    truncIdx = lastOpenBracket;
  }

  // Avoid cutting inside an HTML entity: & ... ;
  const lastAmpersand = html.lastIndexOf('&', truncIdx - 1);
  const lastSemicolon = html.lastIndexOf(';', truncIdx - 1);
  if (lastAmpersand > lastSemicolon && (truncIdx - lastAmpersand) < 10) {
    truncIdx = lastAmpersand;
  }

  let truncated = html.slice(0, truncIdx);

  // Close any tags left open
  const tagRegex = /<\/?([a-z1-6]+)(?:\s+[^>]*?)?>/gi;
  const openTags: string[] = [];
  let match;

  while ((match = tagRegex.exec(truncated)) !== null) {
    const isClose = match[0].startsWith('</');
    const tagName = match[1].toLowerCase();

    if (isClose) {
      const lastOpenIdx = openTags.lastIndexOf(tagName);
      if (lastOpenIdx !== -1) {
        openTags.splice(lastOpenIdx, 1);
      }
    } else {
      const voidTags = ['img', 'br', 'hr', 'input', 'meta', 'link'];
      if (!voidTags.includes(tagName)) {
        openTags.push(tagName);
      }
    }
  }

  for (let i = openTags.length - 1; i >= 0; i--) {
    truncated += `</${openTags[i]}>`;
  }

  return truncated;
}

export async function postArticleToTelegram(article: TelegramArticle): Promise<void> {
  if (!config.telegramEnabled || !config.telegramBotToken || !config.telegramChatIds.length) return;
  const activeStories = await listActiveStories(50).catch(() => []);
  const storyMap = new Map(activeStories.map((s) => [s.id, s]));
  const fastModel = await getFastModel();
  const [summary, context] = await Promise.all([
    generateSummary(article.title, article.content, fastModel),
    generateContext(article.title, article.content, article.category, fastModel),
  ]);
  const displaySummary = summary || article.content.replace(/\s+/g, ' ').trim().slice(0, FALLBACK_SUMMARY_MAX_LEN);
  const { label: ago, isBreaking } = formatPublishedAt(article.publishedAt);
  const matchedStory = article.storyId ? storyMap.get(article.storyId) : null;
  const storyGraph = matchedStory ? await getStoryGraph(matchedStory.id).catch(() => null) : null;
  let storyBlock = '';
  if (matchedStory) {
    storyBlock = `\n\n${SEPARATOR}\n${IMPACT_EMOJI[matchedStory.impactLevel] ?? '📊'}${matchedStory.financialSignal && matchedStory.financialSignal !== 'neutral' ? ` ${SIGNAL_EMOJI[matchedStory.financialSignal]}` : ''} <b>${escapeHtml(matchedStory.title)}</b>\n<i>Parte de uma história com ${matchedStory.articleCount} reportagens</i>`;
    if (matchedStory.affectedAssets?.length) storyBlock += `\n💹 <code>${matchedStory.affectedAssets.slice(0, 4).join(' · ')}</code>`;
    if (matchedStory.summary) storyBlock += `\n\n${escapeHtml(matchedStory.summary.slice(0, 250))}`;
    const whatChanged = storyGraph?.timeline.at(-1)?.whatChanged ?? '';
    if (whatChanged) storyBlock += `\n🔄 <i>${escapeHtml(whatChanged.slice(0, 160))}</i>`;
  }
  const related = await fetchRelatedArticles(article.id, article.category);
  const relatedBlock = related.length ? `\n\n${SEPARATOR}\n🔗 <b>Veja também</b>\n${related.map((r) => `• <a href="${r.url}">${escapeHtml(r.title.slice(0, 72))}</a>`).join('\n')}` : '';
  const breakingLabel = isBreaking ? `🔴 <b>URGENTE</b>  ·  ` : '';
  const sourceHeader = `${breakingLabel}${CATEGORY_EMOJI[article.category] ?? '📰'} <b>${article.category.toUpperCase()}</b>  ·  ${article.company ? `${article.company} · ` : ''}${article.source}${ago ? `  ·  <i>${ago}</i>` : ''}`;
  const message = `${sourceHeader}\n${SEPARATOR}\n<b>${escapeHtml(article.title)}</b>\n\n<i>${escapeHtml(displaySummary)}</i>${context ? `\n\n💡 <i>${escapeHtml(context)}</i>` : ''}${buildCredibilityBlock(article)}${storyBlock}${relatedBlock}\n\n#${article.category.replace(/\W/g, '_')}`;
  const inlineButtons = [[{ text: '👍 Curtir', callback_data: `fb:like:${article.id}` }, { text: '👎 Não curti', callback_data: `fb:dislike:${article.id}` }], [{ text: '📖 Ler reportagem', url: article.url }, { text: '📱 Fast News', url: `${FAST_NEWS_URL}/?id=${article.id}` }]];
  if (matchedStory) inlineButtons.push([{ text: '🕸 Ver grafo', url: `${FAST_NEWS_URL}/?view=stories&story=${matchedStory.id}` }]);
  const sendOpts = { parse_mode: 'HTML' as const, link_preview_options: { url: article.imageUrl ?? article.url, prefer_large_media: true, show_above_text: true }, reply_markup: { inline_keyboard: inlineButtons } };
  await Promise.allSettled(config.telegramChatIds.map((chatId) => getBot().telegram.sendMessage(chatId, safeTruncateHtml(message, 3800), sendOpts)));
  await query(`UPDATE news_articles SET telegram_sent_at = NOW() WHERE id = $1`, [article.id]).catch(console.error);
}

export async function postNewArticles(articles: TelegramArticle[]): Promise<void> { for (const article of articles) { await postArticleToTelegram(article); await new Promise(r => setTimeout(r, 1500)); } }
export async function sendDigest(content: string, _topArticleUrl?: string): Promise<void> {
  if (!config.telegramEnabled || !config.telegramBotToken || !config.telegramChatIds.length) return;
  const chunks = content.match(/[\s\S]{1,3800}/g) ?? [];
  for (const chatId of config.telegramChatIds) { for (const chunk of chunks) { await getBot().telegram.sendMessage(chatId, chunk, { parse_mode: 'Markdown' }).catch(() => getBot().telegram.sendMessage(chatId, chunk)); await new Promise(r => setTimeout(r, 500)); } }
}
async function sendLongMessage(ctx: Context, text: string): Promise<void> { const chunks = text.match(/[\s\S]{1,4000}/g) ?? []; for (const chunk of chunks) await ctx.reply(chunk, { parse_mode: 'HTML' }).catch(() => ctx.reply(chunk)); }
export async function startBot(): Promise<void> { if (config.telegramEnabled && config.telegramBotToken) { getBot().launch().catch(console.error); console.log('[Telegram] Bot started.'); } }
export async function stopBot(): Promise<void> { bot?.stop('SIGTERM'); }
