import { Script } from "node:vm";
import { describe, expect, it } from "vitest";
import { draft, edition, headline, knownOf } from "./fixtures.js";
import {
	createEditionSnapshot,
	hydrateSnapshot,
	parseSnapshotEnvelope,
} from "./snapshot.js";
import {
	buildStaticEditionSite,
	mergeStaticSiteArtifacts,
	type PublicManifest,
} from "./staticSite.js";

const ARTICLE_ID = "6ec0f1d6-90d5-4b62-a74b-30da7d18f4bc";

function snapshot(day = "2026-09-18", kind: "noite" | "manha" = "noite") {
	const source = headline({ sourceId: ARTICLE_ID });
	return createEditionSnapshot(
		edition(
			draft({
				destaques: [
					{
						chapeu: undefined,
						titulo: "Destaque",
						texto: "Contexto",
						fontes: [source.id],
					},
				],
			}),
			knownOf([source]),
			{
				window: {
					kind,
					start: new Date(`${day}T10:00:00Z`),
					end: new Date(`${day}T22:00:00Z`),
					day,
				},
			},
		),
		new Date("2026-09-18T22:01:00Z"),
	);
}

describe("edition snapshots", () => {
	it("keeps persistent source IDs and prompt-local IDs across serialization", () => {
		const envelope = snapshot();
		const restored = hydrateSnapshot(
			parseSnapshotEnvelope(JSON.parse(JSON.stringify(envelope))),
		);
		expect(restored.headlines.get(1)?.sourceId).toBe(ARTICLE_ID);
		expect(restored.headlines.get(1)?.createdAt).toBeInstanceOf(Date);
		expect(restored.window.day).toBe("2026-09-18");
	});

	it("rejects changed payloads and unsafe source URLs", () => {
		const envelope = snapshot();
		expect(() =>
			parseSnapshotEnvelope({
				...envelope,
				snapshot: {
					...envelope.snapshot,
					draft: { ...envelope.snapshot.draft, leve: ["tampered"] },
				},
			}),
		).toThrow("checksum mismatch");
		const unsafe = structuredClone(envelope);
		unsafe.snapshot.headlines[0]!.url = "javascript:alert(1)";
		unsafe.checksum = "0".repeat(64);
		expect(() => parseSnapshotEnvelope(unsafe)).toThrow("unsafe source URL");
	});
});

describe("static O Fio archive", () => {
	it("writes permanent edition paths, latest and archive links under a project prefix", () => {
		const files = buildStaticEditionSite(
			[snapshot("2026-09-17"), snapshot("2026-09-18")],
			"https://juninmd.github.io/fast-news",
		);
		expect(files.has("edicoes/2026-09-18/noite/index.html")).toBe(true);
		expect(files.get("ultima/index.html")).toContain(
			"/fast-news/edicoes/2026-09-18/noite/",
		);
		expect(files.get("arquivo/index.html")).toContain("2026-09-17");
		expect(files.get("manifest.json")).toContain(
			'"latestEditionId": "2026-09-18:noite"',
		);
		const editionHtml = files.get("edicoes/2026-09-18/noite/index.html") ?? "";
		expect(editionHtml).toContain('href="#main-content"');
		expect(editionHtml).toContain('role="search"');
		expect(editionHtml).toContain("Todos os assuntos visíveis");
	});

	it("chooses the newest edition by its reporting window, independent of array order", () => {
		const files = buildStaticEditionSite(
			[snapshot("2026-09-18"), snapshot("2026-09-17")],
			"https://juninmd.github.io/fast-news",
		);
		expect(files.get("ultima/index.html")).toContain("2026-09-18");
	});

	it("keeps edition text readable without JavaScript and emits valid search code", () => {
		const files = buildStaticEditionSite(
			[snapshot()],
			"https://juninmd.github.io/fast-news",
		);
		const html = files.get("edicoes/2026-09-18/noite/index.html")!;
		expect(html).toContain("Destaque");
		expect(html).toContain('role="search"');
		expect(html).toContain("Todos os assuntos visíveis");
		const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
		expect(inlineScript).toBeTruthy();
		expect(() => new Script(inlineScript ?? "")).not.toThrow();
	});

	it("merges a concurrent publication without dropping history or moving latest backward", () => {
		const old = buildStaticEditionSite(
			[snapshot("2026-09-18")],
			"https://juninmd.github.io/fast-news",
		);
		const next = buildStaticEditionSite(
			[snapshot("2026-09-17")],
			"https://juninmd.github.io/fast-news",
		);
		const previous = JSON.parse(old.get("manifest.json")!) as PublicManifest;
		const merged = mergeStaticSiteArtifacts(
			next,
			"https://juninmd.github.io/fast-news",
			previous,
		);
		const manifest = JSON.parse(merged.get("manifest.json")!) as PublicManifest;
		expect(manifest.editions).toHaveLength(2);
		expect(manifest.latestEditionId).toBe("2026-09-18:noite");
		expect(merged.get("arquivo/index.html")).toContain("2026-09-17");
	});

	it("rejects an attempt to replace an already published edition", () => {
		const old = buildStaticEditionSite(
			[snapshot("2026-09-18")],
			"https://juninmd.github.io/fast-news",
		);
		const next = buildStaticEditionSite(
			[snapshot("2026-09-18")],
			"https://juninmd.github.io/fast-news",
		);
		const previous = JSON.parse(old.get("manifest.json")!) as PublicManifest;
		previous.editions[0]!.checksum = "0".repeat(64);
		expect(() =>
			mergeStaticSiteArtifacts(
				next,
				"https://juninmd.github.io/fast-news",
				previous,
			),
		).toThrow("is immutable");
	});

	it("rejects an empty archive and non-HTTPS Pages URL", () => {
		expect(() =>
			buildStaticEditionSite([], "https://juninmd.github.io/fast-news"),
		).toThrow("empty edition archive");
		expect(() =>
			buildStaticEditionSite([snapshot()], "http://example.com/fast-news"),
		).toThrow("HTTPS");
	});
});
