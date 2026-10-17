import type { KeyboardEvent, ReactElement } from "react";
import { t } from "../i18n";
import type { MessageKey } from "../i18n/pt-BR";
import { type TabId, TAB_IDS, panelId, tabId } from "../lib/tabs";
import { BookOpen, Coins, Flame, Layers, Newspaper, Search, Settings, Tag } from "./Icons";

const LABELS: Record<TabId, MessageKey> = {
  feed: "tabs.feed",
  top: "tabs.top",
  search: "tabs.search",
  editions: "tabs.editions",
  stories: "tabs.stories",
  topics: "tabs.topics",
  finance: "tabs.finance",
  settings: "tabs.settings",
};

const ICONS: Record<TabId, (props: { className?: string }) => ReactElement> = {
  feed: Newspaper,
  top: Flame,
  search: Search,
  editions: BookOpen,
  stories: Layers,
  topics: Tag,
  finance: Coins,
  settings: Settings,
};

/** WAI-ARIA APG: um único tab stop, setas/Home/End trocam de seção. */
export default function TabBar({ current, onChange }: { current: TabId; onChange: (tab: TabId) => void }) {
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const index = TAB_IDS.indexOf(current);
    const target = {
      ArrowRight: (index + 1) % TAB_IDS.length,
      ArrowLeft: (index - 1 + TAB_IDS.length) % TAB_IDS.length,
      Home: 0,
      End: TAB_IDS.length - 1,
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    onChange(TAB_IDS[target]);
  }

  return (
    <div className="shrink-0 border-b border-edge bg-panel/60 px-2">
      <nav role="tablist" aria-label={t("tabs.label")} onKeyDown={onKeyDown} className="flex gap-0.5 overflow-x-auto">
        {TAB_IDS.map((id) => {
          const Icon = ICONS[id];
          const active = current === id;
          return (
            <button
              key={id}
              id={tabId(id)}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={active ? panelId(id) : undefined}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(id)}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs transition-colors after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full ${
                active
                  ? "font-semibold text-fg after:bg-accent"
                  : "text-muted after:bg-transparent hover:bg-hover hover:text-fg"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(LABELS[id])}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
