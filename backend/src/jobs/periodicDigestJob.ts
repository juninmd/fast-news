import cron from "node-cron";
import { config } from "../config/env.js";
import {
	DIGEST_PERIODS,
	type DigestPeriod,
	isDigestPeriod,
	renderDigestText,
} from "../services/digestBuilder.js";
import { getDigest } from "../services/digestData.js";
import { buildChannels, notifyAll } from "../services/notifier.js";

const SCHEDULE: Record<DigestPeriod, string> = {
	"4h": config.cron.digest4h,
	daily: config.cron.digest,
	weekly: config.cron.digestWeekly,
	monthly: config.cron.digestMonthly,
};

/** Builds the period's digest (no model call) and pushes it to every configured channel. */
export async function runPeriodicDigest(
	period: DigestPeriod,
): Promise<{ items: number; delivered: number }> {
	const channels = buildChannels();
	if (!channels.length) return { items: 0, delivered: 0 };
	const items = await getDigest(period);
	// An empty window is not worth a notification.
	if (!items.length) return { items: 0, delivered: 0 };
	const reports = await notifyAll(
		{
			title: `Fast News — ${DIGEST_PERIODS[period].label}`,
			body: renderDigestText(items, period),
			url: config.publicUrl,
		},
		channels,
	);
	for (const r of reports)
		if (!r.ok) console.warn(`[PeriodicDigest] ${r.channel} failed: ${r.error}`);
	return { items: items.length, delivered: reports.filter((r) => r.ok).length };
}

const tasks: cron.ScheduledTask[] = [];

export function startPeriodicDigestJobs(): void {
	for (const raw of config.notify.digestPeriods) {
		if (!isDigestPeriod(raw)) {
			console.warn(`[PeriodicDigest] Unknown period "${raw}" ignored`);
			continue;
		}
		tasks.push(
			cron.schedule(SCHEDULE[raw], () => {
				runPeriodicDigest(raw).catch((err: Error) =>
					console.error(`[PeriodicDigest] ${raw} failed:`, err.message),
				);
			}),
		);
		console.log(`[PeriodicDigest] ${raw} scheduled: ${SCHEDULE[raw]}`);
	}
}

export function stopPeriodicDigestJobs(): void {
	for (const t of tasks) t.stop();
	tasks.length = 0;
}
