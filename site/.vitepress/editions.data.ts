import { createContentLoader } from "vitepress";

export interface EditionEntry {
	url: string;
	title: string;
	description: string;
}

declare const data: EditionEntry[];

export { data };

// Slugs are YYYY-MM-DD-<kind>, so a descending URL sort is newest first.
export default createContentLoader("edicoes/*.md", {
	transform: (raw): EditionEntry[] =>
		raw
			.map(({ url, frontmatter }) => ({
				url,
				title: String(frontmatter["title"] ?? url),
				description: String(frontmatter["description"] ?? ""),
			}))
			.sort((a, b) => b.url.localeCompare(a.url)),
});
