import { t } from "../i18n";
import { AlertTriangle } from "./Icons";

export default function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
        <span className="leading-relaxed text-fg">{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-edge px-2.5 py-1 text-xs text-muted transition-colors hover:bg-hover hover:text-fg"
        >
          {t("app.retry")}
        </button>
      )}
    </div>
  );
}
