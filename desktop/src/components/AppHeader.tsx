import type { ReactNode } from "react";
import { t } from "../i18n";
import type { MessageKey } from "../i18n/pt-BR";
import type { Health } from "../lib/types";
import type { Skin } from "../lib/theme";
import Badge, { type Tone } from "./Badge";
import { Moon, Newspaper, Refresh, Settings, Sun, Wifi, WifiOff } from "./Icons";

const HEALTH_KEY: Record<string, MessageKey> = {
  healthy: "health.healthy",
  degraded: "health.degraded",
  unhealthy: "health.unhealthy",
};
const HEALTH_TONE: Record<string, Tone> = { healthy: "ok", degraded: "warn", unhealthy: "danger" };

type Props = {
  online: boolean;
  health: Health | null;
  healthError: string | null;
  skin: Skin;
  onToggleSkin: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  onOpenSettings: () => void;
};

export default function AppHeader({
  online,
  health,
  healthError,
  skin,
  onToggleSkin,
  onRefresh,
  refreshing,
  onOpenSettings,
}: Props) {
  const status = health?.status ?? (healthError ? "unhealthy" : null);

  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-edge bg-panel px-3 py-2">
      <div className="flex items-center gap-2 text-fg">
        <span className="text-accent-text">
          <Newspaper className="h-5 w-5" />
        </span>
        <h1 className="text-sm font-semibold tracking-tight">{t("app.name")}</h1>
      </div>

      <span className="mx-1 h-5 w-px bg-edge" />

      {status && (
        <Badge tone={HEALTH_TONE[status] ?? "neutral"}>
          {t(HEALTH_KEY[status] ?? "health.unhealthy")}
          {health?.version ? ` · v${health.version}` : ""}
        </Badge>
      )}

      <div className="ml-auto flex items-center gap-1">
        <span
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${online ? "text-ok" : "text-danger"}`}
          title={online ? t("app.online") : t("app.offline")}
        >
          {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {online ? t("app.online") : t("app.offline")}
        </span>
        <IconButton label={t("app.refresh")} onClick={onRefresh} busy={refreshing}>
          <Refresh className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </IconButton>
        <IconButton
          label={skin === "escuro" ? t("settings.theme.claro") : t("settings.theme.escuro")}
          onClick={onToggleSkin}
        >
          {skin === "escuro" ? <Sun /> : <Moon />}
        </IconButton>
        <IconButton label={t("app.settings")} onClick={onOpenSettings}>
          <Settings />
        </IconButton>
      </div>
    </header>
  );
}

function IconButton({
  label,
  onClick,
  busy,
  children,
}: {
  label: string;
  onClick: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-busy={busy}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-fg"
    >
      {children}
    </button>
  );
}
