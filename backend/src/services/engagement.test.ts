import { describe, expect, it, vi } from "vitest";
import {
	engagementWeight,
	fetchRedditEngagement,
	hnEngagement,
	redditPostId,
} from "./engagement.js";

describe("hnEngagement", () => {
	const desc =
		'<p>Article URL: <a href="https://x.dev/a">x</a></p><p>Points: 312</p><p># Comments: 87</p>';

	it("reads hnrss points and comments", () => {
		expect(
			hnEngagement(
				desc,
				"https://x.dev/a",
				"https://news.ycombinator.com/item?id=1",
			),
		).toEqual({ score: 312, comments: 87 });
	});

	it("ignores non-HN items even if the text looks alike", () => {
		expect(hnEngagement(desc, "https://x.dev/a", "https://x.dev/c")).toBeNull();
	});

	it("returns null when an HN item has no counts", () => {
		expect(
			hnEngagement(
				"hello",
				"https://x.dev",
				"https://news.ycombinator.com/item?id=2",
			),
		).toBeNull();
	});
});

describe("redditPostId", () => {
	it("extracts the post id from a permalink", () => {
		expect(
			redditPostId(
				"https://www.reddit.com/r/LocalLLaMA/comments/1AbC2d/some_title/",
			),
		).toBe("1abc2d");
	});

	it("ignores other hosts", () => {
		expect(redditPostId("https://example.com/comments/abc")).toBeNull();
	});
});

describe("fetchRedditEngagement", () => {
	it("maps by_id children and survives a failed request", async () => {
		const fetcher = vi.fn().mockResolvedValueOnce(
			new Response(
				JSON.stringify({
					data: {
						children: [{ data: { id: "abc", score: 50, num_comments: 9 } }],
					},
				}),
			),
		);
		const out = await fetchRedditEngagement(["abc", "abc"], fetcher);
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(String(fetcher.mock.calls[0]?.[0])).toContain("/by_id/t3_abc.json");
		expect(out.get("abc")).toEqual({ score: 50, comments: 9 });

		const failing = vi.fn().mockRejectedValue(new Error("403"));
		expect((await fetchRedditEngagement(["x"], failing)).size).toBe(0);
	});
});

describe("engagementWeight", () => {
	it("is 0 without signal and grows on a log scale", () => {
		expect(engagementWeight(null)).toBe(0);
		const small = engagementWeight({ score: 10, comments: 2 });
		const big = engagementWeight({ score: 1000, comments: 200 });
		expect(big).toBeGreaterThan(small);
		expect(big).toBeLessThan(small * 4);
	});
});
