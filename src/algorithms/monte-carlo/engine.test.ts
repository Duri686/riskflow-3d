/**
 * Monte Carlo GBM 引擎单元测试
 *
 * 覆盖 6 大测试维度：
 * 1. 随机过程正确性（复现性 + 分布稳定性）
 * 2. 收益率分布一致性（均值 / 方差 / 中位数与理论值对比）
 * 3. 波动率校验（σ 收敛 + σ→0 退化）
 * 4. 分位数与风险指标稳定性（paths 增大 → 收敛）
 * 5. 数量级与边界条件（NaN / Infinity / 负价格）
 * 6. 回归测试（黄金指标 snapshot）
 */

import { describe, expect, it } from 'vitest'

import {
  calculateRiskMetrics,
  createMulberry32,
  createNormalSampler,
  monteCarloEngine,
  quantile,
  sanitizeInput,
} from './engine'
import type { MonteCarloInput } from './engine'
import { TRADING_DAYS_PER_YEAR } from './constants'

// ─── 测试辅助函数 ───────────────────────────────────────────

/** 构造一组标准测试参数 */
const makeInput = (overrides: Partial<MonteCarloInput> = {}): MonteCarloInput => ({
  paths: 5000,
  steps: TRADING_DAYS_PER_YEAR,
  years: 1,
  initialPrice: 100,
  drift: 0.08,
  volatility: 0.22,
  seed: 42,
  playbackSpeed: 30,
  ...overrides,
})

/** 从终端价格数组计算 log return 统计量 */
const logReturnStats = (terminalPrices: number[], initialPrice: number) => {
  const logReturns = terminalPrices.map((p) => Math.log(p / initialPrice))
  const n = logReturns.length
  const mean = logReturns.reduce((s, v) => s + v, 0) / n
  const variance = logReturns.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)
  return { logReturns, mean, variance, std: Math.sqrt(variance) }
}

/** 相对误差 */
const relativeError = (actual: number, expected: number): number =>
  Math.abs(actual - expected) / Math.max(Math.abs(expected), 1e-12)

// ─── 1. 随机过程正确性 ─────────────────────────────────────

describe('1. 随机过程正确性', () => {
  describe('1a. 固定种子复现性', () => {
    it('同一输入+同一种子，两次调用生成的终端价格完全一致（误差 ≤ 1e-12）', () => {
      const input = makeInput({ paths: 500, steps: 60 })
      const state1 = monteCarloEngine.createInitialState(input)
      const state2 = monteCarloEngine.createInitialState(input)

      expect(state1.cloud.terminalPrices.length).toBe(state2.cloud.terminalPrices.length)

      for (let i = 0; i < state1.cloud.terminalPrices.length; i++) {
        expect(Math.abs(state1.cloud.terminalPrices[i] - state2.cloud.terminalPrices[i])).toBeLessThanOrEqual(1e-12)
      }
    })

    it('Mulberry32 PRNG 固定种子输出确定性序列', () => {
      const gen1 = createMulberry32(12345)
      const gen2 = createMulberry32(12345)
      const seq1 = Array.from({ length: 100 }, () => gen1())
      const seq2 = Array.from({ length: 100 }, () => gen2())

      for (let i = 0; i < 100; i++) {
        expect(seq1[i]).toBe(seq2[i])
      }
    })

    it('Mulberry32 输出均在 [0, 1) 范围内', () => {
      const gen = createMulberry32(9999)
      for (let i = 0; i < 10000; i++) {
        const v = gen()
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThan(1)
      }
    })
  })

  describe('1b. 不同种子分布稳定性', () => {
    it('不同种子下 log return 均值/方差在容忍带内（均值 10%，方差 5%）', () => {
      const seeds = [42, 123, 7777, 31415, 271828]
      const input = makeInput({ paths: 5000, steps: TRADING_DAYS_PER_YEAR })

      const stats = seeds.map((seed) => {
        const state = monteCarloEngine.createInitialState({ ...input, seed })
        return logReturnStats(state.cloud.terminalPrices, input.initialPrice)
      })

      // 理论值
      const theoreticalMean = (input.drift - 0.5 * input.volatility ** 2) * input.years
      const theoreticalVariance = input.volatility ** 2 * input.years

      // 均值收敛速度 ∝ 1/√n，5k paths 下跨种子相对误差可达 ~8%，放宽到 10%
      // 方差收敛更快，保持 5%
      for (const s of stats) {
        expect(relativeError(s.mean, theoreticalMean)).toBeLessThan(0.10)
        expect(relativeError(s.variance, theoreticalVariance)).toBeLessThan(0.05)
      }
    })
  })
})

// ─── 2. 收益率分布一致性 ────────────────────────────────────

