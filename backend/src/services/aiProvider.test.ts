import { describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
	config: {
		ollama: {
			baseUrl: "http://litellm.test/v1",
			model: "cloud/auto",
			embeddingModel: "nomic-embed-text",
			embeddingBaseUrl: "",
		},
		ai: { analysisModel: "", fastModel: "", embeddingModel: "" },
	},
}));

const {
	getCloudFallbackModel,
	getEmbeddingModel,
	getFastModel,
	getLanguageModel,
} = await import("./aiProvider.js");

describe("aiProvider só fala com o LiteLLM", () => {
	it("chat, fallback e embeddings usam o cliente OpenAI-compatível do LiteLLM", async () => {
		const models = [
			await getFastModel(),
			await getLanguageModel(),
			await getCloudFallbackModel(),
			await getEmbeddingModel(),
		];
		for (const m of models) {
			expect(String((m as { provider: string }).provider)).toMatch(/^openai\./);
		}
		expect((models[0] as { modelId: string }).modelId).toBe("cloud/auto");
		expect((models[3] as { modelId: string }).modelId).toBe("nomic-embed-text");
	});

	it("a chamada vai para a URL do LiteLLM", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({
					id: "1",
					created: 0,
					model: "cloud/auto",
					choices: [
						{
							index: 0,
							message: { role: "assistant", content: "ok" },
							finish_reason: "stop",
						},
					],
					usage: { prompt_tokens: 1, completion_tokens: 1 },
				}),
				{ headers: { "content-type": "application/json" } },
			),
		);
		const { generateText } = await import("ai");
		await generateText({
			model: await getFastModel(),
			prompt: "oi",
			maxRetries: 0,
		});
		expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
			"http://litellm.test/v1/chat/completions",
		);
		fetchSpy.mockRestore();
	});
});
