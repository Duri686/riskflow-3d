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
    cvar95: number
    profitProbability: number
    upDownRatio: number
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
  const tailCount = Math.max(1, Math.floor(n * 0.05))
  const tail = sorted.slice(0, tailCount)
  const cvar95 = tail.reduce((a, b) => a + b, 0) / tail.length
  const profitCount = returns.filter((r) => r > 0).length
  const profitProbability = (profitCount / n) * 100
  const upDownRatio = p95 > 0 && cvar95 < 0 ? (p95 / Math.abs(cvar95)) : 0

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
      cvar95,
      profitProbability,
      upDownRatio,
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

  const xMin = Math.min(Math.min(stats.p05, stats.cvar95) - 10, -50)
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
  const p05X = xScale(stats.p05)
  const p95X = xScale(stats.p95)
  const medianX = xScale(stats.median)
  const cvar95X = xScale(stats.cvar95)

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

        {/* P5 标注（5%分位/绿色） */}
        <line
          x1={p05X}
          y1={padding.top}
          x2={p05X}
          y2={padding.top + chartHeight}
          stroke="#00D4AA"
          strokeWidth={2}
          filter="url(#glow)"
        />
        <text x={p05X} y={padding.top - 10} fill="#00D4AA" fontSize={10} textAnchor="middle">
          P5: {stats.p05.toFixed(1)}%
        </text>

        {/* CVaR 95% 标注（极端亏损均值/绿色虚线） */}
        <line
          x1={cvar95X}
          y1={padding.top}
          x2={cvar95X}
          y2={padding.top + chartHeight}
          stroke="#00D4AA"
          strokeWidth={1.5}
          strokeDasharray="3,3"
        />
        <text x={cvar95X} y={padding.top - 10} fill="#00D4AA" fontSize={10} textAnchor="middle">
          CVaR95: {stats.cvar95.toFixed(1)}%
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

        {/* 中位数 (P50) 标注 */}
        <line
          x1={medianX}
          y1={padding.top}
          x2={medianX}
          y2={padding.top + chartHeight}
          stroke="#E5E7EB"
          strokeWidth={2}
        />
        <text x={medianX} y={padding.top - 10} fill="#E5E7EB" fontSize={10} textAnchor="middle">
          P50: {stats.median > 0 ? '+' : ''}{stats.median.toFixed(1)}%
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

        {/* 右侧统计面板（决策三联表） */}
        <g transform={`translate(${width - padding.right + 10}, ${padding.top})`}>
          <text x={0} y={0} fill="#E5E7EB" fontSize={11} fontWeight="600" letterSpacing="0.05em">
            决策指标
          </text>

          {/* 胜率 */}
          <text x={0} y={26} fill={stats.profitProbability >= 55 ? '#FF4757' : '#00D4AA'} fontSize={16} fontWeight="600">
            胜率 {stats.profitProbability.toFixed(0)}%
          </text>

          {/* 中位数收益 P50 */}
          <text x={0} y={52} fill={stats.median >= 0 ? '#FF4757' : '#00D4AA'} fontSize={12} fontWeight="600">
            P50 {stats.median > 0 ? '+' : ''}{stats.median.toFixed(1)}%
          </text>

          {/* CVaR95 */}
          <text x={0} y={78} fill="#00D4AA" fontSize={12} fontWeight="600">
            CVaR95 {stats.cvar95.toFixed(1)}%
          </text>

          {/* P95 */}
          <text x={0} y={104} fill="#FF4757" fontSize={12} fontWeight="600">
            P95 +{stats.p95.toFixed(1)}%
          </text>

          {/* 盈亏比 */}
          <text x={0} y={130} fill="#E5E7EB" fontSize={12} fontWeight="600">
            盈亏比 {stats.upDownRatio.toFixed(2)}
          </text>

          <rect x={0} y={150} width={90} height={1} fill="#374151" />

          <text x={0} y={170} fill="#6B7280" fontSize={9}>
            模拟路径: {paths}
          </text>
        </g>
      </svg>
    </div>
  )
}
