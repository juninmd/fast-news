/**
 * Reader-side article extraction. Mirrors the ingestion pipeline's rules
 * (backend/src/services/articleText.ts): keep the article body, drop nav bars,
 * bylines, photo credits, ad markers and "leia também" blocks.
 */

/** Headings that mark the tail of the page — everything after them is other articles. */
const TAIL_SECTIONS = [
	"leia tambem",
	"leia mais",
	"veja tambem",
	"veja mais",
	"saiba mais",
	"mais lidas",
	"mais lidos",
	"mais noticias",
	"ultimas noticias",
	"em alta",
	"assuntos relacionados",
	"relacionadas",
	"relacionados",
	"related stories",
	"related articles",
	"read more",
	"recommended",
	"topicos",
	"tags",
	"sobre o autor",
	"comments",
	"comentarios",
	"deixe seu comentario",
	"nos siga no google news",
];

/** Ad slots and share bars sit between paragraphs — skip them, never stop on them. */
const INLINE_MARKERS = [
	"publicidade",
	"advertisement",
	"continua depois da publicidade",
	"continua apos a publicidade",
	"newsletter",
	"compartilhe",
	"share this",
	"siga-nos",
	"siga o",
	"follow us",
];

const NOISE_PATTERNS = [
	/^(menu|buscar|search|login|assine|assinar|subscribe|entrar|sair|cadastre-se|inscreva-se|newsletter)$/i,
	/^(facebook|twitter|x|whatsapp|telegram|linkedin|instagram|threads|bluesky|youtube|tiktok)$/i,
	/^(home|inicio|in[ií]cio|not[ií]cias|esportes|economia|pol[ií]tica|mundo|tecnologia|colunas|opini[aã]o)$/i,
	/cookie|privacy policy|pol[ií]tica de privacidade|termos de uso|terms of service/i,
	/all rights reserved|todos os direitos reservados|©\s*\d{4}/i,
	/clique aqui|click here|voltar ao topo|back to top|carregar mais|load more/i,
	/^(foto|imagem|photo|image|cr[eé]dito|reprodu[cç][aã]o|divulga[cç][aã]o|arte)\s*[:/]/i,
	/\b(getty images|shutterstock|ag[eê]ncia brasil\/|reuters\/|afp\/)\b/i,
	/^(por|by|texto de|escrito por)\s+[\p{Lu}][\p{L}.'-]+(\s+[\p{L}.'-]+){0,3}$/u,
	/^(atualizado|publicado|updated|published)\s+(em|on|h[aá])\b/i,
	/^\d{1,2}\/\d{1,2}\/\d{2,4}(\s+[\dh:]+)?$/,
	/^(compartilhar|share|salvar|save|imprimir|print|copiar link|copy link|ouvir|listen)\b/i,
	/assine (a|o|já|ja|agora)|seja assinante|torne-se assinante|conte[uú]do exclusivo para assinantes/i,
	/(baixe|instale) (o )?(nosso )?(app|aplicativo)|download our app/i,
	/receba (as )?(principais )?not[ií]cias|cadastre seu e-?mail|inscreva-se (no|na|em)/i,
	/^\W+$/,
];

const STOPWORDS = new Set([
	"para",
	"com",
	"como",
	"pelo",
	"pela",
	"sobre",
	"apos",
	"mais",
	"menos",
	"entre",
	"dos",
	"das",
	"que",
	"uma",
	"seu",
	"sua",
	"the",
	"and",
	"for",
	"with",
	"from",
	"this",
	"that",
	"into",
]);

const stripReaderChrome = (text) =>
	text
		.replace(/^Title:.*$/gim, "")
		.replace(/^URL Source:.*$/gim, "")
		.replace(/^Published Time:.*$/gim, "")
		.replace(/^Markdown Content:\s*/gim, "")
		.replace(/\r/g, "")
		.trim();

