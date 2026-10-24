import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnimatedNumber } from "./AnimatedNumber";

const offsets = (container: HTMLElement) =>
	[...container.querySelectorAll<HTMLElement>("[data-digit]")].map(
		(el) => el.style.transform,
	);

describe("AnimatedNumber", () => {
	it("exposes the real number as text and rolls each digit to its place", async () => {
		const { container } = render(<AnimatedNumber value={42} />);
		expect(screen.getByText("42")).toHaveClass("sr-only");
		await waitFor(() =>
			expect(offsets(container)).toEqual([
				"translateY(-5em)",
				"translateY(-2.5em)",
			]),
		);
	});

	it("rolls to a new value and grows to the left", async () => {
		const { container, rerender } = render(<AnimatedNumber value={9} />);
		await waitFor(() =>
			expect(offsets(container)).toEqual(["translateY(-11.25em)"]),
		);
		rerender(<AnimatedNumber value={12} />);
		await waitFor(() =>
			expect(offsets(container)).toEqual([
				"translateY(-1.25em)",
				"translateY(-2.5em)",
			]),
		);
	});

	it("clamps negatives to zero", () => {
		const { container } = render(<AnimatedNumber value={-3.4} />);
		expect(container.querySelector(".sr-only")).toHaveTextContent(/^0$/);
	});
});
