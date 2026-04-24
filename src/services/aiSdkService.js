import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';

export const summarizeTextAiSdk = async (text, config) => {
    const { provider, apiKey, modelName } = config;

    if (!apiKey) {
        throw new Error("API Key is missing.");
    }

    let model;

    try {
        if (provider === 'openai') {
            const openai = createOpenAI({ apiKey });
            model = openai(modelName || 'gpt-3.5-turbo');
        } else if (provider === 'google') {
            const google = createGoogleGenerativeAI({ apiKey });
            model = google(modelName || 'gemini-1.5-flash');
        } else if (provider === 'anthropic') {
            const anthropic = createAnthropic({ apiKey });
            model = anthropic(modelName || 'claude-3-haiku-20240307');
        } else {
             throw new Error(`Unsupported provider: ${provider}`);
        }

        const prompt = `Resuma a seguinte notícia em português em 2 ou 3 frases. Mantenha o resumo informativo e conciso:\n\n${text}`;

        const { text: summary } = await generateText({
            model,
            prompt,
        });

        return summary;
    } catch (error) {
        console.error("Error summarizing text with AI SDK:", error);
        throw error;
    }
};
