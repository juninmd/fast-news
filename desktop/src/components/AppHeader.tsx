import { t } from "../i18n";
import { SECTION_LABEL, SECTION_SUBTITLE } from "../lib/sections";
import { type TabId, titleId } from "../lib/tabs";
import { Refresh, Wifi, WifiOff } from "./Icons";

type Props = {
  tab: TabId;
  online: boolean;
  onRefresh: () => void;
  refreshing: boolean;
};

export default function AppHeader({ tab, online, onRefresh, refreshing }: Props) {
  return (
    <header className="flex shrink-0 items-start gap-4 border-b border-edge px-7 pt-6 pb-4">
      <div className="min-w-0">
        <h1 id={titleId(tab)} className="text-[1.35rem] leading-tight font-semibold tracking-tight text-fg">
          {t(SECTION_LABEL[tab])}
        </h1>
        <p className="mt-0.5 truncate text-[12.5px] text-faint">{t(SECTION_SUBTITLE[tab])}</p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3 pt-1">
        <span
          className={`flex items-center gap-1.5 text-[11.5px] ${online ? "text-ok" : "text-danger"}`}
          title={online ? t("app.online") : t("app.offline")}
        >
          {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{online ? t("app.online") : t("app.offline")}</span>
        </span>

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-lg border border-edge px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-hover hover:text-fg disabled:opacity-60"
        >
          <Refresh className={refreshing ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          {t("app.refresh")}
        </button>
      </div>
    </header>
  );
}
