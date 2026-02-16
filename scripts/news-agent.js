/* eslint-env node */
import Parser from 'rss-parser';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration
// You can override these with environment variables
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MAX_ITEMS_PER_RUN = 5; // Prevent spamming
const HISTORY_FILE = 'history.json';

// Import feeds from source
// We need to manually define the path since we are in scripts/
import { FEED_SOURCES } from '../src/services/newsService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const parser = new Parser();

async function loadHistory() {
    try {
        const data = await fs.readFile(path.join(__dirname, HISTORY_FILE), 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function saveHistory(history) {
    // Keep history manageable (last 1000 items)
    const truncated = history.slice(-1000);
    await fs.writeFile(path.join(__dirname, HISTORY_FILE), JSON.stringify(truncated, null, 2));
}

async function summarizeWithOllama(text) {
    const prompt = `Resuma a seguinte notícia em português do Brasil em um parágrafo curto e direto (máximo 3 frases). Destaque o que é mais importante.

Texto:
${text}

Resumo:`;

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
        console.error('Error with Ollama:', error.message);
        return null;
    }
}

async function sendToTelegram(title, summary, link, category) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log('Skipping Telegram (Not Configured)');
        return;
    }

    const text = `*${category.toUpperCase()} | ${title}*\n\n${summary}\n\n[Ler matéria completa](${link})`;
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: text,
                parse_mode: 'Markdown'
            })
        });

        if (!response.ok) {
            const err = await response.json();
            console.error('Telegram Error:', err);
        } else {
            console.log(`Sent to Telegram: ${title}`);
        }
    } catch (error) {
        console.error('Error sending to Telegram:', error);
    }
}

async function run() {
    console.log('Starting News Agent...');

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn('WARNING: Telegram credentials not set in environment variables (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID).');
    }

    const history = await loadHistory();
    const historySet = new Set(history);
    let itemsProcessed = 0;

    // Shuffle feeds to get variety
    const shuffledFeeds = [...FEED_SOURCES].sort(() => 0.5 - Math.random());

    for (const source of shuffledFeeds) {
        if (itemsProcessed >= MAX_ITEMS_PER_RUN) break;

        try {
            console.log(`Checking ${source.url}...`);
            const feed = await parser.parseURL(source.url);

            // Get items from last 24h
            const now = new Date();
            const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

            for (const item of feed.items) {
                if (itemsProcessed >= MAX_ITEMS_PER_RUN) break;

                const pubDate = new Date(item.pubDate);
                if (pubDate < oneDayAgo) continue;

                // Check duplicates (link or guid)
                const id = item.guid || item.link;
                if (historySet.has(id)) continue;

                console.log(`Processing: ${item.title}`);

                // Summarize
                const content = item.contentSnippet || item.content || item.summary || item.title;
                const summary = await summarizeWithOllama(content);

                if (summary) {
                    await sendToTelegram(item.title, summary, item.link, source.category);
                    history.push(id);
                    historySet.add(id);
                    itemsProcessed++;
                }
            }
        } catch (error) {
            console.error(`Error processing feed ${source.url}:`, error.message);
        }
    }

    await saveHistory(history);
    console.log(`Done. Processed ${itemsProcessed} items.`);
}

run().catch(console.error);
