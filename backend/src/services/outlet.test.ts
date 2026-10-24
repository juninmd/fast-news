import { describe, expect, it } from "vitest";
import { outletOf } from "./outlet.js";

describe("outletOf", () => {
	it("folds sections, mirrors and mobile hosts of one site into one outlet", () => {
		const keys = [
			"https://www1.folha.uol.com.br/poder/2026/10/a.shtml",
			"https://www.folha.uol.com.br/mercado/2026/10/b.shtml",
			"https://m.folha.uol.com.br/mundo/c.shtml",
		].map((u) => outletOf(u));
		expect(new Set(keys)).toEqual(new Set(["folha.uol.com.br"]));
	});

	it("reads through click-tracking redirects and groups UOL's channels", () => {
		expect(
			outletOf(
				"https://redir.folha.com.br/redir/online/poder/rss091/*https://www1.folha.uol.com.br/poder/2026/10/a.shtml",
			),
		).toBe("folha.uol.com.br");
		expect(outletOf("https://economia.uol.com.br/x")).toBe("uol.com.br");
		expect(outletOf("https://www.uol.com.br/carros/x")).toBe("uol.com.br");
	});

	it("keeps different publishers on related domains apart", () => {
		expect(outletOf("https://www1.folha.uol.com.br/x")).not.toBe(
			outletOf("https://economia.uol.com.br/x"),
		);
		expect(outletOf("https://g1.globo.com/x")).not.toBe(
			outletOf("https://ge.globo.com/x"),
		);
	});

	it("applies aliases", () => {
		expect(outletOf("https://www.bbc.co.uk/news/1")).toBe("bbc.com");
		expect(outletOf("https://www.bbc.com/news/1")).toBe("bbc.com");
	});

	it("separates publishers that share a platform", () => {
		expect(outletOf("https://medium.com/better-programming/x-123")).toBe(
			"medium.com/better-programming",
		);
		expect(outletOf("https://www.reddit.com/r/LocalLLaMA/comments/1/x/")).toBe(
			"reddit.com/r/localllama",
		);
		expect(
			outletOf(
				"https://www.youtube.com/watch?v=dQw4w9WgXcQ",
				"Two Minute Papers",
			),
		).toBe("youtube.com:two-minute-papers");
	});

	it("falls back to the feed title when the link is unusable", () => {
		expect(outletOf("", "Folha de S.Paulo")).toBe("folha-de-s-paulo");
		expect(outletOf("")).toBeUndefined();
	});
});
