import { articleSlug } from "./renderMarkdown.js";
import type { SnapshotEnvelope } from "./snapshot.js";

const API = "https://api.github.com";
const REQUEST_TIMEOUT_MS = 20_000;
// Pushing the article triggers the Pages workflow (VitePress build + deploy).
const PAGE_VERIFY_TIMEOUT_MS = 10 * 60_000;
const VERIFY_INTERVAL_MS = 10_000;
export const ARTICLE_DIR = "site/edicoes";

interface RepositoryConfig {
	token: string;
	owner: string;
	repo: string;
	branch: string;
	baseUrl: string;
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
	const branch = process.env["EDITION_PAGES_BRANCH"] ?? "main";
	if (!/^[A-Za-z0-9_./-]+$/.test(branch) || branch.includes(".."))
		throw new Error("EDITION_PAGES_BRANCH is not a valid branch name");
	const url = new URL(baseUrl);
	if (url.protocol !== "https:")
		throw new Error("EDITION_PAGES_BASE_URL must use HTTPS");
	return {
		token,
		owner: match[1]!,
		repo: match[2]!,
		branch,
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

/**
 * Publishes each edition as one markdown article of the VitePress site under
 * `site/edicoes/`. The commit is the trigger: the Pages workflow builds and
 * deploys the site, so the URL is only verified after the deploy lands.
 */
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
		return (await response.json()) as T;
	}

	articleUrl(snapshot: SnapshotEnvelope): string {
		return `${this.config.baseUrl}/edicoes/${articleSlug(snapshot.snapshot.window)}`;
	}

	/** Commits the article. A published edition is immutable: an existing file is left untouched. */
	private async commitArticle(
		snapshot: SnapshotEnvelope,
		markdown: string,
	): Promise<string> {
		const slug = articleSlug(snapshot.snapshot.window);
		const path = `${ARTICLE_DIR}/${slug}.md`;
		const target = `/contents/${path}`;
		const ref = encodeURIComponent(this.config.branch);
		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				const existing = await this.api<{ sha: string }>(
					`${target}?ref=${ref}`,
				);
				return existing.sha;
			} catch (error) {
				if (
					!(error instanceof Error) ||
					!error.message.startsWith("GitHub API 404:")
				)
					throw error;
			}
			try {
				const created = await this.api<{ commit: { sha: string } }>(target, {
					method: "PUT",
					body: JSON.stringify({
						message: `Publish O Fio ${snapshot.snapshot.editionId}`,
						content: Buffer.from(markdown, "utf8").toString("base64"),
						branch: this.config.branch,
					}),
				});
				return created.commit.sha;
			} catch (error) {
				// 409/422: branch moved or the file appeared concurrently; re-check and retry.
				if (
					attempt === 3 ||
					!(error instanceof Error) ||
					!/^GitHub API (409|422):/.test(error.message)
				)
					throw error;
			}
		}
		throw new Error("Pages article commit failed after three attempts");
	}

	async verifyPublished(snapshot: SnapshotEnvelope): Promise<string> {
		const url = this.articleUrl(snapshot);
		const deadline = this.now() + PAGE_VERIFY_TIMEOUT_MS;
		let lastStatus = 0;
		while (this.now() < deadline) {
			const page = await this.fetchImpl(url, {
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			});
			lastStatus = page.status;
			if (page.ok) {
				if (!(await page.text()).includes(snapshot.snapshot.window.day))
					throw new Error(
						"Published edition page does not contain its expected identity",
					);
				return url;
			}
			await sleep(VERIFY_INTERVAL_MS);
		}
		throw new Error(
			`Published edition was not verified before the deadline (HTTP ${lastStatus})`,
		);
	}

	async publish(
		snapshot: SnapshotEnvelope,
		markdown: string,
	): Promise<PagesPublication> {
		const commit = await this.commitArticle(snapshot, markdown);
		return { commit, url: await this.verifyPublished(snapshot) };
	}
}
