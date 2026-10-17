import { locale } from "../i18n";

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(locale(), { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatDate(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(locale(), { dateStyle: "medium" }).format(date);
}

/** Dia e mês abreviados, para o bloco de data das edições. */
export function dateParts(value: string | null | undefined): { day: string; month: string } {
  const date = toDate(value);
  if (!date) return { day: "", month: "" };
  return {
    day: new Intl.DateTimeFormat(locale(), { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat(locale(), { month: "short" }).format(date).replace(/\.$/, ""),
  };
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000_000],
  ["month", 2_592_000_000],
  ["week", 604_800_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "há 2 horas", "em 3 dias"; a data sem fuso visível vira string vazia. */
export function relativeTime(value: string | null | undefined, now: number = Date.now()): string {
  const date = toDate(value);
  if (!date) return "";
  const diff = date.getTime() - now;
  const magnitude = Math.abs(diff);
  const formatter = new Intl.RelativeTimeFormat(locale(), { numeric: "auto" });
  for (const [unit, ms] of UNITS) {
    if (magnitude >= ms) return formatter.format(Math.round(diff / ms), unit);
  }
  return formatter.format(Math.round(diff / 1000), "second");
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return new Intl.NumberFormat(locale(), { maximumFractionDigits: digits }).format(value);
}

export function parseCount(raw: string | null | undefined): number {
  const value = Number.parseInt(String(raw ?? "").trim(), 10);
  return Number.isNaN(value) ? 0 : value;
}

/** `fake_news_score` runs 1..10 with higher meaning worse; credibility is the mirror the user reads. */
export function credibilityScore(fakeNewsScore: number | null | undefined): number | null {
  if (fakeNewsScore === null || fakeNewsScore === undefined || Number.isNaN(fakeNewsScore)) return null;
  return Math.max(1, Math.min(10, Math.round(11 - fakeNewsScore)));
}

export function similarityPercent(similarity: number | null | undefined): number | null {
  if (similarity === null || similarity === undefined || Number.isNaN(similarity)) return null;
  return Math.round(Math.max(0, Math.min(1, similarity)) * 100);
}

/** Uptime in ms to "12 d 3 h" / "3 h 20 min" / "45 min". */
export function formatUptime(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${rest} min`;
  return `${rest} min`;
}

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
