import { describe, expect, it } from "vitest";
import {
	composeTopStories,
	type MemberRow,
	type StoryRow,
	toExcerpt,
	uniqueSources,
} from "./topStories.js";

const NOW = new Date("2026-10-19T12:00:00Z");

function member(over: Partial<MemberRow>): MemberRow {
	return {
		story_id: "s1",
		id: "a1",
		title: "Título",
		summary: null,
		content: null,
		url: "https://x.com/1",
		source: "G1",
		category: "Mundo",
		company: null,
		published_at: "2026-10-19T10:00:00Z",
		image_url: null,
		importance_score: 5,
		fake_news_score: null,
		political_bias: null,
		is_militant: false,
		...over,
	};
}

const story = (id: string, over: Partial<StoryRow> = {}): StoryRow => ({
	story_id: id,
	story_title: id,
	story_summary: null,
	last_updated_at: "2026-10-19T11:00:00Z",
	article_count: 1,
	source_count: 1,
	...over,
});

describe("composeTopStories", () => {
	it("ranks broad coverage first and borrows an image from another outlet", () => {
		const out = composeTopStories(
			[story("s1"), story("s2")],
			[
				member({ story_id: "s1", id: "a1", source: "G1", importance_score: 9 }),
				member({
					story_id: "s1",
					id: "a2",
					source: "BBC",
					image_url: "https://x.com/i.jpg",
				}),
				member({ story_id: "s1", id: "a3", source: "CNN" }),
				member({
					story_id: "s2",
					id: "b1",
					source: "Folha",
					importance_score: 10,
				}),
			],
			NOW,
		);
		expect(out.map((s) => s.storyId)).toEqual(["s1", "s2"]);
		expect(out[0]).toMatchObject({
			id: "a1",
			sourceCount: 3,
			image_url: "https://x.com/i.jpg",
		});
	});

	it("skips stories whose members were not loaded", () => {
		expect(composeTopStories([story("s9")], [], NOW)).toEqual([]);
	});
});

describe("uniqueSources", () => {
	it("keeps the newest article of each outlet", () => {
		const out = uniqueSources([
			member({ id: "old", source: "G1", published_at: "2026-10-19T08:00:00Z" }),
			member({ id: "new", source: "G1", published_at: "2026-10-19T09:00:00Z" }),
			member({
				id: "bbc",
				source: "BBC",
				published_at: "2026-10-19T07:00:00Z",
			}),
		]);
		expect(out.map((s) => s.id)).toEqual(["new", "bbc"]);
	});
});

describe("toExcerpt", () => {
	it("strips tags and entities and cuts on a word boundary", () => {
		expect(toExcerpt("<p>Olá &amp; bem-vindo</p>")).toBe("Olá & bem-vindo");
		const cut = toExcerpt("palavra ".repeat(60), 50);
		expect(cut.endsWith("…")).toBe(true);
		expect(cut.length).toBeLessThanOrEqual(51);
	});
});
