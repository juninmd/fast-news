import { describe, expect, it } from "vitest";
import {
	canonicalUrl,
	resolveHttpUrl,
	titleSimilarity,
	tokenize,
} from "./textSimilarity.js";

describe("tokenize", () => {
	it("drops accents, stopwords and short numbers", () => {
		expect(tokenize("O Banco Central mantém a Selic em 15%")).toEqual([
			"banco",
			"central",
			"mantem",
			"selic",
		]);
	});
});

describe("titleSimilarity", () => {
	it("scores the same story from two outlets high", () => {
		const a = "Banco Central mantém Selic em 15% ao ano";
		const b = "Copom mantém a Selic em 15% e sinaliza cautela";
		expect(titleSimilarity(a, b)).toBeGreaterThan(0.2);
		expect(
			titleSimilarity(
				"Banco Central mantém Selic estável pela terceira vez",
				"BC mantém Selic estável pela terceira reunião seguida",
			),
		).toBeGreaterThan(0.4);
	});

	it("ignores headlines that share a single word", () => {
		expect(
			titleSimilarity("Apple lança novo iPhone", "Apple processa fornecedora"),
		).toBe(0);
	});
});

describe("canonicalUrl", () => {
	it("strips tracking params, fragment, www and trailing slash", () => {
		expect(
			canonicalUrl(
				"https://www.Example.com/a/b/?utm_source=x&id=2&fbclid=1#top",
			),
		).toBe("example.com/a/b?id=2");
	});

	it("keeps unparseable input", () => {
		expect(canonicalUrl("not a url")).toBe("not a url");
	});
});

describe("resolveHttpUrl", () => {
	const feed = "https://example.com/rss.xml";

	it("trims padded links and resolves relative ones against the feed", () => {
		expect(resolveHttpUrl("  https://example.com/a  ", feed)).toBe(
			"https://example.com/a",
		);
		expect(resolveHttpUrl("/noticia/1", feed)).toBe(
			"https://example.com/noticia/1",
		);
	});

	it("rejects empty and non-web links", () => {
		expect(resolveHttpUrl(undefined, feed)).toBe("");
		expect(resolveHttpUrl("javascript:alert(1)", feed)).toBe("");
		expect(resolveHttpUrl("mailto:a@b.c", feed)).toBe("");
	});
});
