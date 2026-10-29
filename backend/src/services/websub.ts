import { config } from "../config/env.js";

/**
 * WebSub publisher ping: tells the hub the feed changed so subscribers are
 * pushed instead of polling. A no-op unless WEBSUB_HUB_URL is set.
 */
export async function pingWebSubHub(
	feedUrls: string[],
	hubUrl: string = config.websub.hubUrl,
	timeoutMs = 10_000,
): Promise<boolean> {
	if (!hubUrl || feedUrls.length === 0) return false;
	const ac = new AbortController();
	const t = setTimeout(() => ac.abort(), timeoutMs);
	try {
		const body = new URLSearchParams({ "hub.mode": "publish" });
		for (const u of feedUrls) body.append("hub.url", u);
		const res = await fetch(hubUrl, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body,
			signal: ac.signal,
		});
		// Hubs answer 204 (or 200) when the publish is accepted.
		return res.ok;
	} catch (err) {
		console.warn("[websub] ping failed:", (err as Error).message);
		return false;
	} finally {
		clearTimeout(t);
	}
}

export function publicFeedUrls(publicUrl: string = config.publicUrl): string[] {
	const base = publicUrl.replace(/\/$/, "");
	return [`${base}/api/feed.xml`, `${base}/api/feed.json`];
}
