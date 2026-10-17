import { t } from "../i18n";
import { formatNumber, parseCount } from "../lib/format";
import type { Category } from "../lib/types";

type Props = { categories: Category[]; active: string | null; onPick: (category: string | null) => void };

export default function CategoryChips({ categories, active, onPick }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      <Chip label={t("feed.all")} selected={active === null} onClick={() => onPick(null)} />
      {categories.map((item) => (
        <Chip
          key={item.category}
          label={item.category}
          count={parseCount(item.count)}
          selected={active === item.category}
          onClick={() => onPick(item.category)}
        />
      ))}
    </div>
  );
}

function Chip({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs whitespace-nowrap transition-colors ${
        selected ? "border-accent bg-accent/15 text-accent-text" : "border-edge text-muted hover:bg-hover hover:text-fg"
      }`}
    >
      {label}
      {count !== undefined && <span className="ml-1 text-faint">{formatNumber(count)}</span>}
    </button>
  );
}
