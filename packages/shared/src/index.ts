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
