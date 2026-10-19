import { describe, expect, it } from "vitest";
import { pickStoryMatch, type StoryCandidate } from "./storyMatch.js";

const opts = { threshold: 0.82, windowHours: 72 };
const at = (iso: string) => new Date(iso);
const art = {
	title: "Banco Central mantém Selic em 15%",
	publishedAt: at("2026-10-19T10:00:00Z"),
};

function cand(over: Partial<StoryCandidate>): StoryCandidate {
	return {
		id: "c1",
		title: "Outro assunto qualquer",
		storyId: "s1",
		similarity: null,
		publishedAt: at("2026-10-19T09:00:00Z"),
		...over,
	};
}

describe("pickStoryMatch", () => {
	it("matches on embedding similarity above the threshold", () => {
		const m = pickStoryMatch(art, [cand({ similarity: 0.9 })], opts);
		expect(m?.id).toBe("c1");
	});

	it("rejects a similar vector below the threshold with no headline support", () => {
		expect(pickStoryMatch(art, [cand({ similarity: 0.78 })], opts)).toBeNull();
	});

	it("rescues a near-miss when the headlines overlap", () => {
		const m = pickStoryMatch(
			art,
			[
				cand({
					similarity: 0.77,
					title: "Copom mantém Selic em 15% e sinaliza cautela",
				}),
			],
			opts,
		);
		expect(m).not.toBeNull();
	});

	it("falls back to headline overlap without vectors", () => {
		const hit = cand({
			title: "BC mantém Selic em 15%, diz Copom",
			similarity: null,
		});
		expect(pickStoryMatch(art, [hit], opts)?.id).toBe("c1");
		expect(pickStoryMatch(art, [cand({ similarity: null })], opts)).toBeNull();
	});

	it("ignores candidates outside the time window", () => {
		const old = cand({
			similarity: 0.95,
			publishedAt: at("2026-10-10T09:00:00Z"),
		});
		expect(pickStoryMatch(art, [old], opts)).toBeNull();
	});

	it("keeps the best-scoring candidate", () => {
		const m = pickStoryMatch(
			art,
			[
				cand({ id: "a", similarity: 0.84 }),
				cand({ id: "b", similarity: 0.93 }),
			],
			opts,
		);
		expect(m?.id).toBe("b");
	});
});
