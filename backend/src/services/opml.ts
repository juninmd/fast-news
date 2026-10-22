import { query } from "../database/client.js";

export interface OpmlFeed {
	title: string;
	url: string;
	category?: string;
}

function escapeXml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function unescapeXml(s: string): string {
	return s
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
		.replace(/&amp;/g, "&");
}

/** OPML 2.0, one <outline> folder per category — what every feed reader imports. */
export function buildOpml(
	feeds: OpmlFeed[],
	title = "Fast News — fontes",
	now: Date = new Date(),
): string {
	const byCategory = new Map<string, OpmlFeed[]>();
	for (const f of feeds) {
		const key = f.category?.trim() || "Geral";
		byCategory.set(key, [...(byCategory.get(key) ?? []), f]);
	}
	const body = [...byCategory.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([category, items]) => {
			const inner = items
				.map(
					(f) =>
						`      <outline type="rss" text="${escapeXml(f.title)}" title="${escapeXml(f.title)}" xmlUrl="${escapeXml(f.url)}"/>`,
				)
				.join("\n");
			return `    <outline text="${escapeXml(category)}" title="${escapeXml(category)}">\n${inner}\n    </outline>`;
		})
		.join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${escapeXml(title)}</title>
    <dateCreated>${now.toUTCString()}</dateCreated>
  </head>
  <body>
${body}
  </body>
</opml>
`;
}

function attr(tag: string, name: string): string | undefined {
	const m = tag.match(
		new RegExp(`(?:^|\\s)${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"),
	);
	const v = m?.[2] ?? m?.[3];
	return v === undefined ? undefined : unescapeXml(v);
}

/**
 * Reads feeds from any OPML: nested folders become the category of the feeds
 * inside them. Regex-based on purpose — OPML is flat and attribute-only, and
 * it avoids an XML dependency (and XXE surface) for untrusted uploads.
 */
export function parseOpml(xml: string): OpmlFeed[] {
	const feeds: OpmlFeed[] = [];
	const seen = new Set<string>();
	const folders: Array<string | undefined> = [];
	const tagRe = /<outline\b([^>]*?)(\/?)>|<\/outline\s*>/gi;
	for (const m of xml.matchAll(tagRe)) {
		if (m[0].startsWith("</")) {
			folders.pop();
			continue;
		}
		const attrs = m[1] ?? "";
		const selfClosing = m[2] === "/";
		const xmlUrl = attr(attrs, "xmlUrl");
		const label = attr(attrs, "title") ?? attr(attrs, "text");
		if (xmlUrl) {
			let valid = false;
			try {
				const u = new URL(xmlUrl);
				valid = u.protocol === "http:" || u.protocol === "https:";
			} catch {
				valid = false;
			}
			if (valid && !seen.has(xmlUrl)) {
				seen.add(xmlUrl);
				const category = [...folders].reverse().find(Boolean);
				feeds.push({
					title: (label ?? new URL(xmlUrl).hostname).trim(),
					url: xmlUrl,
					...(category ? { category } : {}),
				});
			}
			if (!selfClosing) folders.push(undefined);
		} else if (!selfClosing) {
			folders.push(label?.trim() || undefined);
		}
	}
	return feeds;
}

export const MAX_IMPORT_FEEDS = 500;

export async function importFeeds(
	feeds: OpmlFeed[],
	defaultCategory = "Geral",
): Promise<{ added: number; skipped: number }> {
	let added = 0;
	const limited = feeds.slice(0, MAX_IMPORT_FEEDS);
	for (const f of limited) {
		const category = (f.category ?? defaultCategory).slice(0, 50);
		const name = f.title.slice(0, 100);
		const res = await query(
			`INSERT INTO source_feeds (name, url, category, company, is_active)
			 VALUES ($1, $2, $3, $4, true)
			 ON CONFLICT (url) DO NOTHING`,
			[name, f.url, category, name.slice(0, 50)],
		);
		added += res.rowCount ?? 0;
	}
	return { added, skipped: feeds.length - added };
}