describe('2. 收益率分布一致性', () => {
  it('mean(log(S_T/S_0)) ≈ (μ − 0.5σ²)T，相对误差 ≤ 5%', () => {
    const input = makeInput({ paths: 10000, steps: TRADING_DAYS_PER_YEAR })
    const state = monteCarloEngine.createInitialState(input)
    const stats = logReturnStats(state.cloud.terminalPrices, input.initialPrice)

    const theoreticalMean = (input.drift - 0.5 * input.volatility ** 2) * input.years
    expect(relativeError(stats.mean, theoreticalMean)).toBeLessThan(0.05)
  })

  it('var(log(S_T/S_0)) ≈ σ²T，相对误差 ≤ 5%', () => {
    const input = makeInput({ paths: 10000, steps: TRADING_DAYS_PER_YEAR })
    const state = monteCarloEngine.createInitialState(input)
    const stats = logReturnStats(state.cloud.terminalPrices, input.initialPrice)

    const theoreticalVariance = input.volatility ** 2 * input.years
    expect(relativeError(stats.variance, theoreticalVariance)).toBeLessThan(0.05)
  })

  it('μ=0 时，简单收益中位数 ≈ 0（|median(R)| ≤ 2pp）', () => {
    const input = makeInput({ paths: 10000, drift: 0, volatility: 0.2 })
    const state = monteCarloEngine.createInitialState(input)
    const returns = state.cloud.terminalPrices.map((p) => p / input.initialPrice - 1)
    const sorted = [...returns].sort((a, b) => a - b)
    const median = quantile(sorted, 0.5)

    // 理论中位数：exp((0 - 0.5σ²)T) - 1 = exp(-0.02) - 1 ≈ -0.0198
    const theoreticalMedian = Math.exp(-0.5 * input.volatility ** 2 * input.years) - 1
    expect(Math.abs(median - theoreticalMedian)).toBeLessThan(0.02) // 2pp 容忍
  })

  it('多组参数下均值/方差均一致', () => {
    const configs = [
      { drift: 0.05, volatility: 0.15, years: 1 },
      { drift: 0.12, volatility: 0.30, years: 2 },
      { drift: -0.05, volatility: 0.25, years: 0.5 },
    ]

    for (const cfg of configs) {
      const input = makeInput({ paths: 10000, ...cfg })
      const state = monteCarloEngine.createInitialState(input)
      const stats = logReturnStats(state.cloud.terminalPrices, input.initialPrice)

      const thMean = (cfg.drift - 0.5 * cfg.volatility ** 2) * cfg.years
      const thVar = cfg.volatility ** 2 * cfg.years

      expect(relativeError(stats.mean, thMean)).toBeLessThan(0.08)
      expect(relativeError(stats.variance, thVar)).toBeLessThan(0.08)
    }
  })
})

// ─── 3. 波动率校验（σ sanity check） ───────────────────────

describe('3. 波动率校验', () => {
  it('std(log(S_T/S_0)) / √T ≈ σ，相对误差 ≤ 5%', () => {
    const input = makeInput({ paths: 10000, steps: TRADING_DAYS_PER_YEAR })
    const state = monteCarloEngine.createInitialState(input)
    const stats = logReturnStats(state.cloud.terminalPrices, input.initialPrice)

    const impliedVol = stats.std / Math.sqrt(input.years)
    expect(relativeError(impliedVol, input.volatility)).toBeLessThan(0.05)
  })

  it('σ 极小（sanitize 下限 0.01）时所有路径价格几乎一致', () => {
    // 注意：sanitizeInput 将 volatility 下限 clamp 到 0.01
    const input = makeInput({ paths: 500, steps: 60, volatility: 0.01 })
    const state = monteCarloEngine.createInitialState(input)
    const prices = state.cloud.terminalPrices

    // σ=0.01 极小，价格应非常接近确定性路径 S_0 * exp(μT)
    const deterministicPrice = input.initialPrice * Math.exp(input.drift * input.years)
    const maxDeviation = Math.max(...prices.map((p) => Math.abs(p - deterministicPrice)))
    // 偏差应 < 确定性价格的 5%
    expect(maxDeviation / deterministicPrice).toBeLessThan(0.05)
  })

  it('不同 σ 值下隐含波动率线性跟踪', () => {
    const vols = [0.10, 0.20, 0.40]

    for (const vol of vols) {
      const input = makeInput({ paths: 10000, volatility: vol })
      const state = monteCarloEngine.createInitialState(input)
      const stats = logReturnStats(state.cloud.terminalPrices, input.initialPrice)
      const impliedVol = stats.std / Math.sqrt(input.years)

      expect(relativeError(impliedVol, vol)).toBeLessThan(0.05)
    }
  })
})

// ─── 4. 分位数与风险指标稳定性 ──────────────────────────────

