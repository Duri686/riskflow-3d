import { describe, expect, it } from 'vitest'

import {
  defaultMarkowitzInput,
  markowitzEngine,
  normalizeWeights,
  rebalanceWeights,
  runMarkowitzOptimization,
} from './engine'

describe('Markowitz engine core math', () => {
  it('normalizeWeights keeps sum=1 and respects maxWeight', () => {
    const weights = normalizeWeights([0.9, 0.05, 0.03, 0.02], 0.45)
    const total = weights.reduce((sum, value) => sum + value, 0)

    expect(total).toBeCloseTo(1, 10)
    for (const weight of weights) {
      expect(weight).toBeGreaterThanOrEqual(0)
      expect(weight).toBeLessThanOrEqual(0.45 + 1e-8)
    }
  })

  it('rebalanceWeights updates target asset while preserving feasibility', () => {
    const next = rebalanceWeights([0.25, 0.25, 0.25, 0.25], 0, 0.5, 0.7)
    const total = next.reduce((sum, value) => sum + value, 0)

    expect(next[0]).toBeCloseTo(0.5, 10)
    expect(total).toBeCloseTo(1, 10)
    for (let i = 1; i < next.length; i += 1) {
      expect(next[i]).toBeCloseTo(1 / 6, 10)
    }
  })

  it('optimization identifies best Sharpe and min-variance portfolios from candidate cloud', () => {
    const analysis = runMarkowitzOptimization(defaultMarkowitzInput)

    expect(analysis.portfolios.length).toBeGreaterThan(100)
    expect(analysis.frontier.length).toBeGreaterThan(8)

    const bestSharpe = Math.max(...analysis.portfolios.map((point) => point.sharpe))
    const minVolatility = Math.min(...analysis.portfolios.map((point) => point.volatility))

    expect(analysis.maxSharpe.sharpe).toBeCloseTo(bestSharpe, 10)
    expect(analysis.minVariance.volatility).toBeCloseTo(minVolatility, 10)
  })

  it('efficient frontier points are sorted by volatility', () => {
    const analysis = runMarkowitzOptimization(defaultMarkowitzInput)

    for (let i = 1; i < analysis.frontier.length; i += 1) {
      expect(analysis.frontier[i].volatility).toBeGreaterThanOrEqual(
        analysis.frontier[i - 1].volatility,
      )
    }
  })
})

describe('Markowitz visualization engine contract', () => {
  it('builds render layer with valid point buffers', () => {
    const state = markowitzEngine.createInitialState(defaultMarkowitzInput)
    const layer = markowitzEngine.getRenderLayer(state, defaultMarkowitzInput)

    expect(layer.pointCount).toBe(state.analysis.portfolios.length)
    expect(layer.positions.length).toBe(layer.pointCount * 3)
    expect(layer.colors.length).toBe(layer.pointCount * 3)
    expect(layer.frontierLine.length).toBeGreaterThan(2)
  })
})
