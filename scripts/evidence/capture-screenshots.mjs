/**
 * Renders the app against the demo API and saves HiDPI screenshots.
 *
 *   pnpm build && pnpm preview --port 4173 &
 *   node scripts/evidence/capture-screenshots.mjs --out docs/screenshots/after
 *
 * Options: --base <url> (default http://localhost:4173), --out <dir>,
 * --only <name-substring>.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { mockDemoApi } from "./demoApi.mjs";

const args = Object.fromEntries(
	process.argv
		.slice(2)
		.map((a, i, all) => (a.startsWith("--") ? [a.slice(2), all[i + 1]] : null))
		.filter(Boolean),
);
const base = args.base ?? "http://localhost:4173";
const out = path.resolve(args.out ?? "docs/screenshots/after");
const only = args.only;
mkdirSync(out, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const FROZEN_NOW = new Date("2026-11-10T12:05:00Z");

const executablePath = process.env.PW_CHROMIUM ?? undefined;
const browser = await chromium.launch({ executablePath });

async function open({
	viewport,
	theme,
	mobile = false,
	reducedMotion = "reduce",
}) {
	const context = await browser.newContext({
		viewport,
		deviceScaleFactor: 2,
		isMobile: mobile,
		hasTouch: mobile,
		locale: "pt-BR",
		timezoneId: "America/Sao_Paulo",
		reducedMotion,
	});
	await context.addInitScript((t) => localStorage.setItem("theme", t), theme);
	await mockDemoApi(context);
	const page = await context.newPage();
	await page.clock.setFixedTime(FROZEN_NOW);
	await page.goto(base, { waitUntil: "networkidle" });
	await page.evaluate(() => document.fonts.ready);
	return { context, page };
}

async function settle(page, ms = 900) {
	await page.waitForLoadState("networkidle").catch(() => {});
	await page.waitForTimeout(ms);
}

async function shot(page, name, options = {}) {
	await page.screenshot({ path: path.join(out, `${name}.png`), ...options });
	console.log(`saved ${name}.png`);
}

/** Switches the desktop view and parks the view strip right under the header. */
async function tab(page, label) {
	const button = page.getByRole("button", { name: label, exact: true }).first();
	await button.click();
	await settle(page);
	await button.evaluate((el) => {
		const header = document.querySelector("header");
		const offset = (header?.getBoundingClientRect().height ?? 0) + 12;
		window.scrollTo(
			0,
			el.getBoundingClientRect().top + window.scrollY - offset,
		);
	});
}

const SCENES = {
	"home-desktop-dark": async () => {
		const { context, page } = await open({ viewport: DESKTOP, theme: "dark" });
		await settle(page);
		await shot(page, "home-desktop-dark");
		await context.close();
	},
	"home-desktop-light": async () => {
		const { context, page } = await open({ viewport: DESKTOP, theme: "light" });
		await settle(page);
		await shot(page, "home-desktop-light");
		await context.close();
	},
	"feed-desktop-dark": async () => {
		const { context, page } = await open({ viewport: DESKTOP, theme: "dark" });
		await settle(page);
		await page.locator("article").nth(2).scrollIntoViewIfNeeded();
		await page.evaluate(() => {
			const first = document.querySelectorAll("article")[1];
			window.scrollTo(0, first.getBoundingClientRect().top + scrollY - 200);
		});
		await settle(page, 600);
		await shot(page, "feed-desktop-dark");
		await context.close();
	},
	"article-modal-desktop-dark": async () => {
		const { context, page } = await open({ viewport: DESKTOP, theme: "dark" });
		await settle(page);
		await page.locator('article button[title="Abrir artigo"]').first().click();
		await settle(page, 1200);
		await shot(page, "article-modal-desktop-dark");
		await context.close();
	},
	"stories-desktop-dark": async () => {
		const { context, page } = await open({ viewport: DESKTOP, theme: "dark" });
		await tab(page, "Histórias");
		await settle(page, 500);
		await shot(page, "stories-desktop-dark");
		await context.close();
	},
	"intelligence-desktop-dark": async () => {
		const { context, page } = await open({ viewport: DESKTOP, theme: "dark" });
		await tab(page, "Inteligência");
		await settle(page, 500);
		await shot(page, "intelligence-desktop-dark");
		await context.close();
	},
	"graph-desktop-dark": async () => {
		const { context, page } = await open({ viewport: DESKTOP, theme: "dark" });
		await tab(page, "Grafo");
		await settle(page, 2500);
		await shot(page, "graph-desktop-dark");
		await context.close();
	},
	"status-desktop-light": async () => {
		const { context, page } = await open({ viewport: DESKTOP, theme: "light" });
		await tab(page, "Status");
		await settle(page, 500);
		await shot(page, "status-desktop-light");
		await context.close();
	},
	"today-mobile-dark": async () => {
		const { context, page } = await open({
			viewport: MOBILE,
			theme: "dark",
			mobile: true,
		});
		await settle(page);
		await shot(page, "today-mobile-dark");
		await context.close();
	},
	"today-mobile-light": async () => {
		const { context, page } = await open({
			viewport: MOBILE,
			theme: "light",
			mobile: true,
		});
		await settle(page);
		await shot(page, "today-mobile-light");
		await context.close();
	},
	"trending-mobile-dark": async () => {
		const { context, page } = await open({
			viewport: MOBILE,
			theme: "dark",
			mobile: true,
		});
		await page.getByRole("button", { name: "Em alta" }).last().click();
		await settle(page);
		await shot(page, "trending-mobile-dark");
		await context.close();
	},
	"reader-mobile-dark": async () => {
		const { context, page } = await open({
			viewport: MOBILE,
			theme: "dark",
			mobile: true,
		});
		await settle(page);
		await page
			.locator("main button")
			.filter({ hasText: "Laboratório" })
			.first()
			.click();
		await settle(page, 1200);
		await shot(page, "reader-mobile-dark");
		await context.close();
	},
};

const extra = args.scenes
	? (await import(path.resolve(args.scenes))).default
	: {};
const scenes = {
	...SCENES,
	...(typeof extra === "function"
		? extra({ open, settle, shot, tab, DESKTOP, MOBILE })
		: extra),
};

let failed = 0;
for (const [name, run] of Object.entries(scenes)) {
	if (only && !name.includes(only)) continue;
	try {
		await run();
	} catch (err) {
		failed++;
		console.error(`FAILED ${name}: ${err.message.split("\n")[0]}`);
	}
}
await browser.close();
process.exit(failed ? 1 : 0);
