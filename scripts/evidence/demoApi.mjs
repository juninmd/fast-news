/**
 * Deterministic stand-in for the backend, used to render the app with
 * realistic content when no database is available (screenshots, runtime
 * measurements). Every route the front calls on mount is answered here, with
 * the same response shapes as `backend/src/api/routes/*`.
 */

const NOW = Date.parse("2026-11-10T12:00:00Z");
const HOUR = 3_600_000;
export const IMAGE_ORIGIN = "https://img.fastnews.test";

const uuid = (n) =>
	`${String(n).padStart(8, "0")}-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ago = (hours) => new Date(NOW - hours * HOUR).toISOString();

const SEEDS = [
	[
		"Banco Central mantém Selic e sinaliza corte apenas no segundo trimestre",
		"Negócios",
		"Valor Econômico",
		"O comitê citou a inflação de serviços ainda pressionada e o câmbio volátil para justificar a cautela; o mercado esperava um aceno mais claro de flexibilização.",
	],
	[
		"Laboratório brasileiro abre modelo de linguagem treinado só com textos em português",
		"IA",
		"Folha de S.Paulo",
		"O modelo de 12 bilhões de parâmetros foi treinado em acervos públicos e será distribuído com licença aberta para universidades e órgãos do governo.",
	],
	[
		"Chuvas no Sul deixam 14 cidades em situação de emergência",
		"Brasil",
		"G1",
		"A Defesa Civil informou que 3.200 pessoas estão fora de casa; a previsão é de mais dois dias de temporais na região.",
	],
	[
		"Nova geração de chips promete dobrar a autonomia de notebooks",
		"Tecnologia",
		"Tecnoblog",
		"Fabricante apresenta processo de 2 nanômetros e diz que os primeiros aparelhos chegam ao varejo no segundo semestre.",
	],
	[
		"Senado aprova marco regulatório para inteligência artificial",
		"IA",
		"Estadão",
		"O texto cria categorias de risco, obriga relatórios de impacto e prevê multas de até 2% do faturamento; segue agora para a Câmara.",
	],
	[
		"Estúdio independente brasileiro vence prêmio internacional de jogos",
		"Gaming",
		"The Enemy",
		"Aventura narrativa ambientada no sertão levou as categorias de roteiro e direção de arte na premiação europeia.",
	],
	[
		"Telescópio registra a imagem mais detalhada já feita de um exoplaneta",
		"Ciência",
		"Revista Pesquisa Fapesp",
		"Astrônomos identificaram vapor d'água e sinais de nuvens de silicato na atmosfera do gigante gasoso a 97 anos-luz.",
	],
	[
		"Bitcoin oscila após decisão de agência reguladora sobre fundos de índice",
		"Cripto",
		"InfoMoney",
		"A criptomoeda chegou a subir 6% no dia antes de devolver parte dos ganhos; analistas veem fluxo institucional crescente.",
	],
	[
		"Cúpula do clima termina com acordo sobre financiamento de transição",
		"Mundo",
		"BBC News Brasil",
		"Países ricos se comprometem com 300 bilhões de dólares por ano; nações insulares consideram o valor insuficiente.",
	],
	[
		"Editor de código ganha agente que revisa pull requests sozinho",
		"Dev Tools",
		"The Verge",
		"A ferramenta roda testes, comenta diffs e sugere correções; a empresa diz que o recurso continua opcional.",
	],
	[
		"Gigante de buscas reorganiza divisão de nuvem e corta gerências",
		"Big Techs",
		"Reuters",
		"Mudança afeta cerca de 1.200 cargos e concentra as equipes de infraestrutura e de modelos sob o mesmo comando.",
	],
	[
		"Startup de fusão nuclear anuncia ganho líquido de energia pela terceira vez",
		"Ciência",
		"MIT Technology Review",
		"O experimento sustentou a reação por 8 segundos; pesquisadores independentes ainda vão auditar os dados.",
	],
	[
		"Governo lança programa de crédito para pequenas empresas exportadoras",
		"Negócios",
		"Agência Brasil",
		"A linha tem juros subsidiados e garantia do fundo de aval; a meta é alcançar 40 mil empresas em dois anos.",
	],
	[
		"Vazamento expõe dados de 9 milhões de clientes de operadora",
		"Tecnologia",
		"TecMundo",
		"Nomes, CPFs e telefones circulam em fóruns; a empresa afirma que senhas e dados bancários não foram afetados.",
	],
	[
		"Pesquisa mostra que 62% dos brasileiros já usam assistentes de IA no trabalho",
		"IA",
		"Exame",
		"O levantamento ouviu 4 mil profissionais; redação de textos e resumo de reuniões lideram os usos.",
	],
	[
		"Eleições na Europa redesenham o equilíbrio do Parlamento",
		"Mundo",
		"El País",
		"Coalizão de centro perde a maioria e depende de acordos pontuais para aprovar o orçamento do bloco.",
	],
	[
		"Montadora confirma fábrica de baterias no Nordeste",
		"Negócios",
		"Valor Econômico",
		"O investimento é de R$ 5,5 bilhões e a operação deve começar em 2028 com 2.500 empregos diretos.",
	],
	[
		"Framework web popular chega à versão 20 com compilador reescrito",
		"Dev Tools",
		"InfoQ",
		"A equipe relata builds até 4 vezes mais rápidos e remove APIs marcadas como obsoletas há três versões.",
	],
	[
		"Console portátil esgota na pré-venda em menos de uma hora",
		"Gaming",
		"IGN Brasil",
		"A fabricante promete reposição antes do lançamento e limita a compra a uma unidade por cliente.",
	],
	[
		"Supremo retoma julgamento sobre responsabilidade de plataformas",
		"Brasil",
		"JOTA",
		"Ministros discutem se redes devem remover conteúdo ilegal após notificação, sem necessidade de ordem judicial.",
	],
];

const OUTLETS = [
	"G1",
	"Folha de S.Paulo",
	"Estadão",
	"UOL",
	"CNN Brasil",
	"Valor Econômico",
	"O Globo",
	"Reuters",
];

function coverage(index, count) {
	return Array.from({ length: count }, (_, k) => {
		const source = OUTLETS[(index + k + 1) % OUTLETS.length];
		return {
			id: uuid(9000 + index * 10 + k),
			source,
			title: `${SEEDS[index % SEEDS.length][0]} — ${source}`,
			url: `https://example.com/${source.toLowerCase().replace(/[^a-z]+/g, "-")}/${index}`,
			publishedAt: ago(index * 0.4 + k + 1),
		};
	});
}

