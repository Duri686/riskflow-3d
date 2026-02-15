import type { EngineClock, VisualizationEngine } from '../../engine/types'

export interface MonteCarloInput {
  paths: number
  steps: number
  years: number
  initialPrice: number
  drift: number
  volatility: number
  seed: number
  playbackSpeed: number
}

export interface MonteCarloStepStat {
  step: number
  elapsedYears: number
  meanPrice: number
  p05Price: number
  p95Price: number
}

interface MonteCarloRiskMetrics {
  expectedReturn: number
  medianReturn: number
  volatility: number
  var95: number
  expectedShortfall95: number
  lossProbability: number
  p95Return: number
  upDownRatio: number
}

interface MonteCarloCloudData {
  positions: Float32Array
  colors: Float32Array
  stepStats: MonteCarloStepStat[]
  terminalPrices: number[]
  riskMetrics: MonteCarloRiskMetrics
  totalSteps: number
  paths: number
}

export interface MonteCarloState {
  cloud: MonteCarloCloudData
  currentStep: number
  elapsedSeconds: number
}

export interface MonteCarloRenderLayer {
  positions: Float32Array
  colors: Float32Array
  visiblePoints: number
  totalPoints: number
  currentStep: number
  totalSteps: number
}

export interface MonteCarloMetricsPanel {
  current: MonteCarloStepStat
  final: MonteCarloRiskMetrics
  progress: number
  elapsedYears: number
}

