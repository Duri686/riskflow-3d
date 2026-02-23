import type { ReactNode } from "react";

type Tone =
	| "foreground"
	| "accent"
	| "success"
	| "warning"
	| "danger"
	| "muted";

type Align = "start" | "end";

interface WorkspaceActionsShellProps {
	children: ReactNode;
	className?: string;
}

interface WorkspaceActionMetricProps {
	label: string;
	value: string;
	tone?: Tone;
	align?: Align;
}

const toneClassMap: Record<Tone, string> = {
	foreground: "text-[var(--color-bt-foreground)]",
	accent: "text-[var(--color-bt-accent)]",
	success: "text-[var(--color-bt-success)]",
	warning: "text-[var(--color-bt-warning)]",
	danger: "text-[var(--color-bt-danger)]",
	muted: "text-[var(--color-bt-muted-foreground)]",
};

const alignClassMap: Record<Align, string> = {
	start: "items-start text-left",
	end: "items-end text-right",
};

const combineClasses = (...classes: Array<string | undefined | false>) => {
	return classes.filter(Boolean).join(" ");
};

export const WorkspaceActionsShell = ({
	children,
	className,
}: WorkspaceActionsShellProps) => {
	return (
		<div
			className={combineClasses(
				"mr-1 flex items-center gap-3 border-l border-[var(--color-bt-border)] pl-3",
				className,
			)}
		>
			{children}
		</div>
	);
};

export const WorkspaceActionMetric = ({
	label,
	value,
	tone = "foreground",
	align = "end",
}: WorkspaceActionMetricProps) => {
	return (
		<div className={combineClasses("flex flex-col", alignClassMap[align])}>
			<span className="font-bt-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-bt-muted-foreground)]">
				{label}
			</span>
			<span className={combineClasses("font-bt-mono text-[11px] font-semibold", toneClassMap[tone])}>
				{value}
			</span>
		</div>
	);
};

export const WorkspaceActionDivider = () => {
	return <div className="h-7 w-px bg-[var(--color-bt-border)]" />;
};
