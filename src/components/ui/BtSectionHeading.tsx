import type { ReactNode } from "react";

interface BtSectionHeadingProps {
	title: string;
	meta?: string;
	icon?: ReactNode;
	className?: string;
}

const combineClasses = (...classes: Array<string | undefined | false>) => {
	return classes.filter(Boolean).join(" ");
};

export const BtSectionHeading = ({
	title,
	meta,
	icon,
	className,
}: BtSectionHeadingProps) => {
	return (
		<div className={combineClasses("flex items-center justify-between gap-4", className)}>
			<h2 className="flex items-center gap-2.5 font-bt-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-bt-foreground)]">
				<span className="h-3.5 w-[2px] bg-[var(--color-bt-accent)]" />
				{icon ? <span className="inline-flex items-center">{icon}</span> : null}
				<span>{title}</span>
			</h2>
			{meta ? (
				<span className="font-bt-mono text-[9px] uppercase tracking-[0.16em] text-[var(--color-bt-muted-foreground)]">
					{meta}
				</span>
			) : null}
		</div>
	);
};
