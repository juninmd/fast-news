import { unwrapRedirect } from "./textSimilarity.js";

/**
 * Publisher behind an article, so one outlet's many feeds count as ONE source
 * when a story is grouped. The feed title cannot do this: Folha publishes
 * "Poder", "Mercado" and "Mundo" feeds, G1 a dozen sections, NYT one per
 * desk — each would otherwise look like a different outlet confirming a story.
 */

// Mobile/AMP/numbered mirrors of the same site.
const HOST_PREFIX = /^(?:www\d*|m|amp|mobile|mobi)\./;

// Same publisher under another domain.
const ALIASES: Record<string, string> = {
	"bbc.co.uk": "bbc.com",
	"feeds.bbci.co.uk": "bbc.com",
	"nyti.ms": "nytimes.com",
};

// Section/brand subdomains of one publisher (c-level.folha..., f5.folha...,
// cooking.nytimes..., economia.uol...). Order matters: Folha lives under
// uol.com.br but is its own newspaper.
const FAMILIES = [
	"folha.uol.com.br",
	"uol.com.br",
	"estadao.com.br",
	"cnnbrasil.com.br",
	"abril.com.br",
	"terra.com.br",
	"nytimes.com",
	"theguardian.com",
	"bbc.com",
];

function collapseFamily(host: string): string {
	return (
		FAMILIES.find((root) => host === root || host.endsWith(`.${root}`)) ?? host
	);
}

// Hosts where many unrelated publishers share one domain.
const PLATFORMS = new Set([
	"medium.com",
	"reddit.com",
	"youtube.com",
	"github.com",
	"dev.to",
	"substack.com",
]);

function slug(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

/** Lower-case publisher key for an article URL; `fallback` (the feed title) is used on shared platforms and unparsable links. */
export function outletOf(url: string, fallback?: string): string | undefined {
	let parsed: URL;
	try {
		// Rows stored before redirects were unwrapped still carry the wrapper host.
		parsed = new URL(unwrapRedirect(url));
	} catch {
		return fallback ? slug(fallback) || undefined : undefined;
	}
	const host = parsed.hostname.toLowerCase().replace(HOST_PREFIX, "");
	if (!host) return fallback ? slug(fallback) || undefined : undefined;
	const canonical = ALIASES[host] ?? collapseFamily(host);
	if (!PLATFORMS.has(canonical)) return canonical;
	if (canonical === "medium.com") {
		const publication = parsed.pathname.split("/").filter(Boolean)[0];
		if (publication) return `${canonical}/${publication.toLowerCase()}`;
	}
	if (canonical === "reddit.com") {
		const [r, sub] = parsed.pathname.split("/").filter(Boolean);
		if (r === "r" && sub) return `${canonical}/r/${sub.toLowerCase()}`;
	}
	const name = fallback ? slug(fallback) : "";
	return name ? `${canonical}:${name}` : canonical;
}
