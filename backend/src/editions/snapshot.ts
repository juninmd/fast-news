import { createHash } from "node:crypto";
import type { Edition, EditionKind, EditionWindow, Headline } from "./types.js";

export const EDITION_SNAPSHOT_SCHEMA = 1;
export const EDITION_TEMPLATE_VERSION = 1;

export interface EditionSnapshot {
	schemaVersion: typeof EDITION_SNAPSHOT_SCHEMA;
	templateVersion: typeof EDITION_TEMPLATE_VERSION;
	generationStatus: "ready" | "degraded";
	editionId: string;
	generatedAt: string;
	window: { kind: EditionKind; start: string; end: string; day: string };
	draft: Edition["draft"];
	headlines: Array<Omit<Headline, "createdAt"> & { createdAt: string }>;
	checagens: Array<Omit<Headline, "createdAt"> & { createdAt: string }>;
	coverage: Edition["coverage"];
	hourly: number[];
	totalArticles: number;
	totalSources: number;
	market: Edition["market"];
}

export interface SnapshotEnvelope {
	snapshot: EditionSnapshot;
	checksum: string;
}

function stableJson(value: unknown): string {
	if (Array.isArray(value))
		return `[${value.map((child) => stableJson(child ?? null)).join(",")}]`;
	if (value && typeof value === "object") {
		return `{${Object.entries(value)
			.filter(
				([, child]) =>
					child !== undefined &&
					typeof child !== "function" &&
					typeof child !== "symbol",
			)
			.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
			.map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
			.join(",")}}`;
	}
	return JSON.stringify(value) ?? "null";
}

export function checksumSnapshot(snapshot: EditionSnapshot): string {
	return createHash("sha256").update(stableJson(snapshot)).digest("hex");
}

function serialiseHeadline(headline: Headline) {
	return { ...headline, createdAt: headline.createdAt.toISOString() };
}

export function createEditionSnapshot(
	edition: Edition,
	generatedAt = new Date(),
): SnapshotEnvelope {
	const sourceIds = [...edition.headlines.values()];
	if (sourceIds.some((headline) => !headline.sourceId)) {
		throw new Error("Edition snapshot requires persistent source article IDs");
	}
	const snapshot: EditionSnapshot = {
		schemaVersion: EDITION_SNAPSHOT_SCHEMA,
		templateVersion: EDITION_TEMPLATE_VERSION,
		generationStatus:
			edition.coverage.omittedBeforeAi > 0 || edition.coverage.modelFallback
				? "degraded"
				: "ready",
		editionId: `${edition.window.day}:${edition.window.kind}`,
		generatedAt: generatedAt.toISOString(),
		window: {
			kind: edition.window.kind,
			start: edition.window.start.toISOString(),
			end: edition.window.end.toISOString(),
			day: edition.window.day,
		},
		draft: edition.draft,
		headlines: sourceIds.map(serialiseHeadline),
		checagens: edition.checagens.map(serialiseHeadline),
		coverage: edition.coverage,
		hourly: edition.hourly,
		totalArticles: edition.totalArticles,
		totalSources: edition.totalSources,
		market: edition.market,
	};
	return { snapshot, checksum: checksumSnapshot(snapshot) };
}

const UUID =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const KINDS = new Set<EditionKind>(["manha", "meiodia", "tarde", "noite"]);