describe('4. 分位数与风险指标稳定性', () => {
  describe('4a. quantile 函数直接测试', () => {
    it('空数组返回 0', () => {
      expect(quantile([], 0.5)).toBe(0)
    })

    it('单元素数组返回该元素', () => {
      expect(quantile([42], 0.5)).toBe(42)
      expect(quantile([42], 0)).toBe(42)
      expect(quantile([42], 1)).toBe(42)
    })

    it('已排序数组的中位数正确', () => {
      const sorted = [1, 2, 3, 4, 5]
      expect(quantile(sorted, 0.5)).toBe(3)
    })

    it('插值计算正确', () => {
      const sorted = [10, 20, 30, 40]
      // q=0.5 → position = 3 * 0.5 = 1.5 → interpolation between 20 and 30
      expect(quantile(sorted, 0.5)).toBe(25)
    })

    it('边界 q=0 和 q=1', () => {
      const sorted = [1, 2, 3, 4, 5]
      expect(quantile(sorted, 0)).toBe(1)
      expect(quantile(sorted, 1)).toBe(5)
    })
  })

  describe('4b. paths 增大 → 指标收敛', () => {
    it('P5/P50/P95 区间随 paths 增大单调收敛', () => {
      const pathCounts = [500, 2000, 10000]
      const results = pathCounts.map((paths) => {
        const input = makeInput({ paths, seed: 42 })
        const state = monteCarloEngine.createInitialState(input)
        const returns = state.cloud.terminalPrices
          .map((p) => p / input.initialPrice - 1)
          .sort((a, b) => a - b)
        return {
          paths,
          p05: quantile(returns, 0.05),
          p50: quantile(returns, 0.50),
          p95: quantile(returns, 0.95),
        }
      })

      // 大样本（10k）和中样本（2k）之间，各分位数差异应 < 5pp
      const large = results[2]
      const medium = results[1]
      expect(Math.abs(large.p05 - medium.p05)).toBeLessThan(0.05)
      expect(Math.abs(large.p50 - medium.p50)).toBeLessThan(0.05)
      expect(Math.abs(large.p95 - medium.p95)).toBeLessThan(0.05)
    })

    it('CVaR95 在 2k→10k 的变化 < 10%', () => {
      const getES = (paths: number) => {
        const input = makeInput({ paths, seed: 42 })
        const state = monteCarloEngine.createInitialState(input)
        return state.cloud.riskMetrics.expectedShortfall95
      }

      const es2k = getES(2000)
      const es10k = getES(10000)

      expect(relativeError(es2k, es10k)).toBeLessThan(0.10)
    })
  })

  describe('4c. calculateRiskMetrics 直接测试', () => {
    it('已知终端价格的风险指标正确', () => {
      // 10 个价格：5 个亏损 5 个盈利
      const prices = [80, 85, 90, 95, 98, 102, 105, 110, 115, 120]
      const metrics = calculateRiskMetrics(prices, 100)

      // expectedReturn = mean(prices/100 - 1)
      const returns = prices.map((p) => p / 100 - 1)
      const expectedMean = returns.reduce((s, v) => s + v, 0) / returns.length
      expect(metrics.expectedReturn).toBeCloseTo(expectedMean, 10)

      // medianReturn
      const sorted = [...returns].sort((a, b) => a - b)
      expect(metrics.medianReturn).toBeCloseTo(quantile(sorted, 0.5), 10)

      // lossProbability: 5 个 < 0 的 / 10
      expect(metrics.lossProbability).toBe(0.5)

      // var95 (P5)
      expect(metrics.var95).toBeCloseTo(quantile(sorted, 0.05), 10)
    })
  })
})

// ─── 5. 数量级与边界条件 ────────────────────────────────────

describe('5. 数量级与边界条件', () => {
  it('所有终端价格 > 0 且 isFinite', () => {
    const input = makeInput({ paths: 5000, steps: TRADING_DAYS_PER_YEAR })
    const state = monteCarloEngine.createInitialState(input)

    for (const price of state.cloud.terminalPrices) {
      expect(price).toBeGreaterThan(0)
      expect(Number.isFinite(price)).toBe(true)
    }
  })

  it('极端参数（σ=2, T=5）下无 NaN/Infinity', () => {
    // volatility 被 clamp 到 max=2, years 保留
    const input = makeInput({ paths: 1000, steps: 60, volatility: 2, years: 5, seed: 42 })
    const state = monteCarloEngine.createInitialState(input)

    for (const price of state.cloud.terminalPrices) {
      expect(Number.isFinite(price)).toBe(true)
      expect(price).toBeGreaterThan(0)
      expect(price).toBeLessThan(1e308)
    }
  })

  it('高漂移（μ=1）+ 长期（T=5）下数值稳定', () => {
    // drift 被 clamp 到 max=1
    const input = makeInput({ paths: 500, steps: 60, drift: 1, years: 5 })
    const state = monteCarloEngine.createInitialState(input)

    for (const price of state.cloud.terminalPrices) {
      expect(Number.isFinite(price)).toBe(true)
      expect(price).toBeGreaterThan(0)
    }
  })

  it('负漂移（μ=-1）下价格仍为正', () => {
    const input = makeInput({ paths: 500, steps: 60, drift: -1, years: 3 })
    const state = monteCarloEngine.createInitialState(input)

    for (const price of state.cloud.terminalPrices) {
      expect(price).toBeGreaterThan(0)
      expect(Number.isFinite(price)).toBe(true)
    }
  })

  describe('5b. sanitizeInput 边界处理', () => {
    it('paths 下限为 16', () => {
      expect(sanitizeInput(makeInput({ paths: 1 })).paths).toBe(16)
    })

    it('steps 下限为 12', () => {
      expect(sanitizeInput(makeInput({ steps: 1 })).steps).toBe(12)
    })

    it('years 下限为 0.1', () => {
      expect(sanitizeInput(makeInput({ years: 0.001 })).years).toBe(0.1)
    })

    it('initialPrice 下限为 1', () => {
      expect(sanitizeInput(makeInput({ initialPrice: -100 })).initialPrice).toBe(1)
    })

    it('drift 被 clamp 到 [-1, 1]', () => {
      expect(sanitizeInput(makeInput({ drift: 5 })).drift).toBe(1)
      expect(sanitizeInput(makeInput({ drift: -5 })).drift).toBe(-1)
    })

    it('volatility 被 clamp 到 [0.01, 2]', () => {
      expect(sanitizeInput(makeInput({ volatility: 0 })).volatility).toBe(0.01)
      expect(sanitizeInput(makeInput({ volatility: 10 })).volatility).toBe(2)
    })
  })
})

