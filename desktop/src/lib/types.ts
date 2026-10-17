/** Espelha os tipos de `src-tauri/src/model.rs`. Só os campos que a UI usa. */

export type Article = {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  source: string;
  category: string;
  published_at: string | null;
  image_url: string | null;
  sentiment: number | null;
  importance_score: number | null;
};

export type NewsPage = {
  data: Article[];
  page: number;
  limit: number;
  hasMore: boolean;
};

export type TopArticle = Article & {
  company: string | null;
  fake_news_score: number | null;
  political_bias: string | null;
  is_militant: boolean;
  sourceCount: number;
};

export type ArticleDetail = {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  url: string;
  source: string;
  category: string;
  company: string | null;
  published_at: string | null;
  image_url: string | null;
  importance_score: number | null;
  fake_news_score: number | null;
  political_bias: string | null;
  is_militant: boolean;
  has_incoherence: boolean;
  credibility_flags: string[] | null;
};

export type SearchMode = "semantic" | "keyword";

export type SearchHit = {
  id: string;
  title: string;
  content: string | null;
  url: string;
  source: string;
  category: string;
  published_at: string | null;
  image_url: string | null;
  similarity: number | null;
};

/** `/api/news/search` and `/api/news/:id/related`; `mode` tells which ranking produced the rows. */
export type ArticleSearch = { data: SearchHit[]; mode: SearchMode | null };

export type RagSearch = {
  query: string;
  total: number;
  results: SearchHit[];
  mode: SearchMode | null;
};

export type Category = { category: string; count: string };

export type Edition = {
  editionKey: string;
  kind: string;
  windowStart: string | null;
  sentAt: string | null;
  links: string[];
};

export type Story = {
  id: string;
  title: string;
  summary: string | null;
  category: string;
  status: string | null;
  impactLevel: string | null;
  worldImpact: string | null;
  financialSignal: string | null;
  affectedAssets: string[] | null;
  firstSeenAt: string | null;
  lastUpdatedAt: string | null;
  articleCount: number;
};

export type StoryArticle = {
  id: string;
  title: string;
  source: string;
  category: string;
  publishedAt: string | null;
  url: string;
  sentiment: number | null;
};

export type StoryEdge = { source: string; target: string; similarity: number | null; relationType: string | null };

export type TimelineEvent = {
  id: string;
  eventType: string | null;
  headline: string;
  whatChanged: string | null;
  occurredAt: string | null;
  articleId: string | null;
};

export type StoryGraph = { story: Story; articles: StoryArticle[]; edges: StoryEdge[]; timeline: TimelineEvent[] };

export type Topic = { id: string; name: string; description: string | null; keywords: string[] | null };

export type TopicAnalysis = { topicId: string; analysis: string | null };

export type TopicHistoryItem = {
  id: string;
  analysis_type: string | null;
  content: string;
  created_at: string | null;
};

export type Opportunity = {
  id: string;
  asset: string;
  asset_type: string | null;
  direction: string | null;
  reasoning: string | null;
  confidence: number | null;
  time_horizon: string | null;
  created_at: string | null;
};

export type FinancialSummaryRow = {
  direction: string;
  asset_type: string | null;
  count: string;
  avg_confidence: string;
};

export type Dependency = { status: string; latencyMs: number | null; error: string | null };

export type Health = {
  status: string;
  version: string;
  uptime: number;
  dependencies: Record<string, Dependency>;
  pipeline: { ingestedLast24h: number; pendingTelegram: number; sentLast24h: number } | null;
};

export type Settings = { api_base_url: string };
