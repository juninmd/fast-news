/**
 * Charset handling for feed bodies.
 *
 * Brazilian portals routinely serve ISO-8859-1/Windows-1252 XML while declaring
 * utf-8 (or nothing) over HTTP, so the decision has to look at the XML prolog
 * and at the decoded result, not just the header. Pure module — no network, no
 * config — so it is unit testable and reusable by tooling.
 */

const LATIN1_ALIASES = ["iso-8859-1", "latin1", "latin-1", "cp1252"];

/** Charset the body should be decoded with, in the order the sources are trusted. */
export function resolveCharset(
	buffer: ArrayBuffer,
	contentTypeHeader = "",
): string {
	const headerCharset = contentTypeHeader.match(/charset=([^\s;'"]+)/i)?.[1];
	// The XML prolog wins over a generic/absent HTTP charset.
	const prolog = new TextDecoder("ascii").decode(buffer.slice(0, 200));
	const prologCharset = prolog.match(/encoding=["']([^"']+)["']/i)?.[1];
	const charset = (prologCharset ?? headerCharset ?? "utf-8").toLowerCase();
	// TextDecoder treats windows-1252 as the superset of the latin-1 variants.
	return LATIN1_ALIASES.includes(charset) ? "windows-1252" : charset;
}

/** Decodes a feed body, recovering from a wrong charset declaration. */
export function decodeFeedBuffer(
	buffer: ArrayBuffer,
	contentTypeHeader = "",
): string {
	const charset = resolveCharset(buffer, contentTypeHeader);
	let decoded: string;
	try {
		decoded = new TextDecoder(charset, { fatal: false }).decode(buffer);
	} catch {
		decoded = new TextDecoder("utf-8").decode(buffer);
	}
	// U+FFFD means the guess was wrong (utf-8 header on a latin-1 body with no
	// prolog). windows-1252 maps every byte, so it never yields U+FFFD — retry
	// there before persisting irrecoverable mojibake.
	if (charset !== "windows-1252" && decoded.includes("�")) {
		return new TextDecoder("windows-1252").decode(buffer);
	}
	return decoded;
}
