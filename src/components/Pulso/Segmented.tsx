import { useLayoutEffect, useRef, useState } from "react";

interface SegmentedProps<T extends string> {
	value: T;
	options: ReadonlyArray<readonly [T, string]>;
	onChange: (value: T) => void;
	label: string;
}

/** Segmented control whose thumb springs to the active option. */
export function Segmented<T extends string>({
	value,
	options,
	onChange,
	label,
}: SegmentedProps<T>) {
	const ref = useRef<HTMLDivElement>(null);
	const [thumb, setThumb] = useState({ left: 3, width: 0 });

	useLayoutEffect(() => {
		const on = ref.current?.querySelector<HTMLButtonElement>(
			`[data-val="${CSS.escape(value)}"]`,
		);
		if (on) setThumb({ left: on.offsetLeft, width: on.offsetWidth });
	}, [value]);

	return (
		<div ref={ref} className="pulso-seg" role="group" aria-label={label}>
			<span
				className="pulso-seg-thumb"
				style={{ left: thumb.left, width: thumb.width }}
			/>
			{options.map(([v, l]) => (
				<button
					key={v}
					type="button"
					data-val={v}
					aria-pressed={v === value}
					onClick={() => onChange(v)}
				>
					{l}
				</button>
			))}
		</div>
	);
}
