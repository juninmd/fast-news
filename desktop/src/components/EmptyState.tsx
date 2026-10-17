import type { ReactNode } from "react";
import { Inbox } from "./Icons";

export default function EmptyState({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full border border-edge text-faint">
        {icon ?? <Inbox className="h-5 w-5" />}
      </span>
      <p className="max-w-xs text-sm leading-relaxed text-faint">{message}</p>
    </div>
  );
}
