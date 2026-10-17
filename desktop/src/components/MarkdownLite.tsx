import type { ReactNode } from "react";

/** Minimal markdown (headings, bullets, bold) rendered as React nodes — never through innerHTML. */
function inline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={index} className="font-semibold text-fg">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <span key={index}>{part}</span>
      ),
    );
}

const BULLET = /^\s*[-*]\s+/;

function Block({ block }: { block: string }) {
  const lines = block.split("\n");
  const heading = /^(#{1,6})\s+(.*)$/.exec(lines[0] ?? "");
  const rest = heading ? lines.slice(1).join("\n").trim() : "";

  if (heading) {
    return (
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-accent-text">{inline(heading[2])}</h3>
        {rest !== "" && <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{inline(rest)}</p>}
      </div>
    );
  }

  if (lines.length > 1 && lines.every((line) => BULLET.test(line))) {
    return (
      <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted">
        {lines.map((line, index) => (
          <li key={index}>{inline(line.replace(BULLET, ""))}</li>
        ))}
      </ul>
    );
  }

  return <p className="text-sm leading-relaxed whitespace-pre-line text-muted">{inline(block)}</p>;
}

export default function MarkdownLite({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).filter((block) => block.trim() !== "");
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}
