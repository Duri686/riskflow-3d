import { useMemo } from "react";

interface PathVisualizationProps {
	paths: number;
	steps: number;
	drift: number;
	volatility: number;
	isPlaying: boolean;
	progress: number;
	seed?: number;
}

/**
 * 蒙特卡洛模拟 SVG 可视化组件
 *
 * 展示资产价格的随机游走路径：
 * - 每条线代表一个可能的未来价格路径
 * - 青色(上涨) / 紫色(下跌) 表示相对于初始价格的方向
 * - 右侧直方图显示最终价格分布
 *
 * 参数说明：
 * - paths: 模拟路径数量（更多路径 = 更准确的分布）
 * - steps: 时间步数（如 252 = 一年交易日）
 * - drift: 预期收益率 μ（正值 = 预期上涨）
 * - volatility: 波动率 σ（越大 = 路径分散越广）
 */
export function PathVisualization({
	paths,
	steps,
	drift,
	volatility,
	seed = 42,
}: PathVisualizationProps) {
	// 生成随机路径数据
	const pathsData = useMemo(() => {
		const width = 950;
		const height = 400;
		const startY = height / 2;
		const initialPrice = 100;

		const numPaths = Math.min(paths, 80);
		const stepWidth = width / steps;
		const dt = 1 / steps;

		const result: { d: string; color: string; opacity: number }[] = [];

		// Mulberry32 PRNG
		const mulberry32 = (s: number) => {
			let state = s >>> 0;
			return () => {
				state += 0x6d2b79f5;
				let t = Math.imul(state ^ (state >>> 15), 1 | state);
				t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
				return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
			};
		};

		// Box-Muller 正态分布
		const normalRandom = (rng: () => number) => {
			const u1 = Math.max(rng(), 1e-10);
			const u2 = rng();
			return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
		};

		for (let p = 0; p < numPaths; p++) {
			const rng = mulberry32(seed + p * 7919);
			let price = initialPrice;
			const points: [number, number][] = [[0, startY]];

			for (let s = 1; s <= steps; s++) {
				const z = normalRandom(rng);
				const driftTerm = (drift - 0.5 * volatility * volatility) * dt;
				const diffusionTerm = volatility * Math.sqrt(dt) * z;
				price *= Math.exp(driftTerm + diffusionTerm);

				const logReturn = Math.log(price / initialPrice);
				const y = startY - logReturn * 300;
				points.push([s * stepWidth, Math.max(20, Math.min(height - 20, y))]);
			}

			let d = `M ${points[0][0]},${points[0][1]}`;
			for (let i = 1; i < points.length; i++) {
				const prev = points[i - 1];
				const curr = points[i];
				const cpX = (prev[0] + curr[0]) / 2;
				d += ` Q ${cpX},${prev[1]} ${curr[0]},${curr[1]}`;
			}

			const isUp = price > initialPrice;
			const returnPct = Math.abs(price / initialPrice - 1);
			const opacity = 0.15 + Math.min(returnPct, 0.5) * 0.5;

			result.push({
				d,
				color: isUp ? "#22D3EE" : "#A855F7",
				opacity,
			});
		}

		// 基准线（初始价格水平）
		result.push({
			d: `M 0,${startY} L ${width},${startY}`,
			color: "#FFFFFF",
			opacity: 0.4,
		});

		return result;
	}, [paths, steps, drift, volatility, seed]);

	return (
		<div className="relative h-full w-full">
			{/* SVG 可视化 */}
			<svg
				className="h-full w-full overflow-visible"
				viewBox="0 0 1000 500"
				preserveAspectRatio="xMidYMid meet"
			>
				<defs>
					{/* 路径渐变 */}
					<linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stopColor="#22D3EE" stopOpacity="0.1" />
						<stop offset="100%" stopColor="#A855F7" stopOpacity="0.6" />
					</linearGradient>
					{/* 发光滤镜 */}
					<filter id="glow">
						<feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
						<feMerge>
							<feMergeNode in="coloredBlur" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
					<filter id="glowCyan">
						<feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#22D3EE" />
					</filter>
					<filter id="glowPurple">
						<feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#A855F7" />
					</filter>
				</defs>

				{/* 路径线条 */}
				<g fill="none" strokeWidth="0.5">
					{pathsData.map((path, index) => (
						<path
							key={index}
							d={path.d}
							stroke={path.color}
							opacity={path.opacity}
							filter={
								index === pathsData.length - 1
									? "url(#glow)"
									: path.color === "#22D3EE"
									? "url(#glowCyan)"
									: "url(#glowPurple)"
							}
							strokeWidth={index === pathsData.length - 1 ? 2 : 0.5}
													/>
					))}
				</g>

				</svg>

			</div>
	);
}
