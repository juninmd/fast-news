const STOP_SECTIONS = [
	"leia tambem",
	"leia também",
	"mais lidas",
	"mais noticias",
	"mais notícias",
	"relacionadas",
	"related stories",
	"related articles",
	"recommended",
	"newsletter",
	"publicidade",
	"advertisement",
	"comments",
	"comentarios",
	"compartilhe",
	"share this",
	"siga-nos",
	"follow us",
];

const NOISE_PATTERNS = [
	/^(menu|buscar|search|login|assine|subscribe|entrar|cadastre-se)$/i,
	/^(facebook|twitter|x|whatsapp|telegram|linkedin|instagram)$/i,
	/cookie|privacy policy|politica de privacidade|termos de uso/i,
	/all rights reserved|todos os direitos reservados/i,
	/clique aqui|click here|voltar ao topo/i,
];

function stripReaderChrome(text: string): string {
	return text
		.replace(/^Title:.*$/gim, "")
		.replace(/^URL Source:.*$/gim, "")
		.replace(/^Markdown Content:\s*/gim, "")
		.replace(/\r/g, "")
		.trim();
}

function plain(value = ""): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[[^\]]+\]\([^)]*\)/g, "$1")
		.replace(/[#*_`>[\]()|:.,;!?'"-]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

function isNoise(line: string): boolean {
	const normalized = plain(line);
	if (!normalized) return true;
	if (/^https?:\/\//i.test(line)) return true;
	if (line.length < 28 && !/[.!?]$/.test(line)) return true;
	return NOISE_PATTERNS.some((p) => p.test(line));
}

function isStopSection(line: string): boolean {
	const normalized = plain(line);
	return STOP_SECTIONS.some(
		(s) => normalized === s || normalized.startsWith(`${s} `),
	);
}

function cleanLine(line: string): string {
	return line
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
		.replace(/^\s{0,3}#{1,6}\s*/, "")
		.replace(/^\s*[-*]\s+/, "")
		.replace(/\s+/g, " ")
		.trim();
}

function extractArticleText(markdown: string): string {
	const lines = stripReaderChrome(markdown).split("\n").map(cleanLine);
	const picked: string[] = [];
	for (const line of lines) {
		if (picked.join("\n\n").length > 700 && isStopSection(line)) break;
		if (isNoise(line) || isStopSection(line)) continue;
		if (picked[picked.length - 1] === line) continue;
		picked.push(line);
		if (picked.join("\n\n").length > 8000) break;
	}
	return picked
		.join("\n\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export async function fetchFullArticle(url: string): Promise<string> {
	const ac = new AbortController();
	const t = setTimeout(() => ac.abort(), 15_000);
	try {
		const resp = await fetch(`https://r.jina.ai/${url}`, {
			signal: ac.signal,
			headers: { Accept: "text/plain" },
		});
		if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
		return extractArticleText(await resp.text());
	} finally {
		clearTimeout(t);
	}
}
