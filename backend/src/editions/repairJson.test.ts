import { describe, expect, it } from "vitest";
import { extractJsonObject } from "./repairJson.js";

const repair = (text: string) => extractJsonObject({ text });

describe("extractJsonObject", () => {
	it("recovers the object from a markdown fence the model added", async () => {
		expect(await repair('```json\n{"leve":["a"]}\n```')).toBe('{"leve":["a"]}');
	});

	it("skips reasoning text that mentions braces before the real JSON", async () => {
		const text =
			'We need {manchete} and {destaques}. Output:\n{"destaques":[{"titulo":"x"}]}';
		expect(JSON.parse((await repair(text)) ?? "")).toEqual({
			destaques: [{ titulo: "x" }],
		});
	});

	it("gives up on text with no parseable object so the attempt is retried", async () => {
		expect(await repair("Also about Lula pode estar {tentando")).toBeNull();
		expect(await repair("")).toBeNull();
	});
});

describe("extractJsonObject trailing prose", () => {
	it("ignores braces the model writes after the JSON", async () => {
		expect(await repair('{"leve":[]}\nObs.: campo {x} omitido')).toBe(
			'{"leve":[]}',
		);
	});
});
