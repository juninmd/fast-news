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
		return (
			<div
				role="img"
				aria-label={`Sem imagem — ${source}`}
				className={`relative flex items-center justify-center overflow-hidden border border-border-subtle bg-bg-tertiary ${className}`}
			>
				<div
					aria-hidden="true"
					className="absolute inset-0 opacity-[0.07]"
					style={{
						backgroundImage:
							"repeating-linear-gradient(135deg, currentColor 0 1px, transparent 1px 9px)",
					}}
				/>
				<div className="relative text-center">
					<span className="block font-display text-2xl font-semibold tracking-tight text-text-secondary/70">
						{monogram(source)}
					</span>
					{category && (
						<span className="mt-0.5 block font-mono text-[9px] uppercase tracking-widest text-text-secondary/60">
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
