/**
 * 卡尔曼滤波引擎 — TDD 反向/对抗性测试
 *
 * 目标：通过"反向推理"设计用例，逼出 engine.ts 中的潜在 bug。
 * 每个用例都附带"为什么可能出错"的推理链。
 *
 * 覆盖维度：
 * 1. 基础正确性（收敛、复现性）
 * 2. 初始化双重计数问题
 * 3. 退化输入（全零、极端值）
 * 4. NaN/Infinity 传播
 * 5. Kalman Gain 有界性
 * 6. 长序列数值稳定性
 * 7. 公式验证
 */

import { describe, expect, it } from 'vitest'

import {
  runKalmanFilter,
  defaultKalmanInput,
  KALMAN_PRESETS,
  type KalmanFilterInput,
  type KalmanFilterResult,
} from './engine'
import { TRADING_DAYS_PER_YEAR } from '../shared/constants'

// ─── 辅助函数 ────────────────────────────────────────────────

/** 生成常数波动率的日收益率序列：r_t ~ "固定值" */
const makeConstantReturns = (value: number, count: number): number[] =>
  Array(count).fill(value)

/** 生成阶跃信号：前 n1 步 return=v1，后 n2 步 return=v2 */
const makeStepReturns = (v1: number, n1: number, v2: number, n2: number): number[] => [
  ...Array(n1).fill(v1),
  ...Array(n2).fill(v2),
]

/** 辅助：相对误差 */
const relErr = (actual: number, expected: number): number =>
  Math.abs(actual - expected) / Math.max(Math.abs(expected), 1e-12)

// ═══════════════════════════════════════════════════════════════
// T1. 基础正确性 — 已知常数方差信号应收敛
// ═══════════════════════════════════════════════════════════════

describe('T1. 常数方差信号收敛性', () => {
  it('所有 return 相同时，滤波估计应收敛到 r² 附近', () => {
    // 推理：如果 dailyReturns 全部 = 0.01，则 r² = 0.0001
    // 滤波器应在足够步数后收敛到 estimated ≈ 0.0001
    const r = 0.01
    const returns = makeConstantReturns(r, 200)
    const result = runKalmanFilter(returns, defaultKalmanInput)

    const expectedVariance = r * r // 0.0001
    const lastStep = result.steps[result.steps.length - 1]

    // 收敛后估计值应在 ±50% 以内（Kalman 滤波存在滞后）
    expect(relErr(lastStep.estimated, expectedVariance)).toBeLessThan(0.5)
    // 年化波动率 ≈ √(0.0001 × TRADING_DAYS_PER_YEAR)
    expect(relErr(lastStep.annualizedVol, Math.sqrt(expectedVariance * TRADING_DAYS_PER_YEAR))).toBeLessThan(0.5)
  })
})

// ═══════════════════════════════════════════════════════════════
// T2. 复现性 — 同一输入两次调用结果完全一致
// ═══════════════════════════════════════════════════════════════

describe('T2. 确定性复现', () => {
  it('同一输入两次调用，结果逐步完全一致', () => {
    const returns = [0.01, -0.02, 0.015, -0.005, 0.03, -0.01, 0.008, -0.012, 0.02, -0.025]
    const result1 = runKalmanFilter(returns, defaultKalmanInput)
    const result2 = runKalmanFilter(returns, defaultKalmanInput)

    expect(result1.steps.length).toBe(result2.steps.length)
    for (let i = 0; i < result1.steps.length; i++) {
      expect(result1.steps[i].estimated).toBe(result2.steps[i].estimated)
      expect(result1.steps[i].kalmanGain).toBe(result2.steps[i].kalmanGain)
      expect(result1.steps[i].errorCovariance).toBe(result2.steps[i].errorCovariance)
      expect(result1.steps[i].annualizedVol).toBe(result2.steps[i].annualizedVol)
    }
    expect(result1.currentVol).toBe(result2.currentVol)
    expect(result1.maxVol).toBe(result2.maxVol)
    expect(result1.minVol).toBe(result2.minVol)
    expect(result1.finalGain).toBe(result2.finalGain)
  })
})