export function parseSnapshotEnvelope(value: unknown): SnapshotEnvelope {
	if (!value || typeof value !== "object")
		throw new Error("Invalid edition snapshot");
	const envelope = value as Partial<SnapshotEnvelope>;
	const snapshot = envelope.snapshot as EditionSnapshot | undefined;
	if (!snapshot || snapshot.schemaVersion !== EDITION_SNAPSHOT_SCHEMA)
		throw new Error("Unsupported edition snapshot schema");
	if (snapshot.templateVersion !== EDITION_TEMPLATE_VERSION)
		throw new Error("Unsupported edition template version");
	if (
		snapshot.generationStatus !== "ready" &&
		snapshot.generationStatus !== "degraded"
	)
		throw new Error("Invalid edition snapshot generation status");
	if (
		!snapshot.coverage ||
		![
			snapshot.coverage.collected,
			snapshot.coverage.eligible,
			snapshot.coverage.selectedForAi,
			snapshot.coverage.omittedBeforeAi,
		].every((count) => Number.isSafeInteger(count) && count >= 0) ||
		typeof snapshot.coverage.modelFallback !== "boolean" ||
		snapshot.coverage.eligible > snapshot.coverage.collected ||
		snapshot.coverage.omittedBeforeAi > snapshot.coverage.eligible
	)
		throw new Error("Invalid edition snapshot coverage report");
	if (!Number.isFinite(new Date(snapshot.generatedAt).getTime()))
		throw new Error("Invalid edition snapshot generation timestamp");
	if (
		!snapshot.window ||
		!DAY.test(snapshot.window.day) ||
		!KINDS.has(snapshot.window.kind) ||
		snapshot.editionId !== `${snapshot.window.day}:${snapshot.window.kind}`
	)
		throw new Error("Invalid edition snapshot identity");
	const start = new Date(snapshot.window.start).getTime();
	const end = new Date(snapshot.window.end).getTime();
	if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end)
		throw new Error("Invalid edition snapshot time window");
	if (!Array.isArray(snapshot.headlines) || !Array.isArray(snapshot.checagens))
		throw new Error("Edition snapshot is missing its source records");
	const promptIds = new Map<number, string>();
	for (const headline of snapshot.headlines) {
		if (
			!headline ||
			typeof headline.sourceId !== "string" ||
			!UUID.test(headline.sourceId)
		)
			throw new Error("Edition snapshot contains an invalid source article ID");
		if (!Number.isSafeInteger(headline.id) || headline.id < 1)
			throw new Error("Edition snapshot contains an invalid prompt reference");
		if (promptIds.has(headline.id))
			throw new Error("Edition snapshot contains a duplicate prompt reference");
		promptIds.set(headline.id, headline.sourceId);
		if (!Number.isFinite(new Date(headline.createdAt).getTime()))
			throw new Error("Edition snapshot contains an invalid source timestamp");
		if (typeof headline.url !== "string") throw new Error("Invalid source URL");
		const url = new URL(headline.url);
		if (
			(url.protocol !== "http:" && url.protocol !== "https:") ||
			url.username ||
			url.password
		)
			throw new Error("Edition snapshot contains an unsafe source URL");
	}
	for (const headline of snapshot.checagens) {
		if (!headline || !UUID.test(headline.sourceId ?? ""))
			throw new Error(
				"Edition snapshot contains an invalid fact-check source ID",
			);
		if (promptIds.get(headline.id) !== headline.sourceId)
			throw new Error(
				"Edition snapshot fact-check references do not match stored sources",
			);
	}
	if (
		typeof envelope.checksum !== "string" ||
		checksumSnapshot(snapshot) !== envelope.checksum
	)
		throw new Error("Edition snapshot checksum mismatch");
	return { snapshot, checksum: envelope.checksum };
}

export function hydrateSnapshot(envelope: SnapshotEnvelope): Edition {
	const { snapshot } = parseSnapshotEnvelope(envelope);
	const hydrate = (
		headline: EditionSnapshot["headlines"][number],
	): Headline => ({
		...headline,
		createdAt: new Date(headline.createdAt),
	});
	const window: EditionWindow = {
		...snapshot.window,
		start: new Date(snapshot.window.start),
		end: new Date(snapshot.window.end),
	};
	return {
		window,
		draft: snapshot.draft,
		headlines: new Map(
			snapshot.headlines.map((headline) => [headline.id, hydrate(headline)]),
		),
		checagens: snapshot.checagens.map(hydrate),
		coverage: snapshot.coverage,
		hourly: snapshot.hourly,
		totalArticles: snapshot.totalArticles,
		totalSources: snapshot.totalSources,
		market: snapshot.market,
	};
}