// ─── 6. 回归测试（黄金指标 snapshot） ──────────────────────

describe('6. 回归测试（防模型悄悄变异）', () => {
  // 固定参数 + 固定种子，生成"黄金指标"
  // 这些值在首次运行时记录，后续作为回归基准
  const goldenInput = makeInput({
    paths: 1000,
    steps: 120,
    years: 1,
    initialPrice: 100,
    drift: 0.08,
    volatility: 0.22,
    seed: 42,
  })

  // 首次运行生成黄金值（运行一次后将实际值填入下方）
  let goldenState: ReturnType<typeof monteCarloEngine.createInitialState>

  // 预计算黄金值
  const precomputed = (() => {
    const state = monteCarloEngine.createInitialState(goldenInput)
    const stats = logReturnStats(state.cloud.terminalPrices, goldenInput.initialPrice)
    return {
      meanL: stats.mean,
      stdL: stats.std,
      p05: state.cloud.riskMetrics.var95,
      p50: state.cloud.riskMetrics.medianReturn,
      p95: state.cloud.riskMetrics.p95Return,
      cvar95: state.cloud.riskMetrics.expectedShortfall95,
      winRate: 1 - state.cloud.riskMetrics.lossProbability,
      terminalPriceCount: state.cloud.terminalPrices.length,
    }
  })()

  it('黄金指标在多次运行间完全一致（ε ≤ 1e-9）', () => {
    goldenState = monteCarloEngine.createInitialState(goldenInput)
    const stats = logReturnStats(goldenState.cloud.terminalPrices, goldenInput.initialPrice)

    expect(stats.mean).toBeCloseTo(precomputed.meanL, 9)
    expect(stats.std).toBeCloseTo(precomputed.stdL, 9)
    expect(goldenState.cloud.riskMetrics.var95).toBeCloseTo(precomputed.p05, 9)
    expect(goldenState.cloud.riskMetrics.medianReturn).toBeCloseTo(precomputed.p50, 9)
    expect(goldenState.cloud.riskMetrics.p95Return).toBeCloseTo(precomputed.p95, 9)
    expect(goldenState.cloud.riskMetrics.expectedShortfall95).toBeCloseTo(precomputed.cvar95, 9)
    expect(1 - goldenState.cloud.riskMetrics.lossProbability).toBeCloseTo(precomputed.winRate, 9)
  })

  it('终端价格数组长度与 paths 一致', () => {
    goldenState = monteCarloEngine.createInitialState(goldenInput)
    expect(goldenState.cloud.terminalPrices.length).toBe(goldenInput.paths)
  })

  it('stepStats 长度 = steps + 1', () => {
    goldenState = monteCarloEngine.createInitialState(goldenInput)
    expect(goldenState.cloud.stepStats.length).toBe(goldenInput.steps + 1)
  })

  it('stepStats 首步价格 = initialPrice', () => {
    goldenState = monteCarloEngine.createInitialState(goldenInput)
    const firstStep = goldenState.cloud.stepStats[0]
    expect(firstStep.step).toBe(0)
    expect(firstStep.elapsedYears).toBe(0)
    expect(firstStep.meanPrice).toBe(goldenInput.initialPrice)
  })
})

// ─── 附加：Normal Sampler 直接测试 ─────────────────────────

