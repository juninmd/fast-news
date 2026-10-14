import { describe, expect, it, vi } from "vitest";

const embed = vi.fn();
vi.mock("ai", () => ({ embed, embedMany: vi.fn() }));
const getEmbeddingModel = vi.fn();
vi.mock("./aiProvider.js", () => ({ getEmbeddingModel }));

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
});
