import { useEffect, useState } from "react";

interface AnimatedNumberProps {
	value: number;
	className?: string;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
/** Each digit settles a little after the one to its left, like a mechanical counter. */
const STAGGER_MS = 70;

/**
 * Odometer: every digit is a strip of 0–9 that rolls to its place. Starts at 0 on
 * mount and rolls again whenever the value changes. The strips are hidden from
 * assistive tech; the real number is exposed once, as text.
 */
export function AnimatedNumber({ value, className = "" }: AnimatedNumberProps) {
	const text = String(Math.max(0, Math.round(value)));
	const [shown, setShown] = useState("0".repeat(text.length));

	useEffect(() => {
		// Next frame, so the strips first paint at 0 and the change is a transition.
		const frame = requestAnimationFrame(() => setShown(text));
		return () => cancelAnimationFrame(frame);
	}, [text]);

	// A longer number grows to the left without rolling the digits it already has.
	const padded = shown.padStart(text.length, "0").slice(-text.length);

	return (
		<span className={`inline-flex tabular-nums ${className}`}>
			<span className="sr-only">{text}</span>
			<span aria-hidden="true" className="inline-flex">
				{padded.split("").map((digit, i) => (
					<span
						key={i}
						className="relative inline-block h-[1.25em] overflow-hidden leading-[1.25em]"
					>
						<span
							data-digit={digit}
							className="flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
							style={{
								transform: `translateY(-${Number(digit) * 1.25}em)`,
								transitionDelay: `${i * STAGGER_MS}ms`,
							}}
						>
							{DIGITS.map((d) => (
								<span key={d} className="block h-[1.25em]">
									{d}
								</span>
							))}
						</span>
					</span>
				))}
			</span>
		</span>
	);
}
