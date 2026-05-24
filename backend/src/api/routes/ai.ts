import { generateText } from "ai";
import { Router } from "express";
import { getFastModel } from "../../services/aiProvider.js";

export const aiRouter: Router = Router();

aiRouter.post("/generate", async (req, res) => {
	const { prompt, system } = req.body;

	if (!prompt) {
		return res.status(400).json({ error: "Prompt is required" });
	}

	try {
		const model = await getFastModel();
		const { text } = await generateText({
			model,
			prompt,
			system,
			maxTokens: 512,
		});
		res.json({ response: text });
	} catch (err: any) {
		console.error("[AI API] Error:", err.message);
		res.status(500).json({ error: err.message });
	}
});
