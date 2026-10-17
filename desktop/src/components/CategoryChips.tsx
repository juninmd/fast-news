import { t } from "../i18n";
import { formatNumber, parseCount } from "../lib/format";
import type { Category } from "../lib/types";

type Props = { categories: Category[]; active: string | null; onPick: (category: string | null) => void };

export default function CategoryChips({ categories, active, onPick }: Props) {
  return (
    <div className="flex gap-0.5 overflow-x-auto pb-1">
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
      className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] whitespace-nowrap transition-colors ${
        selected ? "bg-accent/15 font-medium text-accent-text" : "text-muted hover:bg-hover hover:text-fg"
      }`}
    >
      {label}
      {count !== undefined && <span className="ml-1.5 text-[11px] font-normal text-faint">{formatNumber(count)}</span>}
    </button>
  );
}