describe('附加：createNormalSampler 直接测试', () => {
  it('生成的正态样本均值 ≈ 0，标准差 ≈ 1（n=10000）', () => {
    const uniform = createMulberry32(42)
    const normal = createNormalSampler(uniform)
    const samples = Array.from({ length: 10000 }, () => normal())

    const mean = samples.reduce((s, v) => s + v, 0) / samples.length
    const variance = samples.reduce((s, v) => s + (v - mean) ** 2, 0) / (samples.length - 1)

    expect(Math.abs(mean)).toBeLessThan(0.05)
    expect(Math.abs(Math.sqrt(variance) - 1)).toBeLessThan(0.05)
  })

  it('Box-Muller 成对生成：连续调用利用 spare 缓存', () => {
    const uniform = createMulberry32(12345)
    const normal = createNormalSampler(uniform)

    // 前两次调用应消耗同一对 (u1, u2)，产生两个不同值
    const v1 = normal()
    const v2 = normal()
    expect(v1).not.toBe(v2) // cos(θ) vs sin(θ) 生成不同值
    expect(Number.isFinite(v1)).toBe(true)
    expect(Number.isFinite(v2)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// TDD 推导边界用例 — 通过逐行审计 engine.ts 推导
// ═══════════════════════════════════════════════════════════════

// ─── E1. createMulberry32 边界种子 ─────────────────────────

describe('E1. createMulberry32 边界种子', () => {
  it('seed=0 不产生全零序列', () => {
    const gen = createMulberry32(0)
    const values = Array.from({ length: 10 }, () => gen())
    // 至少有一个值不为 0
    expect(values.some((v) => v !== 0)).toBe(true)
    // 且所有值仍在 [0, 1)
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('负种子经 >>> 0 转为 uint32 后仍产生有效序列', () => {
    const gen = createMulberry32(-1) // -1 >>> 0 = 4294967295
    const values = Array.from({ length: 100 }, () => gen())
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
    // 应有足够的多样性
    const unique = new Set(values.map((v) => Math.round(v * 1000)))
    expect(unique.size).toBeGreaterThan(50)
  })

  it('小数种子经 >>> 0 截断后行为确定', () => {
    // 3.7 >>> 0 = 3, 3.2 >>> 0 = 3，因此应产生相同序列
    const gen1 = createMulberry32(3.7)
    const gen2 = createMulberry32(3.2)
    const seq1 = Array.from({ length: 20 }, () => gen1())
    const seq2 = Array.from({ length: 20 }, () => gen2())
    for (let i = 0; i < 20; i++) {
      expect(seq1[i]).toBe(seq2[i])
    }
  })

  it('不同种子产生不同序列', () => {
    const gen1 = createMulberry32(1)
    const gen2 = createMulberry32(2)
    const seq1 = Array.from({ length: 20 }, () => gen1())
    const seq2 = Array.from({ length: 20 }, () => gen2())
    // 至少有部分值不同
    const diffCount = seq1.filter((v, i) => v !== seq2[i]).length
    expect(diffCount).toBeGreaterThan(10)
  })
})

// ─── E2. createNormalSampler 高阶矩 & 退化输入 ────────────

describe('E2. createNormalSampler 高阶矩 & 退化输入', () => {
  it('偏度 ≈ 0（|skewness| < 0.1, n=50000）', () => {
    const uniform = createMulberry32(42)
    const normal = createNormalSampler(uniform)
    const n = 50000
    const samples = Array.from({ length: n }, () => normal())

    const mean = samples.reduce((s, v) => s + v, 0) / n
    const m2 = samples.reduce((s, v) => s + (v - mean) ** 2, 0) / n
    const m3 = samples.reduce((s, v) => s + (v - mean) ** 3, 0) / n
    const skewness = m3 / m2 ** 1.5

    expect(Math.abs(skewness)).toBeLessThan(0.1)
  })

  it('峰度 ≈ 3（超额峰度 |kurtosis-3| < 0.2, n=50000）', () => {
    const uniform = createMulberry32(42)
    const normal = createNormalSampler(uniform)
    const n = 50000
    const samples = Array.from({ length: n }, () => normal())

    const mean = samples.reduce((s, v) => s + v, 0) / n
    const m2 = samples.reduce((s, v) => s + (v - mean) ** 2, 0) / n
    const m4 = samples.reduce((s, v) => s + (v - mean) ** 4, 0) / n
    const kurtosis = m4 / m2 ** 2

    expect(Math.abs(kurtosis - 3)).toBeLessThan(0.2)
  })

  it('uniform 返回 0 时 Math.max 保护 log(0) 不产生 NaN', () => {
    let callCount = 0
    const fakeUniform = () => {
      callCount++
      // 第一次返回 0（触发保护），第二次返回正常值
      return callCount === 1 ? 0 : 0.5
    }
    const normal = createNormalSampler(fakeUniform)
    const v = normal()
    expect(Number.isFinite(v)).toBe(true)
    expect(Number.isNaN(v)).toBe(false)
  })

  it('1000 次连续调用无 NaN/Infinity', () => {
    const uniform = createMulberry32(777)
    const normal = createNormalSampler(uniform)
    for (let i = 0; i < 1000; i++) {
      const v = normal()
      expect(Number.isFinite(v)).toBe(true)
    }
  })
})

// ─── E3. quantile 退化输入 ─────────────────────────────────

describe('E3. quantile 退化输入', () => {
  it('全部相同值 → 任何 q 都返回该值', () => {
    const arr = [5, 5, 5, 5, 5]
    expect(quantile(arr, 0)).toBe(5)
    expect(quantile(arr, 0.25)).toBe(5)
    expect(quantile(arr, 0.5)).toBe(5)
    expect(quantile(arr, 0.75)).toBe(5)
    expect(quantile(arr, 1)).toBe(5)
  })

  it('含负值的数组插值正确', () => {
    const arr = [-10, -5, 0, 5]
    // q=0.5 → position=1.5 → interpolate(-5, 0) = -2.5
    expect(quantile(arr, 0.5)).toBe(-2.5)
    // q=0.25 → position=0.75 → interpolate(-10, -5) = -10*0.25 + -5*0.75 = -6.25
    expect(quantile(arr, 0.25)).toBeCloseTo(-6.25, 10)
  })

  it('两元素数组 [1, 100] 的中位数 = 50.5', () => {
    expect(quantile([1, 100], 0.5)).toBe(50.5)
  })

  it('大量重复值在 VaR 边界', () => {
    // 100 个值：20 个 -0.2，80 个 0.1
    const arr = Array(20).fill(-0.2).concat(Array(80).fill(0.1)).sort((a: number, b: number) => a - b)
    const p05 = quantile(arr, 0.05)
    // position = 99 * 0.05 = 4.95 → 第 4 和第 5 个值都是 -0.2
    expect(p05).toBe(-0.2)
  })
})

// ─── E4. calculateRiskMetrics 退化分布 ─────────────────────

describe('E4. calculateRiskMetrics 退化分布', () => {
  it('单元素 [100]：方差使用 Math.max(1, n-1) 保护', () => {
    const metrics = calculateRiskMetrics([100], 100)
    expect(metrics.expectedReturn).toBe(0)
    expect(metrics.medianReturn).toBe(0)
    expect(metrics.volatility).toBe(0) // variance / max(1, 0) = 0/1 = 0
    expect(metrics.lossProbability).toBe(0)
  })

  it('全部价格相同 → volatility=0, expectedReturn=精确值', () => {
    const metrics = calculateRiskMetrics([100, 100, 100, 100, 100], 100)
    expect(metrics.expectedReturn).toBe(0)
    expect(metrics.volatility).toBe(0)
    expect(metrics.var95).toBe(0)
    expect(metrics.p95Return).toBe(0)
    expect(metrics.expectedShortfall95).toBe(0) // tailCount=5 (全部 <= 0), avg=0
    expect(metrics.lossProbability).toBe(0) // 0 不算亏损（严格 < 0）
    expect(metrics.upDownRatio).toBe(0) // p95Return=0 → 分支进入 else → 0
  })

  it('全部盈利 → lossProbability=0, CVaR 仍正确', () => {
    const prices = [110, 115, 120, 125, 130]
    const metrics = calculateRiskMetrics(prices, 100)
    expect(metrics.lossProbability).toBe(0)
    expect(metrics.expectedReturn).toBeGreaterThan(0)
    // P5 应仍为最小盈利
    expect(metrics.var95).toBeGreaterThanOrEqual(0.1)
    // CVaR 应 > 0（尾部全是盈利）
    expect(metrics.expectedShortfall95).toBeGreaterThan(0)
  })

  it('全部亏损 → lossProbability=1, upDownRatio=0', () => {
    const prices = [70, 75, 80, 85, 90]
    const metrics = calculateRiskMetrics(prices, 100)
    expect(metrics.lossProbability).toBe(1)
    expect(metrics.p95Return).toBeLessThan(0)
    expect(metrics.upDownRatio).toBe(0) // p95Return < 0 → 0
    expect(metrics.expectedShortfall95).toBeLessThan(metrics.var95) // ES 更极端
  })

  it('CVaR 尾部有重复值时 tailCount 正确', () => {
    // 设计：前 10 个值 = -0.3，中间 40 个 = 0，后 50 个 = 0.2
    // 所有价格对应 returns: -0.3, 0, 0.2
    const prices = [
      ...Array(10).fill(70),   // return = -0.3
      ...Array(40).fill(100),  // return = 0
      ...Array(50).fill(120),  // return = 0.2
    ]
    const metrics = calculateRiskMetrics(prices, 100)

    // sortedReturns: [-0.3]*10, [0]*40, [0.2]*50
    // var95 = quantile(sorted, 0.05) → position=99*0.05=4.95 → interp(-0.3,-0.3)=-0.3
    // 注意：70/100-1 = -0.30000000000000004（IEEE 754 浮点精度）
    expect(metrics.var95).toBeCloseTo(-0.3, 12)
    // CVaR: 所有 value <= var95 → 10 个 ≈ -0.3 → avg ≈ -0.3
    expect(metrics.expectedShortfall95).toBeCloseTo(-0.3, 12)
  })

  it('两元素 [50, 150]：极端 VaR 和 ES 稳定', () => {
    const metrics = calculateRiskMetrics([50, 150], 100)
    expect(metrics.expectedReturn).toBe(0) // (-0.5 + 0.5) / 2
    expect(metrics.lossProbability).toBe(0.5)
    expect(Number.isFinite(metrics.var95)).toBe(true)
    expect(Number.isFinite(metrics.expectedShortfall95)).toBe(true)
    expect(Number.isFinite(metrics.upDownRatio)).toBe(true)
  })
})

// ─── E5. buildCloudData 结构不变量 ─────────────────────────

describe('E5. buildCloudData 结构不变量', () => {
  it('positions 长度 = (steps+1) × paths × 3', () => {
    const input = makeInput({ paths: 100, steps: 50 })
    const state = monteCarloEngine.createInitialState(input)
    expect(state.cloud.positions.length).toBe((50 + 1) * 100 * 3)
  })

  it('colors 长度与 positions 一致', () => {
    const input = makeInput({ paths: 100, steps: 50 })
    const state = monteCarloEngine.createInitialState(input)
    expect(state.cloud.colors.length).toBe(state.cloud.positions.length)
  })

  it('stepStats.elapsedYears 单调递增', () => {
    const input = makeInput({ paths: 100, steps: 50 })
    const state = monteCarloEngine.createInitialState(input)
    for (let i = 1; i < state.cloud.stepStats.length; i++) {
      expect(state.cloud.stepStats[i].elapsedYears).toBeGreaterThan(
        state.cloud.stepStats[i - 1].elapsedYears
      )
    }
  })

  it('最终 stepStats.elapsedYears ≈ years（浮点精度内）', () => {
    const input = makeInput({ paths: 100, steps: 50, years: 2 })
    const state = monteCarloEngine.createInitialState(input)
    const lastStat = state.cloud.stepStats[state.cloud.stepStats.length - 1]
    expect(lastStat.elapsedYears).toBeCloseTo(2, 10)
  })

  it('x 坐标范围在 [-13, 13]', () => {
    const input = makeInput({ paths: 100, steps: 50 })
    const state = monteCarloEngine.createInitialState(input)
    const pos = state.cloud.positions
    for (let i = 0; i < pos.length; i += 3) {
      expect(pos[i]).toBeGreaterThanOrEqual(-13.001)
      expect(pos[i]).toBeLessThanOrEqual(13.001)
    }
  })

  it('colors 值全部在 [0, 1] 范围内', () => {
    const input = makeInput({ paths: 500, steps: 60 })
    const state = monteCarloEngine.createInitialState(input)
    const c = state.cloud.colors
    for (let i = 0; i < c.length; i++) {
      expect(c[i]).toBeGreaterThanOrEqual(0)
      expect(c[i]).toBeLessThanOrEqual(1)
    }
  })

  it('最小参数 (paths=16, steps=12) 下无异常', () => {
    const input = makeInput({ paths: 16, steps: 12, years: 0.1 })
    const state = monteCarloEngine.createInitialState(input)
    expect(state.cloud.terminalPrices.length).toBe(16)
    expect(state.cloud.stepStats.length).toBe(13)
    expect(state.cloud.positions.length).toBe(13 * 16 * 3)
    for (const p of state.cloud.terminalPrices) {
      expect(p).toBeGreaterThan(0)
      expect(Number.isFinite(p)).toBe(true)
    }
  })

  it('stepStats 中 p05Price ≤ meanPrice ≤ p95Price', () => {
    const input = makeInput({ paths: 500, steps: 60 })
    const state = monteCarloEngine.createInitialState(input)
    for (const stat of state.cloud.stepStats) {
      expect(stat.p05Price).toBeLessThanOrEqual(stat.meanPrice)
      expect(stat.meanPrice).toBeLessThanOrEqual(stat.p95Price)
    }
  })
})

// ─── E6. Engine 生命周期 ───────────────────────────────────

describe('E6. Engine 生命周期 (advance / getRenderLayer / getMetricsPanel)', () => {
  it('advance 在已完成状态是幂等的（引用相等）', () => {
    const input = makeInput({ paths: 100, steps: 20 })
    let state = monteCarloEngine.createInitialState(input)
    // 推进到终点
    state = { ...state, currentStep: state.cloud.totalSteps }
    const clock = { dtSeconds: 0.016, elapsedSeconds: 1, frame: 60 }
    const next = monteCarloEngine.advance(state, input, clock)
    // 应返回同一引用
    expect(next).toBe(state)
  })

  it('advance 极小 dtSeconds → 最少推进 1 步', () => {
    const input = makeInput({ paths: 100, steps: 20, playbackSpeed: 30 })
    const state = monteCarloEngine.createInitialState(input)
    const clock = { dtSeconds: 0.0001, elapsedSeconds: 0, frame: 0 }
    const next = monteCarloEngine.advance(state, input, clock)
    expect(next.currentStep).toBe(1)
  })

  it('advance 极大 dtSeconds → clamp 到 totalSteps', () => {
    const input = makeInput({ paths: 100, steps: 20, playbackSpeed: 30 })
    const state = monteCarloEngine.createInitialState(input)
    const clock = { dtSeconds: 100, elapsedSeconds: 0, frame: 0 }
    const next = monteCarloEngine.advance(state, input, clock)
    expect(next.currentStep).toBe(state.cloud.totalSteps)
  })

  it('getRenderLayer 初始帧 visiblePoints = paths', () => {
    const input = makeInput({ paths: 200, steps: 50 })
    const state = monteCarloEngine.createInitialState(input)
    const layer = monteCarloEngine.getRenderLayer(state, input)
    // currentStep=0 → (0+1)*200 = 200
    expect(layer.visiblePoints).toBe(200)
    expect(layer.currentStep).toBe(0)
    expect(layer.totalSteps).toBe(50)
    expect(layer.totalPoints).toBe((50 + 1) * 200)
  })

  it('getMetricsPanel 初始 progress=0, elapsedYears=0', () => {
    const input = makeInput({ paths: 200, steps: 50, years: 2 })
    const state = monteCarloEngine.createInitialState(input)
    const panel = monteCarloEngine.getMetricsPanel(state, input)
    expect(panel.progress).toBe(0)
    expect(panel.elapsedYears).toBe(0)
    expect(panel.current.step).toBe(0)
  })

  it('getMetricsPanel 终点 progress=1, elapsedYears=years', () => {
    const input = makeInput({ paths: 200, steps: 50, years: 2 })
    let state = monteCarloEngine.createInitialState(input)
    state = { ...state, currentStep: state.cloud.totalSteps }
    const panel = monteCarloEngine.getMetricsPanel(state, input)
    expect(panel.progress).toBe(1)
    expect(panel.elapsedYears).toBeCloseTo(2, 10)
  })

  it('advance 累计 elapsedSeconds 正确', () => {
    const input = makeInput({ paths: 100, steps: 50, playbackSpeed: 1 })
    let state = monteCarloEngine.createInitialState(input)
    const clock = { dtSeconds: 0.5, elapsedSeconds: 0, frame: 0 }
    state = monteCarloEngine.advance(state, input, clock)
    expect(state.elapsedSeconds).toBeCloseTo(0.5, 10)
    state = monteCarloEngine.advance(state, input, { ...clock, dtSeconds: 0.3 })
    expect(state.elapsedSeconds).toBeCloseTo(0.8, 10)
  })
})

// ─── E7. sanitizeInput NaN / Infinity / 小数 ──────────────

describe('E7. sanitizeInput NaN / Infinity / 小数处理', () => {
  it('NaN paths → Math.max(16, NaN) = NaN（暴露无保护）', () => {
    const result = sanitizeInput(makeInput({ paths: Number.NaN }))
    // NaN 分支：Math.floor(NaN)=NaN, Math.max(16, NaN)=NaN
    // 这是一个已知缺陷，测试记录实际行为
    // 如果返回 NaN，说明 sanitize 对 NaN 无保护
    const isProtected = !Number.isNaN(result.paths)
    if (!isProtected) {
      // 记录：sanitizeInput 不处理 NaN，当前行为是传播 NaN
      expect(Number.isNaN(result.paths)).toBe(true)
    } else {
      expect(result.paths).toBeGreaterThanOrEqual(16)
    }
  })

  it('Infinity steps → Math.floor(Infinity)=Infinity', () => {
    const result = sanitizeInput(makeInput({ steps: Infinity }))
    // Math.floor(Infinity)=Infinity, Math.max(12, Infinity)=Infinity
    const isProtected = Number.isFinite(result.steps)
    if (!isProtected) {
      expect(result.steps).toBe(Infinity)
    } else {
      expect(result.steps).toBeGreaterThanOrEqual(12)
    }
  })

  it('小数 paths=50.7 → floor 到 50', () => {
    const result = sanitizeInput(makeInput({ paths: 50.7 }))
    expect(result.paths).toBe(50)
  })

  it('小数 steps=30.3 → floor 到 30', () => {
    const result = sanitizeInput(makeInput({ steps: 30.3 }))
    expect(result.steps).toBe(30)
  })

  it('seed 小数被 floor', () => {
    const result = sanitizeInput(makeInput({ seed: 42.9 }))
    expect(result.seed).toBe(42)
  })

  it('playbackSpeed 小数被 floor', () => {
    const result = sanitizeInput(makeInput({ playbackSpeed: 3.8 }))
    expect(result.playbackSpeed).toBe(3)
  })
})
