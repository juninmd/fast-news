import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * fetch para URLs vindas de feeds (conteúdo de terceiros): bloqueia destinos
 * internos — IP privado, loopback, link-local (metadata 169.254.169.254) e nomes
 * do cluster — inclusive em cada redirect, para um item de feed não fazer o
 * backend chamar Redis, Postgres ou o LiteLLM por dentro.
 */
const INTERNAL_NAME = /(^|\.)(localhost|local|internal|cluster\.local|svc)$/i;
const MAX_REDIRECTS = 5;

function ipv4Blocked(ip: string): boolean {
	const [a = 0, b = 0] = ip.split(".").map(Number);
	return (
		a === 0 ||
		a === 10 ||
		a === 127 ||
		(a === 100 && b >= 64 && b <= 127) ||
		(a === 169 && b === 254) ||
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 168) ||
		(a === 192 && b === 0) ||
		a >= 224
	);
}

export function isBlockedAddress(ip: string): boolean {
	const v = isIP(ip);
	if (v === 4) return ipv4Blocked(ip);
	if (v === 6) {
		const lower = ip.toLowerCase();
		const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower)?.[1];
		if (mapped) return ipv4Blocked(mapped);
		// Só unicast global (2000::/3) é roteável na internet pública.
		return !/^[23][0-9a-f]{0,3}:/.test(lower);
	}
	return true;
}

type Resolver = (host: string) => Promise<string[]>;
let resolve: Resolver = async (host) =>
	(await lookup(host, { all: true, verbatim: true })).map((a) => a.address);

/** Só para testes. */
export function setResolverForTests(fn: Resolver | null): void {
	resolve =
		fn ??
		(async (host) =>
			(await lookup(host, { all: true, verbatim: true })).map(
				(a) => a.address,
			));
}

export async function assertPublicUrl(raw: string): Promise<URL> {
	const url = new URL(raw);
	if (url.protocol !== "http:" && url.protocol !== "https:")
		throw new Error(`blocked scheme: ${url.protocol}`);
	const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
	if (!host || INTERNAL_NAME.test(host) || (!host.includes(".") && !isIP(host)))
		throw new Error(`blocked host: ${host}`);
	const addresses = isIP(host) ? [host] : await resolve(host);
	if (!addresses.length || addresses.some(isBlockedAddress))
		throw new Error(`blocked address for ${host}`);
	return url;
}

export async function safeFetch(
	raw: string,
	init: RequestInit = {},
): Promise<Response> {
	let current = raw;
	for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
		const url = await assertPublicUrl(current);
		const res = await fetch(url, { ...init, redirect: "manual" });
		const location = res.headers.get("location");
		if (res.status >= 300 && res.status < 400 && location) {
			current = new URL(location, url).toString();
			continue;
		}
		return res;
	}
	throw new Error("too many redirects");
}
