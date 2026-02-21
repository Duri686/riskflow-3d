import { useMemo } from 'react'

interface ReturnDistributionProps {
  terminalPrices: number[]
  initialPrice: number
  paths: number
  visiblePaths: number
  latestDataDate?: string | null
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
  const binWidth = range > 0 ? range / binCount : 1

  const bins: { x: number; count: number; percentage: number }[] = []
  for (let i = 0; i < binCount; i++) {
    const binStart = min + i * binWidth
    const binEnd = binStart + binWidth
    const count = returns.filter((r) => r >= binStart && r < binEnd).length
    bins.push({
      x: binStart + binWidth / 2,
      count,
      percentage: returns.length > 0 ? (count / returns.length) * 100 : 0,
    })
  }

  const n = sorted.length
  const mean = n > 0 ? returns.reduce((a, b) => a + b, 0) / n : 0
  const median = n === 0 ? 0 : n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]
  const p05 = n > 0 ? sorted[Math.floor(n * 0.05)] : 0
  const p95 = n > 0 ? sorted[Math.floor(n * 0.95)] : 0
  const var95 = -p05
  const tailCount = Math.max(1, Math.floor(n * 0.05))
  const tail = sorted.slice(0, tailCount)
  const cvar95 = tail.length > 0 ? tail.reduce((a, b) => a + b, 0) / tail.length : 0
  const profitCount = returns.filter((r) => r > 0).length
  const profitProbability = n > 0 ? (profitCount / n) * 100 : 0
  const upDownRatio = p95 > 0 && cvar95 < 0 ? (p95 / Math.abs(cvar95)) : 0

  const densityCurve: { x: number; y: number }[] = []
  const bandwidth = range > 0 ? range / 15 : 1
  for (let i = 0; i <= 50; i++) {
    const x = min + (i / 50) * (range > 0 ? range : 1)
    let density = 0
    for (const r of returns) {
      const diff = (x - r) / bandwidth
      density += Math.exp(-0.5 * diff * diff)
    }
    density /= returns.length * bandwidth * Math.sqrt(2 * Math.PI)
    if (Number.isFinite(density)) {
      densityCurve.push({ x, y: density })
    }
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

/**
 * 标签防碰撞：对一组 x 坐标进行偏移，避免文字重叠
 * 使用上下交替偏移策略，让标签错开排列
 * 返回 y 偏移量数组（负值=向上，正值=向下）
 */
function resolveLabels(positions: { x: number; label: string }[]): number[] {
  const minGap = 80 // 最小 x 间距（像素）
  const stepSize = 18 // 每级偏移量
  const offsets = positions.map(() => 0)

  // 按 x 排序的索引
  const sorted = positions
    .map((p, i) => ({ ...p, i }))
    .sort((a, b) => a.x - b.x)

  for (let k = 1; k < sorted.length; k++) {
    const prev = sorted[k - 1]
    const curr = sorted[k]
    if (Math.abs(curr.x - prev.x) < minGap) {
      // 交替方向：前一个下移 → 当前上移；前一个上移 → 当前下移
      if (offsets[prev.i] <= 0) {
        offsets[curr.i] = Math.abs(offsets[prev.i]) + stepSize
      } else {
        offsets[curr.i] = -(offsets[prev.i] + stepSize)
      }
    }
  }

  return offsets
}

export function ReturnDistribution({
  terminalPrices,
  initialPrice,
  paths,
  visiblePaths,
  latestDataDate = null,
}: ReturnDistributionProps) {
  const data = useMemo(() => {
    const visiblePrices = terminalPrices.slice(0, Math.max(1, visiblePaths))
    return calculateDistribution(visiblePrices, initialPrice)
  }, [terminalPrices, initialPrice, visiblePaths])

  const { bins, stats, densityCurve } = data

  const width = 800
  const height = 400
  const padding = { top: 70, right: 130, bottom: 60, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // 动态计算X轴范围 (至少 ±5% 范围，防止波动率为0时显示异常)
  const dataMin = Math.min(stats.maxLoss, stats.cvar95, -5);
  const dataMax = Math.max(stats.maxGain, stats.p95, 5);
  const xPadding = (dataMax - dataMin) * 0.1; // 10% padding
  const xMin = Math.floor(dataMin - xPadding);
  const xMax = Math.ceil(dataMax + xPadding);
  
  const xScale = (x: number) => padding.left + ((x - xMin) / (xMax - xMin)) * chartWidth

  const maxCount = Math.max(1, ...bins.map((b) => b.percentage))

  const maxDensity = Math.max(1e-10, ...densityCurve.map((d) => d.y))
  const densityYScale = (y: number) =>
    padding.top + chartHeight - (y / maxDensity) * chartHeight * 0.9

  const densityPath = densityCurve
    .filter((d) => Number.isFinite(d.x) && Number.isFinite(d.y))
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(d.x)} ${densityYScale(d.y)}`)
    .join(' ')

  const zeroX = xScale(0)
  const p05X = xScale(stats.p05)
  const p95X = xScale(stats.p95)
  const medianX = xScale(stats.median)
  const cvar95X = xScale(stats.cvar95)

  // 计算标签 y 偏移，防止碰撞
  const labelPositions = [
    { x: cvar95X, label: 'cvar95' },
    { x: p05X, label: 'p05' },
    { x: medianX, label: 'median' },
    { x: zeroX, label: 'zero' },
    { x: p95X, label: 'p95' },
  ]
  const labelOffsets = resolveLabels(labelPositions)
  /** 标签 y 坐标：基于 padding.top 向上偏移，并 clamp 防止超出 viewBox */
  const labelY = (idx: number) => Math.max(12, padding.top - 10 + labelOffsets[idx])

  // 动态生成 ticks (5个)
  const generateTicks = (min: number, max: number) => {
    const step = (max - min) / 4;
    return [0, 1, 2, 3, 4].map(i => {
       const val = min + i * step;
       // Round to nearest integer or 1 decimal if range is small
       return Math.abs(val) < 10 ? Number(val.toFixed(1)) : Math.round(val);
    });
  };
  const ticks = generateTicks(xMin, xMax);

  return (
    <div className="flex h-full w-full flex-col">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* 颜色纠正：绿色=盈利，红色=亏损（金融惯例） */}
          <linearGradient id="profitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--color-rf-accent)" stopOpacity={0.9} />
            <stop offset="100%" stopColor="var(--color-rf-accent)" stopOpacity={0.3} />
          </linearGradient>
          <linearGradient id="lossGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--color-rf-chart-3)" stopOpacity={0.9} />
            <stop offset="100%" stopColor="var(--color-rf-chart-3)" stopOpacity={0.3} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 背景区域：亏损区（左/红）和盈利区（右/绿） */}
        <rect
          x={padding.left}
          y={padding.top}
          width={Math.max(0, zeroX - padding.left)}
          height={chartHeight}
          fill="var(--color-rf-chart-3)"
          opacity={0.03}
        />
        <rect
          x={zeroX}
          y={padding.top}
          width={Math.max(0, padding.left + chartWidth - zeroX)}
          height={chartHeight}
          fill="var(--color-rf-accent)"
          opacity={0.03}
        />

        {/* 直方图柱子 */}
        {bins.map((bin, i) => {
          const barWidth = (chartWidth / bins.length) * 0.8
          const barHeight = (bin.percentage / maxCount) * chartHeight
          // NaN 守卫
          const safeBarHeight = Number.isFinite(barHeight) ? barHeight : 0
          const x = xScale(bin.x) - barWidth / 2
          const y = padding.top + chartHeight - safeBarHeight
          const isProfit = bin.x > 0
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={safeBarHeight}
              fill={isProfit ? 'url(#profitGrad)' : 'url(#lossGrad)'}
              rx={2}
              style={{ transition: 'height 0.3s ease-out, y 0.3s ease-out' }}
            />
          )
        })}

        {/* 密度曲线 */}
        {densityPath && (
          <path d={densityPath} fill="none" stroke="var(--color-rf-text)" strokeWidth={2} opacity={0.6} />
        )}

        {/* 零线（盈亏平衡点） */}
        <line
          x1={zeroX}
          y1={padding.top}
          x2={zeroX}
          y2={padding.top + chartHeight}
          stroke="var(--color-rf-text)"
          strokeWidth={2}
          strokeDasharray="4,4"
        />
        <text x={zeroX} y={labelY(3)} fill="var(--color-rf-text)" fontSize={11} textAnchor="middle">
          盈亏平衡
        </text>

        {/* CVaR95 标注（极端亏损均值/红色虚线） */}
        <line
          x1={cvar95X}
          y1={padding.top}
          x2={cvar95X}
          y2={padding.top + chartHeight}
          stroke="var(--color-rf-chart-3)"
          strokeWidth={1.5}
          strokeDasharray="3,3"
        />
        <text x={cvar95X} y={labelY(0)} fill="var(--color-rf-chart-3)" fontSize={10} textAnchor="middle">
          CVaR95: {stats.cvar95.toFixed(1)}%
        </text>

        {/* P5 标注（5%分位/红色） */}
        <line
          x1={p05X}
          y1={padding.top}
          x2={p05X}
          y2={padding.top + chartHeight}
          stroke="var(--color-rf-chart-3)"
          strokeWidth={2}
          filter="url(#glow)"
        />
        <text x={p05X} y={labelY(1)} fill="var(--color-rf-chart-3)" fontSize={10} textAnchor="middle">
          P5: {stats.p05.toFixed(1)}%
        </text>

        {/* P95 标注（95%分位/绿色） */}
        <line
          x1={p95X}
          y1={padding.top}
          x2={p95X}
          y2={padding.top + chartHeight}
          stroke="var(--color-rf-accent)"
          strokeWidth={1.5}
          strokeDasharray="3,3"
        />
        <text x={p95X} y={labelY(4)} fill="var(--color-rf-accent)" fontSize={10} textAnchor="middle">
          P95: +{stats.p95.toFixed(1)}%
        </text>

        {/* 中位数 (P50) 标注 */}
        <line
          x1={medianX}
          y1={padding.top}
          x2={medianX}
          y2={padding.top + chartHeight}
          stroke="var(--color-rf-text-secondary)"
          strokeWidth={2}
        />
        <text x={medianX} y={labelY(2)} fill="var(--color-rf-text-secondary)" fontSize={10} textAnchor="middle">
          P50: {stats.median > 0 ? '+' : ''}{stats.median.toFixed(1)}%
        </text>

        {/* X轴 */}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke="var(--color-rf-border)"
          strokeWidth={1}
        />
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={xScale(tick)}
              y1={padding.top + chartHeight}
              x2={xScale(tick)}
              y2={padding.top + chartHeight + 5}
              stroke="var(--color-rf-border)"
            />
            <text
              x={xScale(tick)}
              y={padding.top + chartHeight + 18}
              fill="var(--color-rf-text-muted)"
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
          fill="var(--color-rf-text-muted)"
          fontSize={12}
          textAnchor="middle"
        >
          收益率 (%)
        </text>

        {/* Y轴标签 */}
        <text
          x={15}
          y={padding.top + chartHeight / 2}
          fill="var(--color-rf-text-muted)"
          fontSize={12}
          textAnchor="middle"
          transform={`rotate(-90, 15, ${padding.top + chartHeight / 2})`}
        >
          概率密度
        </text>

        {latestDataDate && (
          <text
            x={padding.left}
            y={24}
            fill="var(--color-rf-text-muted)"
            fontSize={10}
            textAnchor="start"
          >
            最新数据日期: {latestDataDate}
          </text>
        )}

        {/* 右侧统计面板（决策三联表） */}
        <g transform={`translate(${width - padding.right + 15}, ${padding.top})`}>
          <text x={0} y={0} fill="var(--color-rf-text)" fontSize={11} fontWeight="600" letterSpacing="0.05em">
            决策指标
          </text>

          {/* 胜率 */}
          <text x={0} y={26} fill={stats.profitProbability >= 50 ? 'var(--color-rf-accent)' : 'var(--color-rf-chart-3)'} fontSize={16} fontWeight="600">
            胜率 {stats.profitProbability.toFixed(0)}%
          </text>

          {/* 中位数收益 P50 */}
          <text x={0} y={52} fill={stats.median >= 0 ? 'var(--color-rf-accent)' : 'var(--color-rf-chart-3)'} fontSize={12} fontWeight="600">
            P50 {stats.median > 0 ? '+' : ''}{stats.median.toFixed(1)}%
          </text>

          {/* CVaR95 */}
          <text x={0} y={78} fill="var(--color-rf-chart-3)" fontSize={12} fontWeight="600">
            CVaR {stats.cvar95.toFixed(1)}%
          </text>

          {/* P95 */}
          <text x={0} y={104} fill="var(--color-rf-accent)" fontSize={12} fontWeight="600">
            P95 +{stats.p95.toFixed(1)}%
          </text>

          {/* 盈亏比 */}
          <text x={0} y={130} fill="var(--color-rf-text)" fontSize={12} fontWeight="600">
            盈亏比 {stats.upDownRatio.toFixed(2)}
          </text>

          <rect x={0} y={148} width={100} height={1} fill="var(--color-rf-border)" />

          <text x={0} y={168} fill="var(--color-rf-text-muted)" fontSize={9}>
            模拟路径: {visiblePaths}/{paths}
          </text>
        </g>
      </svg>
    </div>
  )
}
