import { ChevronDown, ExternalLink, Layers } from "lucide-react";
import { useState } from "react";
import type { CoverageLink } from "../../hooks/useNews";
import { timeAgoShort } from "../../utils/format";
import { AnimatedNumber } from "./AnimatedNumber";
import { SourcePreview } from "./SourcePreview";

interface SourceStackProps {
	/** Outlet of the entry the card is built on. */
	source: string;
	/** Total distinct outlets on this story, including `source`. */
	sourceCount: number;
	others: CoverageLink[];
}

/**
 * "Também em Folha, InfoMoney +2": the same story from other outlets, kept one
 * click away instead of repeated as separate cards.
 */
export function SourceStack({ source, sourceCount, others }: SourceStackProps) {
	const [open, setOpen] = useState(false);
	if (sourceCount < 2 || others.length === 0) return null;
	const shown = others.slice(0, 3);
	const extra = sourceCount - 1 - shown.length;

	return (
		<div className="mt-3">
			<div className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-text-secondary">
				<button
					type="button"
					onClick={() => setOpen((v) => !v)}
					aria-expanded={open}
					aria-label={`${sourceCount} fontes`}
					className="inline-flex shrink-0 items-center gap-1 bg-accent-primary/10 px-1.5 py-0.5 font-semibold text-accent-primary transition-colors hover:bg-accent-primary/20"
				>
					<Layers className="h-3 w-3" />
					<AnimatedNumber value={sourceCount} />
					<span aria-hidden="true">fontes</span>
					<ChevronDown
						className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
					/>
				</button>
				<span>{source}</span>
				{shown.map((o) => (
					<span key={o.id} className="inline-flex items-center gap-2">
						<span aria-hidden="true">·</span>
						<SourcePreview link={o}>{o.source}</SourcePreview>
					</span>
				))}
				{extra > 0 && <span>+{extra}</span>}
			</div>

			{open && (
				<ul className="mt-2 divide-y divide-border-subtle border border-border-subtle bg-bg-secondary">
					{others.map((o) => (
						<li key={o.id}>
							<a
								href={o.url}
								target="_blank"
								rel="noopener noreferrer"
								className="group/link flex items-start gap-3 px-3 py-2 text-sm transition-colors hover:bg-bg-tertiary/60"
							>
								<span className="w-28 shrink-0 truncate pt-0.5 font-mono text-[11px] uppercase tracking-wide text-text-secondary">
									{o.source}
								</span>
								<span className="min-w-0 flex-1 leading-snug text-text-primary group-hover/link:text-accent-primary">
									{o.title}
								</span>
								<span className="shrink-0 pt-0.5 font-mono text-[11px] tabular-nums text-text-secondary">
									{timeAgoShort(o.publishedAt)}
								</span>
								<ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-text-secondary opacity-0 transition-opacity group-hover/link:opacity-100" />
							</a>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
