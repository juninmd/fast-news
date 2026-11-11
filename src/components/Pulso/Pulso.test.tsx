import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommandPalette } from "./CommandPalette";
import { activeFilterCount, DEFAULT_FILTERS } from "./FilterDrawer";
import { Rail } from "./Rail";
import { Segmented } from "./Segmented";

const baseProps = {
	open: true,
	onClose: vi.fn(),
	onSearch: vi.fn(),
	onOpenArticle: vi.fn(),
	recentSearches: ["selic"],
	trending: ["Lei de IA"],
	articles: [{ id: "a1", title: "Copom corta a Selic", source: "Folha" }],
	commands: [{ id: "feed", label: "Ir para Feed", run: vi.fn() }],
};

describe("CommandPalette", () => {
	it("shows recent, trending and commands when empty", () => {
		render(<CommandPalette {...baseProps} />);
		expect(screen.getByText("selic")).toBeInTheDocument();
		expect(screen.getByText("Lei de IA")).toBeInTheDocument();
		expect(screen.getByText("Ir para Feed")).toBeInTheDocument();
	});

	it("runs a semantic search on Enter", () => {
		const onSearch = vi.fn();
		render(<CommandPalette {...baseProps} onSearch={onSearch} />);
		const input = screen.getByLabelText("Buscar notícias");
		fireEvent.change(input, { target: { value: "juros" } });
		fireEvent.keyDown(input, { key: "Enter" });
		expect(onSearch).toHaveBeenCalledWith("juros");
	});

	it("matches loaded headlines ignoring accents", () => {
		const onOpenArticle = vi.fn();
		render(<CommandPalette {...baseProps} onOpenArticle={onOpenArticle} />);
		fireEvent.change(screen.getByLabelText("Buscar notícias"), {
			target: { value: "copom" },
		});
		fireEvent.click(screen.getByText("Copom corta a Selic"));
		expect(onOpenArticle).toHaveBeenCalledWith("a1", "Copom corta a Selic");
	});

	it("lists only commands in > mode", () => {
		const run = vi.fn();
		render(
			<CommandPalette
				{...baseProps}
				commands={[{ id: "x", label: "Alternar tema", run }]}
			/>,
		);
		const input = screen.getByLabelText("Buscar notícias");
		fireEvent.change(input, { target: { value: ">tema" } });
		expect(screen.queryByText(/por significado/)).not.toBeInTheDocument();
		fireEvent.keyDown(input, { key: "Enter" });
		expect(run).toHaveBeenCalled();
	});

	it("renders nothing when closed", () => {
		const { container } = render(
			<CommandPalette {...baseProps} open={false} />,
		);
		expect(container).toBeEmptyDOMElement();
	});
});

describe("Rail", () => {
	it("labels counts for screen readers and marks the current view", () => {
		const onChange = vi.fn();
		render(
			<Rail active="feed" onChange={onChange} counts={{ bookmarks: 2 }} />,
		);
		expect(
			screen.getByRole("button", { name: "Salvos (2)" }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Feed" })).toHaveAttribute(
			"aria-current",
			"page",
		);
		fireEvent.click(screen.getByRole("button", { name: "Status" }));
		expect(onChange).toHaveBeenCalledWith("status");
		fireEvent.click(screen.getByRole("button", { name: "Palavras" }));
		expect(onChange).toHaveBeenCalledWith("words");
	});
});

describe("Segmented", () => {
	it("presses the chosen option", () => {
		const onChange = vi.fn();
		render(
			<Segmented
				label="Período"
				value="daily"
				options={[
					["4h", "4h"],
					["daily", "Dia"],
				]}
				onChange={onChange}
			/>,
		);
		expect(screen.getByRole("button", { name: "Dia" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		fireEvent.click(screen.getByRole("button", { name: "4h" }));
		expect(onChange).toHaveBeenCalledWith("4h");
	});
});

describe("activeFilterCount", () => {
	it("counts only filters that differ from the defaults", () => {
		expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
		expect(
			activeFilterCount(
				{ ...DEFAULT_FILTERS, minCredibility: 7, lang: "en" },
				1,
			),
		).toBe(3);
	});
});
