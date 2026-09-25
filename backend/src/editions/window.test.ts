import { describe, expect, it } from "vitest";
import { editionWindow, formatLocalTime } from "./window.js";

// Sao Paulo is UTC-3: 06:00 local == 09:00Z, 20:00 local == 23:00Z.
const at = (iso: string) => new Date(iso);

describe("editionWindow", () => {
	it("manhã closes at 06h and covers the 10h since 20h of the previous day", () => {
		const w = editionWindow("manha", at("2026-09-18T09:00:30Z"));
		expect(w.start.toISOString()).toBe("2026-09-17T23:00:00.000Z");
		expect(w.end.toISOString()).toBe("2026-09-18T09:00:00.000Z");
		expect(w.day).toBe("2026-09-18");
		expect(formatLocalTime(w.start)).toBe("20h00");
		expect(formatLocalTime(w.end)).toBe("06h00");
	});

	it("a late retry keeps the same window, so the edition is not duplicated", () => {
		const onTime = editionWindow("manha", at("2026-09-18T09:00:00Z"));
		const retry = editionWindow("manha", at("2026-09-18T11:40:00Z"));
		expect(retry).toEqual(onTime);
	});

	it("before the close time it still points to the previous edition", () => {
		const w = editionWindow("manha", at("2026-09-18T08:59:00Z"));
		expect(w.day).toBe("2026-09-17");
		expect(w.end.toISOString()).toBe("2026-09-17T09:00:00.000Z");
	});

	it("meiodia closes at 11h and covers the 5h since manhã's 06h close", () => {
		const w = editionWindow("meiodia", at("2026-09-18T14:05:00Z"));
		expect(w.start.toISOString()).toBe("2026-09-18T09:00:00.000Z");
		expect(w.end.toISOString()).toBe("2026-09-18T14:00:00.000Z");
		expect(w.day).toBe("2026-09-18");
		expect(formatLocalTime(w.start)).toBe("06h00");
		expect(formatLocalTime(w.end)).toBe("11h00");
	});

	it("tarde closes at 15h and covers the 4h since meio-dia's 11h close", () => {
		const w = editionWindow("tarde", at("2026-09-18T18:05:00Z"));
		expect(w.start.toISOString()).toBe("2026-09-18T14:00:00.000Z");
		expect(w.end.toISOString()).toBe("2026-09-18T18:00:00.000Z");
		expect(w.day).toBe("2026-09-18");
		expect(formatLocalTime(w.start)).toBe("11h00");
		expect(formatLocalTime(w.end)).toBe("15h00");
	});

	it("noite closes at 20h and covers the 5h since tarde's 15h close", () => {
		const w = editionWindow("noite", at("2026-09-18T23:05:00Z"));
		expect(w.start.toISOString()).toBe("2026-09-18T18:00:00.000Z");
		expect(w.end.toISOString()).toBe("2026-09-18T23:00:00.000Z");
		expect(w.day).toBe("2026-09-18");
	});

	it("uses the local day, not the UTC day, late in the evening", () => {
		// 23:30 local on the 18th is already the 19th in UTC.
		const w = editionWindow("noite", at("2026-09-19T02:30:00Z"));
		expect(w.day).toBe("2026-09-18");
	});
});
