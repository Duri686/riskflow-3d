import { useMemo } from "react";

interface ReturnDistributionProps {
	terminalPrices: number[];
	initialPrice: number;
	paths: number;
	visiblePaths: number;
	latestDataDate?: string | null;
	showLatestDataDate?: boolean;
	showDecisionPanel?: boolean;
}

interface DistributionData {
	bins: { x: number; count: number; percentage: number }[];
	stats: {
		mean: number;
		median: number;
		p05: number;
		p95: number;
		var95: number;
		cvar95: number;
		profitProbability: number;
		upDownRatio: number;
		maxGain: number;
		maxLoss: number;
	};
	densityCurve: { x: number; y: number }[];
}

function calculateDistribution(
	terminalPrices: number[],
	initialPrice: number,
): DistributionData {
	const returns = terminalPrices.map((price) => ((price - initialPrice) / initialPrice) * 100);
	const sorted = [...returns].sort((left, right) => left - right);

	const min = Math.min(...returns);
	const max = Math.max(...returns);
	const range = max - min;
	const binCount = 30;
	const binWidth = range > 0 ? range / binCount : 1;

	const bins: { x: number; count: number; percentage: number }[] = [];
	for (let index = 0; index < binCount; index += 1) {
		const binStart = min + index * binWidth;
		const binEnd = binStart + binWidth;
		const count = returns.filter((value) => value >= binStart && value < binEnd).length;
		bins.push({
			x: binStart + binWidth / 2,
			count,
			percentage: returns.length > 0 ? (count / returns.length) * 100 : 0,
		});
	}

	const length = sorted.length;
	const mean = length > 0 ? returns.reduce((sum, value) => sum + value, 0) / length : 0;
	const median =
		length === 0
			? 0
			: length % 2 === 0
				? (sorted[length / 2 - 1] + sorted[length / 2]) / 2
				: sorted[Math.floor(length / 2)];
	const p05 = length > 0 ? sorted[Math.floor(length * 0.05)] : 0;
	const p95 = length > 0 ? sorted[Math.floor(length * 0.95)] : 0;
	const var95 = -p05;
	const tailCount = Math.max(1, Math.floor(length * 0.05));
	const tail = sorted.slice(0, tailCount);
	const cvar95 = tail.length > 0 ? tail.reduce((sum, value) => sum + value, 0) / tail.length : 0;
	const profitCount = returns.filter((value) => value > 0).length;
	const profitProbability = length > 0 ? (profitCount / length) * 100 : 0;
	const upDownRatio = p95 > 0 && cvar95 < 0 ? p95 / Math.abs(cvar95) : 0;

	const densityCurve: { x: number; y: number }[] = [];
	const bandwidth = range > 0 ? range / 15 : 1;
	for (let index = 0; index <= 50; index += 1) {
		const x = min + (index / 50) * (range > 0 ? range : 1);
		let density = 0;
		for (const value of returns) {
			const diff = (x - value) / bandwidth;
			density += Math.exp(-0.5 * diff * diff);
		}
		density /= returns.length * bandwidth * Math.sqrt(2 * Math.PI);
		if (Number.isFinite(density)) {
			densityCurve.push({ x, y: density });
		}
	}

	return {
		bins,
		stats: {
			mean,
			median,
			p05,
			p95,
			var95,
			cvar95,
			profitProbability,
			upDownRatio,
			maxGain: max,
			maxLoss: min,
		},
		densityCurve,
	};
}

function resolveLabels(positions: { x: number; label: string }[]): number[] {
	const minGap = 80;
	const stepSize = 18;
	const offsets = positions.map(() => 0);

	const sorted = positions
		.map((position, index) => ({ ...position, index }))
		.sort((left, right) => left.x - right.x);

	for (let pointer = 1; pointer < sorted.length; pointer += 1) {
		const prev = sorted[pointer - 1];
		const curr = sorted[pointer];
		if (Math.abs(curr.x - prev.x) < minGap) {
			if (offsets[prev.index] <= 0) {
				offsets[curr.index] = Math.abs(offsets[prev.index]) + stepSize;
			} else {
				offsets[curr.index] = -(offsets[prev.index] + stepSize);
			}
		}
	}

	return offsets;
}

