import { Router } from 'express';
import { generateText } from 'ai';
import { getLanguageModel } from '../../services/aiProvider.js';

export const aiRouter = Router();

/**
 * Proxy for AI text generation.
 * This ensures frontend doesn't call Ollama directly.
 */
aiRouter.post('/generate', async (req, res) => {
  const { prompt, model: modelId, system } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const model = await getLanguageModel(modelId);
    const { text } = await generateText({
      model,
      prompt,
      system,
    });

    // Match Ollama response format for compatibility
    res.json({ response: text });
  } catch (err: any) {
    console.error('[AI API] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
