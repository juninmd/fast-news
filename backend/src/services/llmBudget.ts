/**
 * Per-process daily cap on optional LLM work (translation, anything added
 * later). The core pipeline keeps its own behavior; this guards new features
 * so a traffic spike or a crawler cannot burn the model budget.
 */
const counters = new Map<string, { day: string; used: number }>();

function today(now: Date): string {
	return now.toISOString().slice(0, 10);
}

export function tryConsume(
	feature: string,
	limitPerDay: number,
	amount = 1,
	now: Date = new Date(),
): boolean {
	if (limitPerDay <= 0) return false;
	const day = today(now);
	const cur = counters.get(feature);
	const used = cur && cur.day === day ? cur.used : 0;
	if (used + amount > limitPerDay) return false;
	counters.set(feature, { day, used: used + amount });
	return true;
}

export function remaining(
	feature: string,
	limitPerDay: number,
	now: Date = new Date(),
): number {
	const cur = counters.get(feature);
	const used = cur && cur.day === today(now) ? cur.used : 0;
	return Math.max(0, limitPerDay - used);
}

export function resetBudgets(): void {
	counters.clear();
}
