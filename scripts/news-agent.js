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
const MAX_ITEMS_PER_RUN = process.env.MAX_ITEMS_PER_RUN ? parseInt(process.env.MAX_ITEMS_PER_RUN) : 15;
const CONCURRENCY_LIMIT = process.env.CONCURRENCY_LIMIT ? parseInt(process.env.CONCURRENCY_LIMIT) : 5;
const HISTORY_FILE = 'history.json';
const RETRY_ATTEMPTS = 3;

// Args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LOOP_MODE = args.includes('--loop');
const LOOP_INTERVAL = 15 * 60 * 1000; // 15 minutes

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
    'Música': '🎵',
    'Turismo': '✈️',
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
    if (DRY_RUN) return;
    const filePath = path.join(__dirname, HISTORY_FILE);
    const truncated = history.slice(-3000);
    await fs.writeFile(filePath, JSON.stringify(truncated, null, 2));
}

async function checkOllamaHealth() {
    try {
        console.log(`🏥 Checking Ollama health at ${OLLAMA_URL}...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const response = await fetch(OLLAMA_URL, { signal: controller.signal }).catch(e => { throw e; });
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

async function fetchWithRetry(url, options, retries = RETRY_ATTEMPTS) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response;
        } catch (error) {
            if (i === retries - 1) throw error;
            const delay = Math.pow(2, i) * 1000;
            console.log(`   ⚠️ Request failed, retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
}

async function classifyWithOllama(title, content) {
    const categories = Object.keys(EMOJI_MAP).join(', ');
    const prompt = `
Você é um editor chefe. Sua tarefa é classificar notícias.
As categorias válidas são EXATAMENTE e APENAS estas: [${categories}].

Analise a notícia abaixo:
Título: "${title}"
Conteúdo: "${content.substring(0, 500)}"

Responda APENAS com o nome da categoria que melhor se encaixa. Não escreva frases, não use pontuação extra, não de explicações. A sua resposta DEVE ser estritamente uma das categorias da lista fornecida.
Se nenhuma se encaixar perfeitamente, use "Geral".
`;

    try {
        const response = await fetchWithRetry(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false
            })
        });

        const data = await response.json();
        // Clean the response: remove special chars and whitespace
        let category = data.response.trim().replace(/[.,]/g, '');

        // Find the best match in our map keys (case insensitive)
        const bestMatch = Object.keys(EMOJI_MAP).find(c =>
            category.toLowerCase() === c.toLowerCase() ||
            category.toLowerCase().includes(c.toLowerCase())
        );

        return bestMatch || 'Geral';

    } catch (error) {
        console.error('⚠️ Error classifying:', error.message);
        return 'Geral';
    }
}

async function summarizeWithOllama(title, content) {
    const prompt = `
Atue como um editor de um canal de notícias no Telegram.
Resuma a notícia de forma envolvente, fácil de ler no celular e direto ao ponto.

Título: "${title}"
Conteúdo: "${content.substring(0, 2000)}"

Gere o resumo em Português do Brasil seguindo ESTRITAMENTE este formato:

**[Uma frase de impacto chamativa]**

🔸 [Fato 1]
🔸 [Fato 2]
🔸 [Fato 3]

Diretrizes:
- Exatamente 3 bullet points usando o emoji 🔸.
- Não use introduções.
- Máximo de 500 caracteres.
`;

    try {
        const response = await fetchWithRetry(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false
            })
        });

        const data = await response.json();
        return data.response.trim();

    } catch (error) {
        console.error('⚠️ Error summarizing:', error.message);
        return null;
    }
}

async function sendToTelegram(title, summary, category, link) {
    if (DRY_RUN) {
        console.log('\n--- DRY RUN: MESSAGE PREVIEW ---');
        console.log(`Category: ${category}`);
        console.log(`Title: ${title}`);
        console.log(`Summary:\n${summary}`);
        console.log('--------------------------------\n');
        return;
    }

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

    const emoji = EMOJI_MAP[category] || '📰';
    // Remove spaces for hashtag
    const categoryHashtag = category.replace(/\s+/g, '');
    const hashtags = `#${categoryHashtag} #Notícias`;

    // Escaping HTML characters for Telegram
    const escapeHtml = (unsafe) => {
        return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
    }

    const safeTitle = escapeHtml(title);
    // Summary usually comes from AI, might have some formatting, but let's be safe or trust AI didn't inject HTML tags.
    // Ollama returns plain text usually.
    const safeSummary = escapeHtml(summary);

    const text = `<b>${emoji} ${category.toUpperCase()}</b>\n───────────────\n<b>${safeTitle}</b>\n\n${safeSummary}\n\n<i>${hashtags}</i>`;

    const body = {
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
        reply_markup: {
            inline_keyboard: [[
                { text: "📰 Ler matéria completa", url: link }
            ]]
        }
    };

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
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
        // console.log(`   Fetching ${source.url}...`);
        const feed = await parser.parseURL(source.url);
        const newItems = [];
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
        // console.error(`Error processing ${source.url}: ${error.message}`);
        return [];
    }
}

async function processBatch() {
    console.log('🚀 Starting News Agent cycle...');
    if (DRY_RUN) console.log('🧪 DRY RUN MODE ENABLED');

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        if (!DRY_RUN) console.warn('⚠️ WARNING: Telegram credentials missing.');
    }

    const ollamaHealthy = await checkOllamaHealth();

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

        // Sort by date descending
        candidates.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        for (const item of candidates) {
            if (itemsProcessed >= MAX_ITEMS_PER_RUN) break;
            const id = item.guid || item.link;
            if (historySet.has(id)) continue;

            console.log(`📝 Processing: ${item.title}`);

            const content = item.contentSnippet || item.content || item.summary || item.title;

            let category = item.sourceCategory;
            let summary = null;

            if (ollamaHealthy) {
                // Classify using Ollama
                const detectedCategory = await classifyWithOllama(item.title, content);
                if (detectedCategory) category = detectedCategory;

                // Summarize using Ollama
                summary = await summarizeWithOllama(item.title, content);
            } else {
                // Fallback if no Ollama
                summary = content ? content.substring(0, 300) + '...' : item.title;
            }

            if (summary) {
                try {
                    await sendToTelegram(item.title, summary, category, item.link);
                    history.push(id);
                    historySet.add(id);
                    itemsProcessed++;

                    // Rate limiting between sends
                    if (!DRY_RUN) await new Promise(r => setTimeout(r, 2000));
                } catch (err) {
                    console.error(`❌ Failed to process item ${item.title}:`, err);
                }
            }
        }
    }

    await saveHistory(history);
    console.log(`🏁 Done. Processed ${itemsProcessed} items.`);
}

async function main() {
    if (LOOP_MODE) {
        console.log('🔄 Loop mode enabled. Running every 15 minutes.');
        while (true) {
            try {
                await processBatch();
            } catch (error) {
                console.error('❌ Error in batch execution:', error);
            }
            console.log(`⏳ Waiting ${LOOP_INTERVAL / 60000} minutes...`);
            await new Promise(resolve => setTimeout(resolve, LOOP_INTERVAL));
        }
    } else {
        await processBatch();
    }
}

main().catch(console.error);
