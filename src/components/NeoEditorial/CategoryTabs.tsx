import { useLayoutEffect, useRef, useState } from "react";

export const CATEGORIES = [
	"Todas",
	"Big Techs",
	"AI Frontier",
	"Dev Tools",
	"Gaming",
	"Tecnologia",
	"IA",
	"Brasil",
	"Mundo",
	"Negócios",
	"Cripto",
	"Ciência",
];

interface CategoryTabsProps {
	activeCategory: string;
	onCategoryChange: (category: string) => void;
}

/** Horizontal editorias with an ink bar that springs to the active one. */
export function CategoryTabs({
	activeCategory,
	onCategoryChange,
}: CategoryTabsProps) {
	const ref = useRef<HTMLDivElement>(null);
	const [ink, setInk] = useState({ left: 0, width: 0 });

	useLayoutEffect(() => {
		const measure = () => {
			const on = ref.current?.querySelector<HTMLButtonElement>(
				`[data-cat="${CSS.escape(activeCategory)}"]`,
			);
			if (on) setInk({ left: on.offsetLeft, width: on.offsetWidth });
		};
		measure();
		window.addEventListener("resize", measure);
		return () => window.removeEventListener("resize", measure);
	}, [activeCategory]);

	return (
		<div
			ref={ref}
			role="tablist"
			aria-label="Categorias"
			className="pulso-cats"
		>
			{CATEGORIES.map((category) => (
				<button
					key={category}
					type="button"
					role="tab"
					data-cat={category}
					aria-selected={category === activeCategory}
					onClick={() => onCategoryChange(category)}
				>
					{category}
				</button>
			))}
			<span
				className="pulso-cats-ink"
				style={{ left: ink.left, width: ink.width }}
			/>
		</div>
	);
}
