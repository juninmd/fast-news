/* eslint-env node */
import 'dotenv/config';
import Parser from 'rss-parser';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Import sources
import { FEED_SOURCES } from '../src/services/newsService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Limits
const MAX_ITEMS_PER_RUN = 15; // Increased limit slightly
const CONCURRENCY_LIMIT = 5; // Process 5 feeds in parallel
const HISTORY_FILE = 'history.json';

const parser = new Parser({
    timeout: 10000,
    headers: { 'User-Agent': 'NewsAI-Agent/1.0' }
});

const EMOJI_MAP = {
    'Tecnologia': '💻',
    'IA': '🤖',
    'Brasil': '🇧🇷',
    'Mundo': '🌍',
    'Negócios': '💼',
    'Ciência': '🔬',
    'Esportes': '⚽',
    'Automóveis': '🚗',
    'Entretenimento': '🎬',
    'Games': '🎮',
    'Saúde': '🩺',
    'Cripto': '₿',
    'Marketing': '📢',
    'Moda': '👗',
    'Geral': '📰'
};

async function loadHistory() {
    try {
        const filePath = path.join(__dirname, HISTORY_FILE);
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function saveHistory(history) {
    const filePath = path.join(__dirname, HISTORY_FILE);
    // Keep last 3000 items
    const truncated = history.slice(-3000);
    await fs.writeFile(filePath, JSON.stringify(truncated, null, 2));
}

async function classifyWithOllama(title, content) {
    const categories = Object.keys(EMOJI_MAP).join(', ');
    const prompt = `
Você é um editor chefe de um grande portal de notícias.
Sua tarefa é classificar a notícia abaixo em EXATAMENTE UMA das seguintes categorias: ${categories}.

Regras:
1. Responda APENAS com o nome da categoria.
2. Não use frases completas.
3. Se tiver dúvida, escolha a mais próxima.

Título: "${title}"
Conteúdo: "${content.substring(0, 500)}"

Categoria:
`;

    try {
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false
            })
        });

        if (!response.ok) throw new Error(`Ollama Error: ${response.status} ${response.statusText}`);
        const data = await response.json();
        const category = data.response.trim().replace(/[^a-zA-ZáéíóúÁÉÍÓÚãõÃÕçÇ ]/g, ''); // Clean special chars

        // Fuzzy match
        const bestMatch = Object.keys(EMOJI_MAP).find(c => category.toLowerCase().includes(c.toLowerCase()));
        return bestMatch || 'Geral';

    } catch (error) {
        if (error.cause && error.cause.code === 'ECONNREFUSED') {
             console.error('⚠️ Ollama not running or not accessible at', OLLAMA_URL);
        } else {
             console.error('⚠️ Error classifying with Ollama:', error.message);
        }
        return 'Geral';
    }
}

async function summarizeWithOllama(title, content) {
    const prompt = `
Você é um jornalista brasileiro experiente e conciso.
Resuma a notícia abaixo para um canal de Telegram.

Título: "${title}"
Conteúdo: "${content.substring(0, 1500)}"

Formato de saída OBRIGATÓRIO:
[Breve parágrafo introdutório de 1 ou 2 frases]

• [Ponto chave 1]
• [Ponto chave 2]
• [Ponto chave 3 (opcional)]

Regras:
- Idioma: Português do Brasil.
- Tom: Informativo, neutro e direto.
- Não use introduções como "Aqui está o resumo" ou "A notícia fala sobre". Comece direto no assunto.
- Máximo de 600 caracteres.
`;

    try {
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false
            })
        });

        if (!response.ok) throw new Error(`Ollama Error: ${response.status} ${response.statusText}`);
        const data = await response.json();
        return data.response.trim();

    } catch (error) {
        if (error.cause && error.cause.code === 'ECONNREFUSED') {
             console.error('⚠️ Ollama not running or not accessible at', OLLAMA_URL);
        } else {
             console.error('⚠️ Error summarizing with Ollama:', error.message);
        }
        return null;
    }
}

