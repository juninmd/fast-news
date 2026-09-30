import {
	existsSync,
	lstatSync,
	mkdirSync,
	readdirSync,
	realpathSync,
	writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, resolve, sep } from "node:path";
import { esc } from "./escape.js";
import { renderEditionHtml } from "./renderHtml.js";
import type { SnapshotEnvelope } from "./snapshot.js";
import { hydrateSnapshot, parseSnapshotEnvelope } from "./snapshot.js";
import type { Edition, Section } from "./types.js";

const KIND_ORDER = ["manha", "meiodia", "tarde", "noite"] as const;
const PAGE_SIZE = 30;
const EDITION_PAGE_SIZE = 100;
export const MAX_EDITION_PAGES = 100;

/** Bound each newspaper page without dropping stories or their source links. */
function editionPages(edition: Edition): Section[][] {
	const pages: Section[][] = [[]];
	let count = 0;
	for (const section of edition.draft.secoes) {
		let offset = 0;
		do {
			if (count === EDITION_PAGE_SIZE) {
				pages.push([]);
				count = 0;
			}
			const materias = section.materias.slice(
				offset,
				offset + EDITION_PAGE_SIZE - count,
			);
			pages[pages.length - 1]!.push({
				...section,
				materias,
				notas: offset === 0 ? section.notas : [],
			});
			offset += materias.length;
			count += Math.max(1, materias.length);
		} while (offset < section.materias.length);
	}
	return pages;
}

function pagination(url: string, index: number, count: number): string {
	if (count === 1) return "";
	const links = Array.from({ length: count }, (_, i) => {
		const href = i === 0 ? url : `${url}${i + 1}/`;
		return `<a href="${esc(href)}"${i === index ? ' aria-current="page"' : ""}>${i + 1}</a>`;
	}).join(" · ");
	return `<nav class="edition-search" aria-label="Páginas desta edição"><span>Página ${index + 1} de ${count}</span>${links}</nav>`;
}

function basePath(baseUrl: string): string {
	const url = new URL(baseUrl);
	if (url.protocol !== "https:")
		throw new Error("GitHub Pages base URL must use HTTPS");
	if (url.username || url.password || url.search || url.hash)
		throw new Error(
			"GitHub Pages base URL cannot include credentials, query, or fragment",
		);
	const path = url.pathname.replace(/\/+$/, "");
	if (path.split("/").some((part) => part === "." || part === ".."))
		throw new Error("Invalid GitHub Pages base path");
	return path;
}

function editionPath(snapshot: SnapshotEnvelope["snapshot"]): string {
	return `edicoes/${snapshot.window.day}/${snapshot.window.kind}/index.html`;
}

function editionUrl(
	prefix: string,
	snapshot: SnapshotEnvelope["snapshot"],
): string {
	return `${prefix}/${editionPath(snapshot).replace(/index\.html$/, "")}`;
}

function sorted(envelopes: SnapshotEnvelope[]): SnapshotEnvelope[] {
	return envelopes.map(parseSnapshotEnvelope).sort((a, b) => {
		const byDay = b.snapshot.window.day.localeCompare(a.snapshot.window.day);
		if (byDay) return byDay;
		const byWindow = b.snapshot.window.end.localeCompare(a.snapshot.window.end);
		if (byWindow) return byWindow;
		return (
			KIND_ORDER.indexOf(b.snapshot.window.kind) -
			KIND_ORDER.indexOf(a.snapshot.window.kind)
		);
	});
}

function decorateEdition(html: string, base: string, url: string): string {
	const additions = `<base href="${esc(base)}/"><meta name="description" content="O Fio: jornal completo desta edição, com matérias, notas e fontes."><meta property="og:type" content="article"><meta property="og:title" content="O Fio — jornal completo"><meta property="og:description" content="Leia a edição completa de O Fio, com matérias, notas e fontes."><meta property="og:url" content="${esc(url)}"><link rel="canonical" href="${esc(url)}">`;
	const nav = `<a class="site-skip" href="#main-content">Pular para o conteúdo</a><nav class="site-nav" aria-label="Navegação do jornal"><a href="${esc(base)}/ultima/">Última edição</a><a href="${esc(base)}/arquivo/">Arquivo</a></nav><form class="edition-search" role="search"><label for="edition-search">Buscar título ou tema nesta edição</label><input id="edition-search" type="search" autocomplete="off"><output id="edition-search-status" aria-live="polite"></output></form>`;
	const script = `<script>(()=>{const field=document.getElementById('edition-search');const status=document.getElementById('edition-search-status');const items=[...document.querySelectorAll('main.wrap article')];const fold=value=>value.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLocaleLowerCase('pt-BR');field?.addEventListener('input',()=>{const query=fold(field.value.trim());let count=0;for(const item of items){const section=item.closest('.sec')?.querySelector('.sec-h h2')?.textContent||'';const match=!query||fold((item.textContent||'')+' '+section).includes(query);item.hidden=!match;if(match)count++}status.textContent=query?count+' resultado(s)':'Todos os assuntos visíveis'});document.querySelector('.edition-search')?.addEventListener('submit',event=>event.preventDefault())})()</script>`;
	return html
		.replace("<head>", `<head>${additions}`)
		.replace(
			'<main class="wrap">',
			`<main class="wrap" id="main-content">${nav}`,
		)
		.replace("</body>", `${script}</body>`);
}