/** 60 feed articles: three pages of 20, newest first. */
export const ARTICLES = Array.from({ length: 60 }, (_, i) => {
	const [title, category, source, summary] = SEEDS[i % SEEDS.length];
	const round = Math.floor(i / SEEDS.length);
	const extra = i % 4 === 0 ? coverage(i, 1 + (i % 3)) : [];
	return {
		id: uuid(i + 1),
		title: round === 0 ? title : `${title} (atualização ${round})`,
		summary,
		excerpt: summary,
		url: `https://example.com/noticia/${i + 1}`,
		source,
		category,
		theme_category: category,
		company: null,
		published_at: ago(0.3 + i * 0.45),
		image_url: i % 5 === 3 ? null : `${IMAGE_ORIGIN}/cover/${i + 1}.svg`,
		video_url: i === 5 ? "https://www.youtube.com/watch?v=dQw4w9WgXcQ" : null,
		author: null,
		sentiment: ["positive", "neutral", "negative"][i % 3],
		importance_score: 40 + ((i * 37) % 60),
		story_id: extra.length ? uuid(7000 + i) : null,
		source_count: extra.length + 1,
		article_count: extra.length + 1,
		also_in: extra,
	};
});

export const TOP = ARTICLES.slice(0, 7).map((a, i) => {
	const sources = [
		{
			id: a.id,
			source: a.source,
			title: a.title,
			url: a.url,
			publishedAt: a.published_at,
		},
		...coverage(i, 5 - Math.min(i, 3)),
	];
	return {
		id: a.id,
		title: a.title,
		summary: a.summary,
		url: a.url,
		source: a.source,
		category: a.category,
		company: null,
		published_at: a.published_at,
		image_url: `${IMAGE_ORIGIN}/cover/${i + 1}.svg`,
		importance_score: 95 - i * 4,
		fake_news_score: 2,
		political_bias: "neutral",
		is_militant: false,
		sourceCount: sources.length,
		articleCount: sources.length + 2,
		sources,
	};
});

const TERMS = [
	["selic", 42, 11],
	["inteligência artificial", 38, 9],
	["chuvas no sul", 31, 8],
	["marco da ia", 27, 8],
	["bitcoin", 22, 6],
	["cúpula do clima", 19, 7],
	["chips 2nm", 15, 5],
	["fusão nuclear", 12, 4],
	["vazamento de dados", 11, 5],
	["supremo", 9, 4],
];

