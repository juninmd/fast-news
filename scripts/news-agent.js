/* eslint-env node */
import Parser from 'rss-parser';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MAX_ITEMS_PER_RUN = 5;
const HISTORY_FILE = 'history.json';

// Import feeds
import { FEED_SOURCES } from '../src/services/newsService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const parser = new Parser();

const CATEGORY_EMOJIS = {
    'Tecnologia': '💻',
    'IA': '🤖',
    'Brasil': '🇧🇷',
    'Mundo': '🌍',
    'Negócios': '💼',
    'Ciência': '🧪',
    'Esportes': '⚽',
    'Automóveis': '🚗',
    'Entretenimento': '🎬',
    'Games': '🎮',
    'Saúde': '🏥',
    'Cripto': '₿',
    'Marketing': '📢',
    'Moda': '👗'
};

async function loadHistory() {
    try {
        const data = await fs.readFile(path.join(__dirname, HISTORY_FILE), 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function saveHistory(history) {
    const truncated = history.slice(-1000);
    await fs.writeFile(path.join(__dirname, HISTORY_FILE), JSON.stringify(truncated, null, 2));
}

async function processWithOllama(text) {
    const prompt = `
Analise a seguinte notícia.
Texto: "${text}"

Tarefa:
1. Faça um resumo conciso e direto em português do Brasil (máximo 3 frases).
2. Classifique a notícia em uma categoria simples (ex: Tecnologia, Política, Esportes, Economia, Ciência, Entretenimento).

Responda estritamente com um objeto JSON válido. Não inclua Markdown (como \`\`\`json).
Formato esperado:
{
  "summary": "texto do resumo aqui",
  "category": "Categoria"
}
`;

    try {
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false,
                format: "json" // Force JSON mode if model supports it
            })
        });

        if (!response.ok) throw new Error(`Ollama Error: ${response.statusText}`);
        const data = await response.json();

        let result;
        try {
            // Try to parse the response
            const cleanResponse = data.response.trim();
            // Remove markdown code blocks if present (even if we asked not to)
            const jsonStr = cleanResponse.replace(/^```json\s*|\s*```$/g, '');
            result = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error('Failed to parse JSON from Ollama:', data.response);
            return null;
        }

        return result;
    } catch (error) {
        console.error('Error with Ollama:', error.message);
        return null;
    }
}

async function sendToTelegram(title, summary, category, link) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log('Skipping Telegram (Not Configured)');
        return;
    }

    const emoji = CATEGORY_EMOJIS[category] || CATEGORY_EMOJIS[Object.keys(CATEGORY_EMOJIS).find(k => category.includes(k))] || '📰';

    const text = `*${emoji} ${category.toUpperCase()}*\n\n*${title}*\n\n${summary}\n\n[Ler matéria completa](${link})`;
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
        console.warn('WARNING: Telegram credentials not set in environment variables.');
    }

    const history = await loadHistory();
    const historySet = new Set(history);
    let itemsProcessed = 0;

    // Shuffle feeds
    const shuffledFeeds = [...FEED_SOURCES].sort(() => 0.5 - Math.random());

    for (const source of shuffledFeeds) {
        if (itemsProcessed >= MAX_ITEMS_PER_RUN) break;

        try {
            console.log(`Checking ${source.url}...`);
            const feed = await parser.parseURL(source.url);

            const now = new Date();
            const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

            for (const item of feed.items) {
                if (itemsProcessed >= MAX_ITEMS_PER_RUN) break;

                const pubDate = new Date(item.pubDate);
                if (pubDate < oneDayAgo) continue;

                const id = item.guid || item.link;
                if (historySet.has(id)) continue;

                console.log(`Processing: ${item.title}`);

                const content = item.contentSnippet || item.content || item.summary || item.title;
                const aiResult = await processWithOllama(content);

                if (aiResult && aiResult.summary) {
                    // Use AI category if valid, otherwise fallback to source category
                    const category = aiResult.category || source.category;

                    await sendToTelegram(item.title, aiResult.summary, category, item.link);

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
