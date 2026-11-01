import { afterEach, describe, expect, it, vi } from "vitest";
import { draft, edition, headline, knownOf } from "./fixtures.js";
import { renderEditionHtml } from "./renderHtml.js";
import { renderEditionMarkdown } from "./renderMarkdown.js";
import { renderTelegramSummary } from "./renderTelegram.js";
import { createEditionSnapshot, hydrateSnapshot } from "./snapshot.js";
import { fetchXTrends, parseXTrends, sanitizeXTrends } from "./xTrends.js";

const page = (names: string[]) =>
	names
		.map((n) => `<a href="/brazil/trend/${n}" title="x">${n}</a>`)
		.join("\n");

afterEach(() => vi.unstubAllGlobals());

describe("parseXTrends", () => {
	it("reads live names and builds the search link itself", () => {
		const out = parseXTrends(page(["#Alfa", "Beta &amp; Co", "Gama"]));
		expect(out.map((t) => t.name)).toEqual(["#Alfa", "Beta & Co", "Gama"]);
		expect(out[0]?.url).toBe("https://x.com/search?q=%23Alfa");
	});

	it("returns nothing when the page yields fewer than three topics", () => {
		expect(parseXTrends(page(["A", "B"]))).toEqual([]);
		expect(parseXTrends("<html>layout changed</html>")).toEqual([]);
	});

	it("caps and de-duplicates the list", () => {
		const names = Array.from({ length: 20 }, (_, i) => `T${i % 12}`);
		const out = parseXTrends(page(names));
		expect(out).toHaveLength(8);
		expect(new Set(out.map((t) => t.name)).size).toBe(8);
	});
});

describe("sanitizeXTrends", () => {
	it("drops markup, control chars and ignores a forged url", () => {
		const out = sanitizeXTrends([
			{ name: "<img src=x onerror=1>ok\u0007", url: "javascript:alert(1)" },
			{ name: 42 },
			null,
		]);
		expect(out).toHaveLength(1);
		expect(out[0]?.name).not.toMatch(/[<>\p{Cc}]/u);
		expect(out[0]?.url.startsWith("https://x.com/search?q=")).toBe(true);
	});
});

describe("fetchXTrends", () => {
	it("is empty, never stale or invented, when the source is down", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
		expect(await fetchXTrends()).toEqual([]);
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
		expect(await fetchXTrends()).toEqual([]);
	});

	it("returns the live topics when the page is readable", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				text: async () => page(["A", "B", "C"]),
			}),
		);
		expect((await fetchXTrends()).map((t) => t.name)).toEqual(["A", "B", "C"]);
	});
});

describe("X section in the editions", () => {
	const h = headline({ sourceId: "11111111-1111-4111-8111-111111111111" });
	const trends = sanitizeXTrends([
		{ name: "#Alfa" },
		{ name: "Beta" },
		{ name: "Gama" },
	]);
	const withTrends = () => edition(draft(), knownOf([h]), { xTrends: trends });

	it("shows the topics, linked, in Telegram, Markdown and HTML", () => {
		const e = withTrends();
		expect(renderTelegramSummary(e)).toContain(
			'Em alta no X</b>\n<a href="https://x.com/search?q=%23Alfa">#Alfa</a>',
		);
		expect(renderEditionMarkdown(e).markdown).toContain(
			"## Em alta no X\n\n- [\\#Alfa](<https://x.com/search?q=%23Alfa>)",
		);
		expect(renderEditionHtml(e)).toContain(
			'class="chip" href="https://x.com/search?q=%23Alfa"',
		);
	});

	it("leaves the section out entirely when there are no topics", () => {
		const e = edition(draft(), knownOf([h]));
		expect(renderTelegramSummary(e)).not.toContain("Em alta no X");
		expect(renderEditionMarkdown(e).markdown).not.toContain("Em alta no X");
		expect(renderEditionHtml(e)).not.toContain("Em alta no X");
	});

	it("keeps the topics through a snapshot and leaves old snapshots byte-identical", () => {
		const plain = createEditionSnapshot(edition(draft(), knownOf([h])));
		expect(Object.keys(plain.snapshot)).not.toContain("xTrends");
		const full = createEditionSnapshot(withTrends());
		expect(hydrateSnapshot(full).xTrends).toEqual(trends);
	});
});
