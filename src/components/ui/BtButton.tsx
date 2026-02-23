import type { ButtonHTMLAttributes, ReactNode } from "react";

type BtButtonVariant = "primary" | "outline" | "ghost";
type BtButtonSize = "sm" | "md" | "lg" | "icon";

interface BtButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: BtButtonVariant;
	size?: BtButtonSize;
	startIcon?: ReactNode;
	endIcon?: ReactNode;
}

const sizeClassMap: Record<BtButtonSize, string> = {
	sm: "h-11 gap-2 text-[11px]",
	md: "h-12 gap-2.5 text-xs",
	lg: "h-14 gap-3 text-sm",
	icon: "h-11 w-11 px-0",
};

const variantClassMap: Record<BtButtonVariant, string> = {
	primary:
		"px-0 text-[var(--color-bt-accent)] after:absolute after:bottom-[2px] after:left-0 after:h-[2px] after:w-full after:origin-left after:bg-[var(--color-bt-accent)] after:transition-transform after:duration-150 after:ease-[var(--ease-bt)] hover:after:scale-x-[1.1]",
	outline:
		"min-w-[8rem] border border-[var(--color-bt-foreground)] px-6 text-[var(--color-bt-foreground)] transition-colors duration-150 ease-[var(--ease-bt)] hover:bg-[var(--color-bt-foreground)] hover:text-[var(--color-bt-background)]",
	ghost:
		"px-4 text-[var(--color-bt-muted-foreground)] transition-colors duration-150 ease-[var(--ease-bt)] hover:text-[var(--color-bt-foreground)] after:absolute after:bottom-[2px] after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-150 after:ease-[var(--ease-bt)] hover:after:scale-x-100",
};

const combineClasses = (...classes: Array<string | undefined | false>) => {
	return classes.filter(Boolean).join(" ");
};

export const BtButton = ({
	variant = "primary",
	size = "md",
	startIcon,
	endIcon,
	className,
	children,
	type = "button",
	...props
}: BtButtonProps) => {
	const isIconOnly = size === "icon";

	return (
		<button
			type={type}
			className={combineClasses(
				"relative inline-flex shrink-0 appearance-none items-center justify-center whitespace-nowrap border-0 bg-transparent align-middle font-bt-sans font-semibold uppercase tracking-[0.1em] text-[var(--color-bt-foreground)] transition-[color,background-color,transform] duration-150 ease-[var(--ease-bt)] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bt-ring)] disabled:pointer-events-none disabled:opacity-50",
				sizeClassMap[size],
				variantClassMap[variant],
				isIconOnly && "min-w-11 after:hidden",
				className,
			)}
			{...props}
		>
			{startIcon ? <span className="inline-flex items-center">{startIcon}</span> : null}
			{children ? <span>{children}</span> : null}
			{endIcon ? <span className="inline-flex items-center">{endIcon}</span> : null}
		</button>
	);
};
