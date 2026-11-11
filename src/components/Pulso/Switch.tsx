interface SwitchProps {
	id: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
	label: string;
}

export function Switch({ id, checked, onChange, label }: SwitchProps) {
	return (
		<div className="flex items-center justify-between gap-3 text-sm">
			<label htmlFor={id} className="cursor-pointer select-none">
				{label}
			</label>
			<button
				id={id}
				type="button"
				role="switch"
				aria-checked={checked}
				onClick={() => onChange(!checked)}
				className="pulso-switch"
			/>
		</div>
	);
}
