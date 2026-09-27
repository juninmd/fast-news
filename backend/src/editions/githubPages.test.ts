import { afterEach, describe, expect, it, vi } from "vitest";
import { draft, edition, headline, knownOf } from "./fixtures.js";
import { GitHubPagesPublisher } from "./githubPages.js";
import { createEditionSnapshot } from "./snapshot.js";
import { buildStaticEditionSite } from "./staticSite.js";

const baseUrl = "https://juninmd.github.io/fast-news";
const commit = "a".repeat(40);
const now = Date.parse("2026-09-18T22:02:00.900Z");

afterEach(() => vi.unstubAllEnvs());

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

describe("GitHub Pages publisher", () => {
	it("commits the site, dispatches the exact commit, and verifies page plus checksum", async () => {
		vi.stubEnv("EDITION_PAGES_TOKEN", "test-token");
		vi.stubEnv("EDITION_PAGES_REPOSITORY", "juninmd/fast-news");
		vi.stubEnv("EDITION_PAGES_BASE_URL", baseUrl);
		const source = headline({
			sourceId: "6ec0f1d6-90d5-4b62-a74b-30da7d18f4bc",
		});
		const envelope = createEditionSnapshot(
			edition(draft(), knownOf([source])),
			new Date(now),
		);
		const files = buildStaticEditionSite([envelope], baseUrl, new Date(now));
		const treeEntries = Array.from(files.keys()).flatMap((path) => {
			const parts = path.split("/");
			const directories = parts
				.slice(0, -1)
				.map((_, index) => parts.slice(0, index + 1).join("/"));
			return [
				...directories.map((directory) => ({
					path: directory,
					sha: `tree-${directory}`,
					type: "tree",
					mode: "040000",
				})),
				{ path, sha: `blob-${path}`, type: "blob", mode: "100644" },
			];
		});
		const uniqueTreeEntries = [
			...new Map(treeEntries.map((entry) => [entry.path, entry])).values(),
		];
		const calls: Array<{ url: string; body?: string }> = [];
		let workflowRunReads = 0;
		const fetchMock = vi.fn(
			async (input: string | URL | Request, init?: RequestInit) => {
				const url = input.toString();
				calls.push({
					url,
					body: typeof init?.body === "string" ? init.body : undefined,
				});
				if (url.includes("/git/ref/heads/gh-pages"))
					return json({ object: { sha: "parent-commit" } });
				if (url.endsWith("/git/commits/parent-commit"))
					return json({ tree: { sha: "parent-tree" } });
				if (url.includes("/contents/manifest.json?ref=parent-commit"))
					return json({
						encoding: "base64",
						content: Buffer.from(files.get("manifest.json")!).toString(
							"base64",
						),
					});
				if (url.includes("/git/trees/parent-tree?recursive=1"))
					return json({ truncated: false, tree: uniqueTreeEntries });
				if (url.endsWith("/git/blobs")) return json({ sha: "blob-sha" });
				if (url.endsWith("/git/trees")) return json({ sha: "tree-sha" });
				if (url.endsWith("/git/commits")) return json({ sha: commit });
				if (url.endsWith("/git/refs")) return json({});
				if (url.endsWith("/git/refs/heads/gh-pages")) return json({});
				if (url.endsWith("/actions/workflows/publish-pages.yml/dispatches"))
					return new Response(null, { status: 204 });
				if (url.includes("/actions/workflows/publish-pages.yml/runs?")) {
					workflowRunReads++;
					return json({
						workflow_runs:
							workflowRunReads === 1
								? []
								: [
										{
											id: 12,
											display_title: `Pages ${envelope.snapshot.editionId} @ ${commit}`,
											created_at: new Date(
												Math.floor(now / 1000) * 1000,
											).toISOString(),
											status: "completed",
											conclusion: "success",
										},
									],
					});
				}
				if (url === `${baseUrl}/manifest.json`)
					return json(JSON.parse(files.get("manifest.json")!));
				if (url === `${baseUrl}/edicoes/2026-09-18/noite/`)
					return new Response(
						files.get("edicoes/2026-09-18/noite/index.html"),
						{ status: 200 },
					);
				throw new Error(`Unexpected request: ${url}`);
			},
		);
		const publisher = new GitHubPagesPublisher(fetchMock, () => now);
		const result = await publisher.publish(envelope, files);

		expect(result).toEqual({
			commit,
			url: `${baseUrl}/edicoes/2026-09-18/noite/`,
		});
		const dispatch = calls.find((call) => call.url.endsWith("/dispatches"));
		expect(JSON.parse(dispatch?.body ?? "{}").inputs).toEqual({
			edition_id: envelope.snapshot.editionId,
			source_commit: commit,
		});
		expect(workflowRunReads).toBe(2);
		const tree = calls.find((call) => call.url.endsWith("/git/trees"));
		expect(tree?.body).toContain("edicoes/2026-09-18/noite/index.html");
	});
});
