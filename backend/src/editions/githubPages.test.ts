import { afterEach, describe, expect, it, vi } from "vitest";
import { draft, edition, headline, knownOf } from "./fixtures.js";
import { GitHubPagesPublisher } from "./githubPages.js";
import { createEditionSnapshot } from "./snapshot.js";

const baseUrl = "https://juninmd.github.io/fast-news";

afterEach(() => vi.unstubAllEnvs());

function setup() {
	vi.stubEnv("EDITION_PAGES_TOKEN", "test-token");
	vi.stubEnv("EDITION_PAGES_REPOSITORY", "juninmd/fast-news");
	vi.stubEnv("EDITION_PAGES_BASE_URL", baseUrl);
	return createEditionSnapshot(
		edition(
			draft(),
			knownOf([headline({ sourceId: "6ec0f1d6-90d5-4b62-a74b-30da7d18f4bc" })]),
		),
	);
}

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status });

describe("GitHub Pages publisher", () => {
	it("commits the markdown article to main and verifies the page", async () => {
		const envelope = setup();
		const calls: Array<[string, RequestInit | undefined]> = [];
		const fetchMock = vi.fn(
			async (input: string | URL | Request, init?: RequestInit) => {
				const url = input.toString();
				calls.push([url, init]);
				if (url.includes("/contents/") && !init?.method)
					return json({ message: "Not Found" }, 404);
				if (init?.method === "PUT") return json({ commit: { sha: "abc123" } });
				return new Response("<h1>2026-09-18</h1>");
			},
		);
		const publisher = new GitHubPagesPublisher(fetchMock);
		const result = await publisher.publish(envelope, "# artigo\n");

		expect(result).toEqual({
			commit: "abc123",
			url: `${baseUrl}/edicoes/2026-09-18-noite`,
		});
		const put = calls.find(([, init]) => init?.method === "PUT")!;
		expect(put[0]).toContain("/contents/site/edicoes/2026-09-18-noite.md");
		const body = JSON.parse(put[1]!.body as string);
		expect(body.branch).toBe("main");
		expect(Buffer.from(body.content, "base64").toString()).toBe("# artigo\n");
	});

	it("keeps an already published edition immutable", async () => {
		const envelope = setup();
		const fetchMock = vi.fn(
			async (input: string | URL | Request, init?: RequestInit) => {
				const url = input.toString();
				if (url.includes("/contents/") && !init?.method)
					return json({ sha: "existing" });
				return new Response("2026-09-18");
			},
		);
		const result = await new GitHubPagesPublisher(fetchMock).publish(
			envelope,
			"changed",
		);
		expect(result.commit).toBe("existing");
		expect(
			fetchMock.mock.calls.some(([, init]) => init?.method === "PUT"),
		).toBe(false);
	});

	it("fails verification when the deploy never lands", async () => {
		const envelope = setup();
		const fetchMock = vi.fn(async () => new Response("nope", { status: 404 }));
		let ticks = 0;
		const publisher = new GitHubPagesPublisher(
			fetchMock,
			() => ticks++ * 400_000,
		);
		vi.useFakeTimers();
		try {
			const failure = expect(
				publisher.verifyPublished(envelope),
			).rejects.toThrow("was not verified before the deadline");
			await vi.advanceTimersByTimeAsync(20_000);
			await failure;
		} finally {
			vi.useRealTimers();
		}
	});

	it("rejects an edition page that lacks its identity", async () => {
		const envelope = setup();
		const publisher = new GitHubPagesPublisher(
			vi.fn(async () => new Response("outra página")),
		);
		await expect(publisher.verifyPublished(envelope)).rejects.toThrow(
			"expected identity",
		);
	});
});
