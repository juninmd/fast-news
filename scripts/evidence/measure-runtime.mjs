/**
 * Runtime measurements against a production build served by `vite preview`,
 * with the demo API standing in for the backend.
 *
 *   pnpm build && pnpm preview --port 4173 &
 *   node scripts/evidence/measure-runtime.mjs --out docs/benchmarks/after.json
 *
 * What is measured (desktop 1440x900, CPU throttled 4x, median of --runs):
 *  - load: FCP, LCP, CLS, long tasks, bytes and request count per resource type
 *  - React work per interaction: commits and components that re-rendered,
 *    read from the DevTools hook React calls on every commit (works in
 *    production builds; counts fibers flagged PerformedWork).
 */
import { mkdirSync, writeFileSync } from "node:fs";
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
const runs = Number(args.runs ?? 5);
const cpu = Number(args.cpu ?? 4);

/** Installed before any app code: counts commits and re-rendered components. */
function installReactProbe() {
	const PERFORMED_WORK = 1;
	const probe = { commits: 0, renders: 0, byName: {} };
	const nameOf = (fiber) => {
		const t = fiber.type;
		if (!t) return null;
		if (typeof t === "function") return t.displayName || t.name || "Anonymous";
		if (typeof t === "object")
			return (
				t.displayName ||
				t.type?.displayName ||
				t.type?.name ||
				t.render?.name ||
				null
			);
		return null;
	};
	window.__reactProbe = probe;
	window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
		supportsFiber: true,
		isDisabled: false,
		renderers: new Map(),
		inject: () => 1,
		checkDCE() {},
		onCommitFiberUnmount() {},
		onPostCommitFiberRoot() {},
		onCommitFiberRoot(_id, root) {
			probe.commits++;
			const count = (fiber) => {
				if (typeof fiber.type === "string") return;
				const name = nameOf(fiber);
				if (!name) return;
				probe.renders++;
				probe.byName[name] = (probe.byName[name] ?? 0) + 1;
			};
			// Same walk React DevTools does: a child that is the very same fiber
			// object as before was bailed out, so nothing below it rendered.
			const walk = (next, prev) => {
				if (!prev || next.flags & PERFORMED_WORK) count(next);
				if (prev && next.child === prev.child) return;
				for (let child = next.child; child; child = child.sibling)
					walk(child, prev ? child.alternate : null);
			};
			walk(root.current, root.current.alternate);
		},
	};
}

function installVitals() {
	const vitals = { fcp: null, lcp: null, cls: 0, longTasks: [] };
	window.__vitals = vitals;
	new PerformanceObserver((list) => {
		for (const e of list.getEntries())
			if (e.name === "first-contentful-paint") vitals.fcp = e.startTime;
	}).observe({ type: "paint", buffered: true });
	new PerformanceObserver((list) => {
		for (const e of list.getEntries()) vitals.lcp = e.startTime;
	}).observe({ type: "largest-contentful-paint", buffered: true });
	new PerformanceObserver((list) => {
		for (const e of list.getEntries())
			if (!e.hadRecentInput) vitals.cls += e.value;
	}).observe({ type: "layout-shift", buffered: true });
	new PerformanceObserver((list) => {
		for (const e of list.getEntries()) vitals.longTasks.push(e.duration);
	}).observe({ type: "longtask", buffered: true });
}

const median = (xs) => {
	const s = xs.filter((x) => x != null).sort((a, b) => a - b);
	if (!s.length) return null;
	const m = Math.floor(s.length / 2);
	return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const round = (x, d = 0) => (x == null ? null : Number(x.toFixed(d)));

const browser = await chromium.launch({
	executablePath: process.env.PW_CHROMIUM ?? undefined,
});

async function session() {
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		locale: "pt-BR",
		timezoneId: "America/Sao_Paulo",
	});
	await context.addInitScript(installReactProbe);
	await context.addInitScript(installVitals);
	await mockDemoApi(context);
	const page = await context.newPage();
	const cdp = await context.newCDPSession(page);
	await cdp.send("Network.enable");
	await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
	const requests = new Map();
	const bytes = {};
	const count = {};
	cdp.on("Network.responseReceived", (e) => {
		if (new URL(e.response.url).origin === new URL(base).origin)
			requests.set(e.requestId, e.type);
	});
	cdp.on("Network.loadingFinished", (e) => {
		const type = requests.get(e.requestId);
		if (!type) return;
		bytes[type] = (bytes[type] ?? 0) + e.encodedDataLength;
		count[type] = (count[type] ?? 0) + 1;
	});
	return { context, page, bytes, count };
}

