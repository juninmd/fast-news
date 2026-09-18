import { describe, expect, it } from "vitest";
import { extrasSchema, frontSchema } from "./draftSchema.js";

describe("draft schemas", () => {
	it("accept quoted ids and indexes so a sloppy but usable answer is kept", () => {
		const r = extrasSchema.parse({
			fio: [{ tema: "t", eventos: [{ fonte: "12", texto: "e" }] }],
			numeros: [{ rotulo: "Selic", valor: 13.75 }],
			quiz: [{ pergunta: "p", opcoes: ["a", "b", 3], correta: "1" }],
		});
		expect(r.fio[0]?.eventos[0]?.fonte).toBe(12);
		expect(r.numeros[0]?.valor).toBe("13.75");
		expect(r.quiz[0]?.correta).toBe(1);
		expect(r.leve).toEqual([]);
	});

	it("never turns null, false or blank into answer 0", () => {
		for (const correta of [null, false, ""])
			expect(() =>
				extrasSchema.parse({
					quiz: [{ pergunta: "p", opcoes: ["a", "b", "c"], correta }],
				}),
			).toThrow();
	});

	it("still rejects ids that are not numbers, so sanitize never sees NaN", () => {
		expect(() =>
			frontSchema.parse({
				manchete: { titulo: "t", fontes: ["abc"] },
			}),
		).toThrow();
	});
});
