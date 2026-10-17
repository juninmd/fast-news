import { describe, expect, it, vi } from "vitest";

const embed = vi.fn();
vi.mock("ai", () => ({ embed, embedMany: vi.fn() }));
const getEmbeddingModel = vi.fn();
vi.mock("./aiProvider.js", () => ({ getEmbeddingModel }));
vi.mock("../config/env.js", () => ({
	config: { ai: { embeddingTimeoutMs: 45_000 } },
}));

const { embedDocument } = await import("./embeddings.js");

describe("embedDocument", () => {
	it("disables retries so a rate-limited/cooldown deployment fails fast", async () => {
		getEmbeddingModel.mockResolvedValueOnce("mock-model");
		embed.mockResolvedValueOnce({ embedding: [0.1, 0.2] });

		await embedDocument("some article text");

		expect(embed).toHaveBeenCalledWith(
			expect.objectContaining({ maxRetries: 0 }),
		);
	});

	it("gives a caller without a signal a deadline, so a query cannot hang", async () => {
		getEmbeddingModel.mockResolvedValueOnce("mock-model");
		embed.mockResolvedValueOnce({ embedding: [0.1] });

		await embedDocument("query text");

		expect(embed).toHaveBeenCalledWith(
			expect.objectContaining({ abortSignal: expect.any(AbortSignal) }),
		);
	});

	it("keeps the signal the caller already had", async () => {
		getEmbeddingModel.mockResolvedValueOnce("mock-model");
		embed.mockResolvedValueOnce({ embedding: [0.1] });
		const controller = new AbortController();

		await embedDocument("query text", controller.signal);

		expect(embed).toHaveBeenCalledWith(
			expect.objectContaining({ abortSignal: controller.signal }),
		);
	});
});
