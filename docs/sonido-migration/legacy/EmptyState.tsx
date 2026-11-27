// Cópia literal do EmptyState local de origin/main:src/AppNeo.tsx (linhas 814-823).
export function EmptyState({ title, text }: { title: string; text: string }) {
	return (
		<div className="py-20 text-center text-text-secondary">
			<p className="font-display text-xl font-bold text-text-primary">
				{title}
			</p>
			<p className="mt-1">{text}</p>
		</div>
	);
}
