import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SourceStack } from "./SourceStack";

const others = [
	{
		id: "2",
		source: "Folha",
		title: "Selic mantida em 15%",
		url: "https://folha.example/2",
		publishedAt: new Date().toISOString(),
	},
	{
		id: "3",
		source: "Valor",
		title: "Copom segura juros",
		url: "https://valor.example/3",
		publishedAt: new Date().toISOString(),
	},
];

describe("SourceStack", () => {
	it("renders nothing for a story with a single outlet", () => {
		const { container } = render(
			<SourceStack source="G1" sourceCount={1} others={[]} />,
		);
		expect(container).toBeEmptyDOMElement();
	});

	it("shows the outlet count and expands to links for every other outlet", async () => {
		render(<SourceStack source="G1" sourceCount={3} others={others} />);
		expect(
			screen.getByRole("button", { name: "3 fontes" }),
		).toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();

		await userEvent.click(screen.getByRole("button"));
		const links = screen.getAllByRole("link");
		expect(links).toHaveLength(2);
		expect(links[0]).toHaveAttribute("href", "https://folha.example/2");
		expect(links[0]).toHaveAttribute("rel", "noopener noreferrer");
	});

	it("counts outlets the API did not list", () => {
		render(
			<SourceStack source="G1" sourceCount={9} others={others.slice(0, 1)} />,
		);
		expect(screen.getByText(/\+7/)).toBeInTheDocument();
	});
});

describe("SourceStack preview", () => {
	it("shows how another outlet headlined the story on hover and focus, and hides on leave/Esc", async () => {
		render(<SourceStack source="G1" sourceCount={3} others={others} />);
		const folha = screen.getByText("Folha");
		await userEvent.hover(folha);
		const tip = await screen.findByRole("tooltip");
		expect(tip).toHaveTextContent("Selic mantida em 15%");
		await userEvent.unhover(folha);
		await waitFor(() =>
			expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
		);

		await userEvent.tab(); // toggle button
		await userEvent.tab(); // Folha
		expect(await screen.findByRole("tooltip")).toHaveTextContent("Folha");
		await userEvent.keyboard("{Escape}");
		expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
	});
});
