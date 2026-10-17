import { invoke } from "@tauri-apps/api/core";
import type {
  ArticleDetail,
  ArticleSearch,
  Category,
  Edition,
  FinancialSummaryRow,
  Health,
  NewsPage,
  Opportunity,
  RagSearch,
  Settings,
  Story,
  StoryGraph,
  Topic,
  TopicAnalysis,
  TopicHistoryItem,
  TopArticle,
} from "./types";

export type * from "./types";

/** The only place that calls invoke(); argument names are camelCase here and snake_case in Rust. */
export const api = {
  settings: () => invoke<Settings>("settings_get"),
  saveBaseUrl: (apiBaseUrl: string) => invoke<Settings>("settings_set_base_url", { apiBaseUrl }),
  resetBaseUrl: () => invoke<Settings>("settings_reset_base_url"),
  health: (apiBaseUrl?: string) => invoke<Health>("api_health", { apiBaseUrl: apiBaseUrl ?? null }),
  openLink: (url: string) => invoke<void>("open_link", { url }),

  newsList: (page: number, limit: number, category?: string) =>
    invoke<NewsPage>("news_list", { page, limit, category: category ?? null }),
  newsTop: () => invoke<TopArticle[]>("news_top"),
  categories: () => invoke<Category[]>("news_categories"),
  newsSearch: (q: string) => invoke<ArticleSearch>("news_search", { q }),
  newsDetail: (id: string) => invoke<ArticleDetail>("news_detail", { id }),
  newsRelated: (id: string) => invoke<ArticleSearch>("news_related", { id }),

  ragSearch: (q: string, limit: number) => invoke<RagSearch>("rag_search", { q, limit }),

  editions: () => invoke<Edition[]>("editions_list"),
  stories: (limit: number, category?: string) => invoke<Story[]>("stories_list", { limit, category: category ?? null }),
  storyDetail: (id: string) => invoke<StoryGraph>("story_detail", { id }),

  topics: () => invoke<Topic[]>("topics_list"),
  topicAnalysis: (id: string, refresh: boolean) => invoke<TopicAnalysis>("topic_analysis", { id, refresh }),
  topicHistory: (id: string, limit: number) => invoke<TopicHistoryItem[]>("topic_history", { id, limit }),

  financial: () => invoke<Opportunity[]>("financial_list"),
  financialSummary: () => invoke<FinancialSummaryRow[]>("financial_summary"),
};

/** Rust rejects with a plain string; anything else is wrapped so the UI always has a message. */
export function errText(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return String(error);
}
