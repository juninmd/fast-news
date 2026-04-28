export function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden bg-bg-secondary border border-border-subtle">
      <div className="h-48 skeleton" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 rounded-full skeleton" />
          <div className="h-5 w-16 rounded-full skeleton" />
        </div>
        <div className="h-6 w-full rounded skeleton" />
        <div className="h-6 w-3/4 rounded skeleton" />
        <div className="space-y-2">
          <div className="h-4 w-full rounded skeleton" />
          <div className="h-4 w-2/3 rounded skeleton" />
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
          <div className="h-4 w-24 rounded skeleton" />
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-lg skeleton" />
            <div className="h-8 w-8 rounded-lg skeleton" />
            <div className="h-8 w-8 rounded-lg skeleton" />
          </div>
        </div>
      </div>
    </div>
  );
}
