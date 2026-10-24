import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import type { CoverageLink } from "../../hooks/useNews";
import { timeAgoShort } from "../../utils/format";

const OPEN_DELAY_MS = 120;

interface SourcePreviewProps {
	link: CoverageLink;
	children: ReactNode;
}

/**
 * Outlet name that shows how that outlet headlined the story on hover or
 * keyboard focus, without leaving the feed. Esc closes it.
 */
export function SourcePreview({ link, children }: SourcePreviewProps) {
	const [open, setOpen] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const id = useId();

	useEffect(() => () => clearTimeout(timer.current), []);

	const show = () => {
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
	};
	const hide = () => {
		clearTimeout(timer.current);
		setOpen(false);
	};

	return (
		<span className="relative inline-block">
			<span
				// Focusable on purpose: keyboard users get the same preview as hover.
				tabIndex={0}
				aria-describedby={open ? id : undefined}
				onMouseEnter={show}
				onMouseLeave={hide}
				onFocus={show}
				onBlur={hide}
				onKeyDown={(e) => {
					if (e.key === "Escape" && open) {
						e.stopPropagation();
						hide();
					}
				}}
				className="cursor-default underline decoration-dotted decoration-text-secondary/40 underline-offset-4 transition-colors hover:text-accent-primary focus-visible:text-accent-primary focus-visible:outline-none"
			>
				{children}
			</span>
			{open && (
				<span
					id={id}
					role="tooltip"
					className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 block w-64 max-w-[80vw] border border-border-subtle bg-bg-secondary p-3 text-left shadow-xl animate-slide-up motion-reduce:animate-none"
				>
					<span className="block font-mono text-[10px] uppercase tracking-wide text-text-secondary">
						{link.source} · {timeAgoShort(link.publishedAt)}
					</span>
					<span className="mt-1 block font-sans text-sm font-medium normal-case leading-snug tracking-normal text-text-primary">
						{link.title}
					</span>
				</span>
			)}
		</span>
	);
}