// ═══════════════════════════════════════════════════════════════
// T3. 🔴 阶跃信号 — 暴露初始化"双重计数"问题
// ═══════════════════════════════════════════════════════════════

describe('T3. 阶跃信号跟踪（双重计数检测）', () => {
  it('前20步低波动 → 后30步高波动：滤波器应在后半段跟踪到高波动', () => {
    // 推理：初始化用前 20 个 return 计算 x，得到低波动初始估计。
    // 然后主循环从 t=0 重新处理所有数据，前 20 步又"加强"了低波动估计。
    // 如果双重计数严重，滤波器到第 30 步仍会停在低波动区间。
    const lowReturn = 0.001  // r² = 0.000001（极低波动）
    const highReturn = 0.05  // r² = 0.0025（高波动）
    const returns = makeStepReturns(lowReturn, 20, highReturn, 30)

    const input: KalmanFilterInput = {
      processNoise: 0.0001,   // Q 较大 → 灵敏跟踪
      measurementNoise: 0.00005,
    }
    const result = runKalmanFilter(returns, input)

    const highVariance = highReturn * highReturn // 0.0025
    // 最后 5 步的平均估计应接近高波动方差
    const lastFiveEstimates = result.steps.slice(-5).map((s) => s.estimated)
    const avgEstimate = lastFiveEstimates.reduce((s, v) => s + v, 0) / lastFiveEstimates.length

    // 放宽到 80% 内：如果双重计数导致严重滞后，这里会 FAIL
    expect(relErr(avgEstimate, highVariance)).toBeLessThan(0.8)
  })
})

// ═══════════════════════════════════════════════════════════════
// T4. 全零输入
// ═══════════════════════════════════════════════════════════════

