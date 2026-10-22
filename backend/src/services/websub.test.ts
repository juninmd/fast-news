import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
	config: { websub: { hubUrl: "" }, publicUrl: "https://n.test/" },
}));

const { pingWebSubHub, publicFeedUrls } = await import("./websub.js");

afterEach(() => vi.unstubAllGlobals());

describe("pingWebSubHub", () => {
	it("is a no-op without a hub", async () => {
		const f = vi.fn();
		vi.stubGlobal("fetch", f);
		expect(await pingWebSubHub(["https://n.test/api/feed.xml"], "")).toBe(
			false,
		);
		expect(f).not.toHaveBeenCalled();
	});
	it("posts hub.mode=publish with every feed url", async () => {
		const f = vi.fn(async () => ({ ok: true }));
		vi.stubGlobal("fetch", f);
		expect(await pingWebSubHub(publicFeedUrls(), "https://hub.test/")).toBe(
			true,
		);
		const init = (
			f.mock.calls[0] as unknown as [string, { body: URLSearchParams }]
		)[1];
		expect(init.body.get("hub.mode")).toBe("publish");
		expect(init.body.getAll("hub.url")).toEqual([
			"https://n.test/api/feed.xml",
			"https://n.test/api/feed.json",
		]);
	});
	it("swallows network errors", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("down");
			}),
		);
		expect(await pingWebSubHub(["u"], "https://hub.test/")).toBe(false);
	});
});
