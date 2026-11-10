import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface GalleryImage {
	url: string;
	alt?: string;
	credit?: string;
}

interface LightboxProps {
	images: GalleryImage[];
	start: number;
	title: string;
	onClose: () => void;
}

const SWIPE_PX = 50;

/** Full-screen viewer: ← → and swipe to move, Esc to close (and only that, not the article behind it). */
export function Lightbox({ images, start, title, onClose }: LightboxProps) {
	const [index, setIndex] = useState(start);
	const dialogRef = useRef<HTMLDivElement>(null);
	const touchX = useRef<number | null>(null);
	const count = images.length;
	const image = images[index];

	const go = useCallback(
		(step: number) => setIndex((i) => (i + step + count) % count),
		[count],
	);

	useEffect(() => {
		const opener = document.activeElement as HTMLElement | null;
		dialogRef.current?.focus();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
			else if (e.key === "ArrowLeft") go(-1);
			else if (e.key === "ArrowRight") go(1);
			else return;
			// Capture phase: the article modal listens for Escape too.
			e.stopPropagation();
			e.preventDefault();
		};
		window.addEventListener("keydown", onKey, true);
		return () => {
			window.removeEventListener("keydown", onKey, true);
			opener?.focus?.();
		};
	}, [go, onClose]);

	// Warm the neighbours so stepping through is instant.
	useEffect(() => {
		for (const step of [1, -1]) {
			const neighbour = images[(index + step + count) % count];
			if (neighbour) new Image().src = neighbour.url;
		}
	}, [images, index, count]);

	if (!image) return null;
	const caption = [image.alt, image.credit].filter(Boolean).join(" · ");

	return (
		<div
			ref={dialogRef}
			role="dialog"
			aria-modal="true"
			aria-label={`Galeria: ${title}`}
			tabIndex={-1}
			className="fixed inset-0 z-[60] flex flex-col bg-black outline-none animate-fade-in"
			onClick={onClose}
			onTouchStart={(e) => {
				touchX.current = e.touches[0]?.clientX ?? null;
			}}
			onTouchEnd={(e) => {
				const start = touchX.current;
				touchX.current = null;
				const end = e.changedTouches[0]?.clientX;
				if (start === null || end === undefined) return;
				if (end - start > SWIPE_PX) go(-1);
				else if (start - end > SWIPE_PX) go(1);
			}}
		>
			<div className="flex items-center justify-between px-4 py-3 text-xs text-white/70">
				<span className="font-mono tabular-nums" aria-live="polite">
					{index + 1} / {count}
				</span>
				<button
					type="button"
					onClick={onClose}
					aria-label="Fechar galeria"
					className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
				>
					<X className="h-5 w-5" />
				</button>
			</div>

			<div className="relative flex min-h-0 flex-1 items-center justify-center px-12">
				{count > 1 && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							go(-1);
						}}
						aria-label="Imagem anterior"
						className="absolute left-2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
					>
						<ChevronLeft className="h-6 w-6" />
					</button>
				)}
				<img
					key={image.url}
					src={image.url}
					alt={image.alt ?? ""}
					referrerPolicy="no-referrer"
					onClick={(e) => e.stopPropagation()}
					className="max-h-full max-w-full object-contain animate-fade-in"
				/>
				{count > 1 && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							go(1);
						}}
						aria-label="Próxima imagem"
						className="absolute right-2 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
					>
						<ChevronRight className="h-6 w-6" />
					</button>
				)}
			</div>

			<p className="min-h-12 px-6 py-3 text-center text-sm text-white/80">
				{caption}
			</p>
		</div>
	);
}

interface ImageGalleryProps {
	images: GalleryImage[];
	title: string;
	/** Hide the strip (focus mode) but keep nothing open. */
	hidden?: boolean;
}

/** Thumbnail strip under the cover; every thumbnail opens the {@link Lightbox} on that picture. */
export function ImageGallery({ images, title, hidden }: ImageGalleryProps) {
	const [open, setOpen] = useState<number | null>(null);
	const close = useCallback(() => setOpen(null), []);
	if (hidden || images.length < 2) return null;

	return (
		<>
			<ul
				className="flex gap-1.5 overflow-x-auto px-6 pt-4"
				aria-label="Imagens"
			>
				{images.map((image, i) => (
					<li key={image.url} className="shrink-0">
						<button
							type="button"
							onClick={() => setOpen(i)}
							aria-label={`Ver imagem ${i + 1} de ${images.length}${image.alt ? `: ${image.alt}` : ""}`}
							className="group block h-16 w-24 overflow-hidden border border-border-subtle bg-bg-tertiary transition-colors hover:border-accent-primary focus-visible:border-accent-primary focus-visible:outline-none"
						>
							<img
								src={image.url}
								alt=""
								loading="lazy"
								referrerPolicy="no-referrer"
								className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
							/>
						</button>
					</li>
				))}
			</ul>
			{open !== null && (
				<Lightbox images={images} start={open} title={title} onClose={close} />
			)}
		</>
	);
}
