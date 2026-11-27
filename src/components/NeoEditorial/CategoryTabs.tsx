import { Tabs } from "@juninmd/sonido";

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

/** Editorias horizontais; teclado, ARIA e a barra ativa vêm do Tabs do Sonido. */
export function CategoryTabs({
	activeCategory,
	onCategoryChange,
}: CategoryTabsProps) {
	return (
		<Tabs
			label="Categorias"
			variant="underline"
			value={activeCategory}
			onChange={onCategoryChange}
			items={CATEGORIES.map((category) => ({
				key: category,
				label: category,
			}))}
			className="pulso-cats-sonido"
		/>
	);
}
