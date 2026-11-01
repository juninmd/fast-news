const words = (list: string) => new Set(list.split(/\s+/));

// Function words only: names and numbers say nothing about the language.
const ENGLISH = words(
	"the and of to in on at by for with from into over amid about than after before " +
		"is are was were be been has have had will would could should can may not but or if when where which what who how why " +
		"his her their its our your you we they he she this that these those more new says say just now back first",
);
const PORTUGUESE = words(
	"o os as um uma uns umas de da do das dos em na no nas nos por para com sem sobre entre " +
		"que se ao aos pela pelo pelas pelos e ou mas é foi são ser tem têm já não mais como após seu sua seus suas",
);

/**
 * True when a headline is written in English. Tuned to avoid false alarms:
 * a headline is only English when it has English function words and no
 * Portuguese ones (or clearly more of the former).
 */
export function looksEnglish(text: string): boolean {
	const tokens = text.toLowerCase().match(/[\p{L}']+/gu) ?? [];
	if (tokens.length < 3) return false;
	let en = 0;
	let pt = 0;
	for (const t of tokens) {
		if (ENGLISH.has(t)) en++;
		if (PORTUGUESE.has(t)) pt++;
	}
	return (en >= 1 && pt === 0) || (en >= 3 && en > pt * 2);
}
