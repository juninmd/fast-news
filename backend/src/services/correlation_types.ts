export interface StoryNode {
  id: string;
  title: string;
  summary: string | null;
  category: string;
  status: string;
  impactLevel: string;
  worldImpact: string | null;
  financialSignal: string | null;
  affectedAssets: string[];
  firstSeenAt: string;
  lastUpdatedAt: string;
  articleCount: number;
}

export interface ArticleNode {
  id: string;
  title: string;
  source: string;
  category: string;
  publishedAt: string | null;
  url: string;
  sentiment: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  similarity: number;
  relationType: string;
}

export interface StoryGraph {
  story: StoryNode;
  articles: ArticleNode[];
  edges: GraphEdge[];
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  eventType: string;
  headline: string;
  whatChanged: string | null;
  occurredAt: string;
  articleId: string | null;
}
