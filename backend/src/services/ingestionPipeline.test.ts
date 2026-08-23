// @vitest-environment node
/**
 * End-to-end checks of the ingestion pipeline against feed and page payloads
 * shaped like the real providers: Folha's latin-1 RSS 0.91, G1's multi-size
 * media:content, a WordPress feed with content:encoded plus a tracking pixel,
 * and a portal article page wrapped in nav, byline, ad markers and a "leia
 * também" tail. Served from a local HTTP server so the parse → clean → extract
 * path runs for real, without depending on the live portals.
 */

import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import Parser from "rss-parser";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { extractImageUrl, fetchOgImage } from "./articleImage.js";
import { sanitizeFeedContent } from "./articleText.js";
import { decodeFeedBuffer } from "./feedDecode.js";
import { fetchFullArticle } from "./fullArticle.js";

const FOLHA_RSS = `<?xml version="1.0" encoding="ISO-8859-1"?>
<rss version="0.91"><channel><title>Folha de S.Paulo</title>
<item>
<title>Governo anuncia pacote de investimento em inteligência artificial</title>
<link>https://www1.folha.uol.com.br/tec/pacote-ia.shtml</link>
<description>&lt;p&gt;O anúncio ocorreu nesta sexta-feira em Brasília.&lt;/p&gt;&lt;p&gt;Leia mais em https://www1.folha.uol.com.br/tec/&lt;/p&gt;</description>
</item>
</channel></rss>`;

const G1_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>G1</title>
<item>
<title>Nova regra de dados entra em vigor</title>
<link>https://g1.globo.com/tecnologia/noticia/regra-dados.ghtml</link>
<description>A norma passa a valer em setembro.</description>
<media:content url="https://s2.glbimg.com/abc/thumb.jpg" width="150" height="100" medium="image"/>
<media:content url="https://s2.glbimg.com/abc/lead.jpg" width="1280" height="720" medium="image"/>
</item>
<item>
<title>Operadoras anunciam expansão de 5G</title>
<link>https://g1.globo.com/tecnologia/noticia/5g.ghtml</link>
<description>Cobertura chega a 300 cidades.</description>
<enclosure url="https://s2.glbimg.com/xyz/render?id=99" type="image/jpeg" length="12345"/>
</item>
</channel></rss>`;

const WORDPRESS_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>TecMundo</title>
<item>
<title>Processador novo promete ganho de desempenho</title>
<link>ARTICLE_URL</link>
<description>&lt;img src="https://tm.ibxk.com.br/logo.png" width="60" height="60"/&gt;Resumo curto da matéria.</description>
<content:encoded>&lt;p&gt;&lt;img src="https://feeds.feedburner.com/~ff/tecmundo?d=track" width="1" height="1"/&gt;&lt;/p&gt;&lt;p&gt;&lt;img src="/imagens/processador-lead.jpg" width="1200" height="675"/&gt;&lt;/p&gt;&lt;p&gt;O fabricante afirma que o ganho chega a 30% em compilação.&lt;/p&gt;&lt;p&gt;O post Processador novo promete ganho apareceu primeiro em TecMundo.&lt;/p&gt;</content:encoded>
</item>
</channel></rss>`;

const ARTICLE_HTML = `<html><head>
<meta property="og:image" content="https://cdn.portal.com.br/2026/08/lead-1200x675.jpg">
</head><body>
<nav>Home | Esportes | Economia | Política | Tecnologia</nav>
<div class="menu">Assine</div>
<article>
<h1>Processador novo promete ganho de desempenho</h1>
<p>Por Carlos Mendes</p>
<p>Foto: Divulgação/Fabricante</p>
<p>O fabricante afirma que o ganho chega a 30% em tarefas de compilação, segundo os testes internos apresentados nesta semana.</p>
<p>Continua após a publicidade</p>
<p>O lançamento está previsto para o próximo trimestre, com preços ainda não divulgados pela companhia.</p>
<p>Analistas ouvidos pela reportagem avaliam que o desempenho anunciado depende do tipo de carga de trabalho utilizada.</p>
<h2>Leia também</h2>
<ul><li>Time vence clássico e assume liderança do campeonato nacional de futebol.</li>
<li>Bolsa fecha em alta após anúncio do banco central sobre a taxa de juros.</li></ul>
<h2>Mais lidas</h2>
<p>Assine a newsletter e receba as principais notícias do dia no seu e-mail.</p>
<footer>Todos os direitos reservados © 2026</footer>
</article></body></html>`;

