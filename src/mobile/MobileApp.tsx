import { useCallback, useEffect, useState } from "react";
import { useTheme } from "../hooks";
import { ReaderScreen } from "./ReaderScreen";
import { SavedScreen } from "./SavedScreen";
import { SearchScreen } from "./SearchScreen";
import { TabBar } from "./TabBar";
import { TodayScreen } from "./TodayScreen";
import { TrendingScreen } from "./TrendingScreen";
import type { MobileArticle, Tab } from "./types";

/** Screens stay mounted once visited, so feed position and data survive tab switches. */
function Panel({
	active,
	children,
}: {
	active: boolean;
	children: React.ReactNode;
}) {
	return (
		<div
			inert={!active}
			aria-hidden={!active}
			className={`absolute inset-0 ${active ? "" : "invisible"}`}
		>
			{children}
		</div>
	);
}

export default function MobileApp() {
	const [tab, setTab] = useState<Tab>("today");
	const [visited, setVisited] = useState<Set<Tab>>(new Set(["today"]));
	const [reading, setReading] = useState<MobileArticle | null>(null);
	const [pendingQuery, setPendingQuery] = useState<string | null>(null);
	const [toast, setToast] = useState<string | null>(null);
	const { toggleTheme } = useTheme();

	const go = useCallback((next: Tab) => {
		setTab(next);
		setVisited((v) => (v.has(next) ? v : new Set(v).add(next)));
	}, []);

	const searchFor = useCallback(
		(term: string) => {
			setPendingQuery(term);
			go("search");
		},
		[go],
	);

	// Android back button: close the reader, then go back to Today, then leave the app.
	useEffect(() => {
		const cap = (
			globalThis as {
				Capacitor?: { isNativePlatform?: () => boolean };
			}
		).Capacitor;
		if (!cap?.isNativePlatform?.()) return;
		let remove: (() => void) | undefined;
		let cancelled = false;
		import("@capacitor/app").then(({ App }) =>
			App.addListener("backButton", () => {
				if (reading) setReading(null);
				else if (tab !== "today") go("today");
				else App.exitApp();
			}).then((h) => {
				if (cancelled) h.remove();
				else remove = () => h.remove();
			}),
		);
		return () => {
			cancelled = true;
			remove?.();
		};
	}, [reading, tab, go]);

	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 2200);
		return () => clearTimeout(t);
	}, [toast]);

	return (
		<div className="fixed inset-0 flex flex-col bg-bg-primary text-text-primary">
			<main className="relative min-h-0 flex-1">
				<Panel active={tab === "today"}>
					<TodayScreen
						onOpen={setReading}
						onToggleTheme={toggleTheme}
						onSearch={() => go("search")}
					/>
				</Panel>
				{visited.has("trending") && (
					<Panel active={tab === "trending"}>
						<TrendingScreen onSelectTerm={searchFor} />
					</Panel>
				)}
				{visited.has("search") && (
					<Panel active={tab === "search"}>
						<SearchScreen
							onOpen={setReading}
							pendingQuery={pendingQuery}
							onQueryConsumed={() => setPendingQuery(null)}
						/>
					</Panel>
				)}
				{visited.has("saved") && (
					<Panel active={tab === "saved"}>
						<SavedScreen onOpen={setReading} />
					</Panel>
				)}
			</main>

			<TabBar active={tab} onChange={go} />

			{reading && (
				<ReaderScreen
					key={reading.id}
					seed={reading}
					onClose={() => setReading(null)}
					onToast={setToast}
				/>
			)}

			{toast && (
				<div
					role="status"
					className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border-subtle bg-bg-secondary px-4 py-2 text-sm shadow-lg"
				>
					{toast}
				</div>
			)}
		</div>
	);
}
