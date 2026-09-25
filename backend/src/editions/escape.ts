const ENTITIES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

export function esc(value: string): string {
	return value.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
}

/** Returns the URL only when it is plain http(s); anything else is dropped. */
export function safeUrl(value: string): string | null {
	try {
		const url = new URL(value);
		return url.protocol === "https:" || url.protocol === "http:"
			? url.toString()
			: null;
	} catch {
		return null;
	}
}

/** Unwraps Folha's RSS redirector so links open the article directly. */
export function directUrl(value: string): string | null {
	const star = value.indexOf("/*http");
	const target =
		star >= 0 && value.includes("redir.folha.com.br")
			? value.slice(star + 2)
			: value;
	return safeUrl(target);
}
