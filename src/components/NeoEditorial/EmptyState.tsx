import { EmptyState as SonidoEmptyState } from "@juninmd/sonido";
import type { ReactNode } from "react";

interface EmptyStateProps {
	title: string;
	text: string;
	icon?: ReactNode;
	action?: ReactNode;
}

/** Estado vazio do app; a casca, o título e a descrição vêm do Sonido. */
export function EmptyState({ title, text, icon, action }: EmptyStateProps) {
	return (
		<SonidoEmptyState
			icon={icon}
			title={title}
			description={text}
			action={action}
			titleAs="h2"
		/>
	);
}
