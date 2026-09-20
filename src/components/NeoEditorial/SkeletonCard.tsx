export function SkeletonCard() {
	return (
		<div className="flex items-start gap-5 border-b border-border-subtle py-5 last:border-b-0">
			<div className="min-w-0 flex-1 space-y-3">
				<div className="h-3 w-1/3 skeleton" />
				<div className="h-6 w-full skeleton" />
				<div className="h-6 w-2/3 skeleton" />
				<div className="h-4 w-1/2 skeleton" />
			</div>
			<div className="hidden h-20 w-32 shrink-0 skeleton sm:block" />
		</div>
	);
}
