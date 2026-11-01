import { describe, expect, it } from "vitest";
import { draft, edition, headline, knownOf } from "./fixtures.js";
import {
	renderTelegramMedia,
	renderTelegramSummary,
} from "./renderTelegram.js";
import { CAPTION_LIMIT, visibleLength } from "./telegramMedia.js";

const pic = (n: number) => `https://img.example.com/${n}.jpg`;

function setup() {
	const lead = headline({ title: "Lead", source: "Folha", imageUrl: pic(1) });
	const leadAlt = headline({ title: "Lead B", source: "G1", imageUrl: null });
	const a = headline({ title: "Alfa", source: "UOL", imageUrl: pic(2) });
	const b = headline({ title: "Beta", source: "CNN", imageUrl: pic(3) });
	const noPic = headline({ title: "Sem foto", source: "Band" });
	const known = knownOf([lead, leadAlt, a, b, noPic]);
	const d = draft({
		manchete: {
			titulo: "Manchete do dia",
			texto: "",
			linhaFina: "Linha fina",
			paragrafos: [],
			fontes: [lead.id, leadAlt.id],
		},
		destaques: [
			{ titulo: "Destaque alfa", texto: "", fontes: [a.id] },
			{ titulo: "Destaque beta", texto: "", fontes: [b.id] },
			{ titulo: "Destaque sem foto", texto: "", fontes: [noPic.id] },
		],
	});
	return { e: edition(d, known), ids: { lead, leadAlt, a, b, noPic } };
}

describe("renderTelegramMedia", () => {
	it("uses the lead's photo as cover and groups every outlet that ran it", () => {
		const { e } = setup();
		const { cover } = renderTelegramMedia(e);
		expect(cover?.url).toBe(pic(1));
		expect(cover?.caption).toContain("O Fio · Edição da Noite");
		expect(cover?.caption).toContain("Manchete do dia");
		expect(cover?.caption).toContain("Folha</a> · <a");
		expect(cover?.caption).toContain("G1");
	});

	it("builds an album of the next stories that have a photo, one caption", () => {
		const { e } = setup();
		const { album } = renderTelegramMedia(e);
		expect(album?.urls).toEqual([pic(2), pic(3)]);
		expect(album?.caption).toContain("Destaque alfa");
		expect(album?.caption).toContain("Destaque beta");
		expect(album?.caption).not.toContain("Destaque sem foto");
	});

	it("never reuses the cover photo in the album", () => {
		const { e, ids } = setup();
		ids.a.imageUrl = pic(1);
		expect(renderTelegramMedia(e).album?.urls).toEqual([pic(3)]);
	});

	it("drops non-http image URLs instead of sending them", () => {
		const { e, ids } = setup();
		ids.lead.imageUrl = "javascript:alert(1)";
		ids.a.imageUrl = "file:///etc/passwd";
		const media = renderTelegramMedia(e);
		expect(media.cover).toBeUndefined();
		expect(media.album?.urls).toEqual([pic(3)]);
	});

	it("has no media when no story carries a photo", () => {
		const h = headline({ imageUrl: null });
		const e = edition(
			draft({
				manchete: {
					titulo: "M",
					texto: "",
					linhaFina: "",
					paragrafos: [],
					fontes: [h.id],
				},
			}),
			knownOf([h]),
		);
		expect(renderTelegramMedia(e)).toEqual({});
	});

	it("shrinks the deck so the caption always fits Telegram's cap", () => {
		const { e } = setup();
		e.draft.manchete.linhaFina = "L".repeat(900);
		e.draft.manchete.titulo = "T".repeat(240);
		const caption = renderTelegramMedia(e).cover?.caption ?? "";
		expect(caption.length).toBeGreaterThan(0);
		expect(caption.length).toBeLessThanOrEqual(CAPTION_LIMIT);
	});
});

