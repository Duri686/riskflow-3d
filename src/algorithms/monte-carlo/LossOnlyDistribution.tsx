import { useMemo } from 'react'

interface LossOnlyDistributionProps {
  terminalPrices: number[]
  initialPrice: number
}

export function LossOnlyDistribution({ terminalPrices, initialPrice }: LossOnlyDistributionProps) {
  const stats = useMemo(() => {
    const returns = terminalPrices.map((p) => ((p - initialPrice) / initialPrice) * 100)
    const losses = returns.filter((r) => r < 0)
    const n = Math.max(1, losses.length)

    const light = losses.filter((r) => r >= -20).length / n * 100
    const medium = losses.filter((r) => r < -20 && r >= -50).length / n * 100
    const heavy = losses.filter((r) => r < -50).length / n * 100

    return { light, medium, heavy, nLoss: losses.length }
  }, [terminalPrices, initialPrice])

  const width = 800
  const height = 160
  const padding = { top: 20, right: 20, bottom: 30, left: 20 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const segments = [
    { key: '轻亏 (0~-20%)', value: stats.light, color: '#9CA3AF' },
    { key: '中亏 (-20~-50%)', value: stats.medium, color: '#00D4AA' },
    { key: '重亏 (<-50%)', value: stats.heavy, color: '#22C55E' },
  ]

  let acc = 0
  const rects = segments.map((s, i) => {
    const x = padding.left + (acc / 100) * chartWidth
    const w = (s.value / 100) * chartWidth
    acc += s.value
    return (
      <rect key={i} x={x} y={padding.top} width={w} height={chartHeight * 0.5} fill={s.color} opacity={0.25} />
    )
  })

  return (
    <div className="flex h-full w-full flex-col">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <text x={padding.left} y={padding.top - 6} fill="#9CA3AF" fontSize={10}>
          亏损条件分布（仅 R&lt;0 部分）
        </text>
        {rects}

        {/* Legend */}
        {segments.map((s, i) => (
          <g key={s.key} transform={`translate(${padding.left + i * 160}, ${padding.top + chartHeight * 0.65})`}>
            <rect x={0} y={-10} width={12} height={6} fill={s.color} opacity={0.6} />
            <text x={18} y={-6} fill="#E5E7EB" fontSize={10}>{s.key}</text>
            <text x={18} y={10} fill="#9CA3AF" fontSize={10}>{s.value.toFixed(0)}%</text>
          </g>
        ))}

        <text x={width - padding.right} y={height - 8} fill="#6B7280" fontSize={9} textAnchor="end">
          样本：{stats.nLoss}
        </text>
      </svg>
    </div>
  )
}
