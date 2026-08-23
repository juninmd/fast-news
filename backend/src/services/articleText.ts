/**
 * Text extraction/cleanup shared by feed ingestion and full-article fetching.
 *
 * The goal is a single place that decides what is *article body* and what is
 * page furniture (nav, share bars, newsletter pitches, "leia também" blocks,
 * captions, bylines, paywall pitches). Everything here is pure — no config, no
 * network — so it stays cheap to unit test.
 */

const HTML_ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
	hellip: "…",
	mdash: "—",
	ndash: "–",
	laquo: "«",
	raquo: "»",
	ldquo: "“",
	rdquo: "”",
	lsquo: "‘",
	rsquo: "’",
	aacute: "á",
	agrave: "à",
	atilde: "ã",
	acirc: "â",
	eacute: "é",
	ecirc: "ê",
	iacute: "í",
	oacute: "ó",
	otilde: "õ",
	ocirc: "ô",
	uacute: "ú",
	ccedil: "ç",
};

export function decodeEntities(value: string): string {
	return value
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
			String.fromCodePoint(Number.parseInt(hex, 16)),
		)
		.replace(/&#(\d+);/g, (_, dec) =>
			String.fromCodePoint(Number.parseInt(dec, 10)),
		)
		.replace(/&([a-z]+);/gi, (match, name: string) => {
			const decoded = HTML_ENTITIES[name.toLowerCase()];
			return decoded ?? match;
		});
}

