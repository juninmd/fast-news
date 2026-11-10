import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ImageGallery } from "./ImageGallery";

const images = [
	{ url: "https://x.test/1.jpg", alt: "Plenário", credit: "Agência Brasil" },
	{ url: "https://x.test/2.jpg" },
	{ url: "https://x.test/3.jpg", alt: "Votação" },
];

describe("ImageGallery", () => {
	it("renders nothing for fewer than two images or when hidden", () => {
		const { container, rerender } = render(
			<ImageGallery images={images.slice(0, 1)} title="T" />,
		);
		expect(container).toBeEmptyDOMElement();
		rerender(<ImageGallery images={images} title="T" hidden />);
		expect(container).toBeEmptyDOMElement();
	});

	it("opens the lightbox on the clicked picture with caption and counter", async () => {
		render(<ImageGallery images={images} title="Votação" />);
		await userEvent.click(
			screen.getByRole("button", { name: /imagem 3 de 3/i }),
		);
		const dialog = screen.getByRole("dialog", { name: "Galeria: Votação" });
		expect(dialog).toHaveTextContent("3 / 3");
		expect(screen.getByRole("img", { name: "Votação" })).toHaveAttribute(
			"src",
			"https://x.test/3.jpg",
		);
	});

	it("moves with the arrow keys (wrapping) and shows alt + credit", async () => {
		render(<ImageGallery images={images} title="T" />);
		await userEvent.click(
			screen.getByRole("button", { name: /imagem 1 de 3/i }),
		);
		expect(screen.getByRole("dialog")).toHaveTextContent(
			"Plenário · Agência Brasil",
		);
		fireEvent.keyDown(window, { key: "ArrowLeft" });
		expect(screen.getByRole("dialog")).toHaveTextContent("3 / 3");
		fireEvent.keyDown(window, { key: "ArrowRight" });
		expect(screen.getByRole("dialog")).toHaveTextContent("1 / 3");
	});

	it("closes on Escape without letting the page behind see it, and on the close button", async () => {
		const behind = vi.fn();
		window.addEventListener("keydown", behind);
		render(<ImageGallery images={images} title="T" />);
		await userEvent.click(
			screen.getByRole("button", { name: /imagem 2 de 3/i }),
		);
		fireEvent.keyDown(window, { key: "Escape" });
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(behind).not.toHaveBeenCalled();

		await userEvent.click(
			screen.getByRole("button", { name: /imagem 2 de 3/i }),
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Fechar galeria" }),
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		window.removeEventListener("keydown", behind);
	});

	it("swipes between pictures", async () => {
		render(<ImageGallery images={images} title="T" />);
		await userEvent.click(
			screen.getByRole("button", { name: /imagem 1 de 3/i }),
		);
		const dialog = screen.getByRole("dialog");
		fireEvent.touchStart(dialog, { touches: [{ clientX: 300 }] });
		fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 100 }] });
		expect(dialog).toHaveTextContent("2 / 3");
	});
});
