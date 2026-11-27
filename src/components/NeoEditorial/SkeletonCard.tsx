import { Skeleton } from "@juninmd/sonido";

interface SkeletonCardProps {
	label?: string;
}

/** Placeholder do feed: linhas, mídia e anúncio em região viva vêm do Sonido. */
export function SkeletonCard({
	label = "Carregando matérias",
}: SkeletonCardProps) {
	return (
		<div className="pulso-skeleton-card">
			<Skeleton label={label} rows={4} media />
		</div>
	);
}
