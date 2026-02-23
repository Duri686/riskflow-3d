import type { ReactNode } from "react";
import { BtSectionHeading } from "@/components/ui/BtSectionHeading";

export type BtSidebarTone =
	| "foreground"
	| "muted"
	| "accent"
	| "success"
	| "warning"
	| "danger";

type BtSidebarSectionVariant = "default" | "panel";

interface BtSidebarSectionProps {
	title: string;
	meta?: string;
	icon?: ReactNode;
	variant?: BtSidebarSectionVariant;
	className?: string;
	contentClassName?: string;
	children: ReactNode;
}

interface BtSidebarGroupLabelProps {
	children: ReactNode;
	tone?: BtSidebarTone;
	className?: string;
}

interface BtSidebarValueRowProps {
	label: ReactNode;
	value: ReactNode;
	tone?: BtSidebarTone;
	withDivider?: boolean;
	className?: string;
	labelClassName?: string;
	valueClassName?: string;
}

interface BtSidebarSegmentedOption<T extends string> {
	value: T;
	label: string;
	title?: string;
}

interface BtSidebarSegmentedProps<T extends string> {
	options: BtSidebarSegmentedOption<T>[];
	value: T;
	onChange: (value: T) => void;
	columns?: number;
	className?: string;
}

interface BtSidebarRangeRowProps {
	label: ReactNode;
	value: ReactNode;
	min: number;
	max: number;
	step?: number;
	sliderValue: number;
	onChange: (value: number) => void;
	className?: string;
	labelClassName?: string;
	valueClassName?: string;
	disabled?: boolean;
}

interface BtSidebarStatusChipProps {
	label: ReactNode;
	meta?: ReactNode;
	icon?: ReactNode;
	tone?: BtSidebarTone;
	className?: string;
}

const sectionClassMap: Record<BtSidebarSectionVariant, string> = {
	default: "bt-sidebar-section",
	panel: "bt-sidebar-panel",
};

const toneClassMap: Record<BtSidebarTone, string> = {
	foreground: "text-[var(--color-bt-foreground)]",
	muted: "text-[var(--color-bt-muted-foreground)]",
	accent: "text-[var(--color-bt-accent)]",
	success: "text-[var(--color-bt-success)]",
	warning: "text-[var(--color-bt-warning)]",
	danger: "text-[var(--color-bt-danger)]",
};

const chipToneClassMap: Record<BtSidebarTone, string> = {
	foreground:
		"border-[var(--color-bt-border)] bg-[var(--color-bt-muted)] text-[var(--color-bt-foreground)]",
	muted:
		"border-[var(--color-bt-border)] bg-[var(--color-bt-background)] text-[var(--color-bt-muted-foreground)]",
	accent:
		"border-[var(--color-bt-accent)]/40 bg-[color-mix(in_oklab,var(--color-bt-accent)_14%,transparent)] text-[var(--color-bt-accent)]",
	success:
		"border-[var(--color-bt-success)]/40 bg-[var(--color-bt-success-soft)] text-[var(--color-bt-success)]",
	warning:
		"border-[var(--color-bt-warning)]/40 bg-[var(--color-bt-warning-soft)] text-[var(--color-bt-warning)]",
	danger:
		"border-[var(--color-bt-danger)]/40 bg-[var(--color-bt-danger-soft)] text-[var(--color-bt-danger)]",
};

const combineClasses = (...classes: Array<string | undefined | false>) => {
	return classes.filter(Boolean).join(" ");
};

export const BtSidebarSection = ({
	title,
	meta,
	icon,
	variant = "default",
	className,
	contentClassName,
	children,
}: BtSidebarSectionProps) => {
	const defaultContentClass =
		variant === "default" ? "mt-4 space-y-4" : "mt-3 space-y-3";

	return (
		<section className={combineClasses(sectionClassMap[variant], className)}>
			<BtSectionHeading title={title} meta={meta} icon={icon} />
			<div className={combineClasses(contentClassName ?? defaultContentClass)}>
				{children}
			</div>
		</section>
	);
};

