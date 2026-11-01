import { describe, expect, it } from "vitest";
import { looksEnglish } from "./language.js";

describe("looksEnglish", () => {
	it.each([
		"Putin Breaks Down His Isolation, With a Big Assist From Trump",
		"US midterms: 2 days to go – what polls say as Trump, El-Sayed hit the trail",
		"Where are the most expensive midterm races and who is funding them?",
		"Qatar LNG carrier struck by ‘unidentified objects’ in Gulf",
	])("flags English: %s", (title) => {
		expect(looksEnglish(title)).toBe(true);
	});

	it.each([
		"Binance retoma saques após roubo de US$ 6,3 bilhões atribuído à Coreia do Norte",
		"Flávio tenta se comparar a Guaidó, avalia especialista",
		"Moraes está há 177 dias com ações contra a lei da dosimetria",
		"Dólar alto após eleições se soma a El Niño e ameaça inflação",
		"Real Madrid vence o Barcelona",
		"Apple lança novo iPhone no Brasil",
	])("keeps Portuguese: %s", (title) => {
		expect(looksEnglish(title)).toBe(false);
	});

	it("does not judge short or number-only text", () => {
		expect(looksEnglish("Selic 13,75%")).toBe(false);
		expect(looksEnglish("")).toBe(false);
	});
});
