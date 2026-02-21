type MarketSource = "binance" | "fallback" | "manual" | "default";

interface MarketDataMetaLike {
	source: MarketSource;
	latestDataDate: string | null;
}

export function formatMonteCarloDataSource(source: MarketSource): string {
	switch (source) {
		case "binance":
			return "数据来源: Binance 日线";
		case "fallback":
			return "数据来源: 本地 BTC 历史";
		case "manual":
			return "数据来源: 手动输入";
		default:
			return "数据来源: 默认参数";
	}
}

export function buildMonteCarloDataBadge(meta: MarketDataMetaLike): {
	sourceText: string;
	dateText: string | null;
} {
	return {
		sourceText: formatMonteCarloDataSource(meta.source),
		dateText: meta.latestDataDate
			? `最新数据日期: ${meta.latestDataDate}`
			: null,
	};
}