export function ReturnDistribution({
	terminalPrices,
	initialPrice,
	paths,
	visiblePaths,
	latestDataDate = null,
	showLatestDataDate = true,
	showDecisionPanel = true,
}: ReturnDistributionProps) {
	const data = useMemo(() => {
		const visiblePrices = terminalPrices.slice(0, Math.max(1, visiblePaths));
		return calculateDistribution(visiblePrices, initialPrice);
	}, [terminalPrices, initialPrice, visiblePaths]);

	const { bins, stats, densityCurve } = data;

	const width = 800;
	const height = 400;
	const padding = {
		top: showLatestDataDate ? 70 : 58,
		right: showDecisionPanel ? 130 : 28,
		bottom: 60,
		left: 60,
	};
	const chartWidth = width - padding.left - padding.right;
	const chartHeight = height - padding.top - padding.bottom;

	const dataMin = Math.min(stats.maxLoss, stats.cvar95, -5);
	const dataMax = Math.max(stats.maxGain, stats.p95, 5);
	const xPadding = (dataMax - dataMin) * 0.1;
	const xMin = Math.floor(dataMin - xPadding);
	const xMax = Math.ceil(dataMax + xPadding);

	const xScale = (value: number) => padding.left + ((value - xMin) / (xMax - xMin)) * chartWidth;

	const maxCount = Math.max(1, ...bins.map((bin) => bin.percentage));
	const maxDensity = Math.max(1e-10, ...densityCurve.map((point) => point.y));
	const densityYScale = (value: number) =>
		padding.top + chartHeight - (value / maxDensity) * chartHeight * 0.9;

	const densityPath = densityCurve
		.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
		.map((point, index) => `${index === 0 ? "M" : "L"} ${xScale(point.x)} ${densityYScale(point.y)}`)
		.join(" ");

	const zeroX = xScale(0);
	const p05X = xScale(stats.p05);
	const p95X = xScale(stats.p95);
	const medianX = xScale(stats.median);
	const cvar95X = xScale(stats.cvar95);

	const labelPositions = [
		{ x: cvar95X, label: "cvar95" },
		{ x: p05X, label: "p05" },
		{ x: medianX, label: "median" },
		{ x: zeroX, label: "zero" },
		{ x: p95X, label: "p95" },
	];
	const labelOffsets = resolveLabels(labelPositions);
	const labelY = (index: number) => Math.max(12, padding.top - 10 + labelOffsets[index]);

	const generateTicks = (min: number, max: number) => {
		const step = (max - min) / 4;
		return [0, 1, 2, 3, 4].map((index) => {
			const value = min + index * step;
			return Math.abs(value) < 10 ? Number(value.toFixed(1)) : Math.round(value);
		});
	};
	const ticks = generateTicks(xMin, xMax);

	return (
		<div className="flex h-full w-full flex-col">
			<svg
				viewBox={`0 0 ${width} ${height}`}
				className="h-full w-full"
				preserveAspectRatio="xMidYMid meet"
			>
				<defs>
					<linearGradient id="profitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" stopColor="var(--color-bt-success)" stopOpacity={0.9} />
						<stop offset="100%" stopColor="var(--color-bt-success)" stopOpacity={0.3} />
					</linearGradient>
					<linearGradient id="lossGrad" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" stopColor="var(--color-bt-danger)" stopOpacity={0.9} />
						<stop offset="100%" stopColor="var(--color-bt-danger)" stopOpacity={0.3} />
					</linearGradient>
				</defs>

				<rect
					x={padding.left}
					y={padding.top}
					width={Math.max(0, zeroX - padding.left)}
					height={chartHeight}
					fill="var(--color-bt-danger)"
					opacity={0.04}
				/>
				<rect
					x={zeroX}
					y={padding.top}
					width={Math.max(0, padding.left + chartWidth - zeroX)}
					height={chartHeight}
					fill="var(--color-bt-success)"
					opacity={0.04}
				/>

				{bins.map((bin, index) => {
					const barWidth = (chartWidth / bins.length) * 0.82;
					const barHeight = (bin.percentage / maxCount) * chartHeight;
					const safeBarHeight = Number.isFinite(barHeight) ? barHeight : 0;
					const x = xScale(bin.x) - barWidth / 2;
					const y = padding.top + chartHeight - safeBarHeight;
					const isProfit = bin.x > 0;
					return (
						<rect
							key={`${bin.x}-${index}`}
							x={x}
							y={y}
							width={barWidth}
							height={safeBarHeight}
							fill={isProfit ? "url(#profitGrad)" : "url(#lossGrad)"}
							style={{ transition: "height 0.2s var(--ease-bt), y 0.2s var(--ease-bt)" }}
						/>
					);
				})}

				{densityPath ? (
					<path
						d={densityPath}
						fill="none"
						stroke="var(--color-bt-foreground)"
						strokeWidth={2}
						opacity={0.65}
					/>
				) : null}

				<line
					x1={zeroX}
					y1={padding.top}
					x2={zeroX}
					y2={padding.top + chartHeight}
					stroke="var(--color-bt-foreground)"
					strokeWidth={2}
					strokeDasharray="4,4"
				/>
				<text x={zeroX} y={labelY(3)} fill="var(--color-bt-foreground)" fontSize={11} textAnchor="middle">
					盈亏平衡
				</text>

				<line
					x1={cvar95X}
					y1={padding.top}
					x2={cvar95X}
					y2={padding.top + chartHeight}
					stroke="var(--color-bt-danger)"
					strokeWidth={1.5}
					strokeDasharray="3,3"
				/>
				<text x={cvar95X} y={labelY(0)} fill="var(--color-bt-danger)" fontSize={10} textAnchor="middle">
					CVaR95: {stats.cvar95.toFixed(1)}%
				</text>

				<line
					x1={p05X}
					y1={padding.top}
					x2={p05X}
					y2={padding.top + chartHeight}
					stroke="var(--color-bt-danger)"
					strokeWidth={1.5}
				/>
				<text x={p05X} y={labelY(1)} fill="var(--color-bt-danger)" fontSize={10} textAnchor="middle">
					P5: {stats.p05.toFixed(1)}%
				</text>

				<line
					x1={p95X}
					y1={padding.top}
					x2={p95X}
					y2={padding.top + chartHeight}
					stroke="var(--color-bt-success)"
					strokeWidth={1.5}
					strokeDasharray="3,3"
				/>
				<text x={p95X} y={labelY(4)} fill="var(--color-bt-success)" fontSize={10} textAnchor="middle">
					P95: +{stats.p95.toFixed(1)}%
				</text>

				<line
					x1={medianX}
					y1={padding.top}
					x2={medianX}
					y2={padding.top + chartHeight}
					stroke="var(--color-bt-muted-foreground)"
					strokeWidth={1.5}
				/>
				<text x={medianX} y={labelY(2)} fill="var(--color-bt-muted-foreground)" fontSize={10} textAnchor="middle">
					P50: {stats.median > 0 ? "+" : ""}
					{stats.median.toFixed(1)}%
				</text>

				<line
					x1={padding.left}
					y1={padding.top + chartHeight}
					x2={padding.left + chartWidth}
					y2={padding.top + chartHeight}
					stroke="var(--color-bt-border)"
					strokeWidth={1}
				/>
				{ticks.map((tick) => (
					<g key={tick}>
						<line
							x1={xScale(tick)}
							y1={padding.top + chartHeight}
							x2={xScale(tick)}
							y2={padding.top + chartHeight + 5}
							stroke="var(--color-bt-border)"
						/>
						<text
							x={xScale(tick)}
							y={padding.top + chartHeight + 18}
							fill="var(--color-bt-muted-foreground)"
							fontSize={10}
							textAnchor="middle"
						>
							{tick > 0 ? "+" : ""}
							{tick}%
						</text>
					</g>
				))}
				<text
					x={padding.left + chartWidth / 2}
					y={height - 15}
					fill="var(--color-bt-muted-foreground)"
					fontSize={12}
					textAnchor="middle"
				>
					收益率 (%)
				</text>

				<text
					x={15}
					y={padding.top + chartHeight / 2}
					fill="var(--color-bt-muted-foreground)"
					fontSize={12}
					textAnchor="middle"
					transform={`rotate(-90, 15, ${padding.top + chartHeight / 2})`}
				>
					概率密度
				</text>

				{showLatestDataDate && latestDataDate ? (
					<text
						x={padding.left}
						y={24}
						fill="var(--color-bt-muted-foreground)"
						fontSize={10}
						textAnchor="start"
					>
						最新数据日期: {latestDataDate}
					</text>
				) : null}

				{showDecisionPanel ? (
					<g transform={`translate(${width - padding.right + 15}, ${padding.top})`}>
						<text
							x={0}
							y={0}
							fill="var(--color-bt-foreground)"
							fontSize={11}
							fontWeight="600"
							letterSpacing="0.05em"
						>
							决策指标
						</text>

						<text
							x={0}
							y={26}
							fill={
								stats.profitProbability >= 50
									? "var(--color-bt-success)"
									: "var(--color-bt-danger)"
							}
							fontSize={16}
							fontWeight="600"
						>
							胜率 {stats.profitProbability.toFixed(0)}%
						</text>

						<text
							x={0}
							y={52}
							fill={stats.median >= 0 ? "var(--color-bt-success)" : "var(--color-bt-danger)"}
							fontSize={12}
							fontWeight="600"
						>
							P50 {stats.median > 0 ? "+" : ""}
							{stats.median.toFixed(1)}%
						</text>

						<text x={0} y={78} fill="var(--color-bt-danger)" fontSize={12} fontWeight="600">
							CVaR {stats.cvar95.toFixed(1)}%
						</text>

						<text x={0} y={104} fill="var(--color-bt-success)" fontSize={12} fontWeight="600">
							P95 +{stats.p95.toFixed(1)}%
						</text>

						<text x={0} y={130} fill="var(--color-bt-foreground)" fontSize={12} fontWeight="600">
							盈亏比 {stats.upDownRatio.toFixed(2)}
						</text>

						<rect x={0} y={148} width={100} height={1} fill="var(--color-bt-border)" />

						<text x={0} y={168} fill="var(--color-bt-muted-foreground)" fontSize={9}>
							模拟路径: {visiblePaths}/{paths}
						</text>
					</g>
				) : null}
			</svg>
		</div>
	);
}
