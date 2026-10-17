import { t } from "../i18n";
import { AlertTriangle } from "./Icons";

export default function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3 py-3 text-sm text-fg">
      <div className="flex items-center gap-2 text-danger">
        <AlertTriangle />
        <span className="font-medium">{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-edge px-2.5 py-1 text-xs text-muted hover:bg-hover hover:text-fg"
        >
          {t("app.retry")}
        </button>
      )}
    </div>
  );
}
