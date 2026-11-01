import { describe, expect, it } from "vitest";
import { outletName } from "./outlet.js";

describe("outletName", () => {
	it.each([
		["Folha de S.Paulo - Esporte - Principal", "Folha de S.Paulo"],
		["Folha de S.Paulo - Em cima da hora", "Folha de S.Paulo"],
		["g1 &gt; Tecnologia", "g1"],
		["NYT &gt; Business", "NYT"],
		["g1 &gt; Pop &amp; Arte", "g1"],
		["BGR - Industry-Leading Insights In Tech", "BGR"],
		["Hacker News: Front Page", "Hacker News"],
		["JOTA Jornalismo - Feed", "JOTA Jornalismo"],
		["Brazil Journal - Latest news", "Brazil Journal"],
		["Rock Paper Shotgun Latest Articles Feed", "Rock Paper Shotgun"],
		["News - MyAnimeList", "MyAnimeList"],
		["Política – VEJA", "VEJA"],
		["Brasil – Metrópoles", "Metrópoles"],
		["Tecnologia - Correio Braziliense", "Correio Braziliense"],
		["g1 &gt; Fato ou Fake", "g1"],
		["Poder360", "Poder360"],
		["Exame", "Exame"],
	])("%s -> %s", (raw, expected) => {
		expect(outletName(raw)).toBe(expected);
	});

	it("names a generic feed label by its site", () => {
		expect(
			outletName("Feed Últimas", "https://agenciabrasil.ebc.com.br/saude/x"),
		).toBe("agenciabrasil.ebc.com.br");
		expect(outletName("RSS Feed", "https://www.example.org/a")).toBe(
			"example.org",
		);
	});

	it("keeps a generic label when there is no URL to name it by", () => {
		expect(outletName("RSS Feed")).toBe("RSS Feed");
	});

	it("never returns an empty name", () => {
		expect(outletName("")).toBe("Fonte desconhecida");
		expect(outletName(" - ")).not.toBe("");
	});
});