describe("renderTelegramSummary with photos", () => {
	it("repeats nothing a photo already said", () => {
		const { e } = setup();
		const text = renderTelegramSummary(e, undefined, {
			cover: true,
			album: renderTelegramMedia(e).album?.stories ?? [],
		});
		expect(text).not.toContain("Manchete do dia");
		expect(text).not.toContain("O Fio · Edição");
		expect(text).not.toContain("Destaque alfa");
		expect(text).not.toContain("Destaque beta");
		expect(text).toContain("Destaque sem foto");
	});

	it("falls back to the full text when no photo was delivered", () => {
		const { e } = setup();
		const text = renderTelegramSummary(e);
		expect(text).toContain("O Fio · Edição da Noite");
		expect(text).toContain("Manchete do dia");
		expect(text).toContain("Destaque alfa");
		expect(text).toContain("Destaque beta");
	});

	it("keeps the album stories in the text when only the cover was delivered", () => {
		const { e } = setup();
		const text = renderTelegramSummary(e, undefined, {
			cover: true,
			album: [],
		});
		expect(text).not.toContain("Manchete do dia");
		expect(text).toContain("Destaque alfa");
	});

	it("lists a story once with all its outlets, not one line per site", () => {
		const x = headline({ title: "Mesmo fato", source: "Folha" });
		const y = headline({ title: "Mesmo fato", source: "G1" });
		const e = edition(
			draft({
				destaques: [{ titulo: "Mesmo fato", texto: "", fontes: [x.id, y.id] }],
			}),
			knownOf([x, y]),
		);
		const text = renderTelegramSummary(e);
		expect(text.match(/Mesmo fato/g)).toHaveLength(1);
		expect(text).toContain("Folha</a> · <a");
		expect(text).toContain("G1</a>");
	});

	it("does not repeat market quotes as extra figures", () => {
		const { e } = setup();
		e.market = {
			usdBrl: { value: 5.14, changePct: 0.1 },
			ibovespa: null,
			selicRate: null,
		};
		e.draft.numeros = [
			{ rotulo: "Dólar", valor: "R$ 5,14", nota: "" },
			{ rotulo: "Desemprego", valor: "5,6%", nota: "" },
		];
		const text = renderTelegramSummary(e);
		expect(text.match(/Dólar/g)).toHaveLength(1);
		expect(text).toContain("Desemprego: <b>5,6%</b>");
	});

	it("drops thread events whose headline a story above already told", () => {
		const { e, ids } = setup();
		const other = headline({ title: "Outro", source: "Estadão" });
		const another = headline({ title: "Mais um", source: "Valor" });
		e.headlines.set(other.id, other);
		e.headlines.set(another.id, another);
		e.draft.fio = [
			{
				tema: "Tema",
				eventos: [
					{ fonte: ids.noPic.id, texto: "Já contado" },
					{ fonte: other.id, texto: "Novo A" },
					{ fonte: another.id, texto: "Novo B" },
				],
			},
		];
		const text = renderTelegramSummary(e);
		expect(text).toContain("Novo A");
		expect(text).not.toContain("Já contado");
	});

	it("omits a thread left with a single beat", () => {
		const { e, ids } = setup();
		const other = headline({ title: "Outro", source: "Estadão" });
		e.headlines.set(other.id, other);
		e.draft.fio = [
			{
				tema: "Tema",
				eventos: [
					{ fonte: ids.noPic.id, texto: "Já contado" },
					{ fonte: other.id, texto: "Sozinho" },
				],
			},
		];
		expect(renderTelegramSummary(e)).not.toContain("O fio: Tema");
	});

	it("keeps a story trimmed from the album in the text", () => {
		const hs = Array.from({ length: 4 }, (_, i) =>
			headline({
				title: `H${i}`,
				source: `Fonte ${i}`,
				url: `https://example.com/${"p".repeat(60)}/${i}`,
				imageUrl: pic(10 + i),
			}),
		);
		const e = edition(
			draft({
				destaques: hs.map((h, i) => ({
					titulo: `Titulo longo ${i} ${"x".repeat(100)}`,
					texto: "",
					fontes: [h.id],
				})),
			}),
			knownOf(hs),
		);
		const media = renderTelegramMedia(e);
		const told = new Set(media.album?.stories.map((s) => s.titulo));
		const text = renderTelegramSummary(e, undefined, {
			cover: false,
			album: media.album?.stories ?? [],
		});
		for (const s of e.draft.destaques)
			expect(told.has(s.titulo) || text.includes(s.titulo)).toBe(true);
	});

	it("measures the caption by visible text, not by link markup", () => {
		const { e, ids } = setup();
		ids.lead.url = `https://example.com/${"p".repeat(400)}`;
		ids.leadAlt.url = `https://example.com/${"q".repeat(400)}`;
		const cover = renderTelegramMedia(e).cover;
		expect(cover).toBeDefined();
		expect(visibleLength(cover?.caption ?? "")).toBeLessThanOrEqual(
			CAPTION_LIMIT,
		);
		expect(visibleLength("<b>a &amp; b</b>")).toBe(5);
	});
});
