import {
	type CSSProperties,
	type KeyboardEvent,
	type PointerEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import "../../styles/wordwheel.css";
import type { TrendTerm } from "../../hooks/useTrends";
import {
	clockwiseOrder,
	distanceFromTop,
	layoutWheel,
	nearestToTop,
	rotationFor,
	TAU,
	titleCase,
	type WheelWord,
	wrap,
} from "./wheelModel";

const FRICTION = 0.94;
const SNAP = 0.14;
const RING_RADIUS = [44, 34.5, 25]; // % of the wheel's width

const reduceMotion = () =>
	typeof window !== "undefined" &&
	!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

interface WordWheelProps {
	terms: TrendTerm[];
	/** Called whenever the word under the pointer changes. */
	onFocusChange?: (word: WheelWord, index: number) => void;
	/** Enter, or a click on the word already under the pointer. */
	onActivate?: (word: WheelWord) => void;
	max?: number;
	className?: string;
	label?: string;
}

/**
 * Roda de Palavras: trending terms on three spinning rings.
 * Drag to spin with inertia, arrows to step, click a word to bring it to the
 * pointer, click it again (or Enter) to activate it.
 */
export function WordWheel({
	terms,
	onFocusChange,
	onActivate,
	max = 24,
	className = "",
	label = "Roda de palavras em alta",
}: WordWheelProps) {
	const words = useMemo(() => layoutWheel(terms, max), [terms, max]);
	const order = useMemo(() => clockwiseOrder(words), [words]);
	const [focus, setFocus] = useState(0);

	const boxRef = useRef<HTMLDivElement>(null);
	const layerRef = useRef<HTMLDivElement>(null);
	const wordRefs = useRef<Array<HTMLButtonElement | null>>([]);
	const rot = useRef(0);
	const vel = useRef(0);
	const target = useRef<number | null>(null);
	const drag = useRef<{ last: number; moved: number } | null>(null);
	const frame = useRef(0);
	const focusRef = useRef(0);
	const cb = useRef({ onFocusChange, words });
	cb.current = { onFocusChange, words };

	const paint = useCallback(() => {
		const list = cb.current.words;
		if (layerRef.current) {
			layerRef.current.style.transform = `rotate(${rot.current}rad)`;
		}
		const near = nearestToTop(list, rot.current);
		for (let i = 0; i < list.length; i++) {
			const el = wordRefs.current[i];
			if (!el) continue;
			const d = distanceFromTop(list[i].angle, rot.current);
			el.style.opacity = String(Math.max(0.4, 1 - d * 0.35));
			el.dataset.focus = String(i === near);
		}
		if (near >= 0 && near !== focusRef.current) {
			focusRef.current = near;
			setFocus(near);
			cb.current.onFocusChange?.(list[near], near);
		}
	}, []);

	const step = useCallback(() => {
		frame.current = 0;
		const list = cb.current.words;
		if (drag.current || list.length === 0) {
			paint();
			return;
		}
		if (Math.abs(vel.current) > 0.0008) {
			rot.current += vel.current;
			vel.current *= FRICTION;
		} else {
			vel.current = 0;
			if (target.current === null) {
				const i = nearestToTop(list, rot.current);
				target.current = rotationFor(list[i].angle, rot.current);
			}
			const delta = target.current - rot.current;
			if (Math.abs(delta) < 0.0006) {
				rot.current = target.current;
				target.current = null;
				paint();
				return; // settled: stop the loop
			}
			rot.current += delta * SNAP;
		}
		paint();
		frame.current = requestAnimationFrame(step);
	}, [paint]);

	const kick = useCallback(() => {
		if (reduceMotion()) {
			vel.current = 0;
			const list = cb.current.words;
			if (target.current === null && list.length) {
				const i = nearestToTop(list, rot.current);
				target.current = rotationFor(list[i].angle, rot.current);
			}
			if (target.current !== null) rot.current = target.current;
			target.current = null;
			paint();
			return;
		}
		if (!frame.current) frame.current = requestAnimationFrame(step);
	}, [paint, step]);

	const spinTo = useCallback(
		(i: number) => {
			const w = cb.current.words[i];
			if (!w) return;
			vel.current = 0;
			target.current = rotationFor(w.angle, rot.current);
			kick();
		},
		[kick],
	);

	// New data: spin in from a quarter turn back and land on the top term.
	useEffect(() => {
		focusRef.current = -1;
		target.current = 0;
		rot.current = words.length && !reduceMotion() ? -TAU * 0.35 : 0;
		vel.current = 0;
		paint();
		kick();
	}, [words, paint, kick]);

	useEffect(() => () => cancelAnimationFrame(frame.current), []);

	const angleOf = (e: PointerEvent) => {
		const r = boxRef.current?.getBoundingClientRect();
		if (!r) return 0;
		return Math.atan2(
			e.clientY - r.top - r.height / 2,
			e.clientX - r.left - r.width / 2,
		);
	};

	const onPointerDown = (e: PointerEvent) => {
		if (e.button !== 0) return;
		drag.current = { last: angleOf(e), moved: 0 };
		vel.current = 0;
		target.current = null;
	};
	const onPointerMove = (e: PointerEvent) => {
		const d = drag.current;
		if (!d) return;
		const a = angleOf(e);
		const delta = wrap(a - d.last);
		d.last = a;
		d.moved += Math.abs(delta);
		if (d.moved > 0.04 && !boxRef.current?.hasPointerCapture(e.pointerId)) {
			boxRef.current?.setPointerCapture(e.pointerId);
		}
		rot.current += delta;
		vel.current = delta;
		paint();
	};
	const onPointerUp = () => {
		const d = drag.current;
		drag.current = null;
		if (d && d.moved <= 0.04) vel.current = 0;
		kick();
	};

	const onKeyDown = (e: KeyboardEvent) => {
		const n = order.length;
		if (!n) return;
		const pos = order.indexOf(focusRef.current);
		if (e.key === "ArrowRight" || e.key === "ArrowDown") {
			e.preventDefault();
			// clockwise neighbour comes to the pointer by turning the wheel back
			spinTo(order[(pos + 1) % n]);
		} else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
			e.preventDefault();
			spinTo(order[(pos - 1 + n) % n]);
		} else if (e.key === "Home") {
			e.preventDefault();
			spinTo(0);
		} else if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			const w = words[focusRef.current];
			if (w) onActivate?.(w);
		}
	};

	const current = words[focus];

	return (
		<div
			ref={boxRef}
			className={`pulso-wheel ${className}`}
			role="listbox"
			aria-label={`${label}. Setas giram a roda, Enter busca o termo.`}
			aria-activedescendant={current ? `wheel-word-${focus}` : undefined}
			tabIndex={0}
			onKeyDown={onKeyDown}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={onPointerUp}
		>
			<div className="pulso-wheel-ticks" aria-hidden />
			<div ref={layerRef} className="pulso-wheel-layer">
				{words.map((w, i) => (
					<button
						key={w.term.term}
						id={`wheel-word-${i}`}
						ref={(el) => {
							wordRefs.current[i] = el;
						}}
						type="button"
						role="option"
						tabIndex={-1}
						aria-selected={i === focus}
						className="pulso-wheel-word"
						data-tone={w.tone}
						style={
							{
								"--a": `${w.angle}rad`,
								"--r": `${RING_RADIUS[w.ring]}cqw`,
								"--rel": w.rel,
							} as CSSProperties
						}
						onClick={() => {
							if (i === focusRef.current) onActivate?.(w);
							else spinTo(i);
						}}
					>
						<span>{w.term.term}</span>
					</button>
				))}
			</div>
			<span className="pulso-wheel-pointer" aria-hidden />
			<div className="pulso-wheel-hub" aria-hidden>
				{current ? (
					<>
						<small>
							#{focus + 1} de {words.length}
						</small>
						<b key={current.term.term}>{titleCase(current.term.term)}</b>
					</>
				) : (
					<small>Sem termos</small>
				)}
			</div>
		</div>
	);
}
