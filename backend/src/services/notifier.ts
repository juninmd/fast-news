import { config } from "../config/env.js";

export interface Notification {
	title: string;
	/** Plain text body. */
	body: string;
	url?: string;
}

export type ChannelName = "discord" | "slack" | "webhook" | "apprise" | "ntfy";

interface Channel {
	name: ChannelName;
	url: string;
	request(n: Notification): { headers: Record<string, string>; body: string };
}

const json = { "Content-Type": "application/json" };

// Discord caps message content at 2000 chars, Slack text at ~40k but renders badly past a few thousand.
function clip(s: string, max: number): string {
	return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

export function buildChannels(cfg = config.notify): Channel[] {
	const out: Channel[] = [];
	if (cfg.discordWebhookUrl)
		out.push({
			name: "discord",
			url: cfg.discordWebhookUrl,
			request: (n) => ({
				headers: json,
				body: JSON.stringify({
					content: clip(`**${n.title}**\n${n.body}`, 1990),
				}),
			}),
		});
	if (cfg.slackWebhookUrl)
		out.push({
			name: "slack",
			url: cfg.slackWebhookUrl,
			request: (n) => ({
				headers: json,
				body: JSON.stringify({ text: clip(`*${n.title}*\n${n.body}`, 3500) }),
			}),
		});
	if (cfg.webhookUrl)
		out.push({
			name: "webhook",
			url: cfg.webhookUrl,
			request: (n) => ({ headers: json, body: JSON.stringify(n) }),
		});
	if (cfg.appriseUrl)
		out.push({
			name: "apprise",
			url: cfg.appriseUrl,
			request: (n) => ({
				headers: json,
				body: JSON.stringify({ title: n.title, body: n.body, format: "text" }),
			}),
		});
	if (cfg.ntfyUrl)
		out.push({
			name: "ntfy",
			url: cfg.ntfyUrl,
			request: (n) => ({
				headers: {
					"Content-Type": "text/plain; charset=utf-8",
					// HTTP headers are ISO-8859-1; non-ASCII must be RFC 2047-encoded.
					Title: `=?UTF-8?B?${Buffer.from(n.title).toString("base64")}?=`,
					...(n.url ? { Click: n.url } : {}),
				},
				body: n.body,
			}),
		});
	return out;
}

export interface DeliveryReport {
	channel: ChannelName;
	ok: boolean;
	error?: string;
}

/** Sends to every configured channel; one failing channel never blocks the others. */
export async function notifyAll(
	n: Notification,
	channels: Channel[] = buildChannels(),
	timeoutMs = 10_000,
): Promise<DeliveryReport[]> {
	return Promise.all(
		channels.map(async (ch): Promise<DeliveryReport> => {
			const ac = new AbortController();
			const t = setTimeout(() => ac.abort(), timeoutMs);
			try {
				const { headers, body } = ch.request(n);
				const res = await fetch(ch.url, {
					method: "POST",
					headers,
					body,
					signal: ac.signal,
				});
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return { channel: ch.name, ok: true };
			} catch (err) {
				// Never log ch.url: webhook URLs are credentials.
				return { channel: ch.name, ok: false, error: (err as Error).message };
			} finally {
				clearTimeout(t);
			}
		}),
	);
}
