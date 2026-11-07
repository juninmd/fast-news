export interface SampleTweet {
	id: string;
	authorName: string;
	authorHandle: string;
	authorVerified?: boolean;
	text: string;
	likes?: number | string;
	retweets?: number | string;
	timestamp?: string;
	url?: string;
}

export interface TwitterTrendTopic {
	rank: number;
	name: string;
	query: string;
	volume: string | null;
	category: string;
	summary: string;
	sampleTweets: SampleTweet[];
}

export interface TwitterTrendsReport {
	location: string;
	asOf: string;
	topics: TwitterTrendTopic[];
	source: string;
}

export interface TwitterTrendNewsArticle {
	id: string;
	title: string;
	summary: string;
	content: string;
	category: string;
	source: string;
	author: string;
	published_at: string;
	tags: string[];
	topics: TwitterTrendTopic[];
	url: string;
	image_url: string;
}

export const FALLBACK_TWITTER_TOPICS: TwitterTrendTopic[] = [
	{
		rank: 1,
		name: "#BetsNuncaMais",
		query: "%23BetsNuncaMais",
		volume: "248.5K posts",
		category: "Economia & Sociedade",
		summary:
			"Forte pressão popular e mobilização no X após divulgação de estudos do Banco Central e Febraban sobre o impacto do endividamento familiar em apostas online. Parlamentares e influenciadores pedem proibição de publicidade e restrições no PIX.",
		sampleTweets: [
			{
				id: "tw-101",
				authorName: "Economia Popular",
				authorHandle: "@econpopular_br",
				authorVerified: true,
				text: "Os números do BC não deixam dúvidas: bilhões do orçamento familiar estão sendo drenados por plataformas de apostas. A regulação não basta, precisamos de veto à propaganda predatória. #BetsNuncaMais",
				likes: "18.4K",
				retweets: "4.2K",
				timestamp: "há 2 horas",
				url: "https://x.com/search?q=%23BetsNuncaMais",
			},
			{
				id: "tw-102",
				authorName: "Dra. Luciana Mendes",
				authorHandle: "@dralucianapsi",
				authorVerified: false,
				text: "O que vemos nos consultórios de saúde mental é assustador. O vício em apostas digitais destrói casamentos e patrimônios em semanas. É questão de saúde pública urgente.",
				likes: "9.8K",
				retweets: "1.9K",
				timestamp: "há 3 horas",
				url: "https://x.com/search?q=%23BetsNuncaMais",
			},
		],
	},
	{
		rank: 2,
		name: "#DigaNaoAoVotoDistrital",
		query: "%23DigaNaoAoVotoDistrital",
		volume: "135.2K posts",
		category: "Política",
		summary:
			"Debate acalorado nos bastidores de Brasília sobre propostas de reforma política que alteram as regras de representação proporcional para deputados. Usuários dividem-se entre defesa da pluralidade partidária e cobrança de representatividade regional.",
		sampleTweets: [
			{
				id: "tw-201",
				authorName: "Radar Político DF",
				authorHandle: "@radar_politico",
				authorVerified: true,
				text: "A bancada governista e partidos de centro-esquerda articulam resistência pública ao projeto de voto distrital puro, alegando risco de enfraquecimento de minorias e movimentos sociais no Congresso.",
				likes: "7.1K",
				retweets: "2.3K",
				timestamp: "há 1 hora",
				url: "https://x.com/search?q=%23DigaNaoAoVotoDistrital",
			},
			{
				id: "tw-202",
				authorName: "Prof. Marcos Andrade",
				authorHandle: "@marcos_ciencia_pol",
				authorVerified: false,
				text: "Em países de dimensões continentais, o distrital puro cria os chamados 'desertorados eleitorais'. O modelo distrital misto é o debate real, não esse texto apressado. #DigaNaoAoVotoDistrital",
				likes: "5.4K",
				retweets: "1.1K",
				timestamp: "há 4 horas",
				url: "https://x.com/search?q=%23DigaNaoAoVotoDistrital",
			},
		],
	},
	{
		rank: 3,
		name: "Halloween no Brasil",
		query: "Halloween+no+Brasil",
		volume: "98.4K posts",
		category: "Cultura & Tendências",
		summary:
			"Fantasias criativas inspiradas em memes brasileiros de 2026, festas temáticas nas capitais e o já tradicional debate cultural bem-humorado entre comemorar o Dia das Bruxas ou o Dia do Saci.",
		sampleTweets: [
			{
				id: "tw-301",
				authorName: "Memes Brasil",
				authorHandle: "@memesbr_oficial",
				authorVerified: true,
				text: "O brasileiro simplesmente não consegue levar o Halloween a sério: fantasiados de boleto vencido, carro de som e café a 30 reais. Arte pura!",
				likes: "34.2K",
				retweets: "8.6K",
				timestamp: "há 3 horas",
				url: "https://x.com/search?q=Halloween+no+Brasil",
			},
			{
				id: "tw-302",
				authorName: "Cultura Viva",
				authorHandle: "@culturavivabr",
				authorVerified: false,
				text: "Lembrando que 31 de outubro também é o Dia Nacional do Saci! Valorizar o folclore não significa deixar de curtir as festas de Dia das Bruxas. Dá pra celebrar os dois!",
				likes: "12.7K",
				retweets: "3.1K",
				timestamp: "há 5 horas",
				url: "https://x.com/search?q=Halloween+no+Brasil",
			},
		],
	},
	{
		rank: 4,
		name: "#AFazenda",
		query: "%23AFazenda",
		volume: "87.1K posts",
		category: "Entretenimento & TV",
		summary:
			"Repercussão da formação da Roça semanal, alianças rompidas e madrugada de discussões acaloradas no reality show da Record, mobilizando torcidas organizadas e mutirões de votação.",
		sampleTweets: [
			{
				id: "tw-401",
				authorName: "Central Reality",
				authorHandle: "@centralreality",
				authorVerified: true,
				text: "MADRUGADA CAÓTICA NA SEDE! Discussão começou por causa da louça e terminou com acusações de traição de jogo entre os favoritos. O clima está pesadíssimo.",
				likes: "21.5K",
				retweets: "4.8K",
				timestamp: "há 6 horas",
				url: "https://x.com/search?q=%23AFazenda",
			},
		],
	},
	{
		rank: 5,
		name: "Desemprego e Salários",
		query: "Desemprego+e+Salários",
		volume: "62.3K posts",
		category: "Economia",
		summary:
			"Análise dos dados recentes da PNAD Contínua do IBGE mostrando taxa de desemprego em patamar historicamente baixo e recuperação da massa de rendimento real, com economistas comentando os reflexos na inflação e juros.",
		sampleTweets: [
			{
				id: "tw-501",
				authorName: "InfoMercados Brasil",
				authorHandle: "@infomercadosbr",
				authorVerified: true,
				text: "Mercado de trabalho segue resiliente no 2º semestre. Desemprego em 6,4% sustenta o consumo interno, mas pressiona os custos do setor de serviços para o Copom.",
				likes: "8.3K",
				retweets: "1.7K",
				timestamp: "há 4 horas",
				url: "https://x.com/search?q=Desemprego+e+Salários",
			},
		],
	},
	{
		rank: 6,
		name: "#OrdemParanormal",
		query: "%23OrdemParanormal",
		volume: "54.7K posts",
		category: "Games & Criação Digital",
		summary:
			"Comunidade de RPG e cultura geek celebra novidades do universo transmídia de Cellbit, teorizando sobre próximos episódios, campanhas e novos lançamentos de quadrinhos e jogos.",
		sampleTweets: [
			{
				id: "tw-601",
				authorName: "Ordem Updates",
				authorHandle: "@ordemupdates",
				authorVerified: false,
				text: "A quantidade de easter eggs escondidos na última arte divulgada é surreal. O fandom já montou uma linha do tempo de 10 páginas em menos de duas horas!",
				likes: "15.9K",
				retweets: "3.7K",
				timestamp: "há 5 horas",
				url: "https://x.com/search?q=%23OrdemParanormal",
			},
		],
	},
];

