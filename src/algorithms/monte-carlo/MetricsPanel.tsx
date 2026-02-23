import type { MonteCarloMetricsPanel } from "@/algorithms/monte-carlo/engine";

const formatPercent = (value: number): string => `${(value * 100).toFixed(2)}%`;
const formatPrice = (value: number): string => `$${value.toFixed(2)}`;

interface MonteCarloMetricsPanelProps {
	metrics: MonteCarloMetricsPanel;
}

export function MonteCarloMetrics({ metrics }: MonteCarloMetricsPanelProps) {
	return (
		<ul className="m-0 grid list-none gap-0 p-0">
			<li className="flex items-baseline justify-between gap-2 border-b border-[var(--color-bt-border)] py-2 text-xs">
				<span className="text-[var(--color-bt-muted-foreground)]">当前均价</span>
				<strong className="font-bt-mono">{formatPrice(metrics.current.meanPrice)}</strong>
			</li>
			<li className="flex items-baseline justify-between gap-2 border-b border-[var(--color-bt-border)] py-2 text-xs">
				<span className="text-[var(--color-bt-muted-foreground)]">P05 / P95</span>
				<strong className="font-bt-mono">
					{formatPrice(metrics.current.p05Price)} / {formatPrice(metrics.current.p95Price)}
				</strong>
			</li>
			<li className="flex items-baseline justify-between gap-2 border-b border-[var(--color-bt-border)] py-2 text-xs">
				<span className="text-[var(--color-bt-muted-foreground)]">预期收益率</span>
				<strong className="font-bt-mono">{formatPercent(metrics.final.expectedReturn)}</strong>
			</li>
			<li className="flex items-baseline justify-between gap-2 border-b border-[var(--color-bt-border)] py-2 text-xs">
				<span className="text-[var(--color-bt-muted-foreground)]">波动率</span>
				<strong className="font-bt-mono">{formatPercent(metrics.final.volatility)}</strong>
			</li>
			<li className="flex items-baseline justify-between gap-2 border-b border-[var(--color-bt-border)] py-2 text-xs">
				<span className="text-[var(--color-bt-muted-foreground)]">VaR 95%</span>
				<strong className="font-bt-mono text-[var(--color-bt-warning)]">
					{formatPercent(metrics.final.var95)}
				</strong>
			</li>
			<li className="flex items-baseline justify-between gap-2 border-b border-[var(--color-bt-border)] py-2 text-xs">
				<span className="text-[var(--color-bt-muted-foreground)]">尾部损失 ES95</span>
				<strong className="font-bt-mono text-[var(--color-bt-warning)]">
					{formatPercent(metrics.final.expectedShortfall95)}
				</strong>
			</li>
			<li className="flex items-baseline justify-between gap-2 py-2 text-xs">
				<span className="text-[var(--color-bt-muted-foreground)]">亏损概率</span>
				<strong className="font-bt-mono">{formatPercent(metrics.final.lossProbability)}</strong>
			</li>
		</ul>
	);
}
