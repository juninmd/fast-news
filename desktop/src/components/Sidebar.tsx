import type { ReactElement } from "react";
import { t } from "../i18n";
import type { MessageKey } from "../i18n/pt-BR";
import type { Skin } from "../lib/theme";
import { SECTION_LABEL } from "../lib/sections";
import { type TabId, TAB_IDS } from "../lib/tabs";
import type { Health } from "../lib/types";
import { BookOpen, Coins, Flame, Layers, Moon, Newspaper, Search, Settings, Sun, Tag } from "./Icons";

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

const HEALTH_KEY: Record<string, MessageKey> = {
  healthy: "health.healthy",
  degraded: "health.degraded",
  unhealthy: "health.unhealthy",
};

const HEALTH_DOT: Record<string, string> = {
  healthy: "bg-ok",
  degraded: "bg-warn",
  unhealthy: "bg-danger",
};

type Props = {
  current: TabId;
  onChange: (tab: TabId) => void;
  health: Health | null;
  healthError: string | null;
  skin: Skin;
  onToggleSkin: () => void;
};

export default function Sidebar({ current, onChange, health, healthError, skin, onToggleSkin }: Props) {
  const status = health?.status ?? (healthError ? "unhealthy" : null);

  return (
    <aside className="flex w-[13.5rem] shrink-0 flex-col border-r border-edge bg-panel/50">
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-7">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent-text">
          <Newspaper className="h-5 w-5" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[15px] font-semibold tracking-tight text-fg">{t("app.name")}</p>
          <p className="truncate text-[11px] text-faint">{t("app.tagline")}</p>
        </div>
      </div>

      <nav aria-label={t("tabs.label")} className="flex flex-col gap-0.5 px-2">
        {TAB_IDS.map((id) => {
          const Icon = ICONS[id];
          const active = current === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onChange(id)}
              className={`fn-nav text-left ${
                active
                  ? "bg-accent/12 font-medium text-fg"
                  : "text-muted hover:bg-hover hover:text-fg"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-accent-text" : ""}`} />
              <span className="truncate">{t(SECTION_LABEL[id])}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3 border-t border-edge px-4 py-4">
        {status && (
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span className={`h-1.5 w-1.5 rounded-full ${HEALTH_DOT[status] ?? "bg-danger"}`} />
            <span className="truncate">{t(HEALTH_KEY[status] ?? "health.unhealthy")}</span>
            {health?.version && <span className="ml-auto text-faint">v{health.version}</span>}
          </div>
        )}

        <button
          type="button"
          onClick={onToggleSkin}
          className="fn-nav text-muted hover:bg-hover hover:text-fg"
          aria-label={skin === "escuro" ? t("settings.theme.claro") : t("settings.theme.escuro")}
        >
          {skin === "escuro" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span>{skin === "escuro" ? t("settings.theme.claro") : t("settings.theme.escuro")}</span>
        </button>
      </div>
    </aside>
  );
}
