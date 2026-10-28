import { query } from "../database/client.js";
import { titleSimilarity } from "../services/textSimilarity.js";
import type {
	Headline,
	Thread,
	ThreadEvent,
	ThreadEventKind,
} from "./types.js";

export interface TimelineRow {
	story_id: string;
	story_title: string;
	/** news_stories.article_count: how widely the story was covered. */
	article_count: number;
	article_id: string;
	event_type: string;
	headline: string;
	what_changed: string | null;
	occurred_at: Date;
}

const KIND: Record<string, ThreadEventKind> = {
	new_development: "development",
	escalation: "escalation",
	contradiction: "contradiction",
	resolution: "resolution",
	impact_update: "impact",
};

// Turning points weigh more than routine updates when ranking threads.
const WEIGHT: Record<ThreadEventKind, number> = {
	development: 1,
	impact: 1,
	escalation: 3,
	contradiction: 3,
	resolution: 3,
};

const MAX_THREADS = 3;

// Outlets covering one fact cluster into the same story; their headlines are
// near-copies, and a timeline of copies is not a timeline.
const SAME_FACT = 0.5;

/**
 * Groups stored story_timeline rows into threads of the edition's headlines:
 * one event per headline, oldest first, ranked by size and turning points.
 * Rows whose article is not in the edition are skipped, so every event can
 * be linked to a source.
 */
export function buildStoryThreads(
	rows: TimelineRow[],
	byArticle: Map<string, Headline>,
): Thread[] {
	const stories = new Map<
		string,
		{
			title: string;
			coverage: number;
			events: ThreadEvent[];
			headlines: string[];
		}
	>();
	const seen = new Set<number>();
	for (const row of [...rows].sort(
		(a, b) => +new Date(a.occurred_at) - +new Date(b.occurred_at),
	)) {
		const h = byArticle.get(row.article_id);
		if (!h || seen.has(h.id)) continue;
		seen.add(h.id);
		const story = stories.get(row.story_id) ?? {
			title: row.story_title,
			coverage: row.article_count,
			events: [],
			headlines: [],
		};
		if (story.headlines.some((t) => titleSimilarity(t, h.title) >= SAME_FACT))
			continue;
		story.headlines.push(h.title);
		story.events.push({
			fonte: h.id,
			texto: row.what_changed?.trim() || row.headline,
			tipo: KIND[row.event_type] ?? "development",
		});
		stories.set(row.story_id, story);
	}
	const turning = (t: Thread) =>
		t.eventos.reduce((n, e) => n + WEIGHT[e.tipo ?? "development"], 0);
	return (
		[...stories]
			.map(([storyId, s]) => ({
				thread: { tema: s.title, eventos: s.events, storyId },
				coverage: s.coverage,
			}))
			.filter((t) => t.thread.eventos.length >= 2)
			// Wide coverage means a story that matters; turning points break ties.
			.sort(
				(a, b) =>
					b.coverage - a.coverage || turning(b.thread) - turning(a.thread),
			)
			.slice(0, MAX_THREADS)
			.map((t) => t.thread)
	);
}

/**
 * Story-backed threads first, then model-written ones that do not repeat a
 * source already used, up to three in total.
 */
export function mergeThreads(stored: Thread[], written: Thread[]): Thread[] {
	const used = new Set(stored.flatMap((t) => t.eventos.map((e) => e.fonte)));
	const extra = written.filter((t) => {
		const overlap = t.eventos.filter((e) => used.has(e.fonte)).length;
		if (overlap * 2 >= t.eventos.length) return false;
		for (const e of t.eventos) used.add(e.fonte);
		return true;
	});
	return [...stored, ...extra].slice(0, MAX_THREADS);
}

/** Reads the edition's stored story timelines; empty when none or on error. */
export async function fetchStoryThreads(
	headlines: Headline[],
): Promise<Thread[]> {
	const byArticle = new Map<string, Headline>();
	for (const h of headlines) if (h.sourceId) byArticle.set(h.sourceId, h);
	if (byArticle.size === 0) return [];
	try {
		const res = await query<TimelineRow>(
			`SELECT st.story_id, ns.title AS story_title, ns.article_count, st.article_id, st.event_type,
			        st.headline, st.what_changed, st.occurred_at
			   FROM story_timeline st
			   JOIN news_stories ns ON ns.id = st.story_id
			  WHERE st.article_id = ANY($1::uuid[])`,
			[[...byArticle.keys()]],
		);
		return buildStoryThreads(res.rows, byArticle);
	} catch (error) {
		console.warn(
			"[Edition] Story timelines unavailable; using model threads",
			error,
		);
		return [];
	}
}
