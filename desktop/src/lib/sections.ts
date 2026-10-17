import type { MessageKey } from "../i18n/pt-BR";
import type { TabId } from "./tabs";

/** Título e linha de apoio de cada seção, compartilhados pela barra lateral e pelo topo. */
export const SECTION_LABEL: Record<TabId, MessageKey> = {
  feed: "tabs.feed",
  top: "tabs.top",
  search: "tabs.search",
  editions: "tabs.editions",
  stories: "tabs.stories",
  topics: "tabs.topics",
  finance: "tabs.finance",
  settings: "tabs.settings",
};

export const SECTION_SUBTITLE: Record<TabId, MessageKey> = {
  feed: "section.feed.subtitle",
  top: "section.top.subtitle",
  search: "section.search.subtitle",
  editions: "section.editions.subtitle",
  stories: "section.stories.subtitle",
  topics: "section.topics.subtitle",
  finance: "section.finance.subtitle",
  settings: "section.settings.subtitle",
};
