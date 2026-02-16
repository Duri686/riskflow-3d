export type AlgorithmId =
	| "monte-carlo"
	| "black-scholes"
	| "markowitz"
	| "kalman-filter";

export type AlgorithmStatus = "ready" | "wip";

export interface AlgorithmMeta {
	id: AlgorithmId;
	title: string;
	subtitle: string;
	description: string;
	status: AlgorithmStatus;
	tags: string[];
}

export const ALGORITHM_CATALOG: AlgorithmMeta[] = [
	{
		id: "monte-carlo",
		title: "Monte Carlo",
		subtitle: "路径扩散与尾部风险",
		description: "观察数千条价格路径如何扩散，直观感受 VaR 与尾部风险的形成过程。",
		status: "ready",
		tags: ["风险", "路径", "VaR"],
	},
	{
		id: "black-scholes",
		title: "Black-Scholes",
		subtitle: "定价曲面与 Greeks",
		description: "旋转期权定价曲面，拖动波动率与到期日，感受 Greeks 如何联动变化。",
		status: "wip",
		tags: ["期权", "Greeks", "曲面"],
	},
	{
		id: "markowitz",
		title: "Markowitz",
		subtitle: "组合优化与有效前沿",
		description: "拖动资产权重，观察有效前沿如何弯曲，理解分散化降低风险的原理。",
		status: "wip",
		tags: ["组合", "Sharpe", "前沿"],
	},
	{
		id: "kalman-filter",
		title: "Kalman Filter",
		subtitle: "波动率状态估计",
		description: "将波动率视为隐藏状态，从含噪的日收益率中实时估计真实的波动率轨迹。",
		status: "ready",
		tags: ["波动率", "状态空间", "去噪"],
	},
];

export const DEFAULT_ALGORITHM_ID: AlgorithmId = "monte-carlo";

const ALGORITHM_ID_SET = new Set<AlgorithmId>(
	ALGORITHM_CATALOG.map((item) => item.id),
);

export const isAlgorithmId = (value: string): value is AlgorithmId =>
	ALGORITHM_ID_SET.has(value as AlgorithmId);

export const getAlgorithmMeta = (algorithmId: AlgorithmId): AlgorithmMeta => {
	const found = ALGORITHM_CATALOG.find((item) => item.id === algorithmId);

	if (!found) {
		return ALGORITHM_CATALOG[0];
	}

	return found;
};

export const ALGORITHM_SHORTCUTS: Record<string, AlgorithmId> = {
	"1": "monte-carlo",
	"2": "black-scholes",
	"3": "markowitz",
	"4": "kalman-filter",
};
