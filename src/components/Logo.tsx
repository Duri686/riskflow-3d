interface LogoProps {
	className?: string;
	showText?: boolean;
	size?: "sm" | "md" | "lg";
}

const sizeMap = {
	sm: "h-6 w-6",
	md: "h-8 w-8",
	lg: "h-10 w-10",
};

export function RiskFlowLogo({
	className = "",
	showText = true,
	size = "md",
}: LogoProps) {
	return (
		<div className={`flex items-center gap-2 ${className}`}>
			<svg
				className={sizeMap[size]}
				viewBox="0 0 40 40"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				aria-hidden="true"
			>
				<title>RiskFlow Logo</title>
				{/* 中心圆 */}
				<circle cx="20" cy="20" r="6" fill="#7C4DFF" />
				{/* 上方节点 */}
				<circle cx="20" cy="6" r="4" fill="#7C4DFF" />
				<line
					x1="20"
					y1="14"
					x2="20"
					y2="10"
					stroke="#7C4DFF"
					strokeWidth="2"
				/>
				{/* 下方节点 */}
				<circle cx="20" cy="34" r="4" fill="#7C4DFF" />
				<line
					x1="20"
					y1="26"
					x2="20"
					y2="30"
					stroke="#7C4DFF"
					strokeWidth="2"
				/>
				{/* 左上节点 */}
				<circle cx="8" cy="12" r="4" fill="#7C4DFF" />
				<line
					x1="14.5"
					y1="16"
					x2="11"
					y2="14"
					stroke="#7C4DFF"
					strokeWidth="2"
				/>
				{/* 右上节点 */}
				<circle cx="32" cy="12" r="4" fill="#7C4DFF" />
				<line
					x1="25.5"
					y1="16"
					x2="29"
					y2="14"
					stroke="#7C4DFF"
					strokeWidth="2"
				/>
				{/* 左下节点 */}
				<circle cx="8" cy="28" r="4" fill="#7C4DFF" />
				<line
					x1="14.5"
					y1="24"
					x2="11"
					y2="26"
					stroke="#7C4DFF"
					strokeWidth="2"
				/>
				{/* 右下节点 */}
				<circle cx="32" cy="28" r="4" fill="#7C4DFF" />
				<line
					x1="25.5"
					y1="24"
					x2="29"
					y2="26"
					stroke="#7C4DFF"
					strokeWidth="2"
				/>
			</svg>
			{showText && (
				<span className="font-display text-lg font-bold tracking-widest text-white/90">
					RISKFLOW
					<span className="text-rf-primary">_LAB</span>
				</span>
			)}
		</div>
	);
}

export function MaterialIcon({
	name,
	className = "",
}: {
	name: string;
	className?: string;
}) {
	return (
		<span className={`material-symbols-outlined ${className}`}>{name}</span>
	);
}
