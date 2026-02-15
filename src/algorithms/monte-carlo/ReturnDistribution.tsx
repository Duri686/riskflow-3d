import { useMemo } from 'react'

interface ReturnDistributionProps {
  terminalPrices: number[]
  initialPrice: number
  paths: number
  visiblePaths: number
}

interface DistributionData {
  bins: { x: number; count: number; percentage: number }[]
  stats: {
    mean: number
    median: number
    p05: number
    p95: number
    var95: number
    profitProbability: number
    maxGain: number
    maxLoss: number
  }
  densityCurve: { x: number; y: number }[]
}

function calculateDistribution(
  terminalPrices: number[],
  initialPrice: number
): DistributionData {
  const returns = terminalPrices.map((p) => ((p - initialPrice) / initialPrice) * 100)
  const sorted = [...returns].sort((a, b) => a - b)

  const min = Math.min(...returns)
  const max = Math.max(...returns)
  const range = max - min
  const binCount = 30
  const binWidth = range / binCount

  const bins: { x: number; count: number; percentage: number }[] = []
  for (let i = 0; i < binCount; i++) {
    const binStart = min + i * binWidth
    const binEnd = binStart + binWidth
    const count = returns.filter((r) => r >= binStart && r < binEnd).length
    bins.push({
      x: binStart + binWidth / 2,
      count,
      percentage: (count / returns.length) * 100,
    })
  }

  const n = sorted.length
  const mean = returns.reduce((a, b) => a + b, 0) / n
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]
  const p05 = sorted[Math.floor(n * 0.05)]
  const p95 = sorted[Math.floor(n * 0.95)]
  const var95 = -p05
  const profitCount = returns.filter((r) => r > 0).length
  const profitProbability = (profitCount / n) * 100

  const densityCurve: { x: number; y: number }[] = []
  const bandwidth = range / 15
  for (let i = 0; i <= 50; i++) {
    const x = min + (i / 50) * range
    let density = 0
    for (const r of returns) {
      const diff = (x - r) / bandwidth
      density += Math.exp(-0.5 * diff * diff)
    }
    density /= returns.length * bandwidth * Math.sqrt(2 * Math.PI)
    densityCurve.push({ x, y: density })
  }

  return {
    bins,
    stats: {
      mean,
      median,
      p05,
      p95,
      var95,
      profitProbability,
      maxGain: max,
      maxLoss: min,
    },
    densityCurve,
  }
}

