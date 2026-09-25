import { describe, expect, it, vi } from "vitest";

const generateWithFallback = vi.fn();
vi.mock("./llmWithFallback.js", () => ({ generateWithFallback }));

const { classifyTheme, THEME_TAXONOMY } = await import(
	"./themeClassification.js"
);

describe("classifyTheme", () => {
	it("returns the LLM-classified theme", async () => {
		generateWithFallback.mockResolvedValueOnce({ theme: "AI Frontier" });
		const theme = await classifyTheme("title", "content", "Tecnologia");
		expect(theme).toBe("AI Frontier");
	});

	it("falls back to fallbackCategory when the LLM call throws", async () => {
		generateWithFallback.mockRejectedValueOnce(new Error("timeout"));
		const theme = await classifyTheme("title", "content", "Cripto");
		expect(theme).toBe("Cripto");
	});

	it("falls back to Mundo when fallbackCategory is not in the taxonomy", async () => {
		generateWithFallback.mockRejectedValueOnce(new Error("timeout"));
		const theme = await classifyTheme("title", "content", "fact_check");
		expect(theme).toBe("Mundo");
	});

	it("falls back when the LLM returns no object", async () => {
		generateWithFallback.mockResolvedValueOnce(null);
		const theme = await classifyTheme("title", "content", "Gaming");
		expect(theme).toBe("Gaming");
	});

	it("exposes the full taxonomy", () => {
		expect(THEME_TAXONOMY).toContain("AI Frontier");
		expect(THEME_TAXONOMY).toContain("Geral");
	});
});
