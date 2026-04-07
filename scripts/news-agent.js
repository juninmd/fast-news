/* eslint-env node */
import 'dotenv/config';
import Parser from 'rss-parser';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

// Import sources
import { FEED_SOURCES } from '../src/services/newsService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
// Ollama URL and Model can be defined in .env
// Recommended model is llama3 (must be running via `ollama serve` and `ollama pull llama3`)
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

// Telegram Bot Token and Chat ID (must be defined in .env)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// AI Provider settings
const AI_PROVIDER = process.env.AI_PROVIDER || 'ollama'; // 'ollama' or 'ai-sdk'
const AI_SDK_PROVIDER = process.env.AI_SDK_PROVIDER || 'openai';
const AI_SDK_API_KEY = process.env.AI_SDK_API_KEY;
const AI_SDK_MODEL = process.env.AI_SDK_MODEL;

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
    const prompt = `Classifique a seguinte notícia em EXATAMENTE e APENAS uma das seguintes categorias: [${categories}].

Analise o título e o conteúdo da notícia abaixo para determinar seu assunto principal:
Título: "${title}"
Conteúdo: "${content.substring(0, 600)}"

Obrigatório: Retorne ESTRITAMENTE o nome de UMA das categorias acima, e mais NADA.
Proibido: Não explique sua decisão e não adicione pontuação (como ponto final) ou qualquer outro texto.
Se você não tiver certeza de qual categoria escolher ou se nenhuma for exata, retorne exatamente "Geral".

Categoria:`;

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
    const prompt = `Você é um editor sênior para um canal de notícias premium no Telegram.
Sua tarefa é criar um resumo altamente engajador, direto e otimizado para mobile.

Notícia Analisada:
Título: "${title}"
Conteúdo: "${content.substring(0, 2500)}"

Gere o resumo em Português do Brasil, seguindo RIGOROSAMENTE este formato:

**[Crie uma frase de impacto curta e instigante]**

🔸 [Ponto principal 1]
🔸 [Ponto principal 2]
🔸 [Ponto principal 3]

Regras irrevogáveis:
- Exatamente 3 bullet points começando com 🔸.
- Proibido saudações, conclusões ou links no texto.
- Máximo de 500 caracteres.`;

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

const getAiSdkModel = () => {
    switch (AI_SDK_PROVIDER) {
        case 'openai': {
            const openai = createOpenAI({ apiKey: AI_SDK_API_KEY, compatibility: 'strict' });
            return openai(AI_SDK_MODEL || 'gpt-4o-mini');
        }
        case 'anthropic': {
            const anthropic = createAnthropic({ apiKey: AI_SDK_API_KEY });
            return anthropic(AI_SDK_MODEL || 'claude-3-haiku-20240307');
        }
        case 'google': {
            const google = createGoogleGenerativeAI({ apiKey: AI_SDK_API_KEY });
            return google(AI_SDK_MODEL || 'gemini-1.5-flash');
        }
        default:
            throw new Error(`Provider ${AI_SDK_PROVIDER} not supported by AI SDK.`);
    }
};

