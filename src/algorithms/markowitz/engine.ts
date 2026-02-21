import type { VisualizationEngine } from "@/engine/types"

export interface MarkowitzAsset {
  id: string
  label: string
  expectedReturn: number
  volatility: number
}

export interface MarkowitzInput {
  weights: number[]
  riskFreeRate: number
  maxWeight: number
  samples: number
  frontierPoints: number
  seed: number
}

export interface MarkowitzPortfolioPoint {
  weights: number[]
  expectedReturn: number
  volatility: number
  sharpe: number
}

export interface MarkowitzRanges {
  volatility: [number, number]
  expectedReturn: [number, number]
  sharpe: [number, number]
}

export interface MarkowitzAnalysis {
  portfolios: MarkowitzPortfolioPoint[]
  frontier: MarkowitzPortfolioPoint[]
  minVariance: MarkowitzPortfolioPoint
  maxSharpe: MarkowitzPortfolioPoint
  current: MarkowitzPortfolioPoint
  ranges: MarkowitzRanges
}

export interface MarkowitzState {
  analysis: MarkowitzAnalysis
}

export interface MarkowitzRenderLayer {
  positions: Float32Array
  colors: Float32Array
  pointCount: number
  frontierLine: [number, number, number][]
  minVariancePoint: [number, number, number]
  maxSharpePoint: [number, number, number]
  currentPoint: [number, number, number]
  ranges: MarkowitzRanges
}

export interface MarkowitzMetricsPanel {
  current: MarkowitzPortfolioPoint
  minVariance: MarkowitzPortfolioPoint
  maxSharpe: MarkowitzPortfolioPoint
  effectiveAssetCount: number
  diversificationScore: number
}

const EPSILON = 1e-12

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

const mapRange = (
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number,
): number => {
  if (Math.abs(fromMax - fromMin) <= EPSILON) {
    return (toMin + toMax) / 2
  }

  const ratio = (value - fromMin) / (fromMax - fromMin)
  return toMin + ratio * (toMax - toMin)
}

export const MARKOWITZ_ASSETS: MarkowitzAsset[] = [
  {
    id: "btc",
    label: "BTC",
    expectedReturn: 0.24,
    volatility: 0.72,
  },
  {
    id: "eth",
    label: "ETH",
    expectedReturn: 0.2,
    volatility: 0.66,
  },
  {
    id: "gold",
    label: "Gold",
    expectedReturn: 0.08,
    volatility: 0.17,
  },
  {
    id: "bond",
    label: "Bond",
    expectedReturn: 0.045,
    volatility: 0.09,
  },
]

const CORRELATION_MATRIX: number[][] = [
  [1.0, 0.78, 0.15, -0.08],
  [0.78, 1.0, 0.2, -0.04],
  [0.15, 0.2, 1.0, 0.22],
  [-0.08, -0.04, 0.22, 1.0],
]

const ASSET_COUNT = MARKOWITZ_ASSETS.length
const MIN_FEASIBLE_MAX_WEIGHT = 1 / ASSET_COUNT
const DEFAULT_MAX_WEIGHT = 0.7

const buildCovarianceMatrix = (
  assets: MarkowitzAsset[],
  correlations: number[][],
): number[][] => {
  const matrix: number[][] = []

  for (let i = 0; i < assets.length; i += 1) {
    matrix[i] = []
    for (let j = 0; j < assets.length; j += 1) {
      const corr = correlations[i]?.[j] ?? (i === j ? 1 : 0)
      matrix[i][j] = assets[i].volatility * assets[j].volatility * corr
    }
  }

  return matrix
}

const COVARIANCE_MATRIX = buildCovarianceMatrix(
  MARKOWITZ_ASSETS,
  CORRELATION_MATRIX,
)

const ASSET_RETURNS = MARKOWITZ_ASSETS.map((asset) => asset.expectedReturn)

const createEqualWeights = (assetCount: number): number[] =>
  new Array(assetCount).fill(1 / assetCount)

