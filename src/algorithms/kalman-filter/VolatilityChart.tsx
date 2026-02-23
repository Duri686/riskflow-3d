import { useEffect, useMemo, useRef, useState } from "react";
import type { KalmanFilterResult, VolRegime } from "./engine";
import { TRADING_DAYS_PER_YEAR } from "../shared/constants";

interface VolatilityChartProps {
	result: KalmanFilterResult;
	dailyReturns: number[];
	isBootstrapping?: boolean;
}

// ── 布局常量（去掉右侧面板后，右边距大幅缩小） ──
const MARGIN = { top: 40, right: 30, bottom: 50, left: 60 };

// ── Regime 颜色映射 ──
const REGIME_COLORS: Record<VolRegime, { bg: string }> = {
	low: { bg: "var(--color-bt-success-soft)" },
	medium: { bg: "var(--color-bt-warning-soft)" },
	high: { bg: "var(--color-bt-danger-soft)" },
};

// ── Phase 颜色映射 ──
const PHASE_COLORS: Record<string, string> = {
	rising: "var(--color-bt-danger)",
	falling: "var(--color-bt-success)",
	shock: "var(--color-bt-warning)",
	stable: "var(--color-bt-muted-foreground)",
};

const CHART_COLORS = {
	grid: "var(--color-bt-border)",
	axis: "var(--color-bt-muted-foreground)",
	observed: "var(--color-bt-muted-foreground)",
	kalman: "var(--color-bt-success)",
	ewma: "var(--color-bt-warning)",
	thresholdMid: "var(--color-bt-warning)",
	thresholdHigh: "var(--color-bt-danger)",
	band: "var(--color-bt-success)",
};

