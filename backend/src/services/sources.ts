import { query } from "../database/client.js";

export const FEED_SOURCES = [
	// ── AI Frontier ─────────────────────────────────────────────────────────────
	{
		// Mirror comunitário — anthropic.com não publica RSS oficial
		url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_news.xml",
		category: "AI Frontier",
		company: "Anthropic",
	},
	{
		url: "https://raw.githubusercontent.com/Olshansk/rss-feeds/main/feeds/feed_anthropic_engineering.xml",
		category: "AI Frontier",
		company: "Anthropic",
	},
	{
		url: "https://bair.berkeley.edu/blog/feed.xml",
		category: "AI Frontier",
		company: "BAIR",
	},
	{
		url: "https://huyenchip.com/feed.xml",
		category: "AI Frontier",
		company: "Chip Huyen",
	},
	{
		url: "https://eugeneyan.com/rss/",
		category: "AI Frontier",
		company: "Eugene Yan",
	},
	{
		url: "https://research.google/blog/rss/",
		category: "AI Frontier",
		company: "Google Research",
	},
	{
		url: "https://huggingface.co/blog/feed.xml",
		category: "AI Frontier",
		company: "HuggingFace",
	},
	{
		url: "https://jack-clark.net/feed/",
		category: "AI Frontier",
		company: "Import AI",
	},
	{
		url: "https://www.interconnects.ai/feed",
		category: "AI Frontier",
		company: "Interconnects AI",
	},
	{
		url: "https://lilianweng.github.io/index.xml",
		category: "AI Frontier",
		company: "Lilian Weng",
	},
	{
		url: "https://openai.com/blog/rss.xml",
		category: "AI Frontier",
		company: "OpenAI",
	},
	{
		url: "https://sebastianraschka.com/rss_feed.xml",
		category: "AI Frontier",
		company: "Sebastian Raschka",
	},
	{
		url: "https://www.semianalysis.com/feed",
		category: "AI Frontier",
		company: "SemiAnalysis",
	},
	{
		url: "https://www.fast.ai/index.xml",
		category: "AI Frontier",
		company: "fast.ai",
	},

	// ── Anime ─────────────────────────────────────────────────────────────
	{
		url: "https://www.animenewsnetwork.com/all/rss.xml?ann-edition=br",
		category: "Anime",
		company: "ANN Brasil",
	},
	{
		url: "https://www.animenewsnetwork.com/newsroom/rss.xml",
		category: "Anime",
		company: "Anime News Network",
	},
	{
		url: "https://www.myanimelist.net/rss/news.xml",
		category: "Anime",
		company: "MyAnimeList",
	},

	// ── Big Techs ─────────────────────────────────────────────────────────────
	{
		url: "https://aws.amazon.com/blogs/aws/feed/",
		category: "Big Techs",
		company: "AWS",
	},
	{
		url: "https://aws.amazon.com/blogs/opensource/feed/",
		category: "Big Techs",
		company: "AWS",
	},
	{
		url: "https://dropbox.tech/feed",
		category: "Big Techs",
		company: "Dropbox",
	},
	{
		url: "https://github.blog/feed/",
		category: "Big Techs",
		company: "GitHub",
	},
	{
		url: "https://github.blog/engineering/feed/",
		category: "Big Techs",
		company: "GitHub",
	},
	{
		url: "https://deepmind.google/blog/rss.xml",
		category: "Big Techs",
		company: "Google",
	},
	{
		url: "https://blog.google/technology/ai/rss",
		category: "Big Techs",
		company: "Google",
	},
	{
		url: "https://developers.googleblog.com/feeds/posts/default",
		category: "Big Techs",
		company: "Google",
	},
	{
		url: "https://about.fb.com/news/rss/",
		category: "Big Techs",
		company: "Meta",
	},
	{
		url: "https://engineering.fb.com/feed/",
		category: "Big Techs",
		company: "Meta",
	},
	{
		url: "https://devblogs.microsoft.com/feed/",
		category: "Big Techs",
		company: "Microsoft",
	},
	{
		url: "https://blogs.nvidia.com/feed/",
		category: "Big Techs",
		company: "Nvidia",
	},
	{
		url: "https://developer.nvidia.com/blog/feed/",
		category: "Big Techs",
		company: "Nvidia",
	},
	{
		url: "https://slack.engineering/feed/",
		category: "Big Techs",
		company: "Slack",
	},
	{
		url: "https://engineering.atspotify.com/feed/",
		category: "Big Techs",
		company: "Spotify",
	},
	{
		url: "https://engineeringblog.yelp.com/feed.xml",
		category: "Big Techs",
		company: "Yelp",
	},

	// ── Brasil ─────────────────────────────────────────────────────────────
	{
		url: "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml",
		category: "Brasil",
		company: "Agência Brasil",
	},
	{
		url: "https://braziljournal.com/feed/",
		category: "Brasil",
		company: "Brazil Journal",
	},
	{
		url: "https://www.cnnbrasil.com.br/feed/",
		category: "Brasil",
		company: "CNN Brasil",
	},
	{
		url: "https://www.cartacapital.com.br/feed/",
		category: "Brasil",
		company: "Carta Capital",
	},
	{
		url: "https://feeds.folha.uol.com.br/poder/rss091.xml",
		category: "Brasil",
		company: "Folha de S.Paulo",
	},
	{
		url: "https://feeds.folha.uol.com.br/mercado/rss091.xml",
		category: "Brasil",
		company: "Folha de S.Paulo",
	},
	{
		url: "https://www.metropoles.com/brasil/feed",
		category: "Brasil",
		company: "Metrópoles",
	},
	{
		url: "https://www.metropoles.com/negocios/feed",
		category: "Negócios",
		company: "Metrópoles",
	},
	{
		url: "https://www.poder360.com.br/feed/",
		category: "Brasil",
		company: "Poder360",
	},
	{
		url: "https://tecnoblog.net/feed/",
		category: "Brasil",
		company: "Tecnoblog",
	},
	{
		url: "https://veja.abril.com.br/politica/feed/",
		category: "Brasil",
		company: "Veja",
	},
	{
		url: "https://veja.abril.com.br/economia/feed/",
		category: "Negócios",
		company: "Veja",
	},

	// ── Dev Tools ─────────────────────────────────────────────────────────────
	{
		url: "https://www.cncf.io/blog/feed/",
		category: "Dev Tools",
		company: "CNCF",
	},
	{
		url: "https://blog.cloudflare.com/rss/",
		category: "Dev Tools",
		company: "Cloudflare",
	},
	{ url: "https://deno.com/feed", category: "Dev Tools", company: "Deno" },
	{
		url: "https://www.digitalocean.com/community/tutorials/feed",
		category: "Dev Tools",
		company: "DigitalOcean",
	},
	{
		url: "https://www.docker.com/blog/feed/",
		category: "Dev Tools",
		company: "Docker",
	},
	{
		url: "https://fly.io/blog/feed.xml",
		category: "Dev Tools",
		company: "Fly.io",
	},
	{
		url: "https://cloudblog.withgoogle.com/rss/",
		category: "Dev Tools",
		company: "Google Cloud",
	},
	{
		url: "https://grafana.com/blog/index.xml",
		category: "Dev Tools",
		company: "Grafana",
	},
	{
		url: "https://hashicorp.com/blog/feed.xml",
		category: "Dev Tools",
		company: "HashiCorp",
	},
	{
		url: "https://blog.jetbrains.com/feed/",
		category: "Dev Tools",
		company: "JetBrains",
	},
	{
		url: "https://kubernetes.io/feed.xml",
		category: "Dev Tools",
		company: "Kubernetes",
	},
	{
		url: "https://blog.logrocket.com/feed/",
		category: "Dev Tools",
		company: "LogRocket",
	},
	{
		url: "https://neon.tech/blog/rss.xml",
		category: "Dev Tools",
		company: "Neon",
	},
	{
		url: "https://octopus.com/blog/feed.xml",
		category: "Dev Tools",
		company: "Octopus Deploy",
	},
	{
		url: "https://www.pulumi.com/blog/rss.xml",
		category: "Dev Tools",
		company: "Pulumi",
	},

	// ── Engenharia ─────────────────────────────────────────────────────────────
	{
		url: "https://www.architecture-weekly.com/feed",
		category: "Engenharia",
		company: "Architecture Weekly",
	},
	{
		url: "https://medium.com/feed/better-programming",
		category: "Engenharia",
		company: "Better Programming",
	},
	{
		url: "https://highscalability.com/rss/",
		category: "Engenharia",
		company: "High Scalability",
	},
	{
		url: "https://martinfowler.com/feed.atom",
		category: "Engenharia",
		company: "Martin Fowler",
	},
	{
		url: "https://blog.pragmaticengineer.com/rss/",
		category: "Engenharia",
		company: "Pragmatic Engineer",
	},
	{
		url: "https://www.smashingmagazine.com/feed/",
		category: "Engenharia",
		company: "Smashing Magazine",
	},
	{
		url: "https://stackoverflow.blog/feed/",
		category: "Engenharia",
		company: "Stack Overflow",
	},
	{
		url: "https://newsletter.systemdesign.one/feed",
		category: "Engenharia",
		company: "System Design",
	},
	{
		url: "https://thenewstack.io/feed/",
		category: "Engenharia",
		company: "The New Stack",
	},

	// ── Gaming ─────────────────────────────────────────────────────────────
	{
		url: "https://www.adrenaline.com.br/feed/",
		category: "Gaming",
		company: "Adrenaline",
	},
	{
		url: "https://www.gameinformer.com/rss.xml",
		category: "Gaming",
		company: "Game Informer",
	},
	{
		url: "https://www.gameblast.com.br/feeds/posts/default",
		category: "Gaming",
		company: "GameBlast",
	},
	{
		url: "https://www.gamespot.com/feeds/news/",
		category: "Gaming",
		company: "GameSpot",
	},
	{
		url: "https://www.gamesradar.com/rss/",
		category: "Gaming",
		company: "GamesRadar",
	},
	{
		url: "https://flowgames.gg/feed/",
		category: "Gaming",
		company: "Flow Games",
	},
	{
		url: "https://pt.ign.com/feed.xml",
		category: "Gaming",
		company: "IGN Brasil",
	},
	{ url: "https://kotaku.com/rss", category: "Gaming", company: "Kotaku" },
	{
		url: "https://www.nintendolife.com/feed",
		category: "Gaming",
		company: "Nintendo",
	},
	{
		url: "https://www.nintendoblast.com.br/feeds/posts/default",
		category: "Gaming",
		company: "NintendoBlast",
	},
	{
		url: "https://www.pcgamer.com/rss/",
		category: "Gaming",
		company: "PC Gamer",
	},
	{
		url: "https://www.polygon.com/rss/index.xml",
		category: "Gaming",
		company: "Polygon",
	},
	{
		url: "https://blog.playstation.com/feed/",
		category: "Gaming",
		company: "PlayStation",
	},
	{
		url: "https://www.rockpapershotgun.com/feed",
		category: "Gaming",
		company: "Rock Paper Shotgun",
	},
	{
		url: "https://store.steampowered.com/feeds/news/",
		category: "Gaming",
		company: "Steam",
	},
	{
		url: "https://www.videogameschronicle.com/feed/",
		category: "Gaming",
		company: "VGC",
	},

	// ── Mundo ─────────────────────────────────────────────────────────────
	{
		url: "https://www.aljazeera.com/xml/rss/all.xml",
		category: "Mundo",
		company: "Al Jazeera",
	},
	{
		url: "http://feeds.foxnews.com/foxnews/world",
		category: "Mundo",
		company: "Fox News",
	},
	{
		url: "https://feeds.folha.uol.com.br/mundo/rss091.xml",
		category: "Mundo",
		company: "Folha de S.Paulo",
	},
	{
		url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
		category: "Mundo",
		company: "NYT",
	},
	{
		url: "https://www.theguardian.com/world/rss",
		category: "Mundo",
		company: "The Guardian",
	},

	// ── Negócios ─────────────────────────────────────────────────────────────
	{ url: "https://exame.com/feed/", category: "Negócios", company: "Exame" },
	{
		url: "https://www.infomoney.com.br/feed/",
		category: "Negócios",
		company: "InfoMoney",
	},

	// ── Open Source ─────────────────────────────────────────────────────────────
	{
		url: "https://about.gitlab.com/atom.xml",
		category: "Open Source",
		company: "GitLab",
	},
	{
		url: "https://go.dev/blog/feed.atom",
		category: "Open Source",
		company: "Go",
	},
	{
		url: "https://news.itsfoss.com/feed/",
		category: "Open Source",
		company: "It",
	},
	{
		url: "https://lwn.net/headlines/rss",
		category: "Open Source",
		company: "LWN",
	},
	{
		url: "https://www.linux.com/feed/",
		category: "Open Source",
		company: "Linux",
	},
	{
		url: "https://nodejs.org/en/feed/blog.xml",
		category: "Open Source",
		company: "Node.js",
	},
	{
		url: "https://opensource.com/feed",
		category: "Open Source",
		company: "Opensource.com",
	},
	{
		url: "https://blog.rust-lang.org/feed.xml",
		category: "Open Source",
		company: "Rust",
	},
	{
		url: "https://devblogs.microsoft.com/typescript/feed/",
		category: "Open Source",
		company: "TypeScript",
	},

	// ── Segurança ─────────────────────────────────────────────────────────────
	{
		url: "https://www.crowdstrike.com/blog/feed/",
		category: "Segurança",
		company: "CrowdStrike",
	},
	{
		url: "https://www.darkreading.com/rss.xml",
		category: "Segurança",
		company: "Dark Reading",
	},
	{
		url: "https://krebsonsecurity.com/feed/",
		category: "Segurança",
		company: "Krebs on Security",
	},
	{
		url: "https://blog.malwarebytes.com/feed/",
		category: "Segurança",
		company: "Malwarebytes",
	},
	{
		url: "https://googleprojectzero.blogspot.com/feeds/posts/default",
		category: "Segurança",
		company: "Project Zero",
	},
	{
		url: "https://isc.sans.edu/rssfeed.xml",
		category: "Segurança",
		company: "SANS ISC",
	},
	{ url: "https://snyk.io/blog/feed/", category: "Segurança", company: "Snyk" },
	{
		url: "https://openssf.org/feed/",
		category: "Segurança",
		company: "OpenSSF",
	},
	{
		url: "https://socket.dev/blog/rss.xml",
		category: "Segurança",
		company: "Socket.dev",
	},
	{
		url: "https://www.reddit.com/r/netsec/.rss",
		category: "Segurança",
		company: "Reddit r/netsec",
	},
	{
		url: "https://feeds.feedburner.com/TheHackersNews",
		category: "Segurança",
		company: "The Hacker News",
	},
	{
		url: "https://unit42.paloaltonetworks.com/feed/",
		category: "Segurança",
		company: "Unit 42",
	},

	// ── Startups ─────────────────────────────────────────────────────────────
	{
		url: "https://medium.com/feed/point-nine-news",
		category: "Startups",
		company: "Point Nine",
	},
	{ url: "https://sifted.eu/feed/", category: "Startups", company: "Sifted" },

	// ── Tecnologia ─────────────────────────────────────────────────────────────
	{
		url: "https://www.infoworld.com/feed/",
		category: "Tecnologia",
		company: "InfoWorld",
	},

	// ── fact_check ─────────────────────────────────────────────────────────────
	{
		url: "https://lupa.uol.com.br/feed/",
		category: "fact_check",
		company: "Agência Lupa",
	},
	{
		url: "https://www.boatos.org/feed",
		category: "fact_check",
		company: "Boatos.org",
	},
];

