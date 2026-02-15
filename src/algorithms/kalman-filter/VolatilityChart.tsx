import { useEffect, useMemo, useRef, useState } from "react";
import type { KalmanFilterResult } from "./engine";

interface VolatilityChartProps {
	result: KalmanFilterResult;
	dailyReturns: number[];
}

// ── 布局常量 ──
const MARGIN = { top: 40, right: 180, bottom: 50, left: 60 };

export function VolatilityChart({
	result,
	dailyReturns,
}: VolatilityChartProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [size, setSize] = useState({ width: 800, height: 400 });

	// 响应式尺寸
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const ro = new ResizeObserver(([entry]) => {
			const { width, height } = entry.contentRect;
			if (width > 0 && height > 0) {
				setSize({ width: Math.floor(width), height: Math.floor(height) });
			}
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const { steps } = result;
	const hasData = steps.length >= 2;

	const chart = useMemo(() => {
		if (!hasData) return null;

		const W = size.width - MARGIN.left - MARGIN.right;
		const H = size.height - MARGIN.top - MARGIN.bottom;

		// 观测值：|r_t| 的年化近似 = |r_t| × √252
		const observedVols = dailyReturns.map((r) => Math.abs(r) * Math.sqrt(252));

		// 估计值
		const estimatedVols = steps.map((s) => s.annualizedVol);

		// 置信带上下界
		const upperBand = steps.map((s) =>
			Math.sqrt(Math.max(0, s.estimated + Math.sqrt(s.errorCovariance)) * 252),
		);
		const lowerBand = steps.map((s) =>
			Math.sqrt(Math.max(0, s.estimated - Math.sqrt(s.errorCovariance)) * 252),
		);

		// Y 轴范围
		const allVals = [...observedVols, ...estimatedVols, ...upperBand];
		const yMax = Math.min(Math.max(...allVals) * 1.1, 5); // 上限 500%
		const yMin = 0;

		// 坐标映射
		const xScale = (t: number) => MARGIN.left + (t / (steps.length - 1)) * W;
		const yScale = (v: number) =>
			MARGIN.top + H - ((v - yMin) / (yMax - yMin)) * H;

		// 生成路径
		const observedPath = observedVols
			.map(
				(v, i) =>
					`${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`,
			)
			.join(" ");

		const estimatedPath = estimatedVols
			.map(
				(v, i) =>
					`${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`,
			)
			.join(" ");

		// 置信带多边形
		const bandPath = [
			...upperBand.map(
				(v, i) =>
					`${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`,
			),
			...lowerBand.map(
				(_, i) =>
					`L${xScale(steps.length - 1 - i).toFixed(1)},${yScale(lowerBand[steps.length - 1 - i]).toFixed(1)}`,
			),
			"Z",
		].join(" ");

		// Y 轴刻度
		const yTicks: number[] = [];
		const yStep = yMax <= 0.5 ? 0.1 : yMax <= 1 ? 0.2 : yMax <= 2 ? 0.5 : 1;
		for (let tick = 0; tick <= yMax; tick += yStep) {
			yTicks.push(tick);
		}

		// X 轴刻度（每 60 天一个）
		const xTicks: number[] = [];
		const xStep = Math.max(30, Math.floor(steps.length / 6));
		for (let t = 0; t < steps.length; t += xStep) {
			xTicks.push(t);
		}
		if (xTicks[xTicks.length - 1] !== steps.length - 1) {
			xTicks.push(steps.length - 1);
		}

		return {
			observedPath,
			estimatedPath,
			bandPath,
			xScale,
			yScale,
			yTicks,
			xTicks,
			yMax,
			W,
			H,
		};
	}, [hasData, steps, dailyReturns, size]);

	if (!hasData) {
		return (
			<div
				ref={containerRef}
				className="flex h-full w-full items-center justify-center"
			>
				<p className="font-mono text-sm text-gray-500">
					获取数据后显示波动率估计
				</p>
			</div>
		);
	}

	if (!chart) return null;

	return (
		<div ref={containerRef} className="relative h-full w-full">
			<svg
				width={size.width}
				height={size.height}
				className="select-none"
				role="img"
				aria-label="Volatility Chart"
			>
				{/* 网格背景 */}
				{chart.yTicks.map((v) => (
					<line
						key={v}
						x1={MARGIN.left}
						y1={chart.yScale(v)}
						x2={MARGIN.left + chart.W}
						y2={chart.yScale(v)}
						stroke="#1f2937"
						strokeDasharray="2,4"
					/>
				))}

				{/* 置信带 */}
				<path d={chart.bandPath} fill="#00D4AA" fillOpacity={0.08} />

				{/* 观测折线（原始噪声） */}
				<path
					d={chart.observedPath}
					fill="none"
					stroke="#6B7280"
					strokeWidth={0.8}
					strokeOpacity={0.4}
				/>

				{/* 滤波估计折线 */}
				<path
					d={chart.estimatedPath}
					fill="none"
					stroke="#00D4AA"
					strokeWidth={2}
				/>

				{/* Y 轴 */}
				<line
					x1={MARGIN.left}
					y1={MARGIN.top}
					x2={MARGIN.left}
					y2={MARGIN.top + chart.H}
					stroke="#374151"
				/>
				{chart.yTicks.map((v) => (
					<text
						key={v}
						x={MARGIN.left - 8}
						y={chart.yScale(v) + 3}
						fill="#6B7280"
						fontSize={9}
						textAnchor="end"
						fontFamily="monospace"
					>
						{(v * 100).toFixed(0)}%
					</text>
				))}

				{/* X 轴 */}
				<line
					x1={MARGIN.left}
					y1={MARGIN.top + chart.H}
					x2={MARGIN.left + chart.W}
					y2={MARGIN.top + chart.H}
					stroke="#374151"
				/>
				{chart.xTicks.map((t) => (
					<text
						key={t}
						x={chart.xScale(t)}
						y={MARGIN.top + chart.H + 18}
						fill="#6B7280"
						fontSize={9}
						textAnchor="middle"
						fontFamily="monospace"
					>
						{t + 1}天
					</text>
				))}

				{/* 轴标签 */}
				<text
					x={MARGIN.left + chart.W / 2}
					y={size.height - 8}
					fill="#6B7280"
					fontSize={11}
					textAnchor="middle"
				>
					交易日
				</text>
				<text
					x={14}
					y={MARGIN.top + chart.H / 2}
					fill="#6B7280"
					fontSize={11}
					textAnchor="middle"
					transform={`rotate(-90, 14, ${MARGIN.top + chart.H / 2})`}
				>
					年化波动率
				</text>

				{/* 图例 */}
				<g transform={`translate(${MARGIN.left + 10}, ${MARGIN.top + 8})`}>
					<line
						x1={0}
						y1={0}
						x2={20}
						y2={0}
						stroke="#6B7280"
						strokeWidth={1}
						strokeOpacity={0.5}
					/>
					<text x={25} y={3} fill="#6B7280" fontSize={9}>
						原始观测 |r_t|
					</text>

					<line
						x1={0}
						y1={16}
						x2={20}
						y2={16}
						stroke="#00D4AA"
						strokeWidth={2}
					/>
					<text x={25} y={19} fill="#00D4AA" fontSize={9}>
						滤波估计 σ̂
					</text>

					<rect
						x={0}
						y={28}
						width={20}
						height={8}
						fill="#00D4AA"
						fillOpacity={0.15}
					/>
					<text x={25} y={35} fill="#6B7280" fontSize={9}>
						置信区间
					</text>
				</g>

				{/* 右侧决策面板 */}
				<g
					transform={`translate(${size.width - MARGIN.right + 20}, ${MARGIN.top})`}
				>
					<text x={0} y={0} fill="#E5E7EB" fontSize={14} fontWeight="700">
						波动率洞察
					</text>

					{/* 当前波动率 */}
					<text x={0} y={32} fill="#00D4AA" fontSize={22} fontWeight="700">
						σ {(result.currentVol * 100).toFixed(1)}%
					</text>

					{/* 最高 */}
					<text x={0} y={64} fill="#FF4757" fontSize={12} fontWeight="600">
						最高 {(result.maxVol * 100).toFixed(1)}%
					</text>

					{/* 最低 */}
					<text x={0} y={88} fill="#6B7280" fontSize={12} fontWeight="600">
						最低 {(result.minVol * 100).toFixed(1)}%
					</text>

					{/* Kalman Gain */}
					<text x={0} y={112} fill="#E5E7EB" fontSize={12} fontWeight="600">
						Gain {result.finalGain.toFixed(3)}
					</text>

					<rect x={0} y={128} width={100} height={1} fill="#374151" />

					<text x={0} y={148} fill="#6B7280" fontSize={9}>
						数据点: {result.steps.length}
					</text>
				</g>
			</svg>
		</div>
	);
}