const parser = new Parser({
	customFields: {
		item: [
			["media:content", "mediaContent", { keepArray: true }],
			["media:thumbnail", "mediaThumbnail", { keepArray: true }],
			["media:group", "mediaGroup"],
			["content:encoded", "contentEncoded"],
			["itunes:image", "itunesImage"],
			"image",
			"thumbnail",
			"enclosure",
		],
	},
});

let server: Server;
let base = "";

beforeAll(async () => {
	server = createServer((req, res) => {
		const path = (req.url ?? "").split("?")[0];
		if (path === "/artigo.html") {
			res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
			res.end(ARTICLE_HTML);
			return;
		}
		if (path === "/folha.xml") {
			// The real feed: latin-1 bytes announced as utf-8 over HTTP.
			res.writeHead(200, { "content-type": "text/xml; charset=utf-8" });
			res.end(Buffer.from(FOLHA_RSS, "latin1"));
			return;
		}
		res.writeHead(404);
		res.end();
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
	await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function firstItem(xml: string): Promise<Record<string, unknown>[]> {
	const feed = await parser.parseString(xml);
	return (feed.items ?? []) as unknown as Record<string, unknown>[];
}

describe("feed parsing → image extraction", () => {
	it("picks the full-size media:content over the thumbnail", async () => {
		const [item] = await firstItem(G1_RSS);
		expect(extractImageUrl(item)).toBe("https://s2.glbimg.com/abc/lead.jpg");
	});

	it("recovers an extensionless enclosure declared as image/*", async () => {
		const items = await firstItem(G1_RSS);
		expect(extractImageUrl(items[1])).toBe(
			"https://s2.glbimg.com/xyz/render?id=99",
		);
	});

	it("takes the body image from content:encoded, not the pixel or the logo", async () => {
		const [item] = await firstItem(
			WORDPRESS_RSS.replace("ARTICLE_URL", "https://www.tecmundo.com.br/a.htm"),
		);
		expect(extractImageUrl(item)).toBe(
			"https://www.tecmundo.com.br/imagens/processador-lead.jpg",
		);
	});
});

describe("feed content cleaning", () => {
	it("decodes a latin-1 body served as utf-8 and strips the feed trailer", async () => {
		const response = await fetch(`${base}/folha.xml`);
		const xml = decodeFeedBuffer(
			await response.arrayBuffer(),
			response.headers.get("content-type") ?? "",
		);
		const [item] = await firstItem(xml);

		expect(item["title"]).toBe(
			"Governo anuncia pacote de investimento em inteligência artificial",
		);
		const clean = sanitizeFeedContent(
			(item["contentEncoded"] as string) ||
				(item["content"] as string) ||
				(item["summary"] as string) ||
				"",
		);
		expect(clean).toContain("Brasília");
		expect(clean).not.toContain("Leia mais");
		expect(clean).not.toContain("http");
	});

	it("removes the WordPress trailer from content:encoded", async () => {
		const [item] = await firstItem(
			WORDPRESS_RSS.replace("ARTICLE_URL", "https://www.tecmundo.com.br/a.htm"),
		);
		const clean = sanitizeFeedContent(item["contentEncoded"] as string);
		expect(clean).toContain("ganho chega a 30%");
		expect(clean).not.toContain("apareceu primeiro em");
		expect(clean).not.toContain("<p>");
	});
});

describe("full article fetching", () => {
	const title = "Processador novo promete ganho de desempenho";

	it("returns the body without chrome, byline, ads or the related block", async () => {
		const text = await fetchFullArticle(`${base}/artigo.html`, {
			title,
			fallback: "Resumo curto da matéria.",
		});

		expect(text).toContain("ganho chega a 30%");
		expect(text).toContain("próximo trimestre");
		expect(text).toContain("Analistas ouvidos pela reportagem");
		expect(text).not.toContain("Por Carlos Mendes");
		expect(text).not.toContain("Foto: Divulgação");
		expect(text).not.toContain("Esportes");
		expect(text).not.toContain("futebol");
		expect(text).not.toContain("Bolsa fecha em alta");
		expect(text).not.toContain("newsletter");
		expect(text).not.toContain("direitos reservados");
	});

	it("keeps the RSS summary when the page cannot be read", async () => {
		const fallback = "Resumo curto da matéria vindo do feed.";
		const text = await fetchFullArticle(`${base}/inexistente.html`, {
			title,
			fallback,
		});
		expect(text).toBe(fallback);
	});

	it("reads og:image from the article page", async () => {
		expect(await fetchOgImage(`${base}/artigo.html`)).toBe(
			"https://cdn.portal.com.br/2026/08/lead-1200x675.jpg",
		);
	});
});
