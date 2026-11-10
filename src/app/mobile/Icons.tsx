import type { ReactNode } from "react";

function Svg({ children, size = 22 }: { children: ReactNode; size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{children}
		</svg>
	);
}

export const HomeIcon = () => (
	<Svg>
		<path d="M4 11l8-7 8 7v9H4z" />
	</Svg>
);
export const TrendIcon = () => (
	<Svg>
		<path d="M3 17l6-6 4 4 8-9" />
		<path d="M15 6h6v6" />
	</Svg>
);
export const SearchIcon = ({ size }: { size?: number }) => (
	<Svg size={size}>
		<circle cx="11" cy="11" r="7" />
		<path d="M20 20l-3.5-3.5" />
	</Svg>
);
export const BookmarkIcon = ({ filled = false }: { filled?: boolean }) => (
	<svg
		width="22"
		height="22"
		viewBox="0 0 24 24"
		fill={filled ? "currentColor" : "none"}
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M6 4h12v17l-6-4-6 4z" />
	</svg>
);
export const BackIcon = () => (
	<Svg>
		<path d="M15 5l-7 7 7 7" />
	</Svg>
);
export const ShareIcon = () => (
	<Svg>
		<path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6" />
	</Svg>
);
export const ExternalIcon = () => (
	<Svg size={18}>
		<path d="M7 17L17 7M9 7h8v8" />
	</Svg>
);
export const FilterIcon = () => (
	<Svg>
		<path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
		<circle cx="16" cy="7" r="2" />
		<circle cx="8" cy="17" r="2" />
	</Svg>
);
export const SunIcon = () => (
	<Svg>
		<circle cx="12" cy="12" r="4" />
		<path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
	</Svg>
);
export const CloseIcon = () => (
	<Svg>
		<path d="M6 6l12 12M18 6L6 18" />
	</Svg>
);
