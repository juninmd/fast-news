import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createMistral } from '@ai-sdk/mistral';

export const summarizeTextAiSdk = async (text, config) => {
    if (!text) return '';

    const { provider, apiKey, modelName } = config;

    if (!provider || !apiKey) {
        throw new Error('Provider and API Key are required.');
    }

    let aiProvider;
    let defaultModel;

    switch (provider) {
        case 'openai':
            aiProvider = createOpenAI({ apiKey });
            defaultModel = 'gpt-3.5-turbo';
            break;
        case 'anthropic':
            aiProvider = createAnthropic({ apiKey });
            defaultModel = 'claude-3-haiku-20240307';
            break;
        case 'google':
            aiProvider = createGoogleGenerativeAI({ apiKey });
            defaultModel = 'gemini-1.5-flash';
            break;
        case 'mistral':
            aiProvider = createMistral({ apiKey });
            defaultModel = 'mistral-small-latest';
            break;
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }

    const modelToUse = modelName || defaultModel;

    try {
        const { text: summaryText } = await generateText({
            model: aiProvider(modelToUse),
            prompt: `Summarize the following text in a concise and clear way, translating to Brazilian Portuguese if needed. Only provide the summary, no other text:\n\n${text}`,
        });

        return summaryText;
    } catch (error) {
        console.error('AI SDK Generation failed:', error);
        throw error;
    }
};