const plain = (value = "") =>
	value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/!\[[^\]]*]\([^)]*\)/g, " ")
		.replace(/\[[^\]]+]\([^)]*\)/g, "$1")
		.replace(/[#*_`>[\]()|:.,;!?'"\-–—]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();

const titleWords = (title) =>
	plain(title)
		.split(" ")
		.filter((word) => word.length > 3 && !STOPWORDS.has(word));

const resemblesTitle = (line, articleTitle) => {
	const words = titleWords(articleTitle);
	if (words.length < 3) return false;
	const normalized = plain(line);
	if (!normalized || normalized.length > 240) return false;
	const hits = words.filter((word) => normalized.includes(word)).length;
	return hits >= Math.min(5, Math.ceil(words.length * 0.55));
};

const cleanLine = (line) =>
	line
		.replace(/!\[[^\]]*]\([^)]*\)/g, "")
		.replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
		.replace(/^\s{0,3}#{1,6}\s*/, "")
		.replace(/^\s{0,3}>\s?/, "")
		.replace(/^\s*[-*+]\s+/, "")
		.replace(/^\s*\d{1,2}[.)]\s+/, "")
		.replace(/\s+/g, " ")
		.trim();

const isNoise = (line) => {
	const normalized = plain(line);
	if (!normalized) return true;
	if (/^https?:\/\//i.test(line.trim())) return true;
	// Nav rows rendered as pipe/bullet separated link lists.
	if ((line.match(/[|•·]/g) ?? []).length >= 3) return true;
	if (line.length < 28 && !/[.!?]$/.test(line)) return true;
	if (line.length < 60 && line === line.toUpperCase() && /[A-Z]/.test(line))
		return true;
	return NOISE_PATTERNS.some((pattern) => pattern.test(line));
};

const matchesSection = (line, sections) => {
	const normalized = plain(line);
	if (!normalized || normalized.length > 60) return false;
	return sections.some(
		(section) => normalized === section || normalized.startsWith(`${section} `),
	);
};

const isTailSection = (line) => matchesSection(line, TAIL_SECTIONS);
const isInlineMarker = (line) => matchesSection(line, INLINE_MARKERS);

const looksLikeProse = (line) =>
	/[.!?]["'”’)]?$/.test(line) && line.split(" ").length >= 6;

export function extractArticleText(markdown, article) {
	const lines = stripReaderChrome(markdown).split("\n").map(cleanLine);
	// Start right after the page's own H1 so nav/menu above it is never picked.
	const titleIndex = lines.findIndex((line) =>
		resemblesTitle(line, article?.title),
	);
	const start = titleIndex >= 0 ? titleIndex + 1 : 0;
	const picked = [];
	const seen = new Set();
	let length = 0;

	for (const line of lines.slice(start)) {
		if (isTailSection(line)) {
			// Before any body accumulates this is still the header area.
			if (length >= 200) break;
			continue;
		}
		if (isInlineMarker(line) || isNoise(line)) continue;
		if (
			article?.title &&
			resemblesTitle(line, article.title) &&
			!looksLikeProse(line)
		)
			continue;
		const key = plain(line);
		if (seen.has(key)) continue;
		seen.add(key);
		picked.push(line);
		length += line.length + 2;
		if (length > 12000) break;
	}

	return picked
		.join("\n\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

const hasEnoughTitleContext = (text, article) => {
	const words = titleWords(article?.title);
	if (!words.length) return true;
	const normalized = plain(text);
	const hits = words.filter((word) => normalized.includes(word)).length;
	return hits / words.length >= 0.25;
};

/** Rejects index pages and paywall stubs that survived line filtering. */
const looksLikeArticle = (text) => {
	const paragraphs = text.split(/\n{2,}/).filter(Boolean);
	const prose = paragraphs.filter(looksLikeProse);
	if (prose.length < 2) return false;
	return prose.join(" ").length / text.length >= 0.5;
};

export async function fetchFullArticle(article) {
	const fallback = article?.body || article?.excerpt || "";
	if (!article?.url) return fallback;

	const response = await fetch(`https://r.jina.ai/${article.url}`, {
		headers: { Accept: "text/plain" },
	});
	if (!response.ok) throw new Error(`Reader HTTP ${response.status}`);

	const text = extractArticleText(await response.text(), article);
	const usefulLength = text.length > Math.max(600, fallback.length + 250);
	return usefulLength &&
		looksLikeArticle(text) &&
		hasEnoughTitleContext(text, article)
		? text
		: fallback;
}
