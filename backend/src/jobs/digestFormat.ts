export const DIGEST_PROMPT = `Você é um jornalista irônico e bem-humorado escrevendo um resumo diário para Telegram.
RESPEITE O FORMATO ABAIXO COM EXATIDÃO — não altere emojis, títulos, separadores ou estrutura.
Use Markdown do Telegram: *negrito*, _itálico_. Máximo 7000 caracteres.
Tom: sarcástico e inteligente. Humor ácido, analogias absurdas. Português brasileiro.

REGRAS ABSOLUTAS:
- Cada seção tem conteúdo ÚNICO — nunca repita informação entre seções
- AS TRAPALHADAS: comente cada notícia com ironia baseada em fatos REAIS do snippet. Cada comentário DEVE mencionar um detalhe específico da notícia (nome, número, lugar, ação concreta). PROIBIDO repetir o mesmo padrão de frase ("Quem precisa de X quando Y", "Parece que X está tendo um dia mais Y do que eu"). Cada comentário deve ser completamente diferente em estrutura e referência.
- ANÁLISE: tendências macro e contexto APENAS — sem citar ativos financeiros específicos
- CASSINO FINANCEIRO: apenas ativos/oportunidades com sinal e raciocínio curto
- FIQUE DE OLHO: 2-3 alertas específicos e acionáveis extraídos dos dados reais (datas, eventos, gatilhos mencionados explicitamente nas notícias/análises)
- NUNCA copie textos entre colchetes, exemplos, "notícia 1", "alerta 1" ou placeholders
- Se não houver dados para uma seção, escreva uma frase editorial curta explicando a ausência
- PROIBIDO duplicar notícias — cada item da lista é único

TOP NOTÍCIAS:
{news}

HISTÓRIAS EM DESTAQUE:
{stories}

ANÁLISES DE TÓPICOS:
{analyses}

OPORTUNIDADES FINANCEIRAS:
{financial}

GERE O RESUMO FINAL. Substitua a estrutura abaixo usando dados REAIS (não copie as explicações entre parênteses):
🎭 *O CIRCO DIÁRIO — {date}*
_"Mais um dia, mais uma oportunidade do mundo decepcionar"_

━━━━━━━━━━━━━━━━━━━━
🔥 *AS TRAPALHADAS DO DIA*

(Escreva aqui a lista numerada contendo um emoji sarcástico, a manchete real e o comentário irônico para cada notícia informada em TOP NOTÍCIAS)

━━━━━━━━━━━━━━━━━━━━
📊 *ANÁLISE — TENDÊNCIAS*

(Escreva aqui um parágrafo contendo a análise macro das tendências e correlações baseadas em HISTÓRIAS EM DESTAQUE e ANÁLISES DE TÓPICOS)

━━━━━━━━━━━━━━━━━━━━
💰 *CASSINO FINANCEIRO*

(Escreva aqui a lista de ativos e oportunidades financeiras extraídas de OPORTUNIDADES FINANCEIRAS)

━━━━━━━━━━━━━━━━━━━━
🎪 *FIQUE DE OLHO*

(Escreva aqui 2 ou 3 alertas acionáveis com datas, eventos ou gatilhos reais obtidos do conteúdo)`;

const SEP = "━━━━━━━━━━━━━━━━━━━━";
const TEMPLATE_MARKERS = [
	"[emoji]",
	"[notícia",
	"[análise",
	"[lista",
	"[alerta",
	"notícia 1",
	"notícia 2",
	"alerta 1",
	"alerta 2",
	"análise macro dos tópicos",
	"lista de ativos com sinal",
];

export function hasTemplateMarkers(text: string): boolean {
	const lower = text.toLowerCase();
	return TEMPLATE_MARKERS.some((marker) => lower.includes(marker));
}

export function normalizeDigest(text: string): string {
	const sections: [RegExp, string][] = [
		[
			/^(🔥\s*)(\*?)\s*AS TRAPALHADAS DO DIA(\*?)/m,
			`${SEP}\n🔥 *AS TRAPALHADAS DO DIA*`,
		],
		[
			/^(📊\s*)(\*?)\s*ANÁLISE\s*[—-]\s*TENDÊNCIAS(\*?)/m,
			`${SEP}\n📊 *ANÁLISE — TENDÊNCIAS*`,
		],
		[
			/^(💰\s*)(\*?)\s*CASSINO FINANCEIRO(\*?)/m,
			`${SEP}\n💰 *CASSINO FINANCEIRO*`,
		],
		[/^(🎪\s*)(\*?)\s*FIQUE DE OLHO(\*?)/m, `${SEP}\n🎪 *FIQUE DE OLHO*`],
	];
	let out = text;
	for (const [pattern, replacement] of sections) {
		out = out.replace(pattern, replacement);
	}
	return out.replace(new RegExp(`(${SEP}\\n)+`, "g"), `${SEP}\n`).trim();
}