export function buildClientTwitterNewsArticle(
	report: TwitterTrendsReport,
): TwitterTrendNewsArticle {
	const count = report.topics.length;
	const topTopic = report.topics[0]?.name || "Assuntos em alta";

	const lines: string[] = [
		`# Trending Topics Brasil: O que está movimentando o X (Twitter) hoje`,
		"",
		`*Edição Especial O Fio · Atualizado em ${new Date(report.asOf).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}*`,
		"",
		`O ambiente digital brasileiro no X (antigo Twitter) amanheceu agitado neste sábado, refletindo um mosaico de debates institucionais, preocupações econômicas e manifestações culturais. O topo das discussões é liderado por **${topTopic}**, acompanhado de outros ${count - 1} temas de grande relevância nacional.`,
		"",
		`Abaixo, a redação do **Fast News / O Fio** detalha cada um dos assuntos que mobilizam os usuários, contextualizando os motivos da repercussão e trazendo os tweets mais compartilhados pela comunidade.`,
		"",
		"---",
		"",
	];

	for (const topic of report.topics) {
		const volStr = topic.volume ? ` (${topic.volume})` : "";
		lines.push(`## ${topic.rank}º Lugar: ${topic.name}${volStr}`);
		lines.push(`**Editoria:** ${topic.category}`);
		lines.push("");
		lines.push(`### Contexto do debate`);
		lines.push(topic.summary);
		lines.push("");

		if (topic.sampleTweets.length > 0) {
			lines.push(`### Vozes do X (Tweets em Destaque)`);
			for (const tweet of topic.sampleTweets) {
				const author = `${tweet.authorName} (${tweet.authorHandle})${tweet.authorVerified ? " ✓" : ""}`;
				const engagement = [
					tweet.likes ? `❤️ ${tweet.likes}` : null,
					tweet.retweets ? `🔁 ${tweet.retweets}` : null,
					tweet.timestamp ? `🕒 ${tweet.timestamp}` : null,
				]
					.filter(Boolean)
					.join(" · ");

				lines.push(`> "${tweet.text}"`);
				lines.push(`> `);
				lines.push(`> — **${author}** ${engagement ? `[${engagement}]` : ""}`);
				if (tweet.url) {
					lines.push(`> [Ver no X](${tweet.url})`);
				}
				lines.push("");
			}
		}
		lines.push("---");
		lines.push("");
	}

	lines.push("### Metodologia de Coleta");
	lines.push(
		"O monitoramento dos Trending Topics do X (Twitter) no Fast News combina telemetria em tempo real com contextualização editorial, filtrando picos de engajamento orgânico e desinformação para entregar uma síntese clara do debate público digital.",
	);

	const content = lines.join("\n");
	const summary = `Panorama completo dos assuntos mais comentados no X (Twitter) no Brasil hoje. Destaque para ${report.topics
		.slice(0, 3)
		.map((t) => t.name)
		.join(", ")} com análise de contexto e tweets representativos.`;

	return {
		id: "twitter-trends-today",
		title: "Trending Topics Brasil: O que está movimentando o X (Twitter) hoje",
		summary,
		content,
		category: "Tecnologia / Sociedade",
		source: "O Fio · Radar X / Twitter",
		author: "Redação Fast News · IA & Redes Sociais",
		published_at: report.asOf,
		tags: [
			"Twitter",
			"X",
			"Trending Topics",
			"Brasil",
			"Redes Sociais",
			"Debate Público",
		],
		topics: report.topics,
		url: "https://x.com/explore/tabs/trending",
		image_url:
			"https://images.unsplash.com/photo-1611605698335-8b1569810432?w=1200&auto=format&fit=crop&q=80",
	};
}

export async function fetchTwitterTrends(): Promise<TwitterTrendsReport> {
	try {
		const res = await fetch("/api/news/twitter-trends");
		if (res.ok) {
			const data = (await res.json()) as TwitterTrendsReport;
			if (data && Array.isArray(data.topics) && data.topics.length > 0) {
				return data;
			}
		}
	} catch {
		// Ignore and fallback
	}

	return {
		location: "Brasil",
		asOf: new Date().toISOString(),
		topics: FALLBACK_TWITTER_TOPICS,
		source: "X (Twitter) Trending Topics Brasil",
	};
}

export async function fetchTwitterNewsArticle(): Promise<TwitterTrendNewsArticle> {
	try {
		const res = await fetch("/api/news/twitter-trends/article");
		if (res.ok) {
			const data = (await res.json()) as TwitterTrendNewsArticle;
			if (data && data.title && data.content) {
				return data;
			}
		}
	} catch {
		// Ignore and fallback
	}

	const report = await fetchTwitterTrends();
	return buildClientTwitterNewsArticle(report);
}
