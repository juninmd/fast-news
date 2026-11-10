import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
}

interface State {
	failed: boolean;
}

/**
 * Last line of defence: a render error (or a lazy chunk that failed to load)
 * shows a way back instead of a blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
	override state: State = { failed: false };

	static getDerivedStateFromError(): State {
		return { failed: true };
	}

	override componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("[ErrorBoundary]", error, info.componentStack);
	}

	override render() {
		if (!this.state.failed) return this.props.children;
		return (
			<div
				role="alert"
				className="flex min-h-screen items-center justify-center bg-bg-primary p-6 text-text-primary"
			>
				<div className="w-full max-w-md border border-border-subtle bg-bg-secondary p-6">
					<p className="font-mono text-[11px] uppercase tracking-widest text-accent-tertiary">
						Erro inesperado
					</p>
					<h1 className="mt-2 font-display text-2xl font-semibold">
						Algo deu errado
					</h1>
					<p className="mt-2 text-sm leading-relaxed text-text-secondary">
						A página encontrou um erro ao montar esta tela. Suas notícias salvas
						e o histórico de leitura continuam guardados neste aparelho.
					</p>
					<div className="mt-5 flex flex-wrap gap-2">
						<button
							type="button"
							onClick={() => this.setState({ failed: false })}
							className="neo-action"
						>
							Tentar novamente
						</button>
						<button
							type="button"
							onClick={() => window.location.reload()}
							className="neo-chip"
						>
							Recarregar a página
						</button>
					</div>
				</div>
			</div>
		);
	}
}