const safeWeightArray = (weights: number[], assetCount: number): number[] => {
  const next = new Array<number>(assetCount).fill(0)

  for (let i = 0; i < assetCount; i += 1) {
    const candidate = weights[i]
    next[i] = Number.isFinite(candidate) ? Math.max(0, candidate) : 0
  }

  return next
}

export const normalizeWeights = (
  weights: number[],
  maxWeight = DEFAULT_MAX_WEIGHT,
  assetCount = ASSET_COUNT,
): number[] => {
  const cappedMax = clamp(maxWeight, 1 / Math.max(1, assetCount), 1)
  const normalized = safeWeightArray(weights, assetCount)

  let total = normalized.reduce((sum, value) => sum + value, 0)

  if (total <= EPSILON) {
    return createEqualWeights(assetCount)
  }

  for (let i = 0; i < assetCount; i += 1) {
    normalized[i] /= total
  }

  for (let iteration = 0; iteration < 24; iteration += 1) {
    let excess = 0
    let uncappedWeightSum = 0
    let uncappedCount = 0

    for (let i = 0; i < assetCount; i += 1) {
      if (normalized[i] > cappedMax) {
        excess += normalized[i] - cappedMax
        normalized[i] = cappedMax
      } else {
        uncappedWeightSum += normalized[i]
        uncappedCount += 1
      }
    }

    if (excess <= 1e-10 || uncappedCount === 0) {
      break
    }

    if (uncappedWeightSum <= EPSILON) {
      const addEach = excess / uncappedCount
      for (let i = 0; i < assetCount; i += 1) {
        if (normalized[i] < cappedMax - 1e-10) {
          normalized[i] += addEach
        }
      }
    } else {
      for (let i = 0; i < assetCount; i += 1) {
        if (normalized[i] < cappedMax - 1e-10) {
          normalized[i] += (normalized[i] / uncappedWeightSum) * excess
        }
      }
    }
  }

  total = normalized.reduce((sum, value) => sum + value, 0)
  if (total <= EPSILON) {
    return createEqualWeights(assetCount)
  }

  for (let i = 0; i < assetCount; i += 1) {
    normalized[i] = clamp(normalized[i] / total, 0, cappedMax)
  }

  let remainder = 1 - normalized.reduce((sum, value) => sum + value, 0)

  for (let i = 0; i < assetCount && Math.abs(remainder) > 1e-10; i += 1) {
    const room = remainder > 0 ? cappedMax - normalized[i] : normalized[i]
    if (room <= 0) {
      continue
    }

    const delta = remainder > 0 ? Math.min(room, remainder) : -Math.min(room, -remainder)
    normalized[i] += delta
    remainder -= delta
  }

  return normalized
}

export const rebalanceWeights = (
  weights: number[],
  targetIndex: number,
  targetWeight: number,
  maxWeight: number,
): number[] => {
  const safeIndex = clamp(Math.floor(targetIndex), 0, ASSET_COUNT - 1)
  const cappedMax = clamp(maxWeight, MIN_FEASIBLE_MAX_WEIGHT, 1)
  const current = normalizeWeights(weights, cappedMax, ASSET_COUNT)
  const clampedTarget = clamp(targetWeight, 0, cappedMax)
  const remaining = Math.max(0, 1 - clampedTarget)

  const next = [...current]
  let otherTotal = 0

  for (let i = 0; i < ASSET_COUNT; i += 1) {
    if (i === safeIndex) {
      continue
    }
    otherTotal += current[i]
  }

  if (otherTotal <= EPSILON) {
    const equal = remaining / (ASSET_COUNT - 1)
    for (let i = 0; i < ASSET_COUNT; i += 1) {
      if (i !== safeIndex) {
        next[i] = equal
      }
    }
  } else {
    for (let i = 0; i < ASSET_COUNT; i += 1) {
      if (i !== safeIndex) {
        next[i] = (current[i] / otherTotal) * remaining
      }
    }
  }

  next[safeIndex] = clampedTarget

  return normalizeWeights(next, cappedMax, ASSET_COUNT)
}

