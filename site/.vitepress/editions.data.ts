import { createContentLoader } from "vitepress";

export interface EditionEntry {
	url: string;
	title: string;
	description: string;
}

declare const data: EditionEntry[];

export { data };

const KIND_ORDER: Record<string, number> = {
	manha: 1,
	meiodia: 2,
	tarde: 3,
	noite: 4,
	especial: 5,
};

function compareEditionUrlsDesc(a: string, b: string): number {
	const matchA = a.match(
		/(\d{4}-\d{2}-\d{2})-(manha|meiodia|tarde|noite|especial)/,
	);
	const matchB = b.match(
		/(\d{4}-\d{2}-\d{2})-(manha|meiodia|tarde|noite|especial)/,
	);
	if (!matchA || !matchB) return b.localeCompare(a);
	if (matchB[1] !== matchA[1]) return matchB[1]!.localeCompare(matchA[1]!);
	return (KIND_ORDER[matchB[2]!] ?? 0) - (KIND_ORDER[matchA[2]!] ?? 0);
}

// Slugs are YYYY-MM-DD-<kind>, so chronological descending sort is newest first.
export default createContentLoader("edicoes/*.md", {
	transform: (raw): EditionEntry[] =>
		raw
			.map(({ url, frontmatter }) => ({
				url,
				title: String(frontmatter["title"] ?? url),
				description: String(frontmatter["description"] ?? ""),
			}))
			.sort((a, b) => compareEditionUrlsDesc(a.url, b.url)),
});
