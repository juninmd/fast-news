import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createMistral } from '@ai-sdk/mistral';

export const summarizeTextWithAiSdk = async (text, provider, apiKey, modelName) => {
  if (!apiKey) {
    throw new Error("API Key is missing for AI SDK.");
  }

  let model;

  switch (provider) {
    case 'openai': {
      const openai = createOpenAI({ apiKey });
      model = openai(modelName || 'gpt-4o-mini');
      break;
    }
    case 'google': {
      const google = createGoogleGenerativeAI({ apiKey });
      model = google(modelName || 'gemini-1.5-flash');
      break;
    }
    case 'anthropic': {
      const anthropic = createAnthropic({ apiKey });
      model = anthropic(modelName || 'claude-3-haiku-20240307');
      break;
    }
    case 'mistral': {
      const mistral = createMistral({ apiKey });
      model = mistral(modelName || 'mistral-small-latest');
      break;
    }
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }

  const prompt = `Resuma a seguinte notícia em português em 2 ou 3 frases. Mantenha o resumo informativo e conciso:\n\n${text}`;

  try {
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
