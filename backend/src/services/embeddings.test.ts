import { beforeEach, describe, expect, it, vi } from "vitest";

const embed = vi.fn();
const embedMany = vi.fn();
vi.mock("ai", () => ({ embed, embedMany }));
const getEmbeddingModel = vi.fn();
vi.mock("./aiProvider.js", () => ({ getEmbeddingModel }));
vi.mock("../config/env.js", () => ({
	config: { ai: { embeddingTimeoutMs: 45_000 } },
}));

const { embedBatch, embedDocument } = await import("./embeddings.js");

beforeEach(() => {
	vi.clearAllMocks();
});

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

describe("embedBatch", () => {
	it("sends one request per chunk instead of one per text", async () => {
		getEmbeddingModel.mockResolvedValueOnce("mock-model");
		embedMany.mockImplementation(({ values }: { values: string[] }) =>
			Promise.resolve({ embeddings: values.map(() => [0.1]) }),
		);

		const vectors = await embedBatch(["a", "b", "c", "d", "e"], 2);

		expect(vectors).toHaveLength(5);
		expect(embedMany).toHaveBeenCalledTimes(3);
	});
});
