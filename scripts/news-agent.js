/* eslint-env node */
import 'dotenv/config'; // Loads .env file
import Parser from 'rss-parser';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Import sources
import { FEED_SOURCES } from '../src/services/newsService.js';

// Configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Limits
const MAX_ITEMS_PER_RUN = 10; // Process max 10 new items per run to avoid spam
const CONCURRENCY_LIMIT = 3; // Process 3 feeds in parallel
const HISTORY_FILE = 'history.json';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const parser = new Parser({
    timeout: 5000,
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
    'Moda': '👗'
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
    // Keep last 2000 items
    const truncated = history.slice(-2000);
    await fs.writeFile(filePath, JSON.stringify(truncated, null, 2));
}

async function summarizeWithOllama(title, content) {
    const prompt = `
Atue como um jornalista experiente. Resuma a seguinte notícia em Português do Brasil.
Título: "${title}"
Conteúdo: "${content.substring(0, 1500)}"

Formato de saída desejado:
- Um parágrafo curto de introdução (máx 20 palavras).
- 3 bullet points com os fatos mais importantes.
- Tom: Informativo e direto.
- Não use markdown no texto, apenas texto simples e emojis se necessário.
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

        if (!response.ok) throw new Error(`Ollama Error: ${response.statusText}`);
        const data = await response.json();
        return data.response.trim();
    } catch (error) {
        console.error('⚠️ Error with Ollama:', error.message);
        return null;
    }
}

async function sendToTelegram(title, summary, link, category) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        return;
    }

    const emoji = EMOJI_MAP[category] || '📰';
    const text = `*${emoji} ${category.toUpperCase()}*\n\n*${title}*\n\n${summary}\n\n[🔗 Ler matéria completa](${link})`;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: text,
                parse_mode: 'Markdown',
                disable_web_page_preview: false
            })
        });

        if (!response.ok) {
            const err = await response.json();
            console.error('❌ Telegram Error:', err.description);
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
        // Silent fail for individual feeds to keep process running
        // console.warn(`Failed to fetch ${source.url}: ${error.message}`);
        return [];
    }
}

async function run() {
    console.log('🚀 Starting News Agent...');

    if (!TELEGRAM_BOT_TOKEN) {
        console.warn('⚠️  TELEGRAM_BOT_TOKEN not set. Messages will not be sent.');
    }

    const history = await loadHistory();
    const historySet = new Set(history);
    let itemsProcessed = 0;

    // Shuffle feeds
    const shuffledFeeds = [...FEED_SOURCES].sort(() => 0.5 - Math.random());

    // Process in batches
    for (let i = 0; i < shuffledFeeds.length; i += CONCURRENCY_LIMIT) {
        if (itemsProcessed >= MAX_ITEMS_PER_RUN) break;

        const batch = shuffledFeeds.slice(i, i + CONCURRENCY_LIMIT);
        console.log(`📡 Checking batch ${i / CONCURRENCY_LIMIT + 1}...`);

        const results = await Promise.all(batch.map(source => processFeed(source, historySet)));
        const candidates = results.flat();

        // Sort candidates by date (newest first)
        candidates.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        for (const item of candidates) {
            if (itemsProcessed >= MAX_ITEMS_PER_RUN) break;

            const id = item.guid || item.link;
            if (historySet.has(id)) continue; // Double check

            console.log(`📝 Processing: ${item.title}`);

            const content = item.contentSnippet || item.content || item.summary || '';
            const summary = await summarizeWithOllama(item.title, content);

            if (summary) {
                await sendToTelegram(item.title, summary, item.link, item.sourceCategory);
                history.push(id);
                historySet.add(id);
                itemsProcessed++;
            }
        }
    }

    await saveHistory(history);
    console.log(`🏁 Done. Processed ${itemsProcessed} items.`);
}

run().catch(console.error);
