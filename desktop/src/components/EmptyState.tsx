import type { ReactNode } from "react";
import { Inbox } from "./Icons";

export default function EmptyState({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-faint">
      <span className="text-line">{icon ?? <Inbox className="h-7 w-7" />}</span>
      <p>{message}</p>
    </div>
  );
}
