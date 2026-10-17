import type { ReactNode } from "react";

const DEFAULT = "h-4 w-4 shrink-0";

function Svg({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function Newspaper({ className = DEFAULT }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M4 5h11a2 2 0 0 1 2 2v11a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2Z" />
      <path d="M17 9h3v9a2 2 0 0 1-2 2M8 9h5M8 13h5M8 17h3" />
    </Svg>
  );
}

export function Flame({ className = DEFAULT }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M12 3c3 4 5 6 5 9.5A5 5 0 0 1 7 12.5C7 10 9 8 9 6c1.5 1.5 3 3 3 6a2.5 2.5 0 0 0 5 0" />
    </Svg>
  );
}

export function Search({ className = DEFAULT }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Svg>
  );
}

export function BookOpen({ className = DEFAULT }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M12 6.5C10.5 5 8.5 4.5 4 4.5v13c4.5 0 6.5.5 8 2 1.5-1.5 3.5-2 8-2v-13c-4.5 0-6.5.5-8 2Z" />
      <path d="M12 6.5v13" />
    </Svg>
  );
}

export function Layers({ className = DEFAULT }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </Svg>
  );
}

export function Tag({ className = DEFAULT }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M3 12V4h8l9 9-8 8-9-9Z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </Svg>
  );
}

export function Coins({ className = DEFAULT }: { className?: string }) {
  return (
    <Svg className={className}>
      <ellipse cx="9" cy="7" rx="6" ry="3" />
      <path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7" />
      <path d="M15 12c3 .3 6 1.5 6 3v5c0 1.7-2.7 3-6 3s-6-1.3-6-3v-3" />
    </Svg>
  );
}

export function Settings({ className = DEFAULT }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </Svg>
  );
}

export function Refresh({ className = DEFAULT }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v4h-4" />
    </Svg>
  );
}

export function ExternalLink({ className = DEFAULT }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </Svg>
  );
}

export function Close({ className = DEFAULT }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function ChevronRight({ className = DEFAULT }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="m9 6 6 6-6 6" />
    </Svg>
  );
}

export function ChevronLeft({ className = DEFAULT }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="m15 6-6 6 6 6" />
    </Svg>
  );
}

export function Sun({ className = DEFAULT }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  );
}

export function Moon({ className = DEFAULT }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />
    </Svg>
  );
}

export function Wifi({ className = DEFAULT }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0" />
      <circle cx="12" cy="19" r="0.6" fill="currentColor" />
    </Svg>
  );
}

export function WifiOff({ className = DEFAULT }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M2 8.5a15 15 0 0 1 8-4M14 4.5a15 15 0 0 1 8 4M5.5 12a10 10 0 0 1 5-2.7M13.5 9.3A10 10 0 0 1 18.5 12M9 15.5a5 5 0 0 1 6 0" />
      <path d="M3 3l18 18" />
    </Svg>
  );
}

export function Clock({ className = DEFAULT }: { className?: string }) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </Svg>
  );
}

export function AlertTriangle({ className = DEFAULT }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10v4M12 17h.01" />
    </Svg>
  );
}

export function Inbox({ className = DEFAULT }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M3 12h5l1.5 3h5L16 12h5" />
      <path d="M4.5 5h15l1.5 7v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5l1.5-7Z" />
    </Svg>
  );
}
