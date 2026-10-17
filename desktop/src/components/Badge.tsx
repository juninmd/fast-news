import type { ReactNode } from "react";

export type Tone = "neutral" | "accent" | "danger" | "warn" | "ok";

const TONES: Record<Tone, string> = {
  neutral: "border-edge bg-hover text-muted",
  accent: "border-accent/30 bg-accent/10 text-accent-text",
  danger: "border-danger/30 bg-danger/10 text-danger",
  warn: "border-warn/30 bg-warn/10 text-warn",
  ok: "border-ok/30 bg-ok/10 text-ok",
};

export default function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
