import type { CoverageLink } from "../hooks/useNews";
import type { TopNewsArticle } from "../hooks/useTopNews";

export interface MobileArticle {
	id: string;
	title: string;
	excerpt?: string;
	url: string;
	source: string;
	category: string;
	publishedAt: Date | string;
	imageUrl?: string;
	sourceCount?: number;
	alsoIn?: CoverageLink[];
}

export type Tab = "today" | "trending" | "search" | "saved";

export function fromTop(a: TopNewsArticle): MobileArticle {
	return {
		id: a.id,
		title: a.title,
		excerpt: a.summary || undefined,
		url: a.url,
		source: a.source,
		category: a.category,
		publishedAt: a.published_at,
		imageUrl: a.image_url ?? undefined,
		sourceCount: a.sourceCount,
		alsoIn: (a.sources ?? []).filter((s) => s.id !== a.id),
	};
}

interface ApiArticle {
	id: string;
	title: string;
	summary?: string | null;
	content?: string;
	url: string;
	source: string;
	category: string;
	published_at?: string;
	image_url?: string | null;
}

export function fromApi(a: ApiArticle): MobileArticle {
	return {
		id: a.id,
		title: a.title,
		excerpt: a.summary || a.content?.slice(0, 220) || undefined,
		url: a.url,
		source: a.source,
		category: a.category,
		publishedAt: a.published_at ?? new Date().toISOString(),
		imageUrl: a.image_url ?? undefined,
	};
}
