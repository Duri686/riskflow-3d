import type { ReactNode } from "react";

export type LabStatusTone =
	| "foreground"
	| "accent"
	| "success"
	| "warning"
	| "danger"
	| "muted";

export interface LabStatusMetric {
	id: string;
	label: string;
	value: string;
	tone?: LabStatusTone;
}

export interface LabStatusModel {
	title?: string;
	metrics: LabStatusMetric[];
	action?: ReactNode;
	loading?: boolean;
}

interface LabStatusStripProps extends LabStatusModel {
	className?: string;
}

const toneClassMap: Record<LabStatusTone, string> = {
	foreground: "text-[var(--color-bt-foreground)]",
	accent: "text-[var(--color-bt-accent)]",
	success: "text-[var(--color-bt-success)]",
	warning: "text-[var(--color-bt-warning)]",
	danger: "text-[var(--color-bt-danger)]",
	muted: "text-[var(--color-bt-muted-foreground)]",
};

const combineClasses = (...classes: Array<string | undefined | false>) => {
	return classes.filter(Boolean).join(" ");
};

const LOADING_METRICS: LabStatusMetric[] = [
	{ id: "loading-0", label: "状态", value: "--", tone: "muted" },
	{ id: "loading-1", label: "指标 A", value: "--", tone: "muted" },
	{ id: "loading-2", label: "指标 B", value: "--", tone: "muted" },
	{ id: "loading-3", label: "指标 C", value: "--", tone: "muted" },
];

export const LabStatusStrip = ({
	title,
	metrics,
	action,
	loading,
	className,
}: LabStatusStripProps) => {
	const displayMetrics =
		loading && metrics.length === 0 ? LOADING_METRICS : metrics.slice(0, 4);

	return (
		<section
			id="lab-status-strip"
			className={combineClasses(
				"border border-[var(--color-bt-border)] bg-[var(--color-bt-overlay)] px-4 py-3 md:px-5",
				className,
			)}
		>
			<div className="flex items-stretch justify-between gap-4">
				<div className="min-w-0 flex-1">
					{title ? (
						<p className="font-bt-mono text-[9px] uppercase tracking-[0.16em] text-[var(--color-bt-muted-foreground)]">
							{title}
						</p>
					) : null}
					<div
						className={combineClasses(
							"grid min-w-0 grid-cols-2 gap-x-4 gap-y-2",
							title ? "mt-2" : undefined,
						)}
					>
						{displayMetrics.map((metric) => (
							<div
								key={metric.id}
								className="min-w-0 border-l border-[var(--color-bt-border)] pl-2"
							>
								<p className="truncate font-bt-mono text-[9px] uppercase tracking-[0.14em] text-[var(--color-bt-muted-foreground)]">
									{metric.label}
								</p>
								<p
									className={combineClasses(
										"truncate font-bt-mono text-[12px] font-semibold [font-variant-numeric:tabular-nums]",
										toneClassMap[metric.tone ?? "foreground"],
									)}
									title={metric.value}
								>
									{metric.value}
								</p>
							</div>
						))}
					</div>
				</div>
				{action ? (
					<div className="flex shrink-0 items-center border-l border-[var(--color-bt-border)] pl-3">
						{action}
					</div>
				) : null}
			</div>
		</section>
	);
};
