import { Component, type ErrorInfo, type ReactNode } from "react";
import { t } from "../i18n";
import { AlertTriangle } from "./Icons";

type Props = { children: ReactNode; /** Muda quando a seção muda, para limpar o erro. */ resetKey: string };
type State = { error: Error | null };

/**
 * Uma seção que quebra não pode levar a janela inteira: era o que acontecia
 * quando um componente lançava durante o render e o React desmontava a árvore.
 */
export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ui] seção falhou:", error, info.componentStack);
  }

  override componentDidUpdate(previous: Props) {
    if (previous.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  override render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-danger/30 bg-danger/8 p-5">
        <div className="flex items-center gap-2 text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="text-[13.5px] font-semibold">{t("error.section.title")}</span>
        </div>
        <p className="text-[13px] leading-relaxed text-muted">{this.state.error.message}</p>
        <p className="text-[12.5px] text-faint">{t("error.section.hint")}</p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="rounded-lg border border-edge px-2.5 py-1 text-xs text-muted transition-colors hover:bg-hover hover:text-fg"
        >
          {t("app.retry")}
        </button>
      </div>
    );
  }
}
