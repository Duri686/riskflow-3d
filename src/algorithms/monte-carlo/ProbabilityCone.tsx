import { useMemo } from 'react'

interface ProbabilityConeProps {
  stepStats: Array<{
    step: number
    elapsedYears: number
    meanPrice: number
    p05Price: number
    p95Price: number
  }>
  initialPrice: number
  currentStep: number
  totalSteps: number
}

export function ProbabilityCone({
  stepStats,
  initialPrice,
  currentStep,
  totalSteps,
}: ProbabilityConeProps) {
  const visibleStats = useMemo(
    () => stepStats.slice(0, Math.max(1, currentStep + 1)),
    [stepStats, currentStep]
  )

  const width = 800
  const height = 180
  const paddingTop = 20
  const paddingRight = 60
  const paddingBottom = 40
  const paddingLeft = 60
  const chartWidth = width - paddingLeft - paddingRight
  const chartHeight = height - paddingTop - paddingBottom

  const { xScale, yScale, paths } = useMemo(() => {
    if (visibleStats.length === 0) {
      return { xScale: () => 0, yScale: () => 0, paths: { upper: '', lower: '', mean: '', area: '' } }
    }

    const allPrices = visibleStats.flatMap((s) => [s.p05Price, s.p95Price, s.meanPrice])
    const minPrice = Math.min(...allPrices) * 0.95
    const maxPrice = Math.max(...allPrices) * 1.05

    const xScaleFn = (step: number) => paddingLeft + (step / totalSteps) * chartWidth
    const yScaleFn = (price: number) =>
      paddingTop + chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight

    const upperPath = visibleStats
      .map((s, i) => `${i === 0 ? 'M' : 'L'} ${xScaleFn(s.step)} ${yScaleFn(s.p95Price)}`)
      .join(' ')

    const lowerPath = [...visibleStats]
      .reverse()
      .map((s, i) => `${i === 0 ? 'L' : 'L'} ${xScaleFn(s.step)} ${yScaleFn(s.p05Price)}`)
      .join(' ')

    const meanPath = visibleStats
      .map((s, i) => `${i === 0 ? 'M' : 'L'} ${xScaleFn(s.step)} ${yScaleFn(s.meanPrice)}`)
      .join(' ')

    return {
      yMin: minPrice,
      yMax: maxPrice,
      xScale: xScaleFn,
      yScale: yScaleFn,
      paths: {
        upper: upperPath,
        lower: lowerPath,
        mean: meanPath,
        area: `${upperPath} ${lowerPath} Z`,
      },
    }
  }, [visibleStats, totalSteps, chartWidth, chartHeight])

  const lastStat = visibleStats[visibleStats.length - 1]
  const progress = currentStep / totalSteps

  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-1 flex shrink-0 items-center justify-between">
        <span className="font-bt-mono text-[10px] text-[var(--color-bt-muted-foreground)]">价格置信区间 (5%-95%)</span>
        <span className="font-bt-mono text-[10px] text-[var(--color-bt-muted-foreground)]/80">
          T = {lastStat ? lastStat.elapsedYears.toFixed(2) : '0.00'} 年
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="coneGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF4757" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#00D4AA" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* 初始价格基准线 */}
        <line
          x1={paddingLeft}
          y1={yScale(initialPrice)}
          x2={paddingLeft + chartWidth}
          y2={yScale(initialPrice)}
          stroke="#FFFFFF"
          strokeWidth={1}
          strokeDasharray="4,4"
          opacity={0.3}
        />
        <text
          x={paddingLeft - 5}
          y={yScale(initialPrice)}
          fill="#9CA3AF"
          fontSize={9}
          textAnchor="end"
          dominantBaseline="middle"
        >
          S₀
        </text>

        {/* 置信区间填充 */}
        {paths.area && (
          <path
            d={paths.area}
            fill="url(#coneGrad)"
          />
        )}

        {/* P95 上边界（上涨/红色） */}
        <path
          d={paths.upper}
          fill="none"
          stroke="#FF4757"
          strokeWidth={1.5}
        />

        {/* P05 下边界 */}
        {visibleStats.length > 0 && (
          <path
            d={visibleStats
              .map((s, i) => `${i === 0 ? 'M' : 'L'} ${xScale(s.step)} ${yScale(s.p05Price)}`)
              .join(' ')}
            fill="none"
            stroke="#00D4AA"
            strokeWidth={1.5}
          />
        )}

        {/* 均值线 */}
        <path
          d={paths.mean}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={2}
        />

        {/* 当前位置标记 - 无 transition，与曲线实时同步 */}
        {lastStat && (
          <g>
            <circle
              cx={xScale(lastStat.step)}
              cy={yScale(lastStat.meanPrice)}
              r={4}
              fill="#FFFFFF"
            />
            <circle
              cx={xScale(lastStat.step)}
              cy={yScale(lastStat.p95Price)}
              r={3}
              fill="#FF4757"
            />
            <circle
              cx={xScale(lastStat.step)}
              cy={yScale(lastStat.p05Price)}
              r={3}
              fill="#00D4AA"
            />
          </g>
        )}

        {/* X轴 */}
        <line
          x1={paddingLeft}
          y1={paddingTop + chartHeight}
          x2={paddingLeft + chartWidth}
          y2={paddingTop + chartHeight}
          stroke="#4B5563"
          strokeWidth={1}
        />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line
              x1={paddingLeft + t * chartWidth}
              y1={paddingTop + chartHeight}
              x2={paddingLeft + t * chartWidth}
              y2={paddingTop + chartHeight + 5}
              stroke="#4B5563"
            />
            <text
              x={paddingLeft + t * chartWidth}
              y={paddingTop + chartHeight + 18}
              fill="#9CA3AF"
              fontSize={9}
              textAnchor="middle"
            >
              {(t * 100).toFixed(0)}%
            </text>
          </g>
        ))}

        {/* 右侧价格标签 */}
        {lastStat && (
          <g>
            <text
              x={width - paddingRight + 5}
              y={yScale(lastStat.p95Price)}
              fill="#FF4757"
              fontSize={10}
              dominantBaseline="middle"
            >
              ${lastStat.p95Price.toFixed(0)}
            </text>
            <text
              x={width - paddingRight + 5}
              y={yScale(lastStat.meanPrice)}
              fill="#E5E7EB"
              fontSize={10}
              dominantBaseline="middle"
            >
              ${lastStat.meanPrice.toFixed(0)}
            </text>
            <text
              x={width - paddingRight + 5}
              y={yScale(lastStat.p05Price)}
              fill="#00D4AA"
              fontSize={10}
              dominantBaseline="middle"
            >
              ${lastStat.p05Price.toFixed(0)}
            </text>
          </g>
        )}

        {/* 进度指示 */}
        <rect
          x={paddingLeft}
          y={paddingTop + chartHeight + 25}
          width={chartWidth * progress}
          height={3}
          fill="url(#coneGrad)"
          rx={1.5}
        />
      </svg>
    </div>
  )
}
