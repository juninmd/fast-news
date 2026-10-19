import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CoverImage } from "./CoverImage";

describe("CoverImage", () => {
	it("renders the picture without leaking the referrer", () => {
		const { container } = render(
			<CoverImage src="https://x.example/a.jpg" source="G1" />,
		);
		const img = container.querySelector("img");
		expect(img).toHaveAttribute("src", "https://x.example/a.jpg");
		expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
	});

	it("shows a monogram when the feed has no image", () => {
		render(<CoverImage source="Folha de S.Paulo" category="Brasil" />);
		expect(screen.getByRole("img")).toHaveTextContent("FD");
		expect(screen.getByText("Brasil")).toBeInTheDocument();
	});

	it("falls back to the monogram when the image fails to load", () => {
		const { container } = render(
			<CoverImage src="https://x.example/broken.jpg" source="BBC News" />,
		);
		const img = container.querySelector("img");
		expect(img).not.toBeNull();
		fireEvent.error(img as HTMLImageElement);
		expect(container.querySelector("img")).toBeNull();
		expect(screen.getByRole("img")).toHaveTextContent("BN");
	});
});
