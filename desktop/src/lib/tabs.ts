/** As seções do app, na ordem em que aparecem na barra. */
export type TabId = "feed" | "top" | "search" | "editions" | "stories" | "topics" | "finance" | "settings";

export const TAB_IDS: TabId[] = ["feed", "top", "search", "editions", "stories", "topics", "finance", "settings"];

export function isTabId(value: string): value is TabId {
  return (TAB_IDS as string[]).includes(value);
}

export const panelId = (tab: TabId) => `panel-${tab}`;
/** Id do título da seção; o painel aponta para ele por `aria-labelledby`. */
export const titleId = (tab: TabId) => `titulo-${tab}`;