export function VolatilityChart({
	result,
	dailyReturns,
	isBootstrapping = false,
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

	const { steps, regimeHistory, ewma } = result;
	const hasData = steps.length >= 2;
	const phaseColor =
		PHASE_COLORS[result.momentum.phase] ?? "var(--color-bt-muted-foreground)";

	const chart = useMemo(() => {
		if (!hasData) return null;

		const W = size.width - MARGIN.left - MARGIN.right;
		const H = size.height - MARGIN.top - MARGIN.bottom;

		// 观测值：|r_t| 的年化近似 = |r_t| × √TRADING_DAYS_PER_YEAR
		const observedVols = dailyReturns.map((r) => Math.abs(r) * Math.sqrt(TRADING_DAYS_PER_YEAR));

		// Kalman 估计值
		const estimatedVols = steps.map((s) => s.annualizedVol);

		// EWMA 值
		const ewmaVols = ewma.values;

		// 置信带上下界
		const upperBand = steps.map((s) =>
			Math.sqrt(Math.max(0, s.estimated + Math.sqrt(s.errorCovariance)) * TRADING_DAYS_PER_YEAR),
		);
		const lowerBand = steps.map((s) =>
			Math.sqrt(Math.max(0, s.estimated - Math.sqrt(s.errorCovariance)) * TRADING_DAYS_PER_YEAR),
		);

		// Y 轴范围
		const allVals = [...observedVols, ...estimatedVols, ...upperBand, ...ewmaVols];
		const maxDataVal = Math.max(...allVals);
		const yMax = Math.max(maxDataVal * 1.1, 0.2);
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

		// EWMA 路径
		const ewmaPath = ewmaVols
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

		// Regime 色带区间（合并连续相同 regime 的段）
		const regimeBands: { start: number; end: number; regime: VolRegime }[] = [];
		if (regimeHistory.length > 0) {
			let currentRegime = regimeHistory[0];
			let segStart = 0;
			for (let i = 1; i < regimeHistory.length; i++) {
				if (regimeHistory[i] !== currentRegime) {
					regimeBands.push({ start: segStart, end: i - 1, regime: currentRegime });
					currentRegime = regimeHistory[i];
					segStart = i;
				}
			}
			regimeBands.push({ start: segStart, end: regimeHistory.length - 1, regime: currentRegime });
		}

		// Regime 阈值线位置
		const thresholds = result.riskGate ? [
			{ val: 0.4, label: '40% 低↔中' },
			{ val: 0.8, label: '80% 中↔高' },
		].filter(t => t.val < yMax) : [];

		// Y 轴刻度
		const yTicks: number[] = [];
		const roughStep = yMax / 6;
		const exponent = Math.floor(Math.log10(roughStep));
		const fraction = roughStep / Math.pow(10, exponent);

		let niceFraction = 1;
		if (fraction >= 7) niceFraction = 10;
		else if (fraction >= 3) niceFraction = 5;
		else if (fraction >= 1.5) niceFraction = 2;

		const yStep = niceFraction * Math.pow(10, exponent);

		for (let tick = 0; tick <= yMax + yStep * 0.1; tick += yStep) {
			yTicks.push(Number(tick.toFixed(10)));
		}

		// X 轴刻度
		const xTicks: number[] = [];
		const xTickStep = Math.max(30, Math.floor(steps.length / 6));
		for (let t = 0; t < steps.length; t += xTickStep) {
			xTicks.push(t);
		}
		if (xTicks[xTicks.length - 1] !== steps.length - 1) {
			xTicks.push(steps.length - 1);
		}

		return {
			observedPath,
			estimatedPath,
			ewmaPath,
			bandPath,
			regimeBands,
			thresholds,
			xScale,
			yScale,
			yTicks,
			xTicks,
			yMax,
			W,
			H,
		};
	}, [hasData, steps, dailyReturns, ewma, regimeHistory, result.riskGate, size]);

	if (!hasData) {
		return (
			<div
				ref={containerRef}
				className="flex h-full w-full items-center justify-center"
			>
				{isBootstrapping ? (
					<div className="flex flex-col items-center gap-3">
						<div className="relative h-8 w-8">
							<div className="absolute inset-0 rounded-full border border-[var(--color-bt-accent)]/30" />
							<div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-r-[var(--color-bt-accent)] border-t-[var(--color-bt-accent)]" />
						</div>
						<p className="font-bt-mono text-xs text-[var(--color-bt-muted-foreground)]">
							正在拉取日线数据并初始化滤波器...
						</p>
					</div>
				) : (
					<p className="font-bt-mono text-sm text-[var(--color-bt-muted-foreground)]">
						获取数据后显示波动率估计
					</p>
				)}
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
				aria-label="Volatility Risk Dashboard"
			>
				{/* Regime 背景色带 */}
				{chart.regimeBands.map((band) => {
					const x1 = chart.xScale(band.start);
					const x2 = chart.xScale(band.end);
					return (
						<rect
							key={`regime-${band.start}`}
							x={x1}
							y={MARGIN.top}
							width={Math.max(1, x2 - x1)}
							height={chart.H}
							fill={REGIME_COLORS[band.regime].bg}
						/>
					);
				})}

				{/* 网格背景 */}
				{chart.yTicks.map((v) => (
					<line
						key={v}
						x1={MARGIN.left}
						y1={chart.yScale(v)}
						x2={MARGIN.left + chart.W}
						y2={chart.yScale(v)}
						stroke={CHART_COLORS.grid}
						strokeDasharray="2,4"
					/>
				))}

				{/* Regime 阈值参考线 */}
				{chart.thresholds.map((t) => (
					<g key={`thresh-${t.val}`}>
						<line
							x1={MARGIN.left}
							y1={chart.yScale(t.val)}
							x2={MARGIN.left + chart.W}
							y2={chart.yScale(t.val)}
							stroke={t.val === 0.4 ? CHART_COLORS.thresholdMid : CHART_COLORS.thresholdHigh}
							strokeWidth={1}
							strokeDasharray="6,4"
							strokeOpacity={0.5}
						/>
						<text
							x={MARGIN.left + chart.W - 4}
							y={chart.yScale(t.val) - 4}
							fill={t.val === 0.4 ? CHART_COLORS.thresholdMid : CHART_COLORS.thresholdHigh}
							fontSize={8}
							fontFamily="monospace"
							textAnchor="end"
							opacity={0.7}
						>
							{t.label}
						</text>
					</g>
				))}

				{/* 置信带 */}
				<path d={chart.bandPath} fill={CHART_COLORS.band} fillOpacity={0.08} />

				{/* 观测折线（原始噪声） */}
				<path
					d={chart.observedPath}
					fill="none"
					stroke={CHART_COLORS.observed}
					strokeWidth={0.8}
					strokeOpacity={0.4}
				/>

				{/* EWMA 对比线 */}
				<path
					d={chart.ewmaPath}
					fill="none"
					stroke={CHART_COLORS.ewma}
					strokeWidth={1.5}
					strokeDasharray="4,3"
					strokeOpacity={0.8}
				/>

				{/* 滤波估计折线 */}
				<path
					d={chart.estimatedPath}
					fill="none"
					stroke={CHART_COLORS.kalman}
					strokeWidth={2}
				/>

				{/* Y 轴 */}
				<line
					x1={MARGIN.left}
					y1={MARGIN.top}
					x2={MARGIN.left}
					y2={MARGIN.top + chart.H}
					stroke={CHART_COLORS.grid}
				/>
				{chart.yTicks.map((v) => (
					<text
						key={v}
						x={MARGIN.left - 8}
						y={chart.yScale(v) + 3}
						fill={CHART_COLORS.axis}
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
					stroke={CHART_COLORS.grid}
				/>
				{chart.xTicks.map((t) => (
					<text
						key={t}
						x={chart.xScale(t)}
						y={MARGIN.top + chart.H + 18}
						fill={CHART_COLORS.axis}
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
					fill={CHART_COLORS.axis}
					fontSize={11}
					textAnchor="middle"
				>
					交易日
				</text>
				<text
					x={14}
					y={MARGIN.top + chart.H / 2}
					fill={CHART_COLORS.axis}
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
						stroke={CHART_COLORS.observed}
						strokeWidth={1}
						strokeOpacity={0.5}
					/>
					<text x={25} y={3} fill={CHART_COLORS.axis} fontSize={9}>
						原始观测 |r_t|
					</text>

					<line
						x1={0}
						y1={16}
						x2={20}
						y2={16}
						stroke={CHART_COLORS.kalman}
						strokeWidth={2}
					/>
					<text x={25} y={19} fill={CHART_COLORS.kalman} fontSize={9}>
						Kalman σ̂
					</text>

					<line
						x1={0}
						y1={32}
						x2={20}
						y2={32}
						stroke={CHART_COLORS.ewma}
						strokeWidth={1.5}
						strokeDasharray="4,3"
					/>
					<text x={25} y={35} fill={CHART_COLORS.ewma} fontSize={9}>
						EWMA 20d
					</text>

					<rect
						x={0}
						y={44}
						width={20}
						height={8}
						fill={CHART_COLORS.band}
						fillOpacity={0.15}
					/>
					<text x={25} y={51} fill={CHART_COLORS.axis} fontSize={9}>
						置信区间
					</text>

					{/* Phase 指示胶囊 */}
					<rect
						x={0}
						y={60}
						width={70}
						height={14}
						rx={3}
						fill={phaseColor}
						fillOpacity={0.15}
						stroke={phaseColor}
						strokeOpacity={0.3}
						strokeWidth={0.5}
					/>
					<text x={6} y={70} fill={phaseColor} fontSize={8} fontFamily="monospace">
						{result.momentum.phaseLabel}
					</text>
				</g>
			</svg>
		</div>
	);
}
