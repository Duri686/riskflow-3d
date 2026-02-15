import type { ReactNode } from "react";

interface PanelSectionProps {
	title: string;
	open: boolean;
	onToggle: () => void;
	children: ReactNode;
}

export function PanelSection({ title, open, onToggle, children }: PanelSectionProps) {
	return (
		<section className="overflow-hidden rounded-card border border-rf-border">
			<button
				className="flex w-full items-center justify-between border-none bg-rf-bg-section px-3.5 py-2.5 text-sm font-medium"
				type="button"
				onClick={onToggle}
			>
				<span>{title}</span>
				<span className="text-xs text-rf-text-dim">{open ? "−" : "+"}</span>
			</button>
			{open && (
				<div className="bg-rf-bg-section-body px-3.5 py-3">
					{children}
				</div>
			)}
		</section>
	);
}
