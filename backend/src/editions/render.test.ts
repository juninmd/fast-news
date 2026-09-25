import { describe, expect, it } from "vitest";
import { directUrl } from "./escape.js";
import { draft, edition, headline, knownOf } from "./fixtures.js";
import { renderEditionHtml } from "./renderHtml.js";
import { renderTelegramSummary, TELEGRAM_LIMIT } from "./renderTelegram.js";

const evil = headline({
	title: "<img src=x onerror=alert(1)>",
	url: "javascript:alert(1)",
	source: "<b>fonte</b>",
});
const folha = headline({
	url: "https://redir.folha.com.br/redir/online/poder/rss091/*https://www1.folha.uol.com.br/poder/x.shtml",
});
const known = knownOf([evil, folha]);

describe("renderEditionHtml", () => {
	it("escapes model and feed text so nothing can inject markup or script", () => {
		const html = renderEditionHtml(
			edition(
				draft({
					manchete: {
						titulo: "<script>alert(1)</script>",
						texto: "",
						fontes: [evil.id],
						linhaFina: "",
						paragrafos: ['"><svg onload=alert(1)>'],
					},
				}),
				known,
			),
		);
		expect(html).not.toContain("<script>alert");
		expect(html).not.toContain("<svg onload");
		expect(html).not.toContain("javascript:");
		expect(html).toContain("&lt;script&gt;");
		expect(html).toContain("&lt;b&gt;fonte&lt;/b&gt;");
	});

	it("links straight to the article, bypassing the Folha RSS redirector", () => {
		expect(directUrl(folha.url)).toBe(
			"https://www1.folha.uol.com.br/poder/x.shtml",
		);
	});

	it("renders a story's image when its source headline has one", () => {
		const withImage = headline({
			imageUrl: "https://example.com/photo.jpg",
		});
		const html = renderEditionHtml(
			edition(
				draft({
					destaques: [{ titulo: "T", texto: "", fontes: [withImage.id] }],
				}),
				knownOf([withImage]),
			),
		);
		expect(html).toContain('src="https://example.com/photo.jpg"');
		expect(html).toContain('class="thumb"');
	});

	it("drops a javascript: image URL instead of rendering it", () => {
		const evilImage = headline({ imageUrl: "javascript:alert(1)" });
		const html = renderEditionHtml(
			edition(
				draft({
					destaques: [{ titulo: "T", texto: "", fontes: [evilImage.id] }],
				}),
				knownOf([evilImage]),
			),
		);
		expect(html).not.toContain("javascript:");
		expect(html).not.toContain('class="thumb"');
	});

	it("renders the real market ticker when a snapshot is present", () => {
		const html = renderEditionHtml(
			edition(draft(), known, {
				market: {
					usdBrl: { value: 5.14, changePct: 0.35 },
					ibovespa: { value: 135000, changePct: -0.4 },
					selicRate: 10.75,
				},
			}),
		);
		expect(html).toContain("Dólar");
		expect(html).toContain("R$ 5,14");
		expect(html).toContain("Ibovespa");
		expect(html).toContain("Selic");
		expect(html).toContain("10,75%");
	});

	it("omits the market ticker entirely when no quote is available", () => {
		const html = renderEditionHtml(edition(draft(), known));
		expect(html).not.toContain(">Dólar<");
		expect(html).not.toContain(">Ibovespa<");
	});
});

describe("renderTelegramSummary", () => {
	it("always fits Telegram's message limit, even for a very busy day", () => {
		const many = Array.from({ length: 40 }, () =>
			headline({ title: "x".repeat(150) }),
		);
		const k = knownOf(many);
		const long = (id: number) => ({
			titulo: "T".repeat(160),
			texto: "",
			fontes: [id],
		});
		const text = renderTelegramSummary(
			edition(
				draft({
					manchete: {
						...long(many[0]?.id ?? 0),
						linhaFina: "L".repeat(320),
						paragrafos: [],
					},
					destaques: many.slice(1, 4).map((h) => long(h.id)),
					secoes: [
						{
							nome: "Brasil",
							materias: many.slice(4, 10).map((h) => long(h.id)),
							notas: [],
						},
					],
					fio: [0, 1, 2].map((t) => ({
						tema: `Tema ${t}`,
						eventos: many.slice(10 + t * 6, 16 + t * 6).map((h) => ({
							fonte: h.id,
							texto: "E".repeat(200),
						})),
					})),
				}),
				k,
			),
		);
		expect(text.length).toBeLessThanOrEqual(TELEGRAM_LIMIT);
		expect(text).toContain("O Fio · Edição da Noite");
	});

	it("includes the real market line when a snapshot is present", () => {
		const text = renderTelegramSummary(
			edition(draft(), known, {
				market: {
					usdBrl: { value: 5.14, changePct: 0.35 },
					ibovespa: null,
					selicRate: 10.75,
				},
			}),
		);
		expect(text).toContain("Dólar: <b>R$ 5,14</b>");
		expect(text).toContain("Selic: <b>10,75%</b>");
	});

	it("never turns a non-http source into a clickable link", () => {
		const text = renderTelegramSummary(
			edition(
				draft({
					manchete: {
						titulo: "M",
						texto: "t",
						fontes: [evil.id],
						linhaFina: "",
						paragrafos: [],
					},
				}),
				known,
			),
		);
		expect(text).not.toContain("javascript:");
	});
});
