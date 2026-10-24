export type VideoSource =
	| { kind: "embed"; provider: "youtube" | "vimeo"; embedUrl: string }
	| { kind: "file"; src: string; hls: boolean };

const YOUTUBE_RE =
	/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|shorts\/|watch\?(?:[^#]*&)?v=)|youtu\.be\/)([\w-]{11})(?![\w-])/i;
const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d{6,})(?!\d)/i;
const HLS_RE = /\.m3u8(\?|$)/i;

/** How to play an article's `video_url`: iframe for YouTube/Vimeo, `<video>` for files. */
export function resolveVideo(url?: string | null): VideoSource | null {
	if (!url) return null;
	const youtube = url.match(YOUTUBE_RE)?.[1];
	if (youtube) {
		return {
			kind: "embed",
			provider: "youtube",
			embedUrl: `https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&rel=0`,
		};
	}
	const vimeo = url.match(VIMEO_RE)?.[1];
	if (vimeo) {
		return {
			kind: "embed",
			provider: "vimeo",
			embedUrl: `https://player.vimeo.com/video/${vimeo}?autoplay=1`,
		};
	}
	return /^https?:\/\//i.test(url)
		? { kind: "file", src: url, hls: HLS_RE.test(url) }
		: null;
}
