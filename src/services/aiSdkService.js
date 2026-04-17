import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';
import { createDeepSeek } from '@ai-sdk/deepseek';

const getModel = (provider, apiKey, modelName) => {
    switch (provider) {
        case 'openai': {
            const openai = createOpenAI({ apiKey, compatibility: 'strict' });
            return openai(modelName || 'gpt-4o-mini');
        }
        case 'anthropic': {
            const anthropic = createAnthropic({ apiKey });
            return anthropic(modelName || 'claude-3-haiku-20240307');
        }
        case 'google': {
            const google = createGoogleGenerativeAI({ apiKey });
            return google(modelName || 'gemini-1.5-flash');
        }
        case 'mistral': {
            const mistral = createMistral({ apiKey });
            return mistral(modelName || 'mistral-large-latest');
        }
        case 'deepseek': {
            const deepseek = createDeepSeek({ apiKey });
            return deepseek(modelName || 'deepseek-chat');
        }
        default:
            throw new Error(`Provider ${provider} not supported by AI SDK in this app.`);
    }
};

export const summarizeWithAiSdk = async (text, aiSdkProvider, apiKey, modelName) => {
    if (!text) return null;

    try {
        const model = getModel(aiSdkProvider, apiKey, modelName);

        const prompt = `Você é um editor sênior de um portal de notícias no Brasil. Seu objetivo é resumir as notícias para um formato direto e atraente no Telegram.
Crie um resumo seguindo rigorosamente estas regras:

1. A PRIMEIRA linha deve SEMPRE começar com uma frase curta de impacto em negrito (ex: **[Frase de impacto]**), seguida de dois pontos e uma linha em branco.
2. Em seguida, use EXATAMENTE e APENAS três (3) tópicos com bullet points (usando o emoji '🔸') para detalhar as principais informações.
3. Não use hashtags (#). Elas serão adicionadas automaticamente depois.
4. Jamais insira introduções (como "Aqui está o resumo..."), conclusões ou qualquer texto extra. Vá direto ao ponto.
5. Escreva de forma jornalística e neutra.
6. O texto total não deve exceder 500 caracteres, seja extremamente conciso.

Aqui está o texto original para você resumir:
---
${text}
---`;

        const { text: result } = await generateText({
            model,
            prompt,
        });

        return result.trim();
    } catch (error) {
        console.error('Error generating summary with AI SDK:', error);
        throw error;
    }
};

export const classifyWithAiSdk = async (text, aiSdkProvider, apiKey, modelName) => {
    if (!text) return null;

    try {
        const model = getModel(aiSdkProvider, apiKey, modelName);

        const prompt = `Você é um classificador automático de categorias de notícias.
Leia o texto abaixo e escolha APENAS UMA das seguintes categorias que melhor descreve o tema principal da notícia:
Tecnologia, Brasil, Mundo, Negócios, Ciência, Esportes, Automóveis, Entretenimento, Games, Saúde, Cripto, Marketing, Moda, Música, IA, Turismo, Educação, Política, Geral.

Regra muito importante: Responda APENAS com a categoria escolhida em formato de hashtag.
Exemplo 1: #Esportes
Exemplo 2: #Tecnologia

Texto a ser classificado:
---
${text}
---`;

        const { text: result } = await generateText({
            model,
            prompt,
        });

        // Limpa a resposta para garantir que seja apenas uma hashtag válida
        const match = result.match(/#([a-zA-ZÀ-ÿ0-9]+)/);
        if (match) {
             const word = match[1];
             const normalized = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
             return normalized === 'Ia' ? 'IA' : normalized;
        }

        return null;
    } catch (error) {
        console.error('Error classifying with AI SDK:', error);
        throw error;
    }
};
