import type {
  MarkowitzAsset,
  MarkowitzMetricsPanel,
} from "./engine"

interface MetricsPanelProps {
  metrics: MarkowitzMetricsPanel
  assets: MarkowitzAsset[]
}

const formatPercent = (value: number, digits = 2): string =>
  `${(value * 100).toFixed(digits)}%`

const formatNumber = (value: number, digits = 2): string => value.toFixed(digits)

function MetricRow({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-1.5 text-[11px] font-mono">
      <span className="text-gray-400">{label}</span>
      <span className={accent ?? "text-white"}>{value}</span>
    </div>
  )
}

export function MetricsPanel({ metrics, assets }: MetricsPanelProps) {
  const current = metrics.current
  const minVariance = metrics.minVariance
  const maxSharpe = metrics.maxSharpe

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-white/10 bg-white/5 p-3">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-rf-primary">
          当前组合
        </h3>
        <MetricRow label="预期收益率" value={formatPercent(current.expectedReturn)} />
        <MetricRow label="波动率" value={formatPercent(current.volatility)} />
        <MetricRow
          label="夏普比率"
          value={formatNumber(current.sharpe, 3)}
          accent="text-rf-accent"
        />
      </section>

      <section className="rounded-lg border border-white/10 bg-white/5 p-3">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-rf-primary">
          前沿关键点
        </h3>
        <MetricRow label="最小方差波动率" value={formatPercent(minVariance.volatility)} />
        <MetricRow label="最小方差收益率" value={formatPercent(minVariance.expectedReturn)} />
        <MetricRow label="最大夏普比率" value={formatNumber(maxSharpe.sharpe, 3)} />
        <MetricRow label="最大夏普收益率" value={formatPercent(maxSharpe.expectedReturn)} />
      </section>

      <section className="rounded-lg border border-white/10 bg-white/5 p-3">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-rf-primary">
          分散化
        </h3>
        <MetricRow
          label="有效资产数"
          value={formatNumber(metrics.effectiveAssetCount, 2)}
        />
        <MetricRow
          label="分散化评分"
          value={formatPercent(metrics.diversificationScore)}
        />

        <div className="mt-2 space-y-1 pt-1">
          {assets.map((asset, index) => (
            <div
              key={asset.id}
              className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wide text-gray-400"
            >
              <span>{asset.label}</span>
              <span className="text-white">{formatPercent(current.weights[index], 1)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
