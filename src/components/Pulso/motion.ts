import { type RefObject, useEffect } from "react";
import { flushSync } from "react-dom";

export const prefersReducedMotion = () =>
	typeof window !== "undefined" &&
	!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

type ViewTransitionDoc = Document & {
	startViewTransition?: (cb: () => void) => unknown;
};

let origin = { x: 0, y: 0 };
if (typeof window !== "undefined") {
	window.addEventListener(
		"pointerdown",
		(e) => {
			origin = { x: e.clientX, y: e.clientY };
		},
		{ capture: true, passive: true },
	);
}

/**
 * Runs a React state update inside a View Transition that opens as a circle
 * from the last pointer press. Falls back to a plain update.
 */
export function withViewTransition(update: () => void) {
	const doc = document as ViewTransitionDoc;
	if (!doc.startViewTransition || prefersReducedMotion()) {
		update();
		return;
	}
	const root = document.documentElement;
	const x = origin.x || window.innerWidth / 2;
	const y = origin.y || 80;
	root.style.setProperty("--vt-x", `${x}px`);
	root.style.setProperty("--vt-y", `${y}px`);
	root.style.setProperty(
		"--vt-r",
		`${Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))}px`,
	);
	doc.startViewTransition(() => flushSync(update));
}

/** 3D tilt and a cursor spotlight for every `.pulso-card` inside `ref`. */
export function useCardTilt(ref: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const host = ref.current;
		if (
			!host ||
			prefersReducedMotion() ||
			!window.matchMedia?.("(pointer: fine)").matches
		)
			return;
		let current: HTMLElement | null = null;
		let raf = 0;
		const reset = (el: HTMLElement | null) => {
			if (!el) return;
			el.style.removeProperty("--rx");
			el.style.removeProperty("--ry");
		};
		const onMove = (e: PointerEvent) => {
			const card = (e.target as HTMLElement).closest<HTMLElement>(
				".pulso-card",
			);
			if (card !== current) {
				reset(current);
				current = card;
			}
			if (!card) return;
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				const r = card.getBoundingClientRect();
				const px = (e.clientX - r.left) / r.width;
				const py = (e.clientY - r.top) / r.height;
				card.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
				card.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
				card.style.setProperty("--rx", `${((0.5 - py) * 5).toFixed(2)}deg`);
				card.style.setProperty("--ry", `${((px - 0.5) * 6).toFixed(2)}deg`);
			});
		};
		const onLeave = () => {
			cancelAnimationFrame(raf);
			reset(current);
			current = null;
		};
		host.addEventListener("pointermove", onMove);
		host.addEventListener("pointerleave", onLeave);
		return () => {
			cancelAnimationFrame(raf);
			host.removeEventListener("pointermove", onMove);
			host.removeEventListener("pointerleave", onLeave);
		};
	}, [ref]);
}

const CATEGORY_HUES: Record<string, string> = {
	"Big Techs": "#7c5cff",
	"AI Frontier": "#00b3ff",
	IA: "#00b3ff",
	"Dev Tools": "#22c55e",
	Gaming: "#ff3d9a",
	Tecnologia: "#6e84ff",
	Brasil: "#18b26b",
	Mundo: "#ff9f1c",
	Negócios: "#f5b640",
	Cripto: "#f7931a",
	Ciência: "#2dd4bf",
};

/** Aurora tint for the active category; undefined keeps the theme default. */
export function auroraTint(category: string): string | undefined {
	return CATEGORY_HUES[category];
}
