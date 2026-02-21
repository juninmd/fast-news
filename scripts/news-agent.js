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

async function checkOllamaHealth() {
    try {
        console.log(`🏥 Checking Ollama health at ${OLLAMA_URL}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(OLLAMA_URL, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) {
            console.log('✅ Ollama is reachable.');
            return true;
        }
        throw new Error(`Status: ${response.status}`);
    } catch (error) {
        console.warn(`⚠️ Ollama is NOT reachable: ${error.message}`);
        return false;
    }
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
             // Already logged by health check usually, but good to have
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
        return null;
    }
}

async function sendToTelegram(title, summary, category, link) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        return;
    }

    const emoji = EMOJI_MAP[category] || '📰';

    // Sanitize basic HTML chars
    const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeSummary = summary.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Improved formatting with Italics for summary
    const text = `<b>${emoji} ${category.toUpperCase()}</b>\n\n<b>${safeTitle}</b>\n\n<i>${safeSummary}</i>\n\n<a href="${link}">🔗 Ler matéria completa</a>`;

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
             // Fallback
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

            newItems.push({ ...item, sourceCategory: source.category });
        }
        return newItems;
    } catch (error) {
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

    // Health Check
    const ollamaHealthy = await checkOllamaHealth();
    if (!ollamaHealthy) {
        console.warn('⚠️ Continue execution? (Attempts to classify/summarize will fail)');
        // In a real automated script we might want to exit, but here we proceed to show feed fetching works
    }

    const history = await loadHistory();
    const historySet = new Set(history);
    let itemsProcessed = 0;

    const shuffledFeeds = [...FEED_SOURCES].sort(() => 0.5 - Math.random());
    console.log(`📚 Loaded ${shuffledFeeds.length} feeds.`);

    for (let i = 0; i < shuffledFeeds.length; i += CONCURRENCY_LIMIT) {
        if (itemsProcessed >= MAX_ITEMS_PER_RUN) break;

        const batch = shuffledFeeds.slice(i, i + CONCURRENCY_LIMIT);
        const results = await Promise.all(batch.map(source => processFeed(source, historySet)));
        const candidates = results.flat();

        candidates.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        for (const item of candidates) {
            if (itemsProcessed >= MAX_ITEMS_PER_RUN) break;

            const id = item.guid || item.link;
            if (historySet.has(id)) continue;

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
