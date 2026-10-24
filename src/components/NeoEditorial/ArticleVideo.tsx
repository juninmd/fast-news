import { ExternalLink, Play } from "lucide-react";
import { useState } from "react";
import { resolveVideo } from "../../lib/articleVideo";

interface ArticleVideoProps {
	url: string;
	title: string;
	/** Cover shown until the viewer presses play. */
	poster?: string | null;
	/** Article page, offered when the browser cannot play the stream itself. */
	fallbackUrl?: string;
}

/** True when the browser can play HLS natively (Safari); Chrome/Firefox cannot. */
function canPlayHls(): boolean {
	if (typeof document === "undefined") return false;
	return (
		document
			.createElement("video")
			.canPlayType("application/vnd.apple.mpegurl") !== ""
	);
}

/**
 * Click-to-play article video: YouTube/Vimeo load their iframe only after the
 * click (no third-party requests while scrolling), files use the native player.
 */
export function ArticleVideo({
	url,
	title,
	poster,
	fallbackUrl,
}: ArticleVideoProps) {
	const source = resolveVideo(url);
	const [playing, setPlaying] = useState(false);
	if (!source) return null;

	if (source.kind === "file") {
		if (source.hls && !canPlayHls()) {
			return (
				<a
					href={fallbackUrl ?? url}
					target="_blank"
					rel="noopener noreferrer"
					className="relative block aspect-video w-full overflow-hidden bg-black"
				>
					{poster && (
						<img
							src={poster}
							alt=""
							referrerPolicy="no-referrer"
							className="h-full w-full object-cover opacity-80"
						/>
					)}
					<span className="absolute inset-0 flex items-center justify-center gap-2 text-sm font-medium text-white">
						<ExternalLink className="h-4 w-4" />
						Assistir no site
					</span>
				</a>
			);
		}
		return (
			<video
				controls
				preload="metadata"
				poster={poster ?? undefined}
				aria-label={title}
				className="aspect-video w-full bg-black"
			>
				<source src={source.src} />
			</video>
		);
	}

	if (playing) {
		return (
			<div className="aspect-video w-full bg-black">
				<iframe
					src={source.embedUrl}
					title={title}
					className="h-full w-full"
					allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
					allowFullScreen
					referrerPolicy="strict-origin-when-cross-origin"
				/>
			</div>
		);
	}

	return (
		<button
			type="button"
			onClick={() => setPlaying(true)}
			aria-label={`Reproduzir vídeo: ${title}`}
			className="group relative block aspect-video w-full overflow-hidden bg-black"
		>
			{poster && (
				<img
					src={poster}
					alt=""
					loading="lazy"
					referrerPolicy="no-referrer"
					className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
				/>
			)}
			<span className="absolute inset-0 flex items-center justify-center">
				<span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/30 transition-transform group-hover:scale-110">
					<Play className="ml-0.5 h-6 w-6 fill-current" />
				</span>
			</span>
		</button>
	);
}
