import { afterEach, describe, expect, it, vi } from "vitest";
import {
	assertPublicUrl,
	isBlockedAddress,
	safeFetch,
	setResolverForTests,
} from "./safeFetch.js";

afterEach(() => {
	setResolverForTests(null);
	vi.restoreAllMocks();
});

describe("safeFetch (SSRF)", () => {
	it.each([
		"127.0.0.1",
		"10.0.0.5",
		"172.20.1.1",
		"192.168.0.10",
		"169.254.169.254",
		"100.64.0.1",
		"0.0.0.0",
		"::1",
		"fd00::1",
		"::ffff:127.0.0.1",
	])("bloqueia %s", (ip) => {
		expect(isBlockedAddress(ip)).toBe(true);
	});

	it("aceita IP público", () => {
		expect(isBlockedAddress("8.8.8.8")).toBe(false);
		expect(isBlockedAddress("2606:4700::1111")).toBe(false);
	});

	it.each([
		"http://127.0.0.1:6379/",
		"http://169.254.169.254/latest/meta-data/",
		"http://redis:6379/",
		"http://litellm.ai.svc.cluster.local:4000/v1/models",
		"http://localhost/",
		"file:///etc/passwd",
	])("recusa %s", async (url) => {
		setResolverForTests(async () => ["93.184.216.34"]);
		await expect(assertPublicUrl(url)).rejects.toThrow(/blocked/);
	});

	it("recusa nome que resolve para IP interno (DNS)", async () => {
		setResolverForTests(async () => ["10.43.0.12"]);
		await expect(assertPublicUrl("https://evil.example/")).rejects.toThrow(
			/blocked address/,
		);
	});

	it("redirect para destino interno é recusado", async () => {
		setResolverForTests(async () => ["93.184.216.34"]);
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(null, {
				status: 302,
				headers: { location: "http://169.254.169.254/" },
			}),
		);
		await expect(safeFetch("https://news.example/a")).rejects.toThrow(
			/blocked/,
		);
	});

	it("segue redirect público", async () => {
		setResolverForTests(async () => ["93.184.216.34"]);
		const spy = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValueOnce(
				new Response(null, {
					status: 301,
					headers: { location: "/b" },
				}),
			)
			.mockResolvedValueOnce(new Response("ok"));
		const res = await safeFetch("https://news.example/a");
		expect(await res.text()).toBe("ok");
		expect(String(spy.mock.calls[1]?.[0])).toBe("https://news.example/b");
	});
});
