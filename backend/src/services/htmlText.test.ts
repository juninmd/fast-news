import { describe, expect, it } from "vitest";
import {
	decodeEntities,
	htmlToText,
	inlineText,
	truncateText,
} from "./htmlText.js";

describe("decodeEntities", () => {
	it("decodes named, decimal and hex entities", () => {
		expect(
			decodeEntities("A&nbsp;&amp;&nbsp;B &#8220;x&#x201D; &hellip;"),
		).toBe("A & B “x” …");
	});

	it("fixes double-encoded text and leaves unknown entities alone", () => {
		expect(decodeEntities("It&amp;#039;s")).toBe("It's");
		expect(decodeEntities("&bogus; & 100%")).toBe("&bogus; & 100%");
	});
});

describe("htmlToText", () => {
	it("drops scripts/embeds, keeps paragraphs, decodes entities", () => {
		const html =
			'<p>Hello&nbsp;<b>world</b></p><script>alert(1)</script><iframe src="x"></iframe><p>Second &amp; last</p>';
		expect(htmlToText(html)).toBe("Hello world\n\nSecond & last");
	});

	it("unwraps CDATA and ignores non-strings", () => {
		expect(htmlToText("<![CDATA[<i>ok</i>]]>")).toBe("ok");
		expect(htmlToText(undefined)).toBe("");
	});
});

describe("inlineText", () => {
	it("collapses everything to one line", () => {
		expect(inlineText("  A <br> B\n\nC &#039;d&#039; ")).toBe("A B C 'd'");
	});
});

describe("truncateText", () => {
	it("keeps short text untouched", () => {
		expect(truncateText("short", 10)).toBe("short");
	});

	it("cuts at a sentence when one is near the limit", () => {
		const text = `${"Frase longa e completa. ".repeat(3)}Resto do texto que passa do limite.`;
		expect(truncateText(text, 70)).toBe(
			"Frase longa e completa. Frase longa e completa.",
		);
	});

	it("falls back to a word boundary with an ellipsis", () => {
		const out = truncateText("palavra ".repeat(20), 30);
		expect(out.endsWith("…")).toBe(true);
		expect(out.length).toBeLessThanOrEqual(31);
	});
});
