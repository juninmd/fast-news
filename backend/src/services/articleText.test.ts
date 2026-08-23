import { describe, expect, it } from "vitest";
import {
	extractArticleText,
	isUsableArticleText,
	sanitizeFeedContent,
	stripHtml,
	titleCoverage,
} from "./articleText.js";

const TITLE = "OpenAI lança novo modelo de raciocínio para desenvolvedores";

const READER_PAGE = `
Title: Example
URL Source: https://example.com/news/model
Markdown Content:
Menu
Buscar
Assine
# OpenAI lança novo modelo de raciocínio para desenvolvedores
Por Maria Silva
Foto: Divulgação/OpenAI
A empresa afirmou que o modelo melhora a confiabilidade em tarefas complexas de programação e reduz alucinações.
Desenvolvedores podem usar a novidade pela API a partir desta semana, segundo o comunicado oficial.
Continua após a publicidade
O preço por token permanece igual ao da geração anterior, disse a companhia em nota.
Leia também
Outra manchete completamente diferente sobre futebol
Mais lidas
Assine a newsletter e receba as principais notícias
Todos os direitos reservados
`;

describe("extractArticleText", () => {
	it("keeps the body and drops chrome, byline, credits and related blocks", () => {
		const text = extractArticleText(READER_PAGE, { title: TITLE });

		expect(text).toContain("melhora a confiabilidade");
		expect(text).toContain("pela API a partir desta semana");
		expect(text).toContain("preço por token");
		expect(text).not.toContain("Menu");
		expect(text).not.toContain("Por Maria Silva");
		expect(text).not.toContain("Foto: Divulgação");
		expect(text).not.toContain("futebol");
		expect(text).not.toContain("newsletter");
		expect(text).not.toContain("direitos reservados");
	});

	it("ignores everything above the headline", () => {
		const text = extractArticleText(
			`Manchete de outra matéria que ocupa a home do portal do dia.\n\n# ${TITLE}\n\nO corpo real da matéria começa aqui e segue por várias frases completas.`,
			{ title: TITLE },
		);
		expect(text).not.toContain("home do portal");
		expect(text).toContain("corpo real da matéria");
	});

	it("drops nav rows and link indexes", () => {
		const text = extractArticleText(
			"Home | Esportes | Economia | Política\n\nO texto verdadeiro da reportagem aparece somente depois da navegação.",
		);
		expect(text).not.toContain("Esportes");
		expect(text).toContain("texto verdadeiro");
	});
});

describe("isUsableArticleText", () => {
	it("accepts real prose about the headline", () => {
		const text = extractArticleText(READER_PAGE, { title: TITLE });
		expect(isUsableArticleText(text, { title: TITLE })).toBe(true);
	});

	it("rejects a paywall stub", () => {
		expect(
			isUsableArticleText("Conteúdo exclusivo para assinantes.", {
				title: TITLE,
			}),
		).toBe(false);
	});

	it("rejects a long body about a different story", () => {
		const unrelated = Array.from(
			{ length: 8 },
			(_, i) =>
				`O time venceu a partida no estádio e comemorou com a torcida presente na arquibancada número ${i}.`,
		).join("\n\n");
		expect(isUsableArticleText(unrelated, { title: TITLE })).toBe(false);
	});
});

describe("sanitizeFeedContent", () => {
	it("strips markup and decodes entities", () => {
		expect(
			sanitizeFeedContent(
				"<p>Alta de pre&ccedil;os atinge o com&eacute;rcio<br/>em todo o pa&iacute;s.</p>",
			),
		).toBe("Alta de preços atinge o comércio\n\nem todo o país.");
	});

	it("removes the feed trailer appended after the summary", () => {
		const clean = sanitizeFeedContent(
			"O Banco Central manteve a taxa básica de juros nesta quarta-feira, segundo o comunicado. O post Copom mantém Selic apareceu primeiro em Portal de Notícias.",
		);
		expect(clean).toContain("manteve a taxa básica");
		expect(clean).not.toContain("apareceu primeiro em");
	});

	it("keeps a short one-line summary instead of returning nothing", () => {
		expect(sanitizeFeedContent("Dólar cai.")).toBe("Dólar cai.");
	});
});

describe("titleCoverage / stripHtml", () => {
	it("scores overlap between text and headline", () => {
		expect(
			titleCoverage("modelo de raciocínio da OpenAI", TITLE),
		).toBeGreaterThan(0.4);
		expect(titleCoverage("resultado do campeonato de futebol", TITLE)).toBe(0);
	});

	it("drops scripts and styles entirely", () => {
		expect(
			stripHtml("<style>.a{color:red}</style><p>Texto</p><script>x()</script>"),
		).toBe("Texto");
	});
});