function hourly(seed, points, total) {
	const raw = Array.from({ length: points }, (_, h) => {
		const wave = Math.sin((h + seed * 3) / 3.2) + 1.2;
		const burst = h > points * 0.6 ? 1 + ((seed * 7 + h) % 5) / 2 : 1;
		return wave * burst;
	});
	const sum = raw.reduce((a, b) => a + b, 0);
	return raw.map((v) => Math.round((v / sum) * total));
}

export function trends(hours) {
	const scale = hours / 24;
	const terms = TERMS.map(([term, count, sources], i) => {
		const scaled = Math.max(2, Math.round(count * scale));
		const previous =
			i === 3 || i === 7 ? 0 : Math.round(scaled / (1.4 + i * 0.25));
		return {
			term,
			count: scaled,
			sources,
			previous,
			growth: previous ? scaled / previous : scaled,
			score: scaled * (1 + sources / 10),
			hourly: hourly(i + 1, Math.min(hours, 24), scaled),
			articleIds: ARTICLES.slice(i, i + 3).map((a) => a.id),
		};
	});
	const themes = [
		["Economia", 0.27, 1.6],
		["Tecnologia", 0.22, 1.1],
		["Política", 0.18, 0.9],
		["Ciência", 0.14, 1.8],
		["Mundo", 0.11, 1.0],
		["Esportes", 0.08, 0.7],
	].map(([theme, share, growth]) => ({
		theme,
		count: Math.round(share * 412 * scale),
		previous: Math.round((share * 412 * scale) / growth),
		growth,
		share,
	}));
	return {
		windowHours: hours,
		totalArticles: Math.round(412 * scale),
		terms,
		themes,
	};
}

export const TOPICS = [
	"Reforma tributária",
	"Modelos abertos",
	"Semicondutores",
	"Transição energética",
	"Eleições 2026",
	"Segurança digital",
	"Mercado de trabalho",
	"Exploração espacial",
].map((name, i) => ({ id: uuid(5000 + i), name }));

const IMPACTS = ["critical", "high", "medium", "low"];
const SIGNALS = ["bullish", "bearish", "neutral", null];
const ASSETS = [
	["USD/BRL", "IBOV"],
	["NVDA", "TSM"],
	["PETR4"],
	["BTC", "ETH"],
	[],
	["VALE3", "LIT"],
];

export const STORIES = ARTICLES.slice(0, 12).map((a, i) => ({
	id: uuid(7000 + i),
	title: a.title,
	summary: a.summary,
	category: a.category,
	status: "active",
	impactLevel: IMPACTS[i % IMPACTS.length],
	worldImpact:
		i % 2 === 0
			? "Pode alterar expectativas de juros e o custo de crédito para empresas e famílias nos próximos meses."
			: null,
	financialSignal: SIGNALS[i % SIGNALS.length],
	affectedAssets: ASSETS[i % ASSETS.length],
	firstSeenAt: ago(30 + i * 3),
	lastUpdatedAt: ago(1 + i),
	articleCount: 3 + ((i * 5) % 11),
}));

const GRAPH_NODES = ARTICLES.slice(0, 36).map((a, i) => ({
	id: a.id,
	title: a.title,
	source: a.source,
	category: a.category,
	publishedAt: a.published_at,
	url: a.url,
	sentiment: ((i * 13) % 20) / 10 - 1,
}));

const GRAPH_EDGES = GRAPH_NODES.flatMap((n, i) =>
	[1, 5, 9]
		.filter((step) => (i * step) % 3 !== 1 && i + step < GRAPH_NODES.length)
		.map((step) => ({
			source: n.id,
			target: GRAPH_NODES[i + step].id,
			similarity: 0.55 + ((i * step) % 40) / 100,
			relationType: "similar",
		})),
);

export const GRAPH = {
	nodes: GRAPH_NODES,
	edges: GRAPH_EDGES,
	stories: STORIES,
};

export function storyDetail(id) {
	const story = STORIES.find((s) => s.id === id) ?? STORIES[0];
	const articles = GRAPH_NODES.slice(0, 7);
	const types = [
		"new_development",
		"escalation",
		"impact_update",
		"contradiction",
		"resolution",
	];
	return {
		story,
		articles,
		edges: GRAPH_EDGES.filter(
			(e) =>
				articles.some((a) => a.id === e.source) &&
				articles.some((a) => a.id === e.target),
		),
		timeline: types.map((eventType, i) => ({
			id: uuid(8000 + i),
			eventType,
			headline: articles[i].title,
			whatChanged:
				i % 2 === 0
					? "Novos números oficiais confirmam a tendência apontada na cobertura anterior."
					: null,
			occurredAt: ago(28 - i * 6),
			articleId: articles[i].id,
		})),
	};
}

