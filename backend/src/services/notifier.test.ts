import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({ config: { notify: {} } }));

const { buildChannels, notifyAll } = await import("./notifier.js");

const cfg = {
	discordWebhookUrl: "https://discord.test/hook",
	slackWebhookUrl: "https://slack.test/hook",
	webhookUrl: "",
	appriseUrl: "https://apprise.test/notify",
	ntfyUrl: "https://ntfy.test/topic",
	digestPeriods: [],
};

afterEach(() => vi.unstubAllGlobals());

describe("buildChannels", () => {
	it("creates only configured channels", () => {
		expect(buildChannels(cfg).map((c) => c.name)).toEqual([
			"discord",
			"slack",
			"apprise",
			"ntfy",
		]);
		expect(
			buildChannels({
				...cfg,
				discordWebhookUrl: "",
				slackWebhookUrl: "",
				appriseUrl: "",
				ntfyUrl: "",
			}),
		).toEqual([]);
	});
	it("clips long messages to the Discord limit", () => {
		const [discord] = buildChannels(cfg);
		const body = JSON.parse(
			discord!.request({ title: "T", body: "x".repeat(5000) }).body,
		);
		expect(body.content.length).toBeLessThanOrEqual(2000);
	});
	it("encodes non-ASCII ntfy titles for the header", () => {
		const ntfy = buildChannels(cfg).find((c) => c.name === "ntfy")!;
		expect(
			ntfy.request({ title: "Edição", body: "b" }).headers["Title"],
		).toMatch(/^=\?UTF-8\?B\?/);
	});
});

describe("notifyAll", () => {
	it("isolates failures and never leaks the webhook url", async () => {
		const fetchMock = vi.fn(async (url: string) => {
			if (url.includes("discord")) throw new Error("boom");
			return { ok: !url.includes("slack") ? true : false, status: 500 };
		});
		vi.stubGlobal("fetch", fetchMock);
		const reports = await notifyAll(
			{ title: "T", body: "B" },
			buildChannels(cfg),
		);
		expect(reports.find((r) => r.channel === "discord")).toMatchObject({
			ok: false,
			error: "boom",
		});
		expect(reports.find((r) => r.channel === "slack")).toMatchObject({
			ok: false,
			error: "HTTP 500",
		});
		expect(reports.find((r) => r.channel === "apprise")?.ok).toBe(true);
		expect(JSON.stringify(reports)).not.toContain("hook");
	});
});