export function ReturnDistribution({
  terminalPrices,
  initialPrice,
  paths,
  visiblePaths,
}: ReturnDistributionProps) {
  const data = useMemo(() => {
    const visiblePrices = terminalPrices.slice(0, Math.max(1, visiblePaths))
    return calculateDistribution(visiblePrices, initialPrice)
  }, [terminalPrices, initialPrice, visiblePaths])

  const { bins, stats, densityCurve } = data

  const width = 800
  const height = 400
  const padding = { top: 40, right: 80, bottom: 60, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const xMin = Math.min(stats.p05 - 10, -50)
  const xMax = Math.max(stats.p95 + 10, 50)
  const xScale = (x: number) => padding.left + ((x - xMin) / (xMax - xMin)) * chartWidth

  const maxCount = Math.max(...bins.map((b) => b.percentage))

  const maxDensity = Math.max(...densityCurve.map((d) => d.y))
  const densityYScale = (y: number) =>
    padding.top + chartHeight - (y / maxDensity) * chartHeight * 0.9

  const densityPath = densityCurve
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.x)} ${densityYScale(d.y)}`)
    .join(' ')

  const zeroX = xScale(0)
  const var95X = xScale(-stats.var95)
  const p95X = xScale(stats.p95)
  const meanX = xScale(stats.mean)

  return (
    <div className="flex h-full w-full flex-col">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="profitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF4757" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FF4757" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="lossGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00D4AA" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#00D4AA" stopOpacity="0.3" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 背景区域：亏损区（左/绿）和盈利区（右/红） */}
        <rect
          x={padding.left}
          y={padding.top}
          width={zeroX - padding.left}
          height={chartHeight}
          fill="#00D4AA"
          opacity={0.03}
        />
        <rect
          x={zeroX}
          y={padding.top}
          width={padding.left + chartWidth - zeroX}
          height={chartHeight}
          fill="#FF4757"
          opacity={0.03}
        />

        {/* 直方图柱子 */}
        {bins.map((bin, i) => {
          const barWidth = (chartWidth / bins.length) * 0.8
          const barHeight = (bin.percentage / maxCount) * chartHeight
          const x = xScale(bin.x) - barWidth / 2
          const y = padding.top + chartHeight - barHeight
          const isProfit = bin.x > 0
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={isProfit ? 'url(#profitGrad)' : 'url(#lossGrad)'}
              rx={2}
              style={{ transition: 'height 0.3s ease-out, y 0.3s ease-out' }}
            />
          )
        })}

        {/* 密度曲线 */}
        <path d={densityPath} fill="none" stroke="#FFFFFF" strokeWidth={2} opacity={0.6} />

        {/* 零线（盈亏平衡点） */}
        <line
          x1={zeroX}
          y1={padding.top}
          x2={zeroX}
          y2={padding.top + chartHeight}
          stroke="#FFFFFF"
          strokeWidth={2}
          strokeDasharray="4,4"
        />
        <text x={zeroX} y={padding.top - 10} fill="#FFFFFF" fontSize={11} textAnchor="middle">
          盈亏平衡
        </text>

        {/* VaR 95% 标注（最大亏损/绿色） */}
        <line
          x1={var95X}
          y1={padding.top}
          x2={var95X}
          y2={padding.top + chartHeight}
          stroke="#00D4AA"
          strokeWidth={2}
          filter="url(#glow)"
        />
        <text x={var95X} y={padding.top - 10} fill="#00D4AA" fontSize={10} textAnchor="middle">
          VaR 95%: {stats.var95.toFixed(1)}%
        </text>

        {/* P95 标注（最大盈利/红色） */}
        <line
          x1={p95X}
          y1={padding.top}
          x2={p95X}
          y2={padding.top + chartHeight}
          stroke="#FF4757"
          strokeWidth={1.5}
          strokeDasharray="3,3"
        />
        <text x={p95X} y={padding.top - 10} fill="#FF4757" fontSize={10} textAnchor="middle">
          P95: +{stats.p95.toFixed(1)}%
        </text>

        {/* 均值标注 */}
        <line
          x1={meanX}
          y1={padding.top + 20}
          x2={meanX}
          y2={padding.top + chartHeight}
          stroke="#FBBF24"
          strokeWidth={1.5}
        />
        <text x={meanX} y={padding.top + 15} fill="#FBBF24" fontSize={10} textAnchor="middle">
          均值: {stats.mean > 0 ? '+' : ''}{stats.mean.toFixed(1)}%
        </text>

        {/* X轴 */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke="#4B5563"
          strokeWidth={1}
        />
        {[-40, -20, 0, 20, 40].map((tick) => (
          <g key={tick}>
            <line
              x1={xScale(tick)}
              y1={padding.top + chartHeight}
              x2={xScale(tick)}
              y2={padding.top + chartHeight + 5}
              stroke="#4B5563"
            />
            <text
              x={xScale(tick)}
              y={padding.top + chartHeight + 18}
              fill="#9CA3AF"
              fontSize={10}
              textAnchor="middle"
            >
              {tick > 0 ? '+' : ''}{tick}%
            </text>
          </g>
        ))}
        <text
          x={padding.left + chartWidth / 2}
          y={height - 15}
          fill="#9CA3AF"
          fontSize={12}
          textAnchor="middle"
        >
          收益率 (%)
        </text>

        {/* Y轴标签 */}
        <text
          x={15}
          y={padding.top + chartHeight / 2}
          fill="#9CA3AF"
          fontSize={12}
          textAnchor="middle"
          transform={`rotate(-90, 15, ${padding.top + chartHeight / 2})`}
        >
          概率密度
        </text>

        {/* 右侧统计面板 */}
        <g transform={`translate(${width - padding.right + 10}, ${padding.top})`}>
          <text x={0} y={0} fill="#E5E7EB" fontSize={11} fontWeight="600" letterSpacing="0.05em">
            关键指标
          </text>

          {/* 赚钱概率 - 大字突出 */}
          <text x={0} y={35} fill={stats.profitProbability >= 50 ? '#FF4757' : '#00D4AA'} fontSize={28} fontWeight="bold">
            {stats.profitProbability.toFixed(0)}%
          </text>
          <text x={0} y={52} fill="#6B7280" fontSize={9}>
            赚钱概率
          </text>

          {/* P95 最好情况 - 红色上涨 */}
          <text x={0} y={90} fill="#FF4757" fontSize={16} fontWeight="600">
            +{stats.p95.toFixed(1)}%
          </text>
          <text x={0} y={105} fill="#4B5563" fontSize={9}>
            最好情况 (P95)
          </text>

          {/* P05 最坏情况 - 绿色下跌 */}
          <text x={0} y={140} fill="#00D4AA" fontSize={16} fontWeight="600">
            {stats.p05.toFixed(1)}%
          </text>
          <text x={0} y={155} fill="#4B5563" fontSize={9}>
            最坏情况 (P5)
          </text>

          {/* 预期收益 - 根据正负显示颜色 */}
          <text x={0} y={190} fill={stats.mean >= 0 ? '#FF4757' : '#00D4AA'} fontSize={16} fontWeight="600">
            {stats.mean > 0 ? '+' : ''}{stats.mean.toFixed(1)}%
          </text>
          <text x={0} y={205} fill="#4B5563" fontSize={9}>
            预期收益
          </text>

          <rect x={0} y={225} width={70} height={1} fill="#374151" />

          <text x={0} y={245} fill="#6B7280" fontSize={9}>
            模拟路径: {paths}
          </text>
        </g>
      </svg>
    </div>
  )
}
