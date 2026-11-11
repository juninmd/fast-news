import { Play } from "lucide-react";
import { useState } from "react";

interface CoverImageProps {
	src?: string | null;
	source: string;
	category?: string;
	className?: string;
	/** Above-the-fold images load eagerly; everything else lazily. */
	eager?: boolean;
	/** The article has a video: a play badge marks the cover. */
	video?: boolean;
}

function PlayBadge() {
	return (
		<span
			role="img"
			aria-label="Vídeo"
			className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/30"
		>
			<Play className="ml-px h-3 w-3 fill-current" />
		</span>
	);
}

function monogram(source: string): string {
	const words = source
		.replace(/[^\p{L}\p{N} ]/gu, "")
		.split(" ")
		.filter(Boolean);
	const letters =
		words.length > 1
			? `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`
			: (words[0]?.slice(0, 2) ?? "");
	return letters.toUpperCase();
}

/** Stable hue per editoria, so the same section always gets the same color. */
function hueFor(key: string): number {
	let h = 0;
	for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) % 360;
	return (h + 210) % 360;
}

/**
 * Article picture with a typographic stand-in when the feed has none or the
 * hotlinked image fails, so every card keeps the same shape.
 */
export function CoverImage({
	src,
	source,
	category,
	className = "",
	eager = false,
	video = false,
}: CoverImageProps) {
	const [failed, setFailed] = useState(false);

	if (!src || failed) {
		const hue = hueFor(category || source);
		return (
			<div
				role="img"
				aria-label={`Sem imagem — ${source}`}
				className={`relative flex items-center justify-center overflow-hidden border border-border-subtle ${className}`}
				style={{
					background: `radial-gradient(120% 90% at 15% 10%, hsl(${hue} 85% 62% / 0.9), transparent 60%), linear-gradient(135deg, hsl(${hue} 70% 42%), hsl(${(hue + 50) % 360} 55% 14%))`,
				}}
			>
				<div
					aria-hidden="true"
					className="absolute inset-0 opacity-[0.12] text-white"
					style={{
						backgroundImage:
							"repeating-linear-gradient(135deg, currentColor 0 1px, transparent 1px 11px)",
					}}
				/>
				<div className="relative text-center text-white">
					<span className="block font-display text-3xl font-extrabold tracking-tight drop-shadow-sm">
						{monogram(source)}
					</span>
					{category && (
						<span className="mt-0.5 block font-mono text-[9px] uppercase tracking-widest opacity-80">
							{category}
						</span>
					)}
				</div>
				{video && <PlayBadge />}
			</div>
		);
	}

	return (
		<div
			className={`relative overflow-hidden border border-border-subtle bg-bg-tertiary ${className}`}
		>
			<img
				src={src}
				alt=""
				loading={eager ? "eager" : "lazy"}
				decoding="async"
				referrerPolicy="no-referrer"
				onError={() => setFailed(true)}
				className="h-full w-full object-cover"
			/>
			{video && <PlayBadge />}
		</div>
	);
}