const BODY = [
	"A decisão foi tomada por unanimidade e veio acompanhada de um comunicado mais longo do que o habitual, em que o comitê detalha os riscos que enxerga no cenário doméstico e externo.",
	"Segundo o texto, a desaceleração da atividade segue em linha com o esperado, mas a inflação de serviços continua acima do compatível com a meta, o que recomenda cautela adicional.",
	"Economistas ouvidos pela reportagem avaliam que o tom do comunicado reduz a chance de um corte já na próxima reunião. Para parte deles, a janela mais provável se abre no segundo trimestre.",
	"No mercado, os juros futuros de curto prazo subiram após a divulgação, enquanto os vencimentos mais longos recuaram, movimento típico de quando os investidores passam a ver uma política monetária mais firme no presente e mais espaço para queda adiante.",
	"O setor produtivo criticou a decisão. Em nota, a confederação da indústria afirmou que o custo do crédito segue inibindo investimentos e pediu uma sinalização mais clara sobre o início do ciclo de queda.",
	"A próxima reunião está marcada para daqui a 45 dias. Até lá, serão divulgados dois resultados do índice oficial de preços e os dados de emprego do trimestre.",
].join("\n\n");

export function articleDetail(id) {
	const a = ARTICLES.find((x) => x.id === id) ?? ARTICLES[0];
	const n = ARTICLES.indexOf(a);
	return {
		id: a.id,
		title: a.title,
		summary: a.summary,
		content: `${a.summary}\n\n${BODY}`,
		url: a.url,
		source: a.source,
		category: a.category,
		company: null,
		published_at: a.published_at,
		image_url: a.image_url,
		video_url: null,
		media: [1, 2, 3].map((k) => ({
			type: "image",
			url: `${IMAGE_ORIGIN}/gallery/${n * 3 + k}.svg`,
			alt: `Imagem ${k} da reportagem`,
			credit: "Divulgação",
		})),
		author: "Marina Duarte",
		tags: ["Economia", "Juros", "Inflação"],
		comments_url: null,
		language: "pt",
		word_count: 640,
		sentiment: a.sentiment,
		importance_score: a.importance_score,
		fake_news_score: 1 + (n % 4),
		political_bias: ["neutral", "left", "right"][n % 3],
		is_militant: false,
		has_incoherence: n % 4 === 3,
		credibility_flags:
			n % 2 === 0
				? ["Cita fontes oficiais", "Dados verificáveis"]
				: ["Título mais forte que o conteúdo"],
	};
}

export const HEALTH = {
	status: "healthy",
	timestamp: new Date(NOW).toISOString(),
	uptime: 482_113,
	version: "1.0.0",
	dependencies: {
		database: { status: "up", latencyMs: 4 },
		redis: { status: "up", latencyMs: 1 },
		ollama: { status: "degraded", latencyMs: 312 },
	},
	pipeline: {
		ingestedLast24h: 412,
		pendingTelegram: 3,
		sentLast24h: 58,
		queues: { telegram: { waiting: 3, active: 1, delayed: 0, failed: 0 } },
	},
};

const SOURCE_STATUS = [
	"healthy",
	"healthy",
	"healthy",
	"degraded",
	"healthy",
	"quarantined",
];
const SOURCE_NAMES = [
	...new Set([...SEEDS.map((s) => s[2]), ...OUTLETS, "Ars Technica", "Nexo"]),
];

export const SOURCES = (() => {
	const data = SOURCE_NAMES.map((name, i) => {
		const status = SOURCE_STATUS[i % SOURCE_STATUS.length];
		return {
			id: uuid(6000 + i),
			name,
			status,
			consecutiveFailures: status === "healthy" ? 0 : 2 + (i % 4),
			lastError: status === "healthy" ? null : "HTTP 503 ao buscar o feed",
			quarantinedUntil: status === "quarantined" ? ago(-3) : null,
			articlesLast24h: status === "quarantined" ? 0 : 4 + ((i * 17) % 38),
		};
	});
	const summary = {};
	for (const s of data) summary[s.status] = (summary[s.status] ?? 0) + 1;
	return { data, summary, total: data.length };
})();

export const FEEDS = {
	data: SOURCE_NAMES.map((name, i) => ({
		id: uuid(6000 + i),
		name,
		url: `https://example.com/${name.toLowerCase().replace(/[^a-z]+/g, "-")}/rss.xml`,
		category: SEEDS[i % SEEDS.length][1],
		company: name,
		isActive: i % 6 !== 5,
		lastFetched: ago(0.2 + i * 0.1),
	})),
};