export const defaultMarkowitzInput: MarkowitzInput = {
  weights: [0.32, 0.25, 0.2, 0.23],
  riskFreeRate: 0.02,
  maxWeight: DEFAULT_MAX_WEIGHT,
  samples: 2200,
  frontierPoints: 40,
  seed: 42,
}

export const sanitizeMarkowitzInput = (
  input: MarkowitzInput,
): MarkowitzInput => {
  const maxWeight = clamp(
    Number.isFinite(input.maxWeight) ? input.maxWeight : defaultMarkowitzInput.maxWeight,
    MIN_FEASIBLE_MAX_WEIGHT,
    1,
  )

  return {
    weights: normalizeWeights(input.weights ?? [], maxWeight, ASSET_COUNT),
    riskFreeRate: clamp(
      Number.isFinite(input.riskFreeRate)
        ? input.riskFreeRate
        : defaultMarkowitzInput.riskFreeRate,
      -0.02,
      0.2,
    ),
    maxWeight,
    samples: Math.max(
      400,
      Math.floor(Number.isFinite(input.samples) ? input.samples : defaultMarkowitzInput.samples),
    ),
    frontierPoints: Math.max(
      16,
      Math.floor(
        Number.isFinite(input.frontierPoints)
          ? input.frontierPoints
          : defaultMarkowitzInput.frontierPoints,
      ),
    ),
    seed: Math.floor(
      Number.isFinite(input.seed) ? input.seed : defaultMarkowitzInput.seed,
    ),
  }
}

const createMulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0

  return () => {
    state += 0x6d2b79f5
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const portfolioExpectedReturn = (weights: number[]): number => {
  let total = 0

  for (let i = 0; i < weights.length; i += 1) {
    total += weights[i] * ASSET_RETURNS[i]
  }

  return total
}

const portfolioVariance = (weights: number[]): number => {
  let variance = 0

  for (let i = 0; i < weights.length; i += 1) {
    for (let j = 0; j < weights.length; j += 1) {
      variance += weights[i] * weights[j] * COVARIANCE_MATRIX[i][j]
    }
  }

  return Math.max(variance, 0)
}

const evaluatePortfolio = (
  weights: number[],
  riskFreeRate: number,
): MarkowitzPortfolioPoint => {
  const expectedReturn = portfolioExpectedReturn(weights)
  const volatility = Math.sqrt(portfolioVariance(weights))
  const sharpe = (expectedReturn - riskFreeRate) / Math.max(volatility, 1e-8)

  return {
    weights: [...weights],
    expectedReturn,
    volatility,
    sharpe,
  }
}

const generateRandomWeights = (
  rng: () => number,
  maxWeight: number,
): number[] => {
  const raw = new Array<number>(ASSET_COUNT).fill(0)

  for (let i = 0; i < ASSET_COUNT; i += 1) {
    raw[i] = -Math.log(Math.max(rng(), EPSILON))
  }

  return normalizeWeights(raw, maxWeight, ASSET_COUNT)
}

const buildCandidatePortfolios = (
  input: MarkowitzInput,
): MarkowitzPortfolioPoint[] => {
  const portfolios: MarkowitzPortfolioPoint[] = []

  const pushPortfolio = (weights: number[]) => {
    portfolios.push(evaluatePortfolio(weights, input.riskFreeRate))
  }

  pushPortfolio(input.weights)
  pushPortfolio(createEqualWeights(ASSET_COUNT))

  const inverseVol = MARKOWITZ_ASSETS.map((asset) => 1 / Math.max(asset.volatility, 1e-6))
  pushPortfolio(normalizeWeights(inverseVol, input.maxWeight, ASSET_COUNT))

  for (let i = 0; i < ASSET_COUNT; i += 1) {
    const oneHot = new Array<number>(ASSET_COUNT).fill(0)
    oneHot[i] = 1
    pushPortfolio(normalizeWeights(oneHot, input.maxWeight, ASSET_COUNT))
  }

  const rng = createMulberry32(input.seed)
  for (let i = 0; i < input.samples; i += 1) {
    pushPortfolio(generateRandomWeights(rng, input.maxWeight))
  }

  return portfolios
}

const getMinVariance = (
  portfolios: MarkowitzPortfolioPoint[],
): MarkowitzPortfolioPoint => {
  let best = portfolios[0]

  for (let i = 1; i < portfolios.length; i += 1) {
    if (portfolios[i].volatility < best.volatility) {
      best = portfolios[i]
    }
  }

  return best
}

const getMaxSharpe = (
  portfolios: MarkowitzPortfolioPoint[],
): MarkowitzPortfolioPoint => {
  let best = portfolios[0]

  for (let i = 1; i < portfolios.length; i += 1) {
    if (portfolios[i].sharpe > best.sharpe) {
      best = portfolios[i]
    }
  }

  return best
}

const dedupeFrontier = (
  points: MarkowitzPortfolioPoint[],
): MarkowitzPortfolioPoint[] => {
  if (points.length === 0) {
    return []
  }

  const sorted = [...points].sort(
    (left, right) =>
      left.volatility - right.volatility || left.expectedReturn - right.expectedReturn,
  )

  const deduped: MarkowitzPortfolioPoint[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i += 1) {
    const previous = deduped[deduped.length - 1]
    const current = sorted[i]
    const sameVol = Math.abs(previous.volatility - current.volatility) < 1e-4
    const sameRet = Math.abs(previous.expectedReturn - current.expectedReturn) < 1e-4

    if (!sameVol || !sameRet) {
      deduped.push(current)
    }
  }

  return deduped
}

const downsampleFrontier = (
  points: MarkowitzPortfolioPoint[],
  targetLength: number,
): MarkowitzPortfolioPoint[] => {
  if (points.length <= targetLength) {
    return points
  }

  const sampled: MarkowitzPortfolioPoint[] = []

  for (let i = 0; i < targetLength; i += 1) {
    const index = Math.round((i * (points.length - 1)) / (targetLength - 1))
    sampled.push(points[index])
  }

  return sampled
}

const buildFrontier = (
  portfolios: MarkowitzPortfolioPoint[],
  frontierPoints: number,
): MarkowitzPortfolioPoint[] => {
  const returns = portfolios.map((portfolio) => portfolio.expectedReturn)
  const minReturn = Math.min(...returns)
  const maxReturn = Math.max(...returns)

  if (Math.abs(maxReturn - minReturn) <= EPSILON) {
    return [getMinVariance(portfolios)]
  }

  const points: MarkowitzPortfolioPoint[] = []
  const buckets = Math.max(frontierPoints * 3, 24)

  for (let i = 0; i < buckets; i += 1) {
    const targetReturn =
      minReturn + ((maxReturn - minReturn) * i) / Math.max(1, buckets - 1)

    let best: MarkowitzPortfolioPoint | null = null
    for (const candidate of portfolios) {
      if (candidate.expectedReturn + 1e-10 < targetReturn) {
        continue
      }

      if (!best || candidate.volatility < best.volatility) {
        best = candidate
      }
    }

    if (best) {
      points.push(best)
    }
  }

  const deduped = dedupeFrontier(points)
  const sampled = downsampleFrontier(deduped, frontierPoints)

  return sampled.sort((left, right) => left.volatility - right.volatility)
}

const withPadding = (values: number[]): [number, number] => {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = Math.max(max - min, 1e-4)
  const padding = spread * 0.08

  return [min - padding, max + padding]
}

const buildRanges = (points: MarkowitzPortfolioPoint[]): MarkowitzRanges => ({
  volatility: withPadding(points.map((point) => point.volatility)),
  expectedReturn: withPadding(points.map((point) => point.expectedReturn)),
  sharpe: withPadding(points.map((point) => point.sharpe)),
})

const projectPoint = (
  point: MarkowitzPortfolioPoint,
  ranges: MarkowitzRanges,
): [number, number, number] => [
  mapRange(point.volatility, ranges.volatility[0], ranges.volatility[1], -9, 9),
  mapRange(point.sharpe, ranges.sharpe[0], ranges.sharpe[1], -2.5, 6.5),
  mapRange(
    point.expectedReturn,
    ranges.expectedReturn[0],
    ranges.expectedReturn[1],
    -8,
    8,
  ),
]

const pointColor = (
  point: MarkowitzPortfolioPoint,
  ranges: MarkowitzRanges,
): [number, number, number] => {
  const sharpeNorm = clamp(
    mapRange(point.sharpe, ranges.sharpe[0], ranges.sharpe[1], 0, 1),
    0,
    1,
  )
  const riskNorm = clamp(
    mapRange(point.volatility, ranges.volatility[0], ranges.volatility[1], 0, 1),
    0,
    1,
  )

  const red = 0.25 + (1 - sharpeNorm) * 0.45
  const green = 0.25 + sharpeNorm * 0.62
  const blue = 0.9 - riskNorm * 0.4

  return [clamp(red, 0, 1), clamp(green, 0, 1), clamp(blue, 0, 1)]
}

export const runMarkowitzOptimization = (
  rawInput: MarkowitzInput,
): MarkowitzAnalysis => {
  const input = sanitizeMarkowitzInput(rawInput)
  const portfolios = buildCandidatePortfolios(input)
  const minVariance = getMinVariance(portfolios)
  const maxSharpe = getMaxSharpe(portfolios)
  const current = evaluatePortfolio(input.weights, input.riskFreeRate)
  const frontier = buildFrontier(portfolios, input.frontierPoints)
  const ranges = buildRanges([...portfolios, ...frontier, current])

  return {
    portfolios,
    frontier,
    minVariance,
    maxSharpe,
    current,
    ranges,
  }
}

const buildRenderLayer = (analysis: MarkowitzAnalysis): MarkowitzRenderLayer => {
  const pointCount = analysis.portfolios.length
  const positions = new Float32Array(pointCount * 3)
  const colors = new Float32Array(pointCount * 3)

  for (let i = 0; i < pointCount; i += 1) {
    const point = analysis.portfolios[i]
    const [x, y, z] = projectPoint(point, analysis.ranges)
    const [r, g, b] = pointColor(point, analysis.ranges)
    const offset = i * 3

    positions[offset] = x
    positions[offset + 1] = y
    positions[offset + 2] = z

    colors[offset] = r
    colors[offset + 1] = g
    colors[offset + 2] = b
  }

  return {
    positions,
    colors,
    pointCount,
    frontierLine: analysis.frontier.map((point) => projectPoint(point, analysis.ranges)),
    minVariancePoint: projectPoint(analysis.minVariance, analysis.ranges),
    maxSharpePoint: projectPoint(analysis.maxSharpe, analysis.ranges),
    currentPoint: projectPoint(analysis.current, analysis.ranges),
    ranges: analysis.ranges,
  }
}

const effectiveAssetCount = (weights: number[]): number => {
  const hhi = weights.reduce((sum, weight) => sum + weight * weight, 0)
  return 1 / Math.max(hhi, 1e-8)
}

const diversificationScore = (weights: number[]): number => {
  const hhi = weights.reduce((sum, weight) => sum + weight * weight, 0)
  return clamp(1 - hhi, 0, 1)
}

export const markowitzEngine: VisualizationEngine<
  MarkowitzInput,
  MarkowitzState,
  MarkowitzRenderLayer,
  MarkowitzMetricsPanel
> = {
  id: "markowitz-efficient-frontier",
  displayName: "Markowitz Efficient Frontier",

  createInitialState: (input) => ({
    analysis: runMarkowitzOptimization(input),
  }),

  advance: (state) => state,

  getRenderLayer: (state) => buildRenderLayer(state.analysis),

  getMetricsPanel: (state) => ({
    current: state.analysis.current,
    minVariance: state.analysis.minVariance,
    maxSharpe: state.analysis.maxSharpe,
    effectiveAssetCount: effectiveAssetCount(state.analysis.current.weights),
    diversificationScore: diversificationScore(state.analysis.current.weights),
  }),
}
