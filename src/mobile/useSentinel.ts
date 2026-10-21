import { useCallback, useRef } from "react";

/** Ref for an element at the end of a list: calls `onVisible` whenever it scrolls into view. */
export function useSentinel(onVisible: () => void) {
	const cb = useRef(onVisible);
	cb.current = onVisible;
	const observer = useRef<IntersectionObserver | null>(null);

	return useCallback((node: HTMLElement | null) => {
		observer.current?.disconnect();
		if (!node) return;
		observer.current = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) cb.current();
			},
			{ rootMargin: "600px" },
		);
		observer.current.observe(node);
	}, []);
}