function page(title: string, base: string, body: string): string {
	return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${esc(title)} — O Fio"><title>${esc(title)} · O Fio</title><style>
:root{color-scheme:light dark;font-family:Georgia,"Times New Roman",serif;background:#f3f5f2;color:#12181e}body{max-width:900px;margin:0 auto;padding:24px 18px 56px;line-height:1.55}a{color:#2146c7;text-underline-offset:3px}a:focus-visible{outline:3px solid #2146c7;outline-offset:3px}.site-skip{position:absolute;left:-10000px;top:8px;background:#f3f5f2;padding:8px;z-index:5}.site-skip:focus{left:8px}.brand{font-size:clamp(3rem,12vw,6rem);font-weight:400;line-height:1;margin:0;border-bottom:3px double;padding-bottom:12px}.brand i{color:#2146c7}.nav{display:flex;gap:1rem;padding:12px 0;border-bottom:1px solid}.edition{padding:14px 0;border-bottom:1px solid #c5ccc7}.edition h2{margin:0;font-size:1.25rem}.muted{color:#56606b}@media(prefers-color-scheme:dark){:root{background:#0d1320;color:#ebe7dc}a{color:#f2a93b}.muted{color:#9ba4b3}}
</style></head><body><a class="site-skip" href="#main-content">Pular para o conteúdo</a><header><p class="brand">O <i>F</i>io</p><nav class="nav" aria-label="Navegação principal"><a href="${esc(base)}/ultima/">Última edição</a><a href="${esc(base)}/arquivo/">Arquivo</a></nav></header><main id="main-content"><h1>${esc(title)}</h1>${body}</main></body></html>`;
}

export interface PublicManifest {
	schemaVersion: 1;
	generatedAt: string;
	latestEditionId: string;
	editions: Array<{
		editionId: string;
		url: string;
		checksum: string;
		windowEnd: string;
		pageCount?: number;
	}>;
}

function manifestPages(
	prefix: string,
	manifest: PublicManifest,
): Map<string, string> {
	const files = new Map<string, string>();
	const latest = manifest.editions.find(
		(entry) => entry.editionId === manifest.latestEditionId,
	);
	if (!latest) throw new Error("Public manifest has no latest edition entry");
	files.set(
		"ultima/index.html",
		page(
			"Última edição",
			prefix,
			`<p class="muted">${esc(latest.editionId.replace(":", " · edição "))}</p><p>O jornal completo desta edição está disponível sem download.</p><p><a href="${esc(latest.url)}">Ler O Fio completo</a></p>`,
		),
	);
	const archivePages = Math.ceil(manifest.editions.length / PAGE_SIZE);
	for (let pageIndex = 0; pageIndex < archivePages; pageIndex++) {
		const slice = manifest.editions.slice(
			pageIndex * PAGE_SIZE,
			(pageIndex + 1) * PAGE_SIZE,
		);
		const items = slice
			.map((entry) => {
				const [day, kind] = entry.editionId.split(":");
				return `<article class="edition"><h2><a href="${esc(entry.url)}">${esc(day)} · ${esc(kind)}</a></h2><p class="muted">Período final ${esc(entry.windowEnd)}</p></article>`;
			})
			.join("");
		const links = Array.from({ length: archivePages }, (_, index) => {
			const href =
				index === 0 ? `${prefix}/arquivo/` : `${prefix}/arquivo/${index + 1}/`;
			return `<a href="${esc(href)}"${index === pageIndex ? ' aria-current="page"' : ""}>${index + 1}</a>`;
		}).join(" · ");
		const path =
			pageIndex === 0
				? "arquivo/index.html"
				: `arquivo/${pageIndex + 1}/index.html`;
		files.set(
			path,
			page(
				"Arquivo de edições",
				prefix,
				`<p>Jornais publicados mais recentes primeiro.</p>${items}<nav aria-label="Páginas do arquivo">${links}</nav>`,
			),
		);
	}
	return files;
}

/** Merge concurrent writers against the latest branch manifest without dropping older editions. */
export function mergeStaticSiteArtifacts(
	files: Map<string, string>,
	baseUrl: string,
	previous?: PublicManifest | null,
): Map<string, string> {
	const prefix = basePath(baseUrl);
	const current = JSON.parse(
		files.get("manifest.json") ?? "null",
	) as PublicManifest | null;
	if (
		!current ||
		current.schemaVersion !== 1 ||
		!Array.isArray(current.editions)
	)
		throw new Error("Static site is missing a valid edition manifest");
	const merged = new Map<string, PublicManifest["editions"][number]>();
	for (const item of [...(previous?.editions ?? []), ...current.editions]) {
		if (
			!/^[0-9]{4}-[0-9]{2}-[0-9]{2}:(manha|meiodia|tarde|noite)$/.test(
				item.editionId,
			) ||
			!/^[0-9a-f]{64}$/.test(item.checksum) ||
			!Number.isFinite(new Date(item.windowEnd).getTime())
		)
			throw new Error("Invalid public manifest entry");
		if (
			item.pageCount !== undefined &&
			(!Number.isSafeInteger(item.pageCount) ||
				item.pageCount < 1 ||
				item.pageCount > MAX_EDITION_PAGES)
		)
			throw new Error("Invalid public manifest page count");
		const expectedUrl = `${baseUrl.replace(/\/+$/, "")}/edicoes/${item.editionId.replace(":", "/")}/`;
		if (item.url !== expectedUrl)
			throw new Error("Public manifest contains an unexpected edition URL");
		const existing = merged.get(item.editionId);
		if (existing && existing.checksum !== item.checksum)
			throw new Error(`Published edition ${item.editionId} is immutable`);
		merged.set(item.editionId, item);
	}
	const editions = [...merged.values()].sort(
		(a, b) =>
			b.windowEnd.localeCompare(a.windowEnd) ||
			b.editionId.localeCompare(a.editionId),
	);
	const latest = editions[0];
	if (!latest) throw new Error("Cannot publish an empty edition archive");
	const manifest: PublicManifest = {
		schemaVersion: 1,
		generatedAt: current.generatedAt,
		latestEditionId: latest.editionId,
		editions,
	};
	files.set("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
	for (const [path, html] of manifestPages(prefix, manifest))
		files.set(path, html);
	return files;
}

export function buildStaticEditionSite(
	input: SnapshotEnvelope[],
	baseUrl: string,
	generatedAt = new Date(),
): Map<string, string> {
	const prefix = basePath(baseUrl);
	if (!input.length) throw new Error("Cannot publish an empty edition archive");
	const envelopes = sorted(input);
	const ids = new Set<string>();
	for (const { snapshot } of envelopes) {
		if (ids.has(snapshot.editionId))
			throw new Error(`Duplicate edition ${snapshot.editionId}`);
		ids.add(snapshot.editionId);
	}
	const latest = envelopes[0];
	if (!latest) throw new Error("Cannot publish an empty edition archive");
	const output = new Map<string, string>();
	const pageCounts = new Map<string, number>();

	for (const envelope of envelopes) {
		const edition = hydrateSnapshot(envelope);
		const pages = editionPages(edition);
		if (pages.length > MAX_EDITION_PAGES)
			throw new Error("Edition exceeds the maximum number of pages");
		pageCounts.set(envelope.snapshot.editionId, pages.length);
		const url = `${baseUrl.replace(/\/+$/, "")}/${editionPath(envelope.snapshot).replace(/index\.html$/, "")}`;
		for (const [index, secoes] of pages.entries()) {
			const pageUrl = index === 0 ? url : `${url}${index + 1}/`;
			const nav = pagination(url, index, pages.length);
			const html = decorateEdition(
				renderEditionHtml(
					{ ...edition, draft: { ...edition.draft, secoes } },
					index > 0,
				),
				prefix,
				pageUrl,
			)
				.replace("</header>", `</header>${nav}`)
				.replace("<footer", `${nav}<footer`)
				.replace(
					"Buscar título ou tema nesta edição",
					pages.length > 1
						? "Buscar título ou tema nesta página"
						: "Buscar título ou tema nesta edição",
				);
			if (Buffer.byteLength(html, "utf8") > 500 * 1024)
				throw new Error(
					`Edition ${envelope.snapshot.editionId} page ${index + 1} exceeds the 500 KB page budget`,
				);
			const path =
				index === 0
					? editionPath(envelope.snapshot)
					: editionPath(envelope.snapshot).replace(
							"index.html",
							`${index + 1}/index.html`,
						);
			output.set(path, html);
		}
	}

	const latestUrl = editionUrl(prefix, latest.snapshot);
	const latestHtml = page(
		"Última edição",
		prefix,
		`<p class="muted">${esc(latest.snapshot.window.day)} · edição ${esc(latest.snapshot.window.kind)}</p><p>O jornal completo desta edição está disponível sem download.</p><p><a href="${esc(latestUrl)}">Ler O Fio completo</a></p>`,
	);
	output.set("ultima/index.html", latestHtml);

	const archivePages = Math.ceil(envelopes.length / PAGE_SIZE);
	for (let pageIndex = 0; pageIndex < archivePages; pageIndex++) {
		const slice = envelopes.slice(
			pageIndex * PAGE_SIZE,
			(pageIndex + 1) * PAGE_SIZE,
		);
		const items = slice
			.map(({ snapshot }) => {
				const url = editionUrl(prefix, snapshot);
				return `<article class="edition"><h2><a href="${esc(url)}">${esc(snapshot.window.day)} · ${esc(snapshot.window.kind)}</a></h2><p class="muted">Período ${esc(snapshot.window.start.slice(11, 16))}–${esc(snapshot.window.end.slice(11, 16))} UTC</p></article>`;
			})
			.join("");
		const links = Array.from({ length: archivePages }, (_, index) => {
			const href =
				index === 0 ? `${prefix}/arquivo/` : `${prefix}/arquivo/${index + 1}/`;
			return `<a href="${esc(href)}"${index === pageIndex ? ' aria-current="page"' : ""}>${index + 1}</a>`;
		}).join(" · ");
		const path =
			pageIndex === 0
				? "arquivo/index.html"
				: `arquivo/${pageIndex + 1}/index.html`;
		output.set(
			path,
			page(
				"Arquivo de edições",
				prefix,
				`<p>Jornais publicados mais recentes primeiro.</p>${items}<nav aria-label="Páginas do arquivo">${links}</nav>`,
			),
		);
	}

	const manifest: PublicManifest = {
		schemaVersion: 1,
		generatedAt: generatedAt.toISOString(),
		latestEditionId: latest.snapshot.editionId,
		editions: envelopes.map(({ snapshot, checksum }) => ({
			editionId: snapshot.editionId,
			url: `${baseUrl.replace(/\/+$/, "")}/${editionPath(snapshot).replace(/index\.html$/, "")}`,
			checksum,
			windowEnd: snapshot.window.end,
			pageCount: pageCounts.get(snapshot.editionId)!,
		})),
	};
	output.set("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
	return mergeStaticSiteArtifacts(output, baseUrl);
}

/** Writes a preview to an explicit directory without deleting existing files. */
export function writeStaticSitePreview(
	files: Map<string, string>,
	directory: string,
): void {
	if (!isAbsolute(directory))
		throw new Error("EDITION_SITE_PREVIEW_DIR must be an absolute path");
	mkdirSync(directory, { recursive: true });
	const root = realpathSync(directory);
	const marker = resolve(root, ".o-fio-preview");
	if (existsSync(marker)) {
		if (!lstatSync(marker).isFile())
			throw new Error("Preview ownership marker is not a regular file");
	} else {
		if (readdirSync(root).length > 0)
			throw new Error(
				"Preview output must be empty or previously created by O Fio",
			);
		writeFileSync(marker, "", { encoding: "utf8", flag: "wx" });
	}
	for (const [path, content] of files) {
		if (
			path.startsWith("/") ||
			path.split("/").some((part) => !part || part === "." || part === "..")
		)
			throw new Error(`Unsafe static site path: ${path}`);
		const target = resolve(root, ...path.split("/"));
		if (!target.startsWith(`${root}${sep}`))
			throw new Error(`Static site path escaped output directory: ${path}`);
		const parent = dirname(target);
		mkdirSync(parent, { recursive: true });
		const realParent = realpathSync(parent);
		if (!realParent.startsWith(root))
			throw new Error(`Static site path escaped through a symlink: ${path}`);
		if (existsSync(target) && lstatSync(target).isSymbolicLink())
			throw new Error(`Refusing to follow an artifact symlink: ${path}`);
		writeFileSync(target, content, { encoding: "utf8", flag: "w" });
	}
}
