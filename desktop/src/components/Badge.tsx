import type { ReactNode } from "react";

export type Tone = "neutral" | "accent" | "danger" | "warn" | "ok";

const TONES: Record<Tone, string> = {
  neutral: "border-edge text-muted",
  accent: "border-accent/50 text-accent-text",
  danger: "border-danger/50 text-danger",
  warn: "border-warn/50 text-warn",
  ok: "border-ok/50 text-ok",
};

export default function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] whitespace-nowrap ${TONES[tone]}`}>
      {children}
    </span>
  );
}
