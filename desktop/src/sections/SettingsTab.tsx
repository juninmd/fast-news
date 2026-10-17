import { useEffect, useState, type ReactNode } from "react";
import { LANGUAGES, type Language, language, setLanguage, t } from "../i18n";
import type { MessageKey } from "../i18n/pt-BR";
import { api, errText } from "../lib/api";
import { formatUptime } from "../lib/format";
import { useAlwaysOnTop } from "../lib/hooks";
import type { Health, Settings } from "../lib/types";
import type { Skin } from "../lib/theme";
import { useToast } from "../lib/toast";
import Badge, { type Tone } from "../components/Badge";
import { Settings as SettingsIcon } from "../components/Icons";

const HEALTH_TONE: Record<string, Tone> = { up: "ok", healthy: "ok", degraded: "warn", down: "danger", unhealthy: "danger" };

const STATUS_KEY: Record<string, MessageKey> = {
  healthy: "health.healthy",
  degraded: "health.degraded",
  unhealthy: "health.unhealthy",
  up: "settings.dep.up",
  down: "settings.dep.down",
};

const statusLabel = (status: string) => (STATUS_KEY[status] ? t(STATUS_KEY[status]) : status);

type Props = { skin: Skin; onSkin: (skin: Skin) => void; health: Health | null; onReconfigured: () => void };

export default function SettingsTab({ skin, onSkin, health, onReconfigured }: Props) {
  const notify = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | "reset" | null>(null);
  const [lang, setLang] = useState<Language>(language());
  const [alwaysOnTop, setAlwaysOnTop] = useAlwaysOnTop();

  useEffect(() => {
    let live = true;
    api
      .settings()
      .then((result) => {
        if (!live) return;
        setSettings(result);
        setBaseUrl(result.api_base_url);
      })
      .catch((cause) => notify({ message: errText(cause), type: "erro" }));
    return () => {
      live = false;
    };
  }, [notify]);

  async function run(kind: "save" | "test" | "reset") {
    setBusy(kind);
    try {
      if (kind === "save") {
        const next = await api.saveBaseUrl(baseUrl);
        setSettings(next);
        setBaseUrl(next.api_base_url);
        notify({ message: t("settings.api.saved"), type: "ok" });
        onReconfigured();
      } else if (kind === "reset") {
        const next = await api.resetBaseUrl();
        setSettings(next);
        setBaseUrl(next.api_base_url);
        notify({ message: t("settings.api.saved"), type: "ok" });
        onReconfigured();
      } else {
        const result = await api.health(baseUrl);
        notify({ message: t("settings.api.ok", { version: result.version }), type: "ok" });
      }
    } catch (cause) {
      notify({ message: errText(cause), type: "erro" });
    } finally {
      setBusy(null);
    }
  }

  function pickLanguage(next: Language) {
    setLanguage(next);
    setLang(next);
    onReconfigured();
  }

  const dirty = settings !== null && baseUrl.trim() !== settings.api_base_url;

  return (
    <div className="flex flex-col gap-4 overflow-y-auto pb-4">
      <Section title={t("settings.api.title")} icon={<SettingsIcon />}>
        <p className="text-xs text-faint">{t("settings.api.description")}</p>
        <label className="flex flex-col gap-1 text-[12.5px] text-muted">
          {t("settings.api.label")}
          <input
            type="url"
            value={baseUrl}
            spellCheck={false}
            onChange={(event) => setBaseUrl(event.target.value)}
            className="fn-field h-10 px-3 text-sm"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void run("save")}
            disabled={busy !== null || !dirty}
            className="rounded-lg border border-accent/50 px-3 py-1.5 text-xs text-accent-text hover:bg-accent/10 disabled:opacity-50"
          >
            {t("settings.api.save")}
          </button>
          <button
            type="button"
            onClick={() => void run("test")}
            disabled={busy !== null}
            className="rounded-lg border border-edge px-3 py-1.5 text-xs text-muted hover:bg-hover hover:text-fg disabled:opacity-50"
          >
            {busy === "test" ? t("settings.api.testing") : t("settings.api.test")}
          </button>
          <button
            type="button"
            onClick={() => void run("reset")}
            disabled={busy !== null}
            className="rounded-lg px-2 py-1.5 text-xs text-faint hover:text-fg disabled:opacity-50"
          >
            {t("settings.api.reset")}
          </button>
        </div>
      </Section>

      <Section title={t("settings.theme.title")}>
        <div className="flex gap-2">
          <Choice label={t("settings.theme.escuro")} active={skin === "escuro"} onClick={() => onSkin("escuro")} />
          <Choice label={t("settings.theme.claro")} active={skin === "claro"} onClick={() => onSkin("claro")} />
        </div>
      </Section>

      <Section title={t("settings.language.title")}>
        <div className="flex gap-2">
          {LANGUAGES.map((item) => (
            <Choice key={item.id} label={item.label} active={lang === item.id} onClick={() => pickLanguage(item.id)} />
          ))}
        </div>
      </Section>

      <Section title={t("settings.window.title")}>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={alwaysOnTop}
            onChange={(event) => setAlwaysOnTop(event.target.checked)}
            className="fn-check"
          />
          {t("settings.window.alwaysOnTop")}
        </label>
      </Section>

      <Section title={t("settings.status.title")}>
        {health ? (
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={HEALTH_TONE[health.status] ?? "neutral"}>{statusLabel(health.status)}</Badge>
              <span className="text-faint">{t("app.version", { version: health.version })}</span>
              <span className="text-faint">{t("settings.status.uptime", { value: formatUptime(health.uptime) })}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(health.dependencies).map(([name, dep]) => (
                <Badge key={name} tone={HEALTH_TONE[dep.status] ?? "neutral"}>
                  {name}: {statusLabel(dep.status)}
                  {dep.latencyMs !== null && dep.latencyMs !== undefined ? ` ${dep.latencyMs}ms` : ""}
                </Badge>
              ))}
            </div>
            {health.pipeline && (
              <div className="flex flex-wrap gap-2 text-faint">
                <span>{t("settings.status.ingested", { n: health.pipeline.ingestedLast24h })}</span>
                <span>·</span>
                <span>{t("settings.status.pending", { n: health.pipeline.pendingTelegram })}</span>
                <span>·</span>
                <span>{t("settings.status.sent", { n: health.pipeline.sentLast24h })}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-faint">{t("app.loading")}</p>
        )}
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex shrink-0 flex-col gap-3 rounded-2xl border border-edge bg-panel p-5">
      <h2 className="flex items-center gap-2 text-[13.5px] font-semibold text-fg">
        {icon && <span className="text-accent-text">{icon}</span>}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Choice({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-3.5 py-2 text-xs transition-colors ${
        active ? "border-accent/50 bg-accent/12 font-medium text-accent-text" : "border-edge text-muted hover:bg-hover hover:text-fg"
      }`}
    >
      {label}
    </button>
  );
}
