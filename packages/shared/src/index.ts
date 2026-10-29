/** Image or video attached to an article (see backend `articleMedia.ts`). */
export interface ArticleMedia {
	type: "image" | "video";
	url: string;
	provider?: "youtube" | "vimeo" | "file";
	embedUrl?: string;
	thumbnail?: string;
	mimeType?: string;
	width?: number;
	height?: number;
	duration?: number;
}

export interface NewsArticle {
	id: string;
	title: string;
	content: string;
	excerpt: string;
	url: string;
	source: string;
	category: string;
	company?: string;
	publishedAt: Date;
	vectorId?: string;
	imageUrl?: string;
	videoUrl?: string;
	media?: ArticleMedia[];
}

export interface FeedSource {
	id: string;
	name: string;
	url: string;
	category: string;
	company: string;
	isActive: boolean;
}

export interface MCPTool {
	name: string;
	description: string;
	inputSchema: object;
}

export type SearchFilters = {
	category?: string;
	company?: string;
	dateFrom?: Date;
	dateTo?: Date;
	limit?: number;
};
