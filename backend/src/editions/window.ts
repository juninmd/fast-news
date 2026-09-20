import type { EditionKind, EditionWindow } from "./types.js";

// Brazil has had no DST since 2019, so Sao Paulo is a fixed UTC-3.
const OFFSET_MS = 3 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const CLOSE_HOUR: Record<EditionKind, number> = {
	manha: 7,
	tarde: 13,
	noite: 19,
};
// Cycle order within a day; each edition's window covers the gap since the
// previous one in this order (wrapping noite -> manha across midnight).
const EDITION_ORDER: EditionKind[] = ["manha", "tarde", "noite"];

export function isEditionKind(value: unknown): value is EditionKind {
	return value === "manha" || value === "tarde" || value === "noite";
}

function windowHours(kind: EditionKind): number {
	const idx = EDITION_ORDER.indexOf(kind);
	const previous =
		EDITION_ORDER[(idx - 1 + EDITION_ORDER.length) % EDITION_ORDER.length]!;
	return (CLOSE_HOUR[kind] - CLOSE_HOUR[previous] + 24) % 24 || 24;
}

/**
 * Each edition closes at a fixed local hour (07h manhã, 13h tarde, 19h
 * noite) and covers the gap since the previous edition in that cycle
 * (12h/6h/6h respectively), so the three windows are contiguous and
 * non-overlapping across the day. Uses the most recent close <= now, so a
 * late or retried job still produces the same window.
 */
export function editionWindow(kind: EditionKind, now: Date): EditionWindow {
	const local = new Date(now.getTime() - OFFSET_MS);
	const close = Date.UTC(
		local.getUTCFullYear(),
		local.getUTCMonth(),
		local.getUTCDate(),
		CLOSE_HOUR[kind],
	);
	const localEnd = close > local.getTime() ? close - 24 * HOUR_MS : close;
	const end = new Date(localEnd + OFFSET_MS);
	return {
		kind,
		start: new Date(end.getTime() - windowHours(kind) * HOUR_MS),
		end,
		day: new Date(localEnd).toISOString().slice(0, 10),
	};
}

/** Local hour (0-23) in Sao Paulo for a timestamp. */
export function localHour(date: Date): number {
	return new Date(date.getTime() - OFFSET_MS).getUTCHours();
}

export function formatLocalTime(date: Date): string {
	const d = new Date(date.getTime() - OFFSET_MS);
	const hh = String(d.getUTCHours()).padStart(2, "0");
	const mm = String(d.getUTCMinutes()).padStart(2, "0");
	return `${hh}h${mm}`;
}

export function formatLocalDate(day: string): string {
	const date = new Date(`${day}T12:00:00Z`);
	return new Intl.DateTimeFormat("pt-BR", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	}).format(date);
}
