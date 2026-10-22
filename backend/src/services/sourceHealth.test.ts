import { describe, expect, it, vi } from "vitest";

vi.mock("../database/client.js", () => ({ query: vi.fn() }));

const { classifySource, isQuarantined, quarantineMs, sanitizeError } =
	await import("./sourceHealth.js");

describe("quarantineMs", () => {
	it("does not quarantine before the threshold", () => {
		expect(quarantineMs(0)).toBe(0);
		expect(quarantineMs(2)).toBe(0);
	});
	it("backs off exponentially up to a day", () => {
		expect(quarantineMs(3)).toBe(30 * 60_000);
		expect(quarantineMs(4)).toBe(60 * 60_000);
		expect(quarantineMs(5)).toBe(120 * 60_000);
		expect(quarantineMs(50)).toBe(24 * 60 * 60_000);
	});
});

describe("isQuarantined / classifySource", () => {
	const now = new Date("2026-01-01T12:00:00Z");
	const future = "2026-01-01T13:00:00Z";
	const past = "2026-01-01T11:00:00Z";

	it("compares against the clock", () => {
		expect(isQuarantined(future, now)).toBe(true);
		expect(isQuarantined(past, now)).toBe(false);
		expect(isQuarantined(null, now)).toBe(false);
	});

	it("classifies by priority: disabled > quarantined > degraded > healthy", () => {
		const base = {
			is_active: true,
			consecutive_failures: 0,
			quarantined_until: null,
			last_success_at: past,
		};
		expect(classifySource(base, now)).toBe("healthy");
		expect(classifySource({ ...base, last_success_at: null }, now)).toBe(
			"unknown",
		);
		expect(classifySource({ ...base, consecutive_failures: 1 }, now)).toBe(
			"degraded",
		);
		expect(
			classifySource(
				{ ...base, consecutive_failures: 4, quarantined_until: future },
				now,
			),
		).toBe("quarantined");
		expect(
			classifySource(
				{ ...base, is_active: false, quarantined_until: future },
				now,
			),
		).toBe("disabled");
	});
});

describe("sanitizeError", () => {
	it("drops credentials and truncates", () => {
		expect(sanitizeError("fetch https://user:pw@host/x failed")).not.toContain(
			"user:pw",
		);
		expect(sanitizeError("GET /feed?token=abc123&x=1")).toBe(
			"GET /feed?token=<redacted>&x=1",
		);
		expect(sanitizeError("x".repeat(500))).toHaveLength(200);
	});
});
