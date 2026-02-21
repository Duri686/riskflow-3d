export interface ConclusionStats {
	winRate: number;
	p50: number;
	cvar: number;
	p95: number;
	upDownRatio: number;
}

export interface ConclusionState {
	label: string;
	tone: "bullish" | "neutral" | "bearish";
}

type ConclusionKey = keyof ConclusionStats;

interface FinalRiskMetricsLike {
	lossProbability: number;
	medianReturn: number;
	expectedShortfall95: number;
	p95Return: number;
	upDownRatio: number;
}

export interface MiniHistogramBin {
	center: number;
	count: number;
	from: number;
	to: number;
}

export interface MiniHistogramResult {
	bins: MiniHistogramBin[];
	maxCount: number;
	totalCount: number;
	minReturn: number;
	maxReturn: number;
}

export function buildConclusionStats(
	final: FinalRiskMetricsLike,
): ConclusionStats {
	return {
		winRate: (1 - final.lossProbability) * 100,
		p50: final.medianReturn * 100,
		cvar: final.expectedShortfall95 * 100,
		p95: final.p95Return * 100,
		upDownRatio: final.upDownRatio,
	};
}

const formatSignedPercent = (value: number, digits = 1): string => {
	const sign = value > 0 ? "+" : "";
	return `${sign}${value.toFixed(digits)}%`;
};

export function formatConclusionValue(key: ConclusionKey, value: number): string {
	switch (key) {
		case "winRate":
			return `${Math.round(value)}%`;
		case "upDownRatio":
			return value.toFixed(2);
		default:
			return formatSignedPercent(value, 1);
	}
}

export function getConclusionState(stats: ConclusionStats): ConclusionState {
	const bullishSignalCount =
		(stats.winRate >= 55 ? 1 : 0) +
		(stats.p50 >= 0 ? 1 : 0) +
		(stats.upDownRatio >= 1.1 ? 1 : 0);

	const bearishSignalCount =
		(stats.winRate < 45 ? 1 : 0) +
		(stats.p50 < -5 ? 1 : 0) +
		(stats.cvar <= -45 ? 1 : 0) +
		(stats.upDownRatio < 0.9 ? 1 : 0);

	if (bearishSignalCount >= 2) {
		return { label: "风险偏高", tone: "bearish" };
	}

	if (bullishSignalCount >= 2 && stats.cvar > -40) {
		return { label: "中性偏多", tone: "bullish" };
	}

	return { label: "中性观望", tone: "neutral" };
}

const ensureFinite = (values: number[]): number[] =>
	values.filter((value) => Number.isFinite(value));

export function buildMiniHistogram(
	terminalPrices: number[],
	initialPrice: number,
	binCount = 16,
): MiniHistogramResult {
	const safeInitial = Math.max(initialPrice, 1e-8);
	const returns = ensureFinite(
		terminalPrices.map((price) => ((price - safeInitial) / safeInitial) * 100),
	);
	const safeBins = Math.max(4, Math.floor(binCount));

	if (returns.length === 0) {
		return {
			bins: Array.from({ length: safeBins }, (_, index) => ({
				center: index,
				count: 0,
				from: index,
				to: index + 1,
			})),
			maxCount: 0,
			totalCount: 0,
			minReturn: 0,
			maxReturn: 0,
		};
	}

	const minReturn = Math.min(...returns);
	const maxReturn = Math.max(...returns);
	const range = Math.max(maxReturn - minReturn, 1e-6);
	const width = range / safeBins;

	const bins: MiniHistogramBin[] = Array.from({ length: safeBins }, (_, index) => {
		const from = minReturn + index * width;
		return {
			center: from + width / 2,
			count: 0,
			from,
			to: from + width,
		};
	});

	for (const ret of returns) {
		const rawIndex = Math.floor((ret - minReturn) / width);
		const index = Math.max(0, Math.min(safeBins - 1, rawIndex));
		bins[index].count += 1;
	}

	return {
		bins,
		maxCount: Math.max(...bins.map((bin) => bin.count)),
		totalCount: returns.length,
		minReturn,
		maxReturn,
	};
}
