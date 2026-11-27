import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CategoryTabs } from "./CategoryTabs";
import { EmptyState } from "./EmptyState";
import { SkeletonCard } from "./SkeletonCard";

describe("CategoryTabs (Sonido Tabs)", () => {
	it("keeps the tablist labelled and moves selection with the arrow keys", () => {
		const onCategoryChange = vi.fn();
		render(
			<CategoryTabs
				activeCategory="Tecnologia"
				onCategoryChange={onCategoryChange}
			/>,
		);

		expect(
			screen.getByRole("tablist", { name: "Categorias" }),
		).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: "Tecnologia" })).toHaveAttribute(
			"aria-selected",
			"true",
		);

		fireEvent.keyDown(screen.getByRole("tablist", { name: "Categorias" }), {
			key: "ArrowRight",
		});
		expect(onCategoryChange).toHaveBeenCalledWith("IA");
	});
});

describe("SkeletonCard (Sonido Skeleton)", () => {
	it("announces the loading label in a live status", () => {
		render(<SkeletonCard label="Carregando o feed" />);
		expect(screen.getByRole("status")).toHaveTextContent("Carregando o feed");
	});
});

describe("EmptyState (Sonido EmptyState)", () => {
	it("shows the title as a heading and the description as text", () => {
		render(
			<EmptyState
				title="Nada salvo ainda"
				text="Toque no marcador de um card."
			/>,
		);
		expect(
			screen.getByRole("heading", { name: "Nada salvo ainda" }),
		).toBeInTheDocument();
		expect(screen.getByText("Toque no marcador de um card.")).toBeVisible();
	});
});