export const defaultMonteCarloInput: MonteCarloInput = {
  paths: 320,
  steps: 180,
  years: 1,
  initialPrice: 100,
  drift: 0.08,
  volatility: 0.22,
  seed: 42,
  playbackSpeed: 30,
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

export const sanitizeInput = (input: MonteCarloInput): MonteCarloInput => ({
  paths: Math.max(16, Math.floor(input.paths)),
  steps: Math.max(12, Math.floor(input.steps)),
  years: Math.max(0.1, input.years),
  initialPrice: Math.max(1, input.initialPrice),
  drift: clamp(input.drift, -1, 1),
  volatility: clamp(input.volatility, 0.01, 2),
  seed: Math.floor(input.seed),
  playbackSpeed: Math.max(1, Math.floor(input.playbackSpeed)),
})

export const createMulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0

  return () => {
    state += 0x6d2b79f5
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const createNormalSampler = (uniform: () => number): (() => number) => {
  let spare: number | null = null

  return () => {
    if (spare !== null) {
      const next = spare
      spare = null
      return next
    }

    const u1 = Math.max(uniform(), Number.EPSILON)
    const u2 = uniform()
    const radius = Math.sqrt(-2 * Math.log(u1))
    const theta = 2 * Math.PI * u2
    spare = radius * Math.sin(theta)
    return radius * Math.cos(theta)
  }
}

export const quantile = (sortedValues: number[], q: number): number => {
  if (sortedValues.length === 0) {
    return 0
  }

  const position = (sortedValues.length - 1) * q
  const lower = Math.floor(position)
  const upper = Math.ceil(position)

  if (lower === upper) {
    return sortedValues[lower]
  }

  const weight = position - lower
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight
}

export const calculateRiskMetrics = (terminalPrices: number[], initialPrice: number): MonteCarloRiskMetrics => {
  const returns = terminalPrices.map((price) => price / initialPrice - 1)
  const total = returns.reduce((sum, value) => sum + value, 0)
  const expectedReturn = total / returns.length

  const variance =
    returns.reduce((sum, value) => {
      const diff = value - expectedReturn
      return sum + diff * diff
    }, 0) / Math.max(1, returns.length - 1)

  const volatility = Math.sqrt(variance)
  const sortedReturns = [...returns].sort((a, b) => a - b)
  const medianReturn = quantile(sortedReturns, 0.5)
  const var95 = quantile(sortedReturns, 0.05)
  const p95Return = quantile(sortedReturns, 0.95)

  let tailTotal = 0
  let tailCount = 0
  for (const value of sortedReturns) {
    if (value <= var95) {
      tailTotal += value
      tailCount += 1
    }
  }

  const expectedShortfall95 = tailCount > 0 ? tailTotal / tailCount : var95
  const lossCount = returns.filter((value) => value < 0).length
  const denom = Math.max(1e-12, Math.abs(expectedShortfall95))
  const upDownRatio = p95Return > 0 ? p95Return / denom : 0

  return {
    expectedReturn,
    medianReturn,
    volatility,
    var95,
    expectedShortfall95,
    lossProbability: lossCount / returns.length,
    p95Return,
    upDownRatio,
  }
}

export const buildCloudData = (rawInput: MonteCarloInput): MonteCarloCloudData => {
  const input = sanitizeInput(rawInput)
  const uniform = createMulberry32(input.seed)
  const normal = createNormalSampler(uniform)

  const points = (input.steps + 1) * input.paths
  const positions = new Float32Array(points * 3)
  const colors = new Float32Array(points * 3)
  const stepStats: MonteCarloStepStat[] = []
  const prices = new Array<number>(input.paths).fill(input.initialPrice)
  const dt = input.years / input.steps
  const pathSpacingDenominator = Math.max(1, input.paths - 1)

  for (let stepIndex = 0; stepIndex <= input.steps; stepIndex += 1) {
    if (stepIndex > 0) {
      for (let pathIndex = 0; pathIndex < input.paths; pathIndex += 1) {
        const shock = normal()
        const driftTerm = (input.drift - 0.5 * input.volatility * input.volatility) * dt
        const diffusionTerm = input.volatility * Math.sqrt(dt) * shock
        prices[pathIndex] *= Math.exp(driftTerm + diffusionTerm)
      }
    }

    const sortedStepPrices = [...prices].sort((a, b) => a - b)
    let meanPrice = 0

    for (let pathIndex = 0; pathIndex < input.paths; pathIndex += 1) {
      meanPrice += prices[pathIndex]

      const pointIndex = (stepIndex * input.paths + pathIndex) * 3
      const x = (stepIndex / input.steps - 0.5) * 26
      const logReturn = Math.log(Math.max(prices[pathIndex], 1e-8) / input.initialPrice)
      const y = logReturn * 14
      const z = (pathIndex / pathSpacingDenominator - 0.5) * 16

      positions[pointIndex] = x
      positions[pointIndex + 1] = y
      positions[pointIndex + 2] = z

      // 涨跌颜色区分：青色上涨 #22D3EE / 紫色下跌 #A855F7
      const priceRatio = prices[pathIndex] / input.initialPrice
      const isUp = priceRatio > 1
      const intensity = clamp(Math.abs(priceRatio - 1) * 2, 0, 1)

      if (isUp) {
        // 青色 #22D3EE (34, 211, 238) -> RGB normalized
        colors[pointIndex] = 0.13 + intensity * 0.1      // R: 0.13
        colors[pointIndex + 1] = 0.6 + intensity * 0.23  // G: 0.83
        colors[pointIndex + 2] = 0.7 + intensity * 0.23  // B: 0.93
      } else {
        // 紫色 #A855F7 (168, 85, 247) -> RGB normalized
        colors[pointIndex] = 0.4 + intensity * 0.26      // R: 0.66
        colors[pointIndex + 1] = 0.2 + intensity * 0.13  // G: 0.33
        colors[pointIndex + 2] = 0.7 + intensity * 0.27  // B: 0.97
      }
    }

    meanPrice /= input.paths

    stepStats.push({
      step: stepIndex,
      elapsedYears: (stepIndex / input.steps) * input.years,
      meanPrice,
      p05Price: quantile(sortedStepPrices, 0.05),
      p95Price: quantile(sortedStepPrices, 0.95),
    })
  }

  const terminalPrices = [...prices]

  return {
    positions,
    colors,
    stepStats,
    terminalPrices,
    riskMetrics: calculateRiskMetrics(terminalPrices, input.initialPrice),
    totalSteps: input.steps,
    paths: input.paths,
  }
}

export const monteCarloEngine: VisualizationEngine<
  MonteCarloInput,
  MonteCarloState,
  MonteCarloRenderLayer,
  MonteCarloMetricsPanel
> = {
  id: 'monte-carlo-gbm',
  displayName: '蒙特卡洛路径点云',

  createInitialState: (input) => ({
    cloud: buildCloudData(input),
    currentStep: 0,
    elapsedSeconds: 0,
  }),

  advance: (state, input, clock: EngineClock) => {
    if (state.currentStep >= state.cloud.totalSteps) {
      return state
    }

    const sanitized = sanitizeInput(input)
    const stepIncrement = Math.max(1, Math.round(clock.dtSeconds * sanitized.playbackSpeed))

    return {
      ...state,
      currentStep: Math.min(state.cloud.totalSteps, state.currentStep + stepIncrement),
      elapsedSeconds: state.elapsedSeconds + clock.dtSeconds,
    }
  },

  getRenderLayer: (state) => ({
    positions: state.cloud.positions,
    colors: state.cloud.colors,
    visiblePoints: (state.currentStep + 1) * state.cloud.paths,
    totalPoints: state.cloud.positions.length / 3,
    currentStep: state.currentStep,
    totalSteps: state.cloud.totalSteps,
  }),

  getMetricsPanel: (state, input) => {
    const currentStep = Math.min(state.currentStep, state.cloud.totalSteps)
    const current = state.cloud.stepStats[currentStep]

    return {
      current,
      final: state.cloud.riskMetrics,
      progress: currentStep / state.cloud.totalSteps,
      elapsedYears: (currentStep / state.cloud.totalSteps) * sanitizeInput(input).years,
    }
  },
}
