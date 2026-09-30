import { createHash } from "node:crypto";
import type { SnapshotEnvelope } from "./snapshot.js";
import type { PublicManifest } from "./staticSite.js";
import { MAX_EDITION_PAGES, mergeStaticSiteArtifacts } from "./staticSite.js";

const API = "https://api.github.com";
const REQUEST_TIMEOUT_MS = 20_000;
const PAGE_VERIFY_TIMEOUT_MS = 5 * 60_000;

interface RepositoryConfig {
	token: string;
	owner: string;
	repo: string;
	contentBranch: string;
	baseUrl: string;
}

interface GitHubCommit {
	sha: string;
	tree: { sha: string };
}
interface GitHubTree {
	truncated: boolean;
	tree: Array<{ path: string; sha: string; type: string; mode: string }>;
}
interface GitHubRef {
	object: { sha: string };
}
function repositoryConfig(): RepositoryConfig {
	const token = process.env["EDITION_PAGES_TOKEN"];
	const repository = process.env["EDITION_PAGES_REPOSITORY"];
	const baseUrl = process.env["EDITION_PAGES_BASE_URL"];
	if (!token || !repository || !baseUrl)
		throw new Error(
			"Pages mode requires EDITION_PAGES_TOKEN, EDITION_PAGES_REPOSITORY, and EDITION_PAGES_BASE_URL",
		);
	const match = repository.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
	if (!match)
		throw new Error("EDITION_PAGES_REPOSITORY must be owner/repository");
	const url = new URL(baseUrl);
	if (url.protocol !== "https:")
		throw new Error("EDITION_PAGES_BASE_URL must use HTTPS");
	return {
		token,
		owner: match[1]!,
		repo: match[2]!,
		contentBranch: "gh-pages",
		baseUrl: url.toString().replace(/\/$/, ""),
	};
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface PagesPublication {
	commit: string;
	url: string;
}

export class GitHubPagesPublisher {
	private readonly config = repositoryConfig();
	private readonly apiBase: string;

	constructor(
		private readonly fetchImpl: typeof fetch = fetch,
		private readonly now: () => number = Date.now,
	) {
		this.apiBase = `${API}/repos/${this.config.owner}/${this.config.repo}`;
	}

	private async api<T>(path: string, init: RequestInit = {}): Promise<T> {
		const response = await this.fetchImpl(`${this.apiBase}${path}`, {
			...init,
			signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			headers: {
				Accept: "application/vnd.github+json",
				Authorization: `Bearer ${this.config.token}`,
				"X-GitHub-Api-Version": "2022-11-28",
				...(init.body ? { "Content-Type": "application/json" } : {}),
				...init.headers,
			},
		});
		if (!response.ok) {
			const detail = (await response.text())
				.replaceAll(this.config.token, "[redacted]")
				.slice(0, 240);
			throw new Error(
				`GitHub API ${response.status}: ${detail || response.statusText}`,
			);
		}
		if (response.status === 204) return undefined as T;
		return (await response.json()) as T;
	}

	private async head(): Promise<{ sha: string; tree: string } | null> {
		try {
			const ref = await this.api<GitHubRef>(
				`/git/ref/heads/${encodeURIComponent(this.config.contentBranch)}`,
			);
			const commit = await this.api<GitHubCommit>(
				`/git/commits/${ref.object.sha}`,
			);
			return { sha: ref.object.sha, tree: commit.tree.sha };
		} catch (error) {
			if (error instanceof Error && error.message.startsWith("GitHub API 404:"))
				return null;
			throw error;
		}
	}

	private async manifestAt(commit: string): Promise<PublicManifest | null> {
		try {
			const file = await this.api<{ content: string; encoding: string }>(
				`/contents/manifest.json?ref=${encodeURIComponent(commit)}`,
			);
			if (file.encoding !== "base64")
				throw new Error("Existing Pages manifest is not a base64 file");
			return JSON.parse(
				Buffer.from(file.content.replace(/\s/g, ""), "base64").toString("utf8"),
			) as PublicManifest;
		} catch (error) {
			if (error instanceof Error && error.message.startsWith("GitHub API 404:"))
				return null;
			throw error;
		}
	}

	private async existingBlobs(treeSha: string): Promise<Map<string, string>> {
		const tree = await this.api<GitHubTree>(
			`/git/trees/${treeSha}?recursive=1`,
		);
		if (tree.truncated)
			throw new Error("Pages branch tree is too large to verify safely");
		const allowed =
			/^(\.nojekyll|manifest\.json|ultima\/index\.html|arquivo\/(index\.html|(?:[2-9]|[1-9][0-9]+)\/index\.html)|edicoes\/[0-9]{4}-[0-9]{2}-[0-9]{2}\/(manha|meiodia|tarde|noite)\/(?:(?:[2-9]|[1-9][0-9]+)\/)?index\.html)$/;
		const allowedDirectories =
			/^(arquivo|arquivo\/(?:[2-9]|[1-9][0-9]+)|ultima|edicoes|edicoes\/[0-9]{4}-[0-9]{2}-[0-9]{2}(\/(manha|meiodia|tarde|noite)(\/(?:[2-9]|[1-9][0-9]+))?)?)$/;
		const blobs = new Map<string, string>();
		for (const entry of tree.tree) {
			if (entry.type === "tree") {
				if (!allowedDirectories.test(entry.path) || entry.mode !== "040000")
					throw new Error(
						`Refusing to publish unexpected directory from gh-pages: ${entry.path}`,
					);
				continue;
			}
			if (!allowed.test(entry.path))
				throw new Error(
					`Refusing to publish unexpected file from gh-pages: ${entry.path}`,
				);
			if (entry.type !== "blob" || entry.mode !== "100644")
				throw new Error(
					`Refusing to publish a non-regular file from gh-pages: ${entry.path}`,
				);
			blobs.set(entry.path, entry.sha);
		}
		return blobs;
	}

	private async commitSite(
		files: Map<string, string>,
		editionId: string,
	): Promise<string> {
		for (let attempt = 1; attempt <= 4; attempt++) {
			const current = await this.head();
			const rebasedFiles = mergeStaticSiteArtifacts(
				new Map(files),
				this.config.baseUrl,
				current ? await this.manifestAt(current.sha) : null,
			);
			const existing = current
				? await this.existingBlobs(current.tree)
				: new Map();
			const entries = [];
			for (const [path, content] of rebasedFiles) {
				if (
					path.startsWith("/") ||
					path.split("/").some((part) => part === ".." || part === ".")
				)
					throw new Error(`Unsafe Pages artifact path: ${path}`);
				const bytes = Buffer.from(content, "utf8");
				if (bytes.byteLength > 500 * 1024)
					throw new Error(`Pages artifact exceeds the 500 KB limit: ${path}`);
				const gitSha = createHash("sha1")
					.update(`blob ${bytes.byteLength}\0`)
					.update(bytes)
					.digest("hex");
				if (existing.get(path) === gitSha) continue;
				const blob = await this.api<{ sha: string }>("/git/blobs", {
					method: "POST",
					body: JSON.stringify({
						content: bytes.toString("base64"),
						encoding: "base64",
					}),
				});
				entries.push({ path, mode: "100644", type: "blob", sha: blob.sha });
			}
			const tree = await this.api<{ sha: string }>("/git/trees", {
				method: "POST",
				body: JSON.stringify({
					...(current ? { base_tree: current.tree } : {}),
					tree: entries,
				}),
			});
			const commit = await this.api<{ sha: string }>("/git/commits", {
				method: "POST",
				body: JSON.stringify({
					message: `Publish O Fio ${editionId}`,
					tree: tree.sha,
					parents: current ? [current.sha] : [],
				}),
			});
			if (!current) {
				try {
					await this.api("/git/refs", {
						method: "POST",
						body: JSON.stringify({
							ref: `refs/heads/${this.config.contentBranch}`,
							sha: commit.sha,
						}),
					});
					return commit.sha;
				} catch (error) {
					if (
						attempt < 4 &&
						error instanceof Error &&
						error.message.startsWith("GitHub API 422:")
					)
						continue;
					throw error;
				}
			}
			try {
				await this.api(
					`/git/refs/heads/${encodeURIComponent(this.config.contentBranch)}`,
					{
						method: "PATCH",
						body: JSON.stringify({ sha: commit.sha, force: false }),
					},
				);
				return commit.sha;
			} catch (error) {
				if (
					attempt === 4 ||
					!(error instanceof Error) ||
					!error.message.startsWith("GitHub API 422:")
				)
					throw error;
			}
		}
		throw new Error(
			"Pages content branch changed during four consecutive update attempts",
		);
	}

	private async verifyPage(snapshot: SnapshotEnvelope): Promise<string> {
		const url = `${this.config.baseUrl}/edicoes/${snapshot.snapshot.window.day}/${snapshot.snapshot.window.kind}/`;
		const deadline = this.now() + PAGE_VERIFY_TIMEOUT_MS;
		let lastStatus = 0;
		while (this.now() < deadline) {
			const page = await this.fetchImpl(url, {
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			});
			lastStatus = page.status;
			if (page.ok) {
				const html = await page.text();
				if (!html.includes(snapshot.snapshot.window.day))
					throw new Error(
						"Published edition page does not contain its expected identity",
					);
				const response = await this.fetchImpl(
					`${this.config.baseUrl}/manifest.json`,
					{
						signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
					},
				);
				if (response.ok) {
					const manifest = (await response.json()) as PublicManifest;
					const entry = manifest.editions?.find(
						(item) => item.editionId === snapshot.snapshot.editionId,
					);
					if (entry?.checksum === snapshot.checksum) {
						const pageCount = entry.pageCount ?? 1;
						if (
							!Number.isSafeInteger(pageCount) ||
							pageCount < 1 ||
							pageCount > MAX_EDITION_PAGES
						)
							throw new Error("Published edition has an invalid page count");
						let complete = true;
						for (let pageNumber = 2; pageNumber <= pageCount; pageNumber++) {
							if (this.now() >= deadline) {
								complete = false;
								break;
							}
							const continuation = await this.fetchImpl(
								`${url}${pageNumber}/`,
								{ signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) },
							);
							if (
								!continuation.ok ||
								!(await continuation.text()).includes(
									snapshot.snapshot.window.day,
								)
							) {
								complete = false;
								break;
							}
						}
						if (complete) return url;
					}
				}
			}
			await sleep(5_000);
		}
		throw new Error(
			`Published edition was not verified before the deadline (HTTP ${lastStatus})`,
		);
	}

	async publish(
		snapshot: SnapshotEnvelope,
		files: Map<string, string>,
	): Promise<PagesPublication> {
		// GitHub Pages builds straight from the gh-pages branch, so the commit is the deploy.
		const commit = await this.commitSite(files, snapshot.snapshot.editionId);
		return { commit, url: await this.verifyPage(snapshot) };
	}

	verifyPublished(snapshot: SnapshotEnvelope): Promise<string> {
		return this.verifyPage(snapshot);
	}
}