async function classifyWithAiSdk(title, content) {
    if (!AI_SDK_API_KEY) return 'Geral';
    try {
        const model = getAiSdkModel();
        const categories = Object.keys(EMOJI_MAP).join(', ');

        const prompt = `Você é um classificador automático de categorias de notícias.
Leia o título e o conteúdo abaixo e escolha APENAS UMA das seguintes categorias que melhor descreve o tema principal da notícia:
[${categories}].

Regra muito importante: Responda APENAS com a categoria escolhida em formato de hashtag.
Exemplo 1: #Esportes
Exemplo 2: #Tecnologia

Título a ser classificado: "${title}"
Conteúdo: "${content.substring(0, 600)}"`;

        const { text: result } = await generateText({
            model,
            prompt,
        });

        const match = result.match(/#([a-zA-ZÀ-ÿ0-9]+)/);
        if (match) {
             const word = match[1];
             const normalized = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
             const bestMatch = Object.keys(EMOJI_MAP).find(c =>
                 normalized.toLowerCase() === c.toLowerCase() ||
                 normalized.toLowerCase().includes(c.toLowerCase()) ||
                 (normalized === 'Ia' && c === 'IA')
             );
             return bestMatch || 'Geral';
        }

        return 'Geral';
    } catch (error) {
        console.error('⚠️ Error classifying with AI SDK:', error.message);
        return 'Geral';
    }
}

async function summarizeWithAiSdk(title, content) {
    if (!AI_SDK_API_KEY) return null;
    try {
        const model = getAiSdkModel();
        const prompt = `Você é um editor sênior para um canal de notícias premium no Telegram.
Sua tarefa é criar um resumo altamente engajador, direto e otimizado para mobile.

Notícia Analisada:
Título: "${title}"
Conteúdo: "${content.substring(0, 2500)}"

Gere o resumo em Português do Brasil, seguindo RIGOROSAMENTE este formato:

**[Crie uma frase de impacto curta e instigante]**

🔸 [Ponto principal 1]
🔸 [Ponto principal 2]
🔸 [Ponto principal 3]

Regras irrevogáveis:
- A primeira linha deve começar com a frase de impacto em negrito (**).
- Exatamente 3 bullet points começando com 🔸.
- Proibido saudações, conclusões, links ou texto extra.
- Máximo de 500 caracteres.`;

        const { text: result } = await generateText({
            model,
            prompt,
        });

        return result.trim();
    } catch (error) {
        console.error('⚠️ Error summarizing with AI SDK:', error.message);
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

    // Ensure summary is properly mapped to Telegram HTML format
    const formatSummaryForTelegramHTML = (text) => {
        // Remove URLs from the summary text to strictly "hide links"
        const noLinksText = text.replace(/https?:\/\/[^\s]+|www\.[^\s]+/g, '');
        // Replace Markdown bold with a placeholder to prevent double escaping
        let preHtmlText = noLinksText.replace(/\*\*(.*?)\*\*/g, '@@BOLD@@$1@@ENDBOLD@@');
        // Escape HTML to prevent injection from the summary content itself
        let htmlText = preHtmlText
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;");
        // Convert placeholder to HTML bold tags safely after escaping
        htmlText = htmlText.replace(/@@BOLD@@(.*?)@@ENDBOLD@@/g, '<b>$1</b>');
        return htmlText;
    };

    const safeTitle = title
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;");

    const formattedSummary = formatSummaryForTelegramHTML(summary);

    const text = `<b>${emoji} ${category.toUpperCase()}</b>\n───────────────\n<b>${safeTitle}</b>\n\n${formattedSummary}\n\n<i>${hashtags}</i>\n\n<a href="${link}">Ler matéria completa na Fonte original</a>`;

    const body = {
        chat_id: TELEGRAM_CHAT_ID,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
        reply_markup: {
            inline_keyboard: [[
                { text: "🔗 Ler matéria completa", url: link }
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

    let ollamaHealthy = false;
    if (AI_PROVIDER === 'ollama') {
        ollamaHealthy = await checkOllamaHealth();
    } else if (AI_PROVIDER === 'ai-sdk' && !AI_SDK_API_KEY) {
        if (!DRY_RUN) console.warn('⚠️ WARNING: AI SDK API Key missing.');
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

            if (AI_PROVIDER === 'ai-sdk' && AI_SDK_API_KEY) {
                // Classify using AI SDK
                const [detectedCategory, aiSummary] = await Promise.all([
                    classifyWithAiSdk(item.title, content),
                    summarizeWithAiSdk(item.title, content)
                ]);
                if (detectedCategory) category = detectedCategory;
                summary = aiSummary;
            } else if (AI_PROVIDER === 'ollama' && ollamaHealthy) {
                // Classify using Ollama
                const detectedCategory = await classifyWithOllama(item.title, content);
                if (detectedCategory) category = detectedCategory;

                // Summarize using Ollama
                summary = await summarizeWithOllama(item.title, content);
            } else {
                // Fallback if no AI or unhealthy
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
