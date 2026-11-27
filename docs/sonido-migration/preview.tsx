import {
	Badge as SonidoBadge,
	Kbd as SonidoKbd,
	StatTile,
	ToastProvider,
	useToast,
} from "@juninmd/sonido";
import { Bookmark } from "lucide-react";
import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/manrope";
import "../../src/index.css";
import "@juninmd/sonido/styles.css";
import "../../src/styles/animations.css";
import "../../src/styles/pulso.css";
import "../../src/styles/aurora.css";
import { CategoryTabs } from "../../src/components/NeoEditorial/CategoryTabs";
import { EmptyState } from "../../src/components/NeoEditorial/EmptyState";
import { SkeletonCard } from "../../src/components/NeoEditorial/SkeletonCard";
import { CategoryTabs as LegacyCategoryTabs } from "./legacy/CategoryTabs";
import { EmptyState as LegacyEmptyState } from "./legacy/EmptyState";
import {
	HealthCard as LegacyHealthCard,
	Kbd as LegacyKbd,
	RailBadge as LegacyRailBadge,
	Toast as LegacyToast,
} from "./legacy/InlineBits";
import { SkeletonCard as LegacySkeletonCard } from "./legacy/SkeletonCard";

const theme =
	new URLSearchParams(location.search).get("theme") === "light"
		? "light"
		: "dark";
document.documentElement.classList.toggle("dark", theme === "dark");
document.documentElement.dataset.theme = theme;

const page: CSSProperties = {
	background: "var(--bg-primary)",
	color: "var(--text-primary)",
	fontFamily: '"Manrope Variable", system-ui, sans-serif',
	padding: "28px clamp(18px, 3vw, 40px) 48px",
	minHeight: "100vh",
	display: "grid",
	gap: 22,
};

const grid: CSSProperties = {
	display: "grid",
	gridTemplateColumns: "1fr 1fr",
	gap: 16,
	alignItems: "stretch",
};

const card: CSSProperties = {
	background: "var(--bg-secondary)",
	border: "1px solid var(--border-subtle)",
	borderRadius: 14,
	padding: 16,
	minWidth: 0,
};

const tag = (color: string): CSSProperties => ({
	fontFamily: '"JetBrains Mono Variable", monospace',
	fontSize: 10,
	letterSpacing: "0.12em",
	textTransform: "uppercase",
	color,
	fontWeight: 700,
	marginBottom: 10,
});

function Row({
	title,
	hint,
	before,
	after,
}: {
	title: string;
	hint: string;
	before: ReactNode;
	after: ReactNode;
}) {
	return (
		<section style={{ display: "grid", gap: 8 }}>
			<div>
				<h2 style={{ margin: 0, fontSize: 15 }}>{title}</h2>
				<p
					style={{
						margin: "2px 0 0",
						fontSize: 12,
						color: "var(--text-secondary)",
					}}
				>
					{hint}
				</p>
			</div>
			<div style={grid}>
				<div style={card} className="legacy-cell">
					<div style={tag("var(--faint)")}>Antes · componente do fast-news</div>
					<div style={{ display: "grid", gap: 10 }}>{before}</div>
				</div>
				<div style={card}>
					<div style={tag("var(--accent-primary)")}>
						Depois · @juninmd/sonido
					</div>
					<div style={{ display: "grid", gap: 10 }}>{after}</div>
				</div>
			</div>
		</section>
	);
}

function ToastOnMount() {
	const toast = useToast();
	useEffect(() => {
		toast({ title: "Analisando credibilidade…", duration: 0 });
	}, [toast]);
	return null;
}

function App() {
	const [legacyTab, setLegacyTab] = useState("Tecnologia");
	const [sonidoTab, setSonidoTab] = useState("Tecnologia");

	return (
		<div style={page} className="sonido-compare">
			<header>
				<p style={tag("var(--accent-primary)")}>fast-news · migração de UI</p>
				<h1
					style={{
						margin: 0,
						fontSize: 26,
						fontFamily: '"Bricolage Grotesque Variable", sans-serif',
					}}
				>
					Trocas de componentes pelo Sonido
				</h1>
				<p
					style={{
						margin: "6px 0 0",
						fontSize: 13,
						color: "var(--text-secondary)",
					}}
				>
					Mesmo conteúdo e o mesmo tema do app (
					{theme === "dark" ? "Pulso · Tinta, escuro" : "Pulso · Návoa, claro"}
					). À esquerda o primitivo que o fast-news mantinha; à direita o do
					design system, lendo os mesmos tokens de layout.
				</p>
			</header>

			<Row
				title="CategoryTabs"
				hint="Editorias do feed; a barra ativa e as setas/Home/End passam a vir do Tabs."
				before={
					<LegacyCategoryTabs
						activeCategory={legacyTab}
						onCategoryChange={setLegacyTab}
					/>
				}
				after={
					<CategoryTabs
						activeCategory={sonidoTab}
						onCategoryChange={setSonidoTab}
					/>
				}
			/>

			<Row
				title="SkeletonCard"
				hint="Placeholder das matérias enquanto o feed carrega; o anúncio em região viva é do Skeleton."
				before={<LegacySkeletonCard />}
				after={<SkeletonCard />}
			/>

			<Row
				title="EmptyState"
				hint="Salvos/Lidos vazios ganham ícone, título, descrição e a casca tracejada do design system."
				before={
					<LegacyEmptyState
						title="Nada salvo ainda"
						text="Toque no marcador de um card, ou aperte S no feed."
					/>
				}
				after={
					<EmptyState
						icon={<Bookmark />}
						title="Nada salvo ainda"
						text="Toque no marcador de um card, ou aperte S no feed."
					/>
				}
			/>

			<Row
				title="Kbd"
				hint="Atalho ⌘K da barra de busca; a tecla 3D e o contraste vêm do Kbd."
				before={
					<div className="pulso-cmdk">
						<span className="pulso-cmdk-label">Buscar por significado…</span>
						<LegacyKbd />
					</div>
				}
				after={
					<div className="pulso-cmdk">
						<span className="pulso-cmdk-label">Buscar por significado…</span>
						<SonidoKbd className="pulso-cmdk-kbd">⌘K</SonidoKbd>
					</div>
				}
			/>

			<Row
				title="Badge"
				hint="Contadores do trilho (Salvos/Lidos); o encaixe absoluto continua no CSS do app."
				before={
					<div
						className="pulso-rail-btn"
						style={{ position: "relative", width: 56, height: 56 }}
					>
						<Bookmark size={18} />
						<LegacyRailBadge />
					</div>
				}
				after={
					<div
						className="pulso-rail-btn"
						style={{ position: "relative", width: 56, height: 56 }}
					>
						<Bookmark size={18} />
						<SonidoBadge
							tone="accent"
							appearance="solid"
							className="pulso-rail-count"
							aria-hidden
						>
							3
						</SonidoBadge>
					</div>
				}
			/>

			<Row
				title="StatTile"
				hint="Saúde do backend em /status: o mesmo nome, estado e latência num bloco com tom."
				before={<LegacyHealthCard />}
				after={
					<StatTile
						label="database"
						value="🟢 Ativo"
						hint="Latência: 12ms"
						tone="success"
					/>
				}
			/>

			<Row
				title="Toast"
				hint="Aviso transitório do app; a pílula, o relógio e a região aria-live são do Toast."
				before={<LegacyToast />}
				after={
					<div className="preview-toast">
						<ToastProvider>
							<ToastOnMount />
						</ToastProvider>
					</div>
				}
			/>
		</div>
	);
}

createRoot(document.getElementById("root")!).render(<App />);
