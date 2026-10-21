import { storyHeat } from "./trends.js";

export interface StoryRow {
	story_id: string;
	story_title: string;
	story_summary: string | null;
	last_updated_at: string;
	article_count: number;
	source_count: number;
}

export interface MemberRow {
	story_id: string;
	id: string;
	title: string;
	summary: string | null;
	content: string | null;
	url: string;
	source: string;
	category: string;
	company: string | null;
	published_at: string;
	image_url: string | null;
	importance_score: number | null;
	fake_news_score: number | null;
	political_bias: string | null;
	is_militant: boolean;
}

export interface StorySource {
	id: string;
	source: string;
	title: string;
	url: string;
	publishedAt: string;
}

/** Plain-text excerpt for feeds that ship HTML inside `content`. */
export function toExcerpt(text: string | null | undefined, max = 240): string {
	if (!text) return "";
	const plain = text
		.replace(/<[^>]*>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;|&apos;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/\s+/g, " ")
		.trim();
	if (plain.length <= max) return plain;
	return `${plain.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

/** One entry per outlet, newest first. */
export function uniqueSources(members: MemberRow[]): StorySource[] {
	const seen = new Set<string>();
	const out: StorySource[] = [];
	for (const m of [...members].sort(
		(a, b) => Date.parse(b.published_at) - Date.parse(a.published_at),
	)) {
		if (seen.has(m.source)) continue;
		seen.add(m.source);
		out.push({
			id: m.id,
			source: m.source,
			title: m.title,
			url: m.url,
			publishedAt: m.published_at,
		});
	}
	return out;
}

/**
 * Ranks story clusters by heat and shows each through its best article. The
 * cover image comes from any member, so a story is not imageless just because
 * its lead article's feed had no picture.
 */
export function composeTopStories(
	stories: StoryRow[],
	members: MemberRow[],
	now: Date = new Date(),
	limit = 10,
) {
	const byStory = new Map<string, MemberRow[]>();
	for (const m of members) {
		const list = byStory.get(m.story_id) ?? [];
		list.push(m);
		byStory.set(m.story_id, list);
	}

	return stories
		.map((story) => {
			const list = byStory.get(story.story_id) ?? [];
			if (list.length === 0) return null;
			const lead = [...list].sort(
				(a, b) =>
					(b.importance_score ?? 0) - (a.importance_score ?? 0) ||
					Date.parse(b.published_at) - Date.parse(a.published_at),
			)[0] as MemberRow;
			const image =
				lead.image_url ??
				list
					.slice()
					.sort(
						(a, b) => Date.parse(b.published_at) - Date.parse(a.published_at),
					)
					.find((m) => m.image_url)?.image_url ??
				null;
			const sources = uniqueSources(list);
			const heat = storyHeat(
				{
					sources: sources.length,
					articles: list.length,
					lastUpdatedAt: new Date(story.last_updated_at),
				},
				now,
			);
			return {
				id: lead.id,
				storyId: story.story_id,
				title: lead.title,
				summary:
					story.story_summary?.trim() ||
					toExcerpt(lead.summary?.trim() || lead.content),
				url: lead.url,
				source: lead.source,
				category: lead.category,
				company: lead.company,
				published_at: lead.published_at,
				image_url: image,
				importance_score: lead.importance_score ?? 0,
				fake_news_score: lead.fake_news_score,
				political_bias: lead.political_bias,
				is_militant: lead.is_militant,
				sourceCount: sources.length,
				articleCount: list.length,
				sources,
				heat,
			};
		})
		.filter((s): s is NonNullable<typeof s> => s !== null)
		.sort((a, b) => b.heat - a.heat || b.importance_score - a.importance_score)
		.slice(0, limit);
}
