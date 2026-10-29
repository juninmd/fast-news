const NAMED_ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
	hellip: "…",
	mdash: "—",
	ndash: "–",
	lsquo: "‘",
	rsquo: "’",
	ldquo: "“",
	rdquo: "”",
	laquo: "«",
	raquo: "»",
	bull: "•",
	middot: "·",
	copy: "©",
	reg: "®",
	trade: "™",
	euro: "€",
	pound: "£",
	deg: "°",
};

const ENTITY_RE = /&(?:#(\d{1,7})|#x([0-9a-f]{1,6})|([a-z][a-z0-9]{1,8}));/gi;

function codePoint(code: number, original: string): string {
	try {
		return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : original;
	} catch {
		return original;
	}
}

function decodeOnce(text: string): string {
	return text.replace(ENTITY_RE, (match, dec, hex, name) => {
		if (dec) return codePoint(Number(dec), match);
		if (hex) return codePoint(Number.parseInt(hex, 16), match);
		return NAMED_ENTITIES[String(name).toLowerCase()] ?? match;
	});
}

/** Decodes named/numeric entities; a second pass fixes double-encoded text (`&amp;#039;`). */
export function decodeEntities(text: string): string {
	if (!text.includes("&")) return text;
	const once = decodeOnce(text);
	return once.includes("&") ? decodeOnce(once) : once;
}

const BLOCK_BREAK_RE =
	/<\/?(?:p|div|br|li|ul|ol|h[1-6]|tr|td|th|table|blockquote|pre|section|article|hr|figure|figcaption)\b[^>]*>/gi;

/**
 * Plain text of an HTML fragment: block tags become paragraph breaks, scripts and
 * embeds are dropped, entities are decoded and whitespace is normalised.
 */
export function htmlToText(html: unknown): string {
	if (typeof html !== "string" || !html) return "";
	const text = html
		.replace(/<!--[\s\S]*?-->/g, " ")
		.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
		.replace(
			/<(script|style|noscript|iframe|svg|video|audio)\b[\s\S]*?<\/\1>/gi,
			" ",
		)
		.replace(BLOCK_BREAK_RE, "\n")
		.replace(/<[^>]*>/g, "");
	return decodeEntities(text)
		.replace(/[​ ]/g, " ")
		.split("\n")
		.map((line) => line.replace(/\s+/g, " ").trim())
		.filter(Boolean)
		.join("\n\n");
}

/** Single-line variant for titles and names. */
export function inlineText(value: unknown): string {
	return htmlToText(value).replace(/\s+/g, " ").trim();
}

/** Cuts at the last sentence/word boundary before `max`, adding an ellipsis. */
export function truncateText(text: string, max: number): string {
	if (text.length <= max) return text;
	const slice = text.slice(0, max);
	const sentence = Math.max(
		slice.lastIndexOf(". "),
		slice.lastIndexOf("! "),
		slice.lastIndexOf("? "),
		slice.lastIndexOf("\n\n"),
	);
	if (sentence > max * 0.6) return slice.slice(0, sentence + 1).trim();
	const word = slice.lastIndexOf(" ");
	return `${slice.slice(0, word > max * 0.6 ? word : max).trim()}…`;
}
