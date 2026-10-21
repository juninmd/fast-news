// No navegador o app fala com a mesma origem (proxy do Vite / backend que serve o
// build). Dentro do app nativo (Capacitor) a origem é local, então os caminhos
// "/api" e "/health" são reescritos para a API publicada.
export const API_URL = (
	import.meta.env.VITE_API_URL || "https://fast-news.antonio-code.duckdns.org"
).replace(/\/+$/, "");

const isNative = () => !!globalThis.Capacitor?.isNativePlatform?.();

export function resolveApiUrl(input) {
	if (typeof input === "string" && /^\/(api\/|health)/.test(input)) {
		return `${API_URL}${input}`;
	}
	return input;
}

export function installNativeFetch() {
	if (!isNative() || globalThis.fetch.__fastNews) return;
	const original = globalThis.fetch.bind(globalThis);
	const patched = (input, init) => original(resolveApiUrl(input), init);
	patched.__fastNews = true;
	globalThis.fetch = patched;
}
