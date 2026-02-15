import type { MonteCarloMetricsPanel } from "./engine";

const formatPercent = (value: number): string => `${(value * 100).toFixed(2)}%`;
const formatPrice = (value: number): string => `$${value.toFixed(2)}`;

interface MonteCarloMetricsPanelProps {
	metrics: MonteCarloMetricsPanel;
}

export function MonteCarloMetrics({ metrics }: MonteCarloMetricsPanelProps) {
	return (
		<ul className="m-0 grid list-none gap-0 p-0">
			<li className="flex items-baseline justify-between gap-2 border-b border-rf-border/40 py-2 text-xs">
				<span className="text-rf-text-secondary">当前均价</span>
				<strong className="font-mono">{formatPrice(metrics.current.meanPrice)}</strong>
			</li>
			<li className="flex items-baseline justify-between gap-2 border-b border-rf-border/40 py-2 text-xs">
				<span className="text-rf-text-secondary">P05 / P95</span>
				<strong className="font-mono">
					{formatPrice(metrics.current.p05Price)} / {formatPrice(metrics.current.p95Price)}
				</strong>
			</li>
			<li className="flex items-baseline justify-between gap-2 border-b border-rf-border/40 py-2 text-xs">
				<span className="text-rf-text-secondary">预期收益率</span>
				<strong className="font-mono">{formatPercent(metrics.final.expectedReturn)}</strong>
			</li>
			<li className="flex items-baseline justify-between gap-2 border-b border-rf-border/40 py-2 text-xs">
				<span className="text-rf-text-secondary">波动率</span>
				<strong className="font-mono">{formatPercent(metrics.final.volatility)}</strong>
			</li>
			<li className="flex items-baseline justify-between gap-2 border-b border-rf-border/40 py-2 text-xs">
				<span className="text-rf-text-secondary">VaR 95%</span>
				<strong className="font-mono text-rf-wip">{formatPercent(metrics.final.var95)}</strong>
			</li>
			<li className="flex items-baseline justify-between gap-2 border-b border-rf-border/40 py-2 text-xs">
				<span className="text-rf-text-secondary">尾部损失 ES95</span>
				<strong className="font-mono text-rf-wip">{formatPercent(metrics.final.expectedShortfall95)}</strong>
			</li>
			<li className="flex items-baseline justify-between gap-2 py-2 text-xs">
				<span className="text-rf-text-secondary">亏损概率</span>
				<strong className="font-mono">{formatPercent(metrics.final.lossProbability)}</strong>
			</li>
		</ul>
	);
}
