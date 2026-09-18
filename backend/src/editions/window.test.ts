import { describe, expect, it } from "vitest";
import { editionWindow, formatLocalTime } from "./window.js";

// Sao Paulo is UTC-3: 07:00 local == 10:00Z, 19:00 local == 22:00Z.
const at = (iso: string) => new Date(iso);

describe("editionWindow", () => {
	it("manhã closes at 07h and covers the 12h since 19h of the previous day", () => {
		const w = editionWindow("manha", at("2026-09-18T10:00:30Z"));
		expect(w.start.toISOString()).toBe("2026-09-17T22:00:00.000Z");
		expect(w.end.toISOString()).toBe("2026-09-18T10:00:00.000Z");
		expect(w.day).toBe("2026-09-18");
		expect(formatLocalTime(w.start)).toBe("19h00");
		expect(formatLocalTime(w.end)).toBe("07h00");
	});

	it("a late retry keeps the same window, so the edition is not duplicated", () => {
		const onTime = editionWindow("manha", at("2026-09-18T10:00:00Z"));
		const retry = editionWindow("manha", at("2026-09-18T12:40:00Z"));
		expect(retry).toEqual(onTime);
	});

	it("before the close time it still points to the previous edition", () => {
		const w = editionWindow("manha", at("2026-09-18T09:59:00Z"));
		expect(w.day).toBe("2026-09-17");
		expect(w.end.toISOString()).toBe("2026-09-17T10:00:00.000Z");
	});

	it("noite covers 07h to 19h of the same local day", () => {
		const w = editionWindow("noite", at("2026-09-18T22:05:00Z"));
		expect(w.start.toISOString()).toBe("2026-09-18T10:00:00.000Z");
		expect(w.end.toISOString()).toBe("2026-09-18T22:00:00.000Z");
		expect(w.day).toBe("2026-09-18");
	});

	it("uses the local day, not the UTC day, late in the evening", () => {
		// 22:30 local on the 18th is already the 19th in UTC.
		const w = editionWindow("noite", at("2026-09-19T01:30:00Z"));
		expect(w.day).toBe("2026-09-18");
	});
});
