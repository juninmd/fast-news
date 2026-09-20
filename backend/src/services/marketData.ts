import type { MarketSnapshot } from "../editions/types.js";

const HG_BRASIL_URL = "https://api.hgbrasil.com/finance?format=json-cors";
// Série 432 do SGS/BCB: Meta da taxa Selic definida pelo Copom (% a.a.).
const BCB_SELIC_URL =
	"https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json";

interface HgBrasilResponse {
	results?: {
		currencies?: { USD?: { buy?: number; variation?: number } };
		stocks?: { IBOVESPA?: { points?: number; variation?: number } };
	};
}

interface BcbSgsEntry {
	valor?: string;
}

async function fetchJson<T>(url: string, timeoutMs = 8000): Promise<T | null> {
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

/**
 * Real-time dólar/Ibovespa/Selic for the edition's financial ticker — never
 * throws, missing fields just fall back to null so a flaky quote source
 * doesn't block the edition (mirrors classifyTheme's fallback stance).
 */
export async function fetchMarketSnapshot(): Promise<MarketSnapshot> {
	const [hgBrasil, selicRows] = await Promise.all([
		fetchJson<HgBrasilResponse>(HG_BRASIL_URL),
		fetchJson<BcbSgsEntry[]>(BCB_SELIC_URL),
	]);

	const usd = hgBrasil?.results?.currencies?.USD;
	const ibov = hgBrasil?.results?.stocks?.IBOVESPA;
	const selic = selicRows?.[0]?.valor
		? Number.parseFloat(selicRows[0].valor)
		: null;

	return {
		usdBrl:
			typeof usd?.buy === "number"
				? { value: usd.buy, changePct: usd.variation ?? 0 }
				: null,
		ibovespa:
			typeof ibov?.points === "number"
				? { value: ibov.points, changePct: ibov.variation ?? 0 }
				: null,
		selicRate: selic !== null && !Number.isNaN(selic) ? selic : null,
	};
}
