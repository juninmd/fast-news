import { describe, expect, it, vi } from "vitest";
import { headline } from "./fixtures.js";

vi.mock("../database/client.js", () => ({ query: vi.fn() }));

const { buildStoryThreads, mergeThreads } = await import("./storyThreads.js");

const at = (min: number) => new Date(Date.UTC(2026, 9, 27, 18, min));
const hs = [1, 2, 3, 4].map((n) =>
	headline({ sourceId: `art-${n}`, createdAt: at(n) }),
);
const byArticle = new Map(hs.map((h) => [h.sourceId as string, h]));
const row = (
	n: number,
	over: Partial<Parameters<typeof buildStoryThreads>[0][number]> = {},
) => ({
	story_id: "s1",
	story_title: "Flávio Bolsonaro deixa o país",
	article_id: `art-${n}`,
	event_type: "new_development",
	headline: `manchete ${n}`,
	what_changed: null,
	occurred_at: at(n),
	...over,
});

describe("buildStoryThreads", () => {
	it("builds an ordered thread, preferring what_changed over the headline", () => {
		const [t] = buildStoryThreads(
			[
				row(3, { event_type: "resolution", what_changed: "PF cancela" }),
				row(1),
				row(2, { event_type: "escalation" }),
			],
			byArticle,
		);
		expect(t?.storyId).toBe("s1");
		expect(t?.eventos.map((e) => [e.texto, e.tipo])).toEqual([
			["manchete 1", "development"],
			["manchete 2", "escalation"],
			["PF cancela", "resolution"],
		]);
	});

	it("skips unknown articles, repeated headlines and one-event stories", () => {
		const out = buildStoryThreads(
			[
				row(1),
				row(1, { event_type: "escalation" }),
				row(9),
				row(2, { story_id: "s2" }),
			],
			byArticle,
		);
		expect(out).toEqual([]);
	});

	it("ranks threads with turning points first", () => {
		const out = buildStoryThreads(
			[
				row(1),
				row(2),
				row(3, { story_id: "s2", event_type: "escalation" }),
				row(4, { story_id: "s2", event_type: "resolution" }),
			],
			byArticle,
		);
		expect(out.map((t) => t.storyId)).toEqual(["s2", "s1"]);
	});
});

describe("mergeThreads", () => {
	it("keeps stored threads and drops written ones that repeat their sources", () => {
		const stored = [
			{ tema: "A", eventos: [1, 2].map((fonte) => ({ fonte, texto: "x" })) },
		];
		const written = [
			{
				tema: "A2",
				eventos: [1, 2, 3].map((fonte) => ({ fonte, texto: "y" })),
			},
			{ tema: "B", eventos: [7, 8].map((fonte) => ({ fonte, texto: "z" })) },
		];
		expect(mergeThreads(stored, written).map((t) => t.tema)).toEqual([
			"A",
			"B",
		]);
	});
});