export const BtSidebarGroupLabel = ({
	children,
	tone = "muted",
	className,
}: BtSidebarGroupLabelProps) => {
	return (
		<p
			className={combineClasses(
				"font-bt-mono text-[10px] uppercase tracking-[0.14em]",
				toneClassMap[tone],
				className,
			)}
		>
			{children}
		</p>
	);
};

export const BtSidebarValueRow = ({
	label,
	value,
	tone = "foreground",
	withDivider = true,
	className,
	labelClassName,
	valueClassName,
}: BtSidebarValueRowProps) => {
	return (
		<div
			className={combineClasses(
				"flex items-center justify-between gap-3 font-bt-mono text-[10px] uppercase tracking-[0.12em]",
				withDivider && "border-b border-[var(--color-bt-border)] pb-2",
				className,
			)}
		>
			<span
				className={combineClasses(
					"text-[var(--color-bt-muted-foreground)]",
					labelClassName,
				)}
			>
				{label}
			</span>
			<span className={combineClasses(toneClassMap[tone], valueClassName)}>{value}</span>
		</div>
	);
};

export const BtSidebarSegmented = <T extends string>({
	options,
	value,
	onChange,
	columns = 2,
	className,
}: BtSidebarSegmentedProps<T>) => {
	return (
		<div
			className={combineClasses("grid gap-2", className)}
			style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
		>
			{options.map((option) => {
				const isActive = option.value === value;
				return (
					<button
						key={option.value}
						type="button"
						title={option.title}
						onClick={() => onChange(option.value)}
						className={combineClasses(
							"h-11 border px-2.5 font-bt-mono text-[11px] tracking-[0.08em] transition-colors duration-150 ease-[var(--ease-bt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bt-ring)]",
							isActive
								? "border-[var(--color-bt-accent)] bg-[var(--color-bt-muted)] text-[var(--color-bt-accent)]"
								: "border-[var(--color-bt-border)] text-[var(--color-bt-muted-foreground)] hover:text-[var(--color-bt-foreground)]",
						)}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
};

export const BtSidebarRangeRow = ({
	label,
	value,
	min,
	max,
	step = 1,
	sliderValue,
	onChange,
	className,
	labelClassName,
	valueClassName,
	disabled,
}: BtSidebarRangeRowProps) => {
	return (
		<label className={combineClasses("block space-y-1.5", className)}>
			<div className="flex items-center justify-between gap-3 font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)]">
				<span className={combineClasses(labelClassName)}>{label}</span>
				<span
					className={combineClasses(
						"text-[var(--color-bt-foreground)] [font-variant-numeric:tabular-nums]",
						valueClassName,
					)}
				>
					{value}
				</span>
			</div>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={sliderValue}
				onChange={(event) => onChange(Number(event.target.value))}
				className="bt-range"
				disabled={disabled}
			/>
		</label>
	);
};

export const BtSidebarStatusChip = ({
	label,
	meta,
	icon,
	tone = "muted",
	className,
}: BtSidebarStatusChipProps) => {
	return (
		<div
			className={combineClasses(
				"flex min-h-11 items-center justify-between gap-3 border px-2.5 py-2 font-bt-mono text-[10px] uppercase tracking-[0.1em]",
				chipToneClassMap[tone],
				className,
			)}
		>
			<span className="inline-flex items-center gap-1.5">
				{icon ? <span className="inline-flex items-center">{icon}</span> : null}
				<span>{label}</span>
			</span>
			{meta ? <span className="text-[9px] opacity-75">{meta}</span> : null}
		</div>
	);
};

export const BtSidebarDivider = ({ className }: { className?: string }) => {
	return <div className={combineClasses("bt-sidebar-divider", className)} />;
};
