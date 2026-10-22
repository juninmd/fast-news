import { beforeEach, describe, expect, it } from "vitest";
import { remaining, resetBudgets, tryConsume } from "./llmBudget.js";

beforeEach(resetBudgets);

describe("llmBudget", () => {
	it("allows work until the daily limit and then refuses", () => {
		expect(tryConsume("f", 3)).toBe(true);
		expect(tryConsume("f", 3, 2)).toBe(true);
		expect(tryConsume("f", 3)).toBe(false);
		expect(remaining("f", 3)).toBe(0);
	});
	it("refuses a batch that would overshoot instead of partially spending", () => {
		expect(tryConsume("f", 5, 6)).toBe(false);
		expect(remaining("f", 5)).toBe(5);
	});
	it("a limit of 0 disables the feature", () => {
		expect(tryConsume("f", 0)).toBe(false);
	});
	it("resets on a new day and isolates features", () => {
		const d1 = new Date("2026-01-01T10:00:00Z");
		const d2 = new Date("2026-01-02T10:00:00Z");
		expect(tryConsume("f", 1, 1, d1)).toBe(true);
		expect(tryConsume("f", 1, 1, d1)).toBe(false);
		expect(tryConsume("f", 1, 1, d2)).toBe(true);
		expect(tryConsume("other", 1, 1, d1)).toBe(true);
	});
});
