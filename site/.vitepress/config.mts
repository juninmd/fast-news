import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";

const here = dirname(fileURLToPath(import.meta.url));
const SLUG = /^(\d{4}-\d{2})-\d{2}-(manha|meiodia|tarde|noite)\.md$/;
const KIND_LABEL: Record<string, string> = {
	manha: "Manhã",
	meiodia: "Meio-dia",
	tarde: "Tarde",
	noite: "Noite",
};

/** Sidebar of every published edition, newest first, grouped by month. */
function sidebar() {
	const months = new Map<string, { text: string; link: string }[]>();
	const files = readdirSync(resolve(here, "../edicoes"))
		.filter((f) => SLUG.test(f))
		.sort()
		.reverse();
	for (const file of files) {
		const [, month, kind] = file.match(SLUG)!;
		const slug = file.replace(/\.md$/, "");
		const items = months.get(month!) ?? [];
		items.push({
			text: `${slug.slice(8, 10)}/${slug.slice(5, 7)} · ${KIND_LABEL[kind!]}`,
			link: `/edicoes/${slug}`,
		});
		months.set(month!, items);
	}
	return [...months].map(([text, items], i) => ({
		text,
		collapsed: i > 0,
		items,
	}));
}

export default defineConfig({
	lang: "pt-BR",
	title: "O Fio",
	description:
		"Arquivo do jornal O Fio: cada edição do fast-news vira um artigo para reler depois.",
	base: process.env["VITEPRESS_BASE"] ?? "/fast-news/",
	cleanUrls: true,
	lastUpdated: true,
	srcExclude: ["**/README.md"],
	themeConfig: {
		nav: [
			{ text: "Última edição", link: "/ultima" },
			{ text: "Arquivo", link: "/arquivo" },
		],
		sidebar: { "/edicoes/": sidebar() },
		outline: { label: "Nesta edição", level: [2, 3] },
		docFooter: { prev: "Edição anterior", next: "Próxima edição" },
		lastUpdated: { text: "Publicado em" },
		search: {
			provider: "local",
			options: {
				translations: {
					button: { buttonText: "Buscar", buttonAriaLabel: "Buscar" },
					modal: {
						noResultsText: "Nada encontrado para",
						footer: {
							selectText: "abrir",
							navigateText: "navegar",
							closeText: "fechar",
						},
					},
				},
			},
		},
		socialLinks: [
			{ icon: "github", link: "https://github.com/juninmd/fast-news" },
		],
	},
});
