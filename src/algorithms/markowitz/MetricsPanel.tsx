import type {
	MarkowitzAsset,
	MarkowitzMetricsPanel,
} from "./engine";
import { BtSectionHeading } from "@/components/ui/BtSectionHeading";

interface MetricsPanelProps {
	metrics: MarkowitzMetricsPanel;
	assets: MarkowitzAsset[];
}

const formatPercent = (value: number, digits = 2): string =>
	`${(value * 100).toFixed(digits)}%`;

const formatNumber = (value: number, digits = 2): string => value.toFixed(digits);

function MetricRow({
	label,
	value,
	accent,
}: {
	label: string;
	value: string;
	accent?: string;
}) {
	return (
		<div className="flex items-center justify-between border-b border-[var(--color-bt-border)] py-1.5 font-bt-mono text-[10px] uppercase tracking-[0.12em]">
			<span className="text-[var(--color-bt-muted-foreground)]">{label}</span>
			<span className={accent ?? "text-[var(--color-bt-foreground)]"}>{value}</span>
		</div>
	);
}

export function MetricsPanel({ metrics, assets }: MetricsPanelProps) {
	const current = metrics.current;
	const minVariance = metrics.minVariance;
	const maxSharpe = metrics.maxSharpe;

	return (
		<div className="space-y-4">
			<section className="border border-[var(--color-bt-border)] bg-[var(--color-bt-muted)] px-3 py-3">
				<BtSectionHeading title="Current Portfolio" />
				<div className="mt-2 space-y-1">
					<MetricRow label="预期收益率" value={formatPercent(current.expectedReturn)} />
					<MetricRow label="波动率" value={formatPercent(current.volatility)} />
					<MetricRow
						label="夏普比率"
						value={formatNumber(current.sharpe, 3)}
						accent="text-[var(--color-bt-accent)]"
					/>
				</div>
			</section>

			<section className="border border-[var(--color-bt-border)] bg-[var(--color-bt-muted)] px-3 py-3">
				<BtSectionHeading title="Frontier Key Points" />
				<div className="mt-2 space-y-1">
					<MetricRow label="最小方差波动率" value={formatPercent(minVariance.volatility)} />
					<MetricRow label="最小方差收益率" value={formatPercent(minVariance.expectedReturn)} />
					<MetricRow label="最大夏普比率" value={formatNumber(maxSharpe.sharpe, 3)} />
					<MetricRow label="最大夏普收益率" value={formatPercent(maxSharpe.expectedReturn)} />
				</div>
			</section>

			<section className="border border-[var(--color-bt-border)] bg-[var(--color-bt-muted)] px-3 py-3">
				<BtSectionHeading title="Diversification" />
				<div className="mt-2 space-y-1">
					<MetricRow
						label="有效资产数"
						value={formatNumber(metrics.effectiveAssetCount, 2)}
					/>
					<MetricRow
						label="分散化评分"
						value={formatPercent(metrics.diversificationScore)}
					/>
				</div>

				<div className="mt-2 space-y-1 border-t border-[var(--color-bt-border)] pt-2">
					{assets.map((asset, index) => (
						<div
							key={asset.id}
							className="flex items-center justify-between font-bt-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-bt-muted-foreground)]"
						>
							<span>{asset.label}</span>
							<span className="text-[var(--color-bt-foreground)]">
								{formatPercent(current.weights[index], 1)}
							</span>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
