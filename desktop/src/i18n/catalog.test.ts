import { describe, expect, test } from "bun:test";
import { en } from "./en";
import { ptBR } from "./pt-BR";

describe("i18n catalogues", () => {
  test("every pt-BR key has an English translation", () => {
    const missing = Object.keys(ptBR).filter((key) => !(key in en));
    expect(missing).toEqual([]);
  });

  test("no translation is left empty", () => {
    for (const [key, value] of Object.entries({ ...ptBR, ...en })) {
      expect(value.trim(), key).not.toBe("");
    }
  });

  test("placeholders match between languages", () => {
    const placeholders = (text: string) => (text.match(/\{[a-z]+\}/g) ?? []).sort();
    for (const key of Object.keys(ptBR) as (keyof typeof ptBR)[]) {
      expect(placeholders(en[key]), key).toEqual(placeholders(ptBR[key]));
    }
  });
});