/** Removes markup while keeping block boundaries as newlines. */
export function stripHtml(value: string): string {
	return decodeEntities(
		value
			.replace(/<!--[\s\S]*?-->/g, " ")
			.replace(/<(script|style|noscript|iframe|svg)[\s\S]*?<\/\1>/gi, " ")
			.replace(/<\/(p|div|section|article|li|h[1-6]|tr|blockquote)>/gi, "\n")
			.replace(/<br\s*\/?>/gi, "\n")
			.replace(/<[^>]+>/g, " "),
	)
		.replace(/[ \t\u00a0]+/g, " ")
		.replace(/ *\n */g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

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

/**
 * Markers that interrupt the body but do not end it — ad slots and share bars
 * sit *between* paragraphs, so stopping on them would truncate the article.
 */
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

/** Lines that are never article body, wherever they appear. */
const NOISE_PATTERNS: RegExp[] = [
	/^(menu|buscar|search|login|assine|assinar|subscribe|entrar|sair|cadastre-se|inscreva-se|newsletter)$/i,
	/^(facebook|twitter|x|whatsapp|telegram|linkedin|instagram|threads|bluesky|youtube|tiktok)$/i,
	/^(home|inicio|in[ií]cio|not[ií]cias|esportes|economia|pol[ií]tica|mundo|tecnologia|colunas|opini[aã]o)$/i,
	/cookie|privacy policy|pol[ií]tica de privacidade|termos de uso|terms of service/i,
	/all rights reserved|todos os direitos reservados|©\s*\d{4}/i,
	/clique aqui|click here|voltar ao topo|back to top|carregar mais|load more/i,
	/^(foto|imagem|photo|image|cr[eé]dito|reprodu[cç][aã]o|divulga[cç][aã]o|arte)\s*[:/]/i,
	/\b(getty images|shutterstock|ag[eê]ncia brasil\/|reuters\/|afp\/|@[\w.]+\/instagram)\b/i,
	/^(por|by|texto de|escrito por)\s+[\p{Lu}][\p{L}.'-]+(\s+[\p{L}.'-]+){0,3}$/u,
	/^(atualizado|publicado|updated|published)\s+(em|on|h[aá])\b/i,
	/^\d{1,2}\/\d{1,2}\/\d{2,4}(\s+[\dh:]+)?$/,
	/^(compartilhar|share|salvar|save|imprimir|print|copiar link|copy link|ouvir|listen)\b/i,
	/assine (a|o|já|ja|agora)|seja assinante|torne-se assinante|subscriber only|conte[uú]do exclusivo para assinantes/i,
	/(baixe|instale) (o )?(nosso )?(app|aplicativo)|download our app/i,
	/receba (as )?(principais )?not[ií]cias|cadastre seu e-?mail|inscreva-se (no|na|em)/i,
	/^(the post|o post|o artigo|este artigo|esse conte[uú]do)\b.*\b(appeared first on|apareceu primeiro em|foi publicado originalmente)\b/i,
	/^\W+$/,
];

/** Trailers that feeds append after the real summary. */
const FEED_TRAILER_PATTERNS: RegExp[] = [
	/\b(the post|o post|o artigo|a matéria|a materia)\b[\s\S]*?\b(appeared first on|apareceu primeiro em|foi publicad[oa] originalmente em)\b[\s\S]*$/i,
	/\bcontinue (lendo|reading)\b[\s\S]*$/i,
	/\b(leia (mais|tamb[eé]m|na íntegra|na integra)|read more|saiba mais)\b\s*[:.]?\s*(em\s+)?https?:\/\/\S*[\s\S]*$/i,
	/\[…\]\s*$/,
	/\.{3,}\s*$/,
];

export function normalizeForMatch(value = ""): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/!\[[^\]]*]\([^)]*\)/g, " ")
		.replace(/\[[^\]]+]\([^)]*\)/g, "$1")
		.replace(/[#*_`>[\]()|:.,;!?'"\-–—]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

const STOPWORDS = new Set([
	"para",
	"com",
	"como",
	"pelo",
	"pela",
	"sobre",
	"após",
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

export function significantWords(title = ""): string[] {
	return normalizeForMatch(title)
		.split(" ")
		.filter((word) => word.length > 3 && !STOPWORDS.has(word));
}

/** True when a line repeats enough of the headline to be the article's own H1. */
export function resemblesTitle(line: string, title?: string): boolean {
	const words = significantWords(title);
	if (words.length < 3) return false;
	const normalized = normalizeForMatch(line);
	if (!normalized || normalized.length > 240) return false;
	const hits = words.filter((word) => normalized.includes(word)).length;
	return hits >= Math.min(5, Math.ceil(words.length * 0.55));
}

/**
 * Share of headline terms present in the extracted text — the cheap guard
 * against a reader that returned a paywall page, a 404 or a section index.
 */
/**
 * Minimum headline-term overlap for a body to count as the same story. Bodies
 * legitimately paraphrase their own headline, so this only has to be high
 * enough to catch a completely different page.
 */
export const MIN_TITLE_COVERAGE = 0.25;

export function titleCoverage(text: string, title?: string): number {
	const words = significantWords(title);
	if (!words.length) return 1;
	const normalized = normalizeForMatch(text);
	const hits = words.filter((word) => normalized.includes(word)).length;
	return hits / words.length;
}

export function cleanLine(line: string): string {
	return line
		.replace(/!\[[^\]]*]\([^)]*\)/g, "")
		.replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
		.replace(/^\s{0,3}#{1,6}\s*/, "")
		.replace(/^\s{0,3}>\s?/, "")
		.replace(/^\s*[-*+]\s+/, "")
		.replace(/^\s*\d{1,2}[.)]\s+/, "")
		.replace(/\s+/g, " ")
		.trim();
}

function matchesSection(line: string, sections: string[]): boolean {
	const normalized = normalizeForMatch(line);
	if (!normalized || normalized.length > 60) return false;
	return sections.some(
		(section) => normalized === section || normalized.startsWith(`${section} `),
	);
}

/** Heading that ends the article body (related content, tags, comments). */
export function isTailSection(line: string): boolean {
	return matchesSection(line, TAIL_SECTIONS);
}

/** Ad/share marker that interrupts the body without ending it. */
export function isInlineMarker(line: string): boolean {
	return matchesSection(line, INLINE_MARKERS);
}

/** Any heading that should never be kept as body text. */
export function isStopSection(line: string): boolean {
	return isTailSection(line) || isInlineMarker(line);
}

export function isNoise(line: string): boolean {
	const normalized = normalizeForMatch(line);
	if (!normalized) return true;
	if (/^https?:\/\//i.test(line.trim())) return true;
	// Nav rows rendered as pipe/bullet separated link lists.
	if ((line.match(/[|•·]/g) ?? []).length >= 3) return true;
	// Short fragments without sentence punctuation are labels, buttons or captions.
	if (line.length < 28 && !/[.!?]$/.test(line)) return true;
	// Mostly-uppercase short lines are kickers/section labels.
	if (line.length < 60 && line === line.toUpperCase() && /[A-Z]/.test(line))
		return true;
	return NOISE_PATTERNS.some((pattern) => pattern.test(line));
}

/** A paragraph looks like prose when it has sentence punctuation and enough words. */
function looksLikeProse(line: string): boolean {
	return /[.!?]["'”’)]?$/.test(line) && line.split(" ").length >= 6;
}

export interface ExtractOptions {
	title?: string;
	maxChars?: number;
	/** Body must reach this length before a stop-section heading ends extraction. */
	minCharsBeforeStop?: number;
}

/**
 * Turns reader-mode markdown into article body text: anchors on the headline,
 * drops chrome, stops at the "related content" tail and de-duplicates repeats.
 */
export function extractArticleText(
	markdown: string,
	options: ExtractOptions = {},
): string {
	const { title, maxChars = 12_000, minCharsBeforeStop = 200 } = options;
	const lines = stripReaderChrome(markdown).split("\n").map(cleanLine);

	// Start right after the page's own H1 so nav/menu above it is never picked.
	const titleIndex = title
		? lines.findIndex((line) => resemblesTitle(line, title))
		: -1;
	const start = titleIndex >= 0 ? titleIndex + 1 : 0;

	const picked: string[] = [];
	const seen = new Set<string>();
	let length = 0;

	for (const line of lines.slice(start)) {
		if (isTailSection(line)) {
			// Before any body has accumulated this is still the header area, so the
			// heading is skipped; afterwards it marks the start of other articles.
			if (length >= minCharsBeforeStop) break;
			continue;
		}
		if (isInlineMarker(line) || isNoise(line)) continue;
		// The headline may repeat (og description, breadcrumb) — keep it out of the body.
		if (title && resemblesTitle(line, title) && !looksLikeProse(line)) continue;
		const key = normalizeForMatch(line);
		if (seen.has(key)) continue;
		seen.add(key);
		picked.push(line);
		length += line.length + 2;
		if (length > maxChars) break;
	}

	return picked
		.join("\n\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export function stripReaderChrome(text: string): string {
	return text
		.replace(/^Title:.*$/gim, "")
		.replace(/^URL Source:.*$/gim, "")
		.replace(/^Published Time:.*$/gim, "")
		.replace(/^Warning:.*$/gim, "")
		.replace(/^Markdown Content:\s*/gim, "")
		.replace(/\r/g, "")
		.trim();
}

/**
 * Quality gate for extracted bodies. Rejects paywall stubs, cookie walls and
 * link indexes that survived line filtering.
 */
export function isUsableArticleText(
	text: string,
	options: { title?: string; minChars?: number } = {},
): boolean {
	// ~three sentences: above any paywall stub, below a short real news brief.
	// The prose-paragraph checks below do most of the filtering.
	const { title, minChars = 280 } = options;
	const trimmed = text.trim();
	if (trimmed.length < minChars) return false;

	const paragraphs = trimmed.split(/\n{2,}/).filter(Boolean);
	const proseParagraphs = paragraphs.filter(looksLikeProse);
	// A body made only of fragments is an index page, not an article.
	if (proseParagraphs.length < 2) return false;

	const proseChars = proseParagraphs.join(" ").length;
	if (proseChars / trimmed.length < 0.5) return false;

	if (title && titleCoverage(trimmed, title) < MIN_TITLE_COVERAGE) return false;
	return true;
}

/**
 * Cleans an RSS description/content:encoded value into plain summary text:
 * strips markup, drops the feed's own trailer and removes leftover chrome lines.
 */
export function sanitizeFeedContent(raw = "", maxChars = 4_000): string {
	if (!raw) return "";
	let text = stripHtml(raw);
	for (const pattern of FEED_TRAILER_PATTERNS) text = text.replace(pattern, "");

	const kept: string[] = [];
	const seen = new Set<string>();
	for (const line of text.split("\n").map(cleanLine)) {
		if (!line) continue;
		if (isTailSection(line)) break;
		if (isInlineMarker(line) || isNoise(line)) continue;
		const key = normalizeForMatch(line);
		if (seen.has(key)) continue;
		seen.add(key);
		kept.push(line);
	}

	// Some feeds ship a single-sentence summary shorter than the noise floor —
	// keep the stripped text rather than returning nothing at all.
	const joined = kept.join("\n\n").trim();
	const fallback = text.replace(/\s+/g, " ").trim();
	const result = joined || fallback;
	return result.length > maxChars
		? `${result.slice(0, maxChars).replace(/\s+\S*$/, "")}…`
		: result;
}
