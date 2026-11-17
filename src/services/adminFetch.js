const KEY = "fastNewsAdminToken";

function readToken() {
	try {
		return localStorage.getItem(KEY) || "";
	} catch {
		return "";
	}
}

function withToken(init, token) {
	const headers = new Headers(init.headers || {});
	if (token) headers.set("x-admin-token", token);
	return { ...init, headers };
}

/**
 * Escritas da API (feeds, tópicos, envio ao Telegram) exigem ADMIN_TOKEN.
 * O token fica só neste navegador; na primeira recusa, pede e tenta de novo.
 */
export async function adminFetch(url, init = {}) {
	const res = await fetch(url, withToken(init, readToken()));
	if (res.status !== 401) return res;
	const token = window.prompt("Token de admin do fast-news:");
	if (!token) return res;
	try {
		localStorage.setItem(KEY, token);
	} catch {
		// sem storage: o token vale só para esta tentativa
	}
	return fetch(url, withToken(init, token));
}
