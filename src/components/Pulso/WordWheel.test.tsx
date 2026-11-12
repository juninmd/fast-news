import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrendTerm } from "../../hooks/useTrends";
import { WordWheel } from "./WordWheel";
import {
	clockwiseOrder,
	distanceFromTop,
	layoutWheel,
	nearestToTop,
	ringCounts,
	rotationFor,
	TAU,
	toneOf,
	wrap,
} from "./wheelModel";

const term = (t: string, score: number, extra: Partial<TrendTerm> = {}) =>
	({
		term: t,
		count: score,
		sources: 3,
		previous: 1,
		growth: 1,
		score,
		hourly: [1, 2, 3],
		articleIds: [],
		...extra,
	}) as TrendTerm;

const TERMS = [
	term("selic", 90, { growth: 2.4 }),
	term("enem", 70, { previous: 0 }),
	term("stf", 50),
	term("dólar", 40),
];

describe("wordWheel helpers", () => {
	it("ranks by score and tones by growth", () => {
		const words = layoutWheel([...TERMS].reverse());
		expect(words.map((w) => w.term.term)).toEqual([
			"selic",
			"enem",
			"stf",
			"dólar",
		]);
		expect(words[0].rel).toBe(1);
		expect(words.map((w) => w.tone)).toEqual([
			"rising",
			"new",
			"steady",
			"steady",
		]);
		expect(toneOf(term("x", 1, { previous: 0 }))).toBe("new");
	});

	it("fills rings in proportion to their size", () => {
		expect(ringCounts(4)).toEqual([4, 0, 0]);
		const c = ringCounts(24);
		expect(c.reduce((a, b) => a + b, 0)).toBe(24);
		expect(c[0]).toBeGreaterThan(c[1]);
		expect(c[1]).toBeGreaterThan(c[2]);
		const many = Array.from({ length: 30 }, (_, i) => term(`t${i}`, 30 - i));
		expect(layoutWheel(many, 24)).toHaveLength(24);
	});

	it("wraps angles and finds the word under the pointer", () => {
		expect(wrap(TAU + 0.5)).toBeCloseTo(0.5);
		expect(wrap(-TAU - 0.5)).toBeCloseTo(-0.5);
		const words = layoutWheel(TERMS);
		expect(nearestToTop(words, 0)).toBe(0);
		const r = rotationFor(words[2].angle, 0);
		expect(distanceFromTop(words[2].angle, r)).toBeCloseTo(0);
		expect(nearestToTop(words, r)).toBe(2);
		expect(Math.abs(r)).toBeLessThanOrEqual(Math.PI);
		expect(clockwiseOrder(words)).toEqual([0, 1, 2, 3]);
	});
});

describe("WordWheel", () => {
	beforeEach(() => {
		// Reduced motion makes every spin land instantly.
		vi.stubGlobal(
			"matchMedia",
			vi.fn((q: string) => ({
				matches: q.includes("reduce"),
				media: q,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			})),
		);
	});
	afterEach(() => vi.unstubAllGlobals());

	it("puts the top term under the pointer and activates it", () => {
		const onActivate = vi.fn();
		const onFocusChange = vi.fn();
		render(
			<WordWheel
				terms={TERMS}
				onActivate={onActivate}
				onFocusChange={onFocusChange}
			/>,
		);
		expect(screen.getAllByRole("option")).toHaveLength(4);
		expect(screen.getByRole("option", { name: "selic" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		expect(onFocusChange).toHaveBeenLastCalledWith(
			expect.objectContaining({ term: TERMS[0] }),
			0,
		);
		fireEvent.click(screen.getByRole("option", { name: "selic" }));
		expect(onActivate).toHaveBeenCalledWith(
			expect.objectContaining({ term: TERMS[0] }),
		);
	});

	it("spins to a clicked word before activating it", () => {
		const onActivate = vi.fn();
		render(<WordWheel terms={TERMS} onActivate={onActivate} />);
		fireEvent.click(screen.getByRole("option", { name: "stf" }));
		expect(onActivate).not.toHaveBeenCalled();
		expect(screen.getByRole("option", { name: "stf" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
	});

	it("steps with the arrow keys and searches on Enter", () => {
		const onActivate = vi.fn();
		render(<WordWheel terms={TERMS} onActivate={onActivate} />);
		const wheel = screen.getByRole("listbox");
		fireEvent.keyDown(wheel, { key: "ArrowRight" });
		expect(screen.getByRole("option", { name: "enem" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		fireEvent.keyDown(wheel, { key: "ArrowLeft" });
		fireEvent.keyDown(wheel, { key: "ArrowLeft" });
		expect(screen.getByRole("option", { name: "dólar" })).toHaveAttribute(
			"aria-selected",
			"true",
		);
		fireEvent.keyDown(wheel, { key: "Enter" });
		expect(onActivate).toHaveBeenCalledWith(
			expect.objectContaining({ term: TERMS[3] }),
		);
	});
});
