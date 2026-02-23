import type {
	MarkowitzAsset,
	MarkowitzMetricsPanel,
} from "@/algorithms/markowitz/engine";
import {
	BtSidebarDivider,
	BtSidebarSection,
	BtSidebarValueRow,
} from "@/components/ui/BtSidebarPrimitives";

interface MetricsPanelProps {
	metrics: MarkowitzMetricsPanel;
	assets: MarkowitzAsset[];
}

const formatPercent = (value: number, digits = 2): string =>
	`${(value * 100).toFixed(digits)}%`;

const formatNumber = (value: number, digits = 2): string => value.toFixed(digits);

export function MetricsPanel({ metrics, assets }: MetricsPanelProps) {
	const { current, minVariance, maxSharpe } = metrics;

	return (
		<div className="space-y-4">
			<BtSidebarSection title="Current Portfolio" variant="panel">
				<BtSidebarValueRow
					label="预期收益率"
					value={formatPercent(current.expectedReturn)}
				/>
				<BtSidebarValueRow
					label="波动率"
					value={formatPercent(current.volatility)}
				/>
				<BtSidebarValueRow
					label="夏普比率"
					value={formatNumber(current.sharpe, 3)}
					tone="accent"
					withDivider={false}
				/>
			</BtSidebarSection>

			<BtSidebarSection title="Frontier Key Points" variant="panel">
				<BtSidebarValueRow
					label="最小方差波动率"
					value={formatPercent(minVariance.volatility)}
				/>
				<BtSidebarValueRow
					label="最小方差收益率"
					value={formatPercent(minVariance.expectedReturn)}
				/>
				<BtSidebarValueRow
					label="最大夏普比率"
					value={formatNumber(maxSharpe.sharpe, 3)}
				/>
				<BtSidebarValueRow
					label="最大夏普收益率"
					value={formatPercent(maxSharpe.expectedReturn)}
					withDivider={false}
				/>
			</BtSidebarSection>

			<BtSidebarSection title="Diversification" variant="panel">
				<BtSidebarValueRow
					label="有效资产数"
					value={formatNumber(metrics.effectiveAssetCount, 2)}
				/>
				<BtSidebarValueRow
					label="分散化评分"
					value={formatPercent(metrics.diversificationScore)}
					withDivider={false}
				/>

				<BtSidebarDivider className="mt-2" />
				<div className="space-y-1.5 pt-2">
					{assets.map((asset, index) => (
						<BtSidebarValueRow
							key={asset.id}
							label={asset.label}
							value={formatPercent(current.weights[index], 1)}
							withDivider={false}
						/>
					))}
				</div>
			</BtSidebarSection>
		</div>
	);
}
