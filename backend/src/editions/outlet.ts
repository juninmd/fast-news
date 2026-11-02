const ENTITIES: Record<string, string> = {
	"&amp;": "&",
	"&gt;": ">",
	"&lt;": "<",
	"&quot;": '"',
	"&#038;": "&",
	"&#39;": "'",
};

// Feed labels that name the feed, not the outlet.
const GENERIC =
	/^(feed|rss|rss feed|feed [uú]ltimas|[uú]ltimas|[uú]ltimas not[ií]cias|latest|latest news|news|newsroom|home|principal|em cima da hora|top stories|front page|all content)$/i;

// A desk name is never the outlet: "Política – VEJA" is VEJA.
const DESK =
	/^(brasil|pol[ií]tica|economia|mundo|neg[óo]cios|tecnologia|esportes?|sa[úu]de|ci[êe]ncia|cultura|internacional|educa[çc][ãa]o|mercado|opini[ãa]o|cotidiano|geral|entretenimento|ilustrada|poder)$/i;

// "Section - Outlet" and "Outlet > Section" both carry the outlet; the rest is the desk.
const SEPARATOR = /\s+[-–—|]\s+|\s*>\s*|:\s+/;

function hostLabel(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return "";
	}
}

/**
 * The outlet behind a feed label: "Folha de S.Paulo - Esporte - Principal"
 * and "g1 &gt; Tecnologia" are one outlet each, and "Feed Últimas" is named
 * by its site instead. Keeps the original label when nothing better exists.
 */
export function outletName(raw: string, url = ""): string {
	const label = raw.replace(
		/&(?:amp|gt|lt|quot|#038|#39);/g,
		(m) => ENTITIES[m] ?? m,
	);
	const parts = label
		.split(SEPARATOR)
		.map((p) => p.trim())
		.filter(Boolean);
	const usable = parts.filter((p) => p.length >= 2 && !GENERIC.test(p));
	const named = usable.find((p) => !DESK.test(p)) ?? usable[0];
	const trimmed = (named ?? "")
		.replace(/\s+(latest\b.*|feed|rss)$/i, "")
		.trim();
	return trimmed || hostLabel(url) || label.trim() || "Fonte desconhecida";
}