async function sendToTelegram(title, summary, category, link) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        return;
    }

    const emoji = EMOJI_MAP[category] || '📰';

    // Escape markdown special characters for Telegram MarkdownV2 is painful.
    // We stick to standard Markdown (limited subset) or HTML.
    // Let's use HTML for better safety against stray * or _.

    // Sanitize basic HTML chars
    const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeSummary = summary.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const text = `<b>${emoji} ${category.toUpperCase()}</b>\n\n<b>${safeTitle}</b>\n\n${safeSummary}\n\n<a href="${link}">🔗 Ler matéria completa</a>`;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: text,
                parse_mode: 'HTML',
                disable_web_page_preview: false
            })
        });

        if (!response.ok) {
            const err = await response.json();
            console.error('❌ Telegram Error:', err.description);
            // Fallback to plain text if HTML fails
             await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: `${emoji} ${category.toUpperCase()}\n\n${title}\n\n${summary}\n\n${link}`,
                    disable_web_page_preview: false
                })
            });
        } else {
            console.log(`✅ Sent to Telegram: ${title}`);
        }
    } catch (error) {
        console.error('❌ Error sending to Telegram:', error.message);
    }
}

async function processFeed(source, historySet) {
    try {
        const feed = await parser.parseURL(source.url);
        const newItems = [];

        // Get items from last 24h
        const now = new Date();
        const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

        for (const item of feed.items) {
            const pubDate = new Date(item.pubDate);
            if (isNaN(pubDate) || pubDate < oneDayAgo) continue;

            const id = item.guid || item.link;
            if (historySet.has(id)) continue;

            // Use source category as default, but we will classify later if needed
            newItems.push({ ...item, sourceCategory: source.category });
        }
        return newItems;
    } catch (error) {
        // Silent fail for individual feeds
        return [];
    }
}

async function run() {
    console.log('🚀 Starting News Agent...');
    console.log(`📡 OLLAMA_URL: ${OLLAMA_URL}`);

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn('⚠️ WARNING: Telegram credentials not set in environment variables.');
        console.warn('   Create a .env file with TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.');
    }

    const history = await loadHistory();
    const historySet = new Set(history);
    let itemsProcessed = 0;

    // Shuffle feeds to vary content
    const shuffledFeeds = [...FEED_SOURCES].sort(() => 0.5 - Math.random());

    console.log(`📚 Loaded ${shuffledFeeds.length} feeds.`);

    // Process in batches
    for (let i = 0; i < shuffledFeeds.length; i += CONCURRENCY_LIMIT) {
        if (itemsProcessed >= MAX_ITEMS_PER_RUN) break;

        const batch = shuffledFeeds.slice(i, i + CONCURRENCY_LIMIT);
        // console.log(`Batch ${Math.floor(i / CONCURRENCY_LIMIT) + 1}...`);

        const results = await Promise.all(batch.map(source => processFeed(source, historySet)));
        const candidates = results.flat();

        // Sort candidates by date (newest first)
        candidates.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        for (const item of candidates) {
            if (itemsProcessed >= MAX_ITEMS_PER_RUN) break;

            const id = item.guid || item.link;
            if (historySet.has(id)) continue; // Double check

            console.log(`📝 Processing: ${item.title} [${item.sourceCategory}]`);

            const content = item.contentSnippet || item.content || item.summary || item.title;

            // 1. Classify
            const category = await classifyWithOllama(item.title, content);

            // 2. Summarize
            const summary = await summarizeWithOllama(item.title, content);

            if (summary) {
                // 3. Send
                await sendToTelegram(item.title, summary, category, item.link);

                history.push(id);
                historySet.add(id);
                itemsProcessed++;

                // Delay to avoid hitting Ollama too hard
                await new Promise(r => setTimeout(r, 2000));
            } else {
                 console.log('   Skipped (Ollama failed to summarize)');
            }
        }
    }

    await saveHistory(history);
    console.log(`🏁 Done. Processed ${itemsProcessed} new items.`);
}

run().catch(console.error);