async function measureLoad() {
	const { context, page, bytes, count } = await session();
	await page.goto(base, { waitUntil: "networkidle" });
	await page.locator("article").first().waitFor();
	await page.waitForTimeout(1500);
	const vitals = await page.evaluate(() => window.__vitals);
	const probe = await page.evaluate(() => ({
		commits: window.__reactProbe.commits,
		renders: window.__reactProbe.renders,
	}));
	await context.close();
	return {
		fcp: vitals.fcp,
		lcp: vitals.lcp,
		cls: vitals.cls,
		longTaskCount: vitals.longTasks.length,
		longTaskTotal: vitals.longTasks.reduce((a, b) => a + b, 0),
		longTaskMax: Math.max(0, ...vitals.longTasks),
		bytes: { ...bytes },
		count: { ...count },
		commits: probe.commits,
		renders: probe.renders,
	};
}

/** Runs `act`, then reports the React work and long tasks it caused. */
async function during(page, act, settleMs = 700) {
	await page.evaluate(() => {
		window.__reactProbe.commits = 0;
		window.__reactProbe.renders = 0;
		window.__reactProbe.byName = {};
		window.__vitals.longTasks.length = 0;
	});
	await act();
	await page.waitForTimeout(settleMs);
	return page.evaluate(() => {
		const top = Object.entries(window.__reactProbe.byName)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5);
		return {
			commits: window.__reactProbe.commits,
			renders: window.__reactProbe.renders,
			top: Object.fromEntries(top),
			longTaskCount: window.__vitals.longTasks.length,
			longTaskTotal: window.__vitals.longTasks.reduce((a, b) => a + b, 0),
		};
	});
}

async function measureInteractions() {
	const { context, page } = await session();
	await page.goto(base, { waitUntil: "networkidle" });
	await page.locator("article").first().waitFor();
	await page.waitForTimeout(1500);
	const result = {};

	result.idle5s = await during(page, () => page.waitForTimeout(5000), 0);

	result.toggleBookmark = await during(page, () =>
		page.locator('article button[title="Salvar"]').first().click(),
	);

	result.openCloseSearch = await during(page, async () => {
		await page.keyboard.press("Control+k");
		await page.waitForTimeout(300);
		await page.keyboard.press("Escape");
	});

	result.switchTrendWindow = await during(page, () =>
		page.getByRole("button", { name: "6h", exact: true }).click(),
	);

	result.scrollThreePages = await during(
		page,
		async () => {
			for (let i = 0; i < 40; i++) {
				await page.mouse.wheel(0, 900);
				await page.waitForTimeout(120);
			}
		},
		1200,
	);
	result.articlesAfterScroll = await page.locator("article").count();
	result.domNodesAfterScroll = await page.evaluate(
		() => document.getElementsByTagName("*").length,
	);

	result.openArticle = await during(
		page,
		() => page.locator('article button[title="Abrir artigo"]').nth(30).click(),
		1200,
	);

	await context.close();
	return result;
}

const loads = [];
for (let i = 0; i < runs; i++) loads.push(await measureLoad());
const interactions = [];
for (let i = 0; i < Math.min(runs, 3); i++)
	interactions.push(await measureInteractions());
await browser.close();

const loadKeys = [
	"fcp",
	"lcp",
	"cls",
	"longTaskCount",
	"longTaskTotal",
	"longTaskMax",
	"commits",
	"renders",
];
const load = Object.fromEntries(
	loadKeys.map((k) => [
		k,
		round(median(loads.map((l) => l[k])), k === "cls" ? 4 : 0),
	]),
);
load.bytes = loads[0].bytes;
load.requests = loads[0].count;

const scenarios = Object.keys(interactions[0]).filter(
	(k) => typeof interactions[0][k] === "object",
);
const interaction = Object.fromEntries(
	scenarios.map((name) => [
		name,
		{
			commits: median(interactions.map((r) => r[name].commits)),
			renders: median(interactions.map((r) => r[name].renders)),
			longTaskCount: median(interactions.map((r) => r[name].longTaskCount)),
			longTaskTotal: round(
				median(interactions.map((r) => r[name].longTaskTotal)),
			),
			top: interactions[0][name].top,
		},
	]),
);
interaction.articlesAfterScroll = interactions[0].articlesAfterScroll;
interaction.domNodesAfterScroll = interactions[0].domNodesAfterScroll;

const report = { base, runs, cpuThrottle: cpu, load, interaction };
console.log(JSON.stringify(report, null, 2));
if (args.out) {
	mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
	writeFileSync(
		path.resolve(args.out),
		`${JSON.stringify(report, null, "\t")}\n`,
	);
}