// Feeds removidos da lista padrão — desativados no banco em cada sync
const RETIRED_FEED_URLS = [
	// Gerais substituídos por feeds de seção (corta fofoca/entretenimento na fonte)
	"https://veja.abril.com.br/feed/",
	"https://www.metropoles.com/feed/",
	"https://www.bleepingcomputer.com/feed/",
	"https://css-tricks.com/feed/",
	// BBC e Eurogamer removidos da lista padrão a pedido do usuário
	"https://feeds.bbci.co.uk/news/world/rss.xml",
	"https://feeds.bbci.co.uk/portuguese/rss.xml",
	"https://www.eurogamer.net/feed",
];

function isValidFeedUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

export async function syncDefaultFeeds(): Promise<void> {
	try {
		// Upsert idempotente: insere apenas fontes novas, preserva is_active de existentes
		let inserted = 0;
		for (const source of FEED_SOURCES) {
			if (!isValidFeedUrl(source.url)) {
				console.warn(`[sources] Skipping malformed feed URL: ${source.url}`);
				continue;
			}
			const res = await query(
				"INSERT INTO source_feeds (name, url, category, company, is_active) VALUES ($1, $2, $3, $4, true) ON CONFLICT (url) DO NOTHING",
				[
					source.company || "Fonte",
					source.url,
					source.category,
					source.company,
				],
			);
			inserted += res.rowCount ?? 0;
		}
		if (inserted > 0)
			console.log(`[sources] Seeded ${inserted} new default sources.`);

		const retired = await query(
			"UPDATE source_feeds SET is_active = false WHERE url = ANY($1) AND is_active = true",
			[RETIRED_FEED_URLS],
		);
		if (retired.rowCount)
			console.log(`[sources] Deactivated ${retired.rowCount} retired feeds.`);
	} catch (err) {
		console.error("[sources] Failed to sync default feeds:", err);
	}
}

export async function getActiveFeeds(): Promise<
	Array<{ url: string; category: string; company?: string }>
> {
	try {
		const res = await query<{ url: string; category: string; company: string }>(
			"SELECT url, category, company FROM source_feeds WHERE is_active = true",
		);
		if (res.rows.length > 0) {
			return res.rows.map((r) => ({
				url: r.url,
				category: r.category,
				company: r.company || undefined,
			}));
		}
	} catch (err) {
		console.error(
			"[sources] Error loading feeds from database, falling back to static list:",
			err,
		);
	}
	return FEED_SOURCES;
}