describe('T4. 全零 dailyReturns', () => {
  it('全零输入不应产生 NaN 或 Infinity', () => {
    // 推理：x=0 → clamped to 1e-10, P=0*0.5=0 → clamped to 1e-12
    // 所有观测=0，滤波器应保持极小估计
    const returns = makeConstantReturns(0, 50)
    const result = runKalmanFilter(returns, defaultKalmanInput)

    expect(result.steps.length).toBe(50)
    for (const step of result.steps) {
      expect(Number.isFinite(step.estimated)).toBe(true)
      expect(Number.isFinite(step.kalmanGain)).toBe(true)
      expect(Number.isFinite(step.errorCovariance)).toBe(true)
      expect(Number.isFinite(step.annualizedVol)).toBe(true)
      expect(step.estimated).toBeGreaterThan(0)
    }
    // 年化波动率应极小
    expect(result.currentVol).toBeLessThan(0.01)
    expect(Number.isFinite(result.currentVol)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// T5. 🔴 NaN 注入 — 检测是否传播
// ═══════════════════════════════════════════════════════════════

describe('T5. NaN 输入传播检测', () => {
  it('dailyReturns 中包含 NaN 时，后续输出是否被污染', () => {
    // 推理：NaN * NaN = NaN，observation = NaN
    // x = xPred + K * (NaN - xPred) = NaN
    // 此后所有步骤都是 NaN — 代码没有保护
    const returns = [0.01, 0.02, NaN, 0.01, 0.02]
    const result = runKalmanFilter(returns, defaultKalmanInput)

    // 🎯 这是反向测试：我们预期 NaN 会传播（因为代码没有防护）
    // 如果这个测试 PASS，说明 NaN 确实传播了 → 代码有 bug，需要修复
    // 如果这个测试 FAIL，说明代码已经处理了 NaN → 没有 bug
    const stepsAfterNaN = result.steps.slice(2) // 从 NaN 开始
    const hasNaN = stepsAfterNaN.some((s) =>
      Number.isNaN(s.estimated) || Number.isNaN(s.annualizedVol)
    )

    // 断言：NaN 不应传播（理想行为）
    // 如果 FAIL → 代码需要增加 NaN 防护
    expect(hasNaN).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// T6. Infinity 注入
// ═══════════════════════════════════════════════════════════════

describe('T6. Infinity 输入传播检测', () => {
  it('dailyReturns 中包含 Infinity 时，后续输出是否被污染', () => {
    // 推理：Infinity² = Infinity → observation = Infinity
    // x = xPred + K * (Infinity - xPred) = Infinity
    const returns = [0.01, 0.02, Infinity, 0.01, 0.02]
    const result = runKalmanFilter(returns, defaultKalmanInput)

    const stepsAfterInf = result.steps.slice(2)
    const hasInfOrNaN = stepsAfterInf.some((s) =>
      !Number.isFinite(s.estimated) || !Number.isFinite(s.annualizedVol)
    )

    // 断言：Infinity 不应传播
    // 如果 FAIL → 代码需要增加边界值防护
    expect(hasInfOrNaN).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// T7. Flash Crash — 单次极端异常值后恢复
// ═══════════════════════════════════════════════════════════════

describe('T7. Flash Crash 恢复', () => {
  it('平稳序列中注入一个极端值后，滤波器应逐步恢复', () => {
    // 推理：正常 r=0.01，突然出现 r=0.5（极端闪崩）
    // 滤波器应在后续步骤回到正常水平，而不是永久偏移
    const normal = makeConstantReturns(0.01, 50)
    normal[25] = 0.5 // 在第 25 步注入极端值

    const result = runKalmanFilter(normal, defaultKalmanInput)

    // 极端值前后的估计
    const beforeCrash = result.steps[24].estimated
    const atCrash = result.steps[25].estimated
    const afterRecovery = result.steps[49].estimated

    // 闪崩时估计应显著升高
    expect(atCrash).toBeGreaterThan(beforeCrash)
    // 恢复后应接近闪崩前的水平（而非永久偏移到闪崩水平）
    expect(afterRecovery).toBeLessThan(atCrash * 0.5) // 至少恢复一半
  })
})

// ═══════════════════════════════════════════════════════════════
// T8. Kalman Gain 有界性
// ═══════════════════════════════════════════════════════════════

describe('T8. Kalman Gain 有界性', () => {
  it('所有步骤的 Kalman Gain 应在 (0, 1) 范围内', () => {
    const returns = [0.01, -0.02, 0.015, -0.005, 0.03, -0.01, 0.008, -0.012, 0.02, -0.025,
      0.005, 0.012, -0.008, 0.018, -0.003, 0.025, -0.015, 0.009, -0.02, 0.011]
    const result = runKalmanFilter(returns, defaultKalmanInput)

    for (const step of result.steps) {
      expect(step.kalmanGain).toBeGreaterThan(0)
      expect(step.kalmanGain).toBeLessThan(1)
    }
  })

  it('Q 极大时 K → 1 但不超过 1', () => {
    const returns = makeConstantReturns(0.01, 30)
    const result = runKalmanFilter(returns, {
      processNoise: 1000,    // Q 极大
      measurementNoise: 0.00001,
    })

    for (const step of result.steps) {
      expect(step.kalmanGain).toBeLessThanOrEqual(1)
      expect(step.kalmanGain).toBeGreaterThan(0.99) // 应非常接近 1
    }
  })

  it('R 极大时 K → 0 但仍正', () => {
    const returns = makeConstantReturns(0.01, 30)
    const result = runKalmanFilter(returns, {
      processNoise: 0.000001,
      measurementNoise: 1000,  // R 极大
    })

    for (const step of result.steps) {
      expect(step.kalmanGain).toBeGreaterThan(0)
      expect(step.kalmanGain).toBeLessThan(0.01) // 应非常接近 0
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// T9. Q/R 边界值
// ═══════════════════════════════════════════════════════════════

describe('T9. Q/R 极端边界', () => {
  it('Q=0, R>0 时不应崩溃', () => {
    // Q=0 → PPred = P + 0 = P → 完全不允许状态变化
    const returns = makeConstantReturns(0.01, 30)
    const result = runKalmanFilter(returns, {
      processNoise: 0,
      measurementNoise: 0.0001,
    })

    expect(result.steps.length).toBe(30)
    for (const step of result.steps) {
      expect(Number.isFinite(step.estimated)).toBe(true)
      expect(Number.isFinite(step.kalmanGain)).toBe(true)
    }
  })

  it('R=0, Q>0 时不应除零', () => {
    // R=0 → K = PPred / (PPred + 0) = 1 → 完全相信观测
    // 但触发 PPred/(PPred + 0)，如果 PPred=0 可能有问题
    const returns = makeConstantReturns(0.01, 30)
    const result = runKalmanFilter(returns, {
      processNoise: 0.0001,
      measurementNoise: 0,  // R=0 → 可能除零？
    })

    expect(result.steps.length).toBe(30)
    for (const step of result.steps) {
      expect(Number.isFinite(step.estimated)).toBe(true)
      // K = PPred / (PPred + 0) = 1
      expect(step.kalmanGain).toBe(1)
    }
  })

  it('Q=0 且 R=0 时不应产生 NaN', () => {
    // PPred = P + 0 = P, K = P / (P + 0) = 1 (如果 P>0)
    // 但 P = (1-1)*PPred = 0 → 下一步 PPred = 0 + 0 = 0
    // K = 0 / (0 + 0) = 0/0 = NaN → 🔴 潜在 bug!
    const returns = makeConstantReturns(0.01, 30)
    const result = runKalmanFilter(returns, {
      processNoise: 0,
      measurementNoise: 0,
    })

    expect(result.steps.length).toBe(30)
    for (const step of result.steps) {
      expect(Number.isNaN(step.kalmanGain)).toBe(false)
      expect(Number.isNaN(step.estimated)).toBe(false)
      expect(Number.isFinite(step.annualizedVol)).toBe(true)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// T10. 长序列数值稳定性
// ═══════════════════════════════════════════════════════════════

describe('T10. 长序列数值稳定性', () => {
  it('10000 步后 P 和 estimated 不退化到 0 也不爆炸', () => {
    const returns = Array.from({ length: 10000 }, (_, i) =>
      0.01 * Math.sin(i * 0.1) + 0.005  // 简单正弦波动
    )
    const result = runKalmanFilter(returns, defaultKalmanInput)

    expect(result.steps.length).toBe(10000)

    const lastStep = result.steps[result.steps.length - 1]
    expect(lastStep.estimated).toBeGreaterThan(1e-10)
    expect(lastStep.estimated).toBeLessThan(1)
    expect(lastStep.errorCovariance).toBeGreaterThan(1e-12)
    expect(lastStep.errorCovariance).toBeLessThan(1)
    expect(Number.isFinite(lastStep.annualizedVol)).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// T11. 最小有效输入
// ═══════════════════════════════════════════════════════════════

describe('T11. 边界：最小输入', () => {
  it('2 元素 dailyReturns 应正常工作', () => {
    const result = runKalmanFilter([0.01, -0.02], defaultKalmanInput)

    expect(result.steps.length).toBe(2)
    expect(Number.isFinite(result.currentVol)).toBe(true)
    expect(result.currentVol).toBeGreaterThan(0)
    expect(result.maxVol).toBeGreaterThanOrEqual(result.minVol)
  })

  it('3 元素 dailyReturns 应正常工作', () => {
    const result = runKalmanFilter([0.01, -0.02, 0.015], defaultKalmanInput)

    expect(result.steps.length).toBe(3)
    expect(Number.isFinite(result.currentVol)).toBe(true)
    expect(result.finalGain).toBeGreaterThan(0)
    expect(result.finalGain).toBeLessThan(1)
  })
})

// ═══════════════════════════════════════════════════════════════
// T12. 空/单元素 → 早期返回
// ═══════════════════════════════════════════════════════════════

describe('T12. 边界：不足 2 个元素', () => {
  it('空数组返回 steps=[], currentVol=0', () => {
    const result = runKalmanFilter([], defaultKalmanInput)
    expect(result.steps).toEqual([])
    expect(result.currentVol).toBe(0)
    expect(result.maxVol).toBe(0)
    expect(result.minVol).toBe(0)
    expect(result.finalGain).toBe(0)
  })

  it('单元素返回 steps=[], currentVol=0', () => {
    const result = runKalmanFilter([0.01], defaultKalmanInput)
    expect(result.steps).toEqual([])
    expect(result.currentVol).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// T13. 公式验证：annualizedVol = √(estimated × TRADING_DAYS_PER_YEAR)
// ═══════════════════════════════════════════════════════════════

describe('T13. annualizedVol 公式验证', () => {
  it('每一步的 annualizedVol 应精确等于 √(estimated × TRADING_DAYS_PER_YEAR)', () => {
    const returns = [0.01, -0.02, 0.015, -0.005, 0.03, -0.01, 0.008, -0.012, 0.02, -0.025]
    const result = runKalmanFilter(returns, defaultKalmanInput)

    for (const step of result.steps) {
      const expected = Math.sqrt(step.estimated * TRADING_DAYS_PER_YEAR)
      expect(step.annualizedVol).toBeCloseTo(expected, 12)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// T14. 预设参数合法性
// ═══════════════════════════════════════════════════════════════

describe('T14. 预设参数合法性', () => {
  it('所有预设的 Q 和 R 都 > 0', () => {
    for (const [name, preset] of Object.entries(KALMAN_PRESETS)) {
      expect(preset.Q).toBeGreaterThan(0)
      expect(preset.R).toBeGreaterThan(0)
      expect(preset.label.length).toBeGreaterThan(0)
      expect(preset.desc.length).toBeGreaterThan(0)
    }
  })

  it('默认参数与 balanced 预设一致', () => {
    expect(defaultKalmanInput.processNoise).toBe(KALMAN_PRESETS.balanced.Q)
    expect(defaultKalmanInput.measurementNoise).toBe(KALMAN_PRESETS.balanced.R)
  })

  it('所有预设参数运行不崩溃', () => {
    const returns = makeConstantReturns(0.01, 100)
    for (const [, preset] of Object.entries(KALMAN_PRESETS)) {
      const result = runKalmanFilter(returns, {
        processNoise: preset.Q,
        measurementNoise: preset.R,
      })
      expect(result.steps.length).toBe(100)
      expect(Number.isFinite(result.currentVol)).toBe(true)
    }
  })
})

// ═══════════════════════════════════════════════════════════════
// T15. 结果一致性：maxVol / minVol / finalGain
// ═══════════════════════════════════════════════════════════════

describe('T15. 结果统计字段一致性', () => {
  it('maxVol 是所有步骤中的最大 annualizedVol', () => {
    const returns = [0.01, -0.02, 0.015, -0.005, 0.03, -0.01, 0.008, -0.012, 0.02, -0.025]
    const result = runKalmanFilter(returns, defaultKalmanInput)

    const maxFromSteps = Math.max(...result.steps.map((s) => s.annualizedVol))
    expect(result.maxVol).toBe(maxFromSteps)
  })

  it('minVol 是所有步骤中的最小 annualizedVol', () => {
    const returns = [0.01, -0.02, 0.015, -0.005, 0.03, -0.01, 0.008, -0.012, 0.02, -0.025]
    const result = runKalmanFilter(returns, defaultKalmanInput)

    const minFromSteps = Math.min(...result.steps.map((s) => s.annualizedVol))
    expect(result.minVol).toBe(minFromSteps)
  })

  it('finalGain 等于最后一步的 kalmanGain', () => {
    const returns = [0.01, -0.02, 0.015, -0.005, 0.03, -0.01, 0.008, -0.012, 0.02, -0.025]
    const result = runKalmanFilter(returns, defaultKalmanInput)

    expect(result.finalGain).toBe(result.steps[result.steps.length - 1].kalmanGain)
  })

  it('currentVol 等于最后一步的 annualizedVol', () => {
    const returns = [0.01, -0.02, 0.015, -0.005, 0.03, -0.01, 0.008, -0.012, 0.02, -0.025]
    const result = runKalmanFilter(returns, defaultKalmanInput)

    expect(result.currentVol).toBe(result.steps[result.steps.length - 1].annualizedVol)
  })
})