/** Abstract "photo": layered blurred shapes, different for every path. */
export function coverSvg(path) {
	let seed = 0;
	for (const ch of path) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
	const hue = seed % 360;
	const rnd = (k) => ((seed >> k) % 100) / 100;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 55% 34%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360} 60% 16%)"/></linearGradient>
<filter id="b"><feGaussianBlur stdDeviation="46"/></filter>
</defs>
<rect width="1280" height="720" fill="url(#g)"/>
<g filter="url(#b)">
<circle cx="${200 + rnd(1) * 800}" cy="${150 + rnd(3) * 300}" r="${180 + rnd(5) * 160}" fill="hsl(${(hue + 30) % 360} 80% 62%)" opacity=".75"/>
<circle cx="${300 + rnd(7) * 700}" cy="${350 + rnd(9) * 300}" r="${140 + rnd(11) * 200}" fill="hsl(${(hue + 300) % 360} 70% 52%)" opacity=".6"/>
<rect x="${rnd(13) * 700}" y="${420 + rnd(15) * 120}" width="760" height="260" fill="hsl(${(hue + 180) % 360} 45% 22%)" opacity=".7"/>
</g>
</svg>`;
}

const json = (body, status = 200) => ({
	status,
	contentType: "application/json",
	body: JSON.stringify(body),
});

/**
 * Registers the routes on a Playwright page or context.
 * @param {import("@playwright/test").Page | import("@playwright/test").BrowserContext} target
 */
export async function mockDemoApi(target) {
	await target.route(`${IMAGE_ORIGIN}/**`, (route) =>
		route.fulfill({
			status: 200,
			contentType: "image/svg+xml",
			body: coverSvg(new URL(route.request().url()).pathname),
		}),
	);
	await target.route("**/health", (route) => route.fulfill(json(HEALTH)));
	await target.route("**/api/**", (route) => {
		const url = new URL(route.request().url());
		const path = url.pathname.replace(/^\/api/, "");
		const q = url.searchParams;

		if (path === "/news") {
			const page = Number(q.get("page") ?? 1);
			const limit = Number(q.get("limit") ?? 20);
			const category = q.get("category");
			const all = category
				? ARTICLES.filter((a) => a.category === category)
				: ARTICLES;
			const slice = all.slice((page - 1) * limit, page * limit);
			return route.fulfill(
				json({
					data: slice,
					articles: slice,
					page,
					limit,
					hasMore: page * limit < all.length,
				}),
			);
		}
		if (path === "/news/top") return route.fulfill(json({ data: TOP }));
		if (path === "/news/trends")
			return route.fulfill(json(trends(Number(q.get("hours") ?? 24))));
		if (path === "/news/twitter-trends")
			return route.fulfill(json({ error: "unavailable" }, 503));
		if (path === "/news/feeds/list") return route.fulfill(json(FEEDS));
		if (path === "/topics") return route.fulfill(json({ data: TOPICS }));
		if (path === "/sources") return route.fulfill(json(SOURCES));
		if (path === "/stories/graph") return route.fulfill(json(GRAPH));
		if (path === "/stories")
			return route.fulfill(json({ data: STORIES, total: STORIES.length }));
		if (path.startsWith("/stories/"))
			return route.fulfill(json(storyDetail(path.split("/")[2])));
		if (path === "/rag/search") {
			const results = ARTICLES.slice(0, 8);
			return route.fulfill(
				json({
					results,
					graph: {
						nodes: GRAPH_NODES.slice(0, 8),
						edges: GRAPH_EDGES.slice(0, 9),
					},
				}),
			);
		}
		if (path === "/news/search")
			return route.fulfill(
				json({ data: ARTICLES.slice(0, 8), query: q.get("q"), mode: "text" }),
			);
		if (path === "/translate") return route.fulfill(json({ data: [] }));
		const related = path.match(/^\/news\/([^/]+)\/related$/);
		if (related)
			return route.fulfill(json({ data: ARTICLES.slice(8, 12), mode: "text" }));
		const credibility = path.match(/^\/news\/([^/]+)\/credibility$/);
		if (credibility) return route.fulfill(json({ ok: true }));
		const detail = path.match(/^\/news\/([^/]+)$/);
		if (detail) return route.fulfill(json(articleDetail(detail[1])));
		return route.fulfill(json({ error: "not mocked" }, 404));
	});
}
