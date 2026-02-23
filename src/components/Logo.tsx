import { Link } from "react-router-dom";

interface LogoProps {
	className?: string;
	showText?: boolean;
	size?: "sm" | "md" | "lg";
	accentColor?: string;
}

const sizeMap: Record<NonNullable<LogoProps["size"]>, string> = {
	sm: "h-6 w-6",
	md: "h-8 w-8",
	lg: "h-10 w-10",
};

const textSizeMap: Record<NonNullable<LogoProps["size"]>, string> = {
	sm: "text-[13px] tracking-[0.16em]",
	md: "text-base tracking-[0.18em]",
	lg: "text-lg tracking-[0.2em]",
};

export function RiskFlowLogo({
	className = "",
	showText = true,
	size = "md",
	accentColor = "var(--color-bt-accent)",
}: LogoProps) {
	return (
		<Link
			to="/"
			className={`inline-flex w-fit items-center gap-2 transition-opacity duration-150 hover:opacity-80 ${className}`}
		>
			<svg
				className={sizeMap[size]}
				viewBox="0 0 40 40"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
			>
				<title>RiskFlow Logo</title>
				<circle cx="20" cy="20" r="6" fill={accentColor} />
				<circle cx="20" cy="6" r="4" fill={accentColor} />
				<line x1="20" y1="14" x2="20" y2="10" stroke={accentColor} strokeWidth="2" />
				<circle cx="20" cy="34" r="4" fill={accentColor} />
				<line x1="20" y1="26" x2="20" y2="30" stroke={accentColor} strokeWidth="2" />
				<circle cx="8" cy="12" r="4" fill={accentColor} />
				<line x1="14.5" y1="16" x2="11" y2="14" stroke={accentColor} strokeWidth="2" />
				<circle cx="32" cy="12" r="4" fill={accentColor} />
				<line x1="25.5" y1="16" x2="29" y2="14" stroke={accentColor} strokeWidth="2" />
				<circle cx="8" cy="28" r="4" fill={accentColor} />
				<line x1="14.5" y1="24" x2="11" y2="26" stroke={accentColor} strokeWidth="2" />
				<circle cx="32" cy="28" r="4" fill={accentColor} />
				<line x1="25.5" y1="24" x2="29" y2="26" stroke={accentColor} strokeWidth="2" />
			</svg>
			{showText ? (
				<span
					className={`whitespace-nowrap font-bt-sans font-semibold leading-none uppercase ${textSizeMap[size]} text-[var(--color-bt-foreground)]`}
				>
					RISKFLOW
					<span className="text-[var(--color-bt-accent)]">_LAB</span>
				</span>
			) : null}
		</Link>
	);
}
