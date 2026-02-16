/**
 * 卡尔曼滤波引擎 — 可决策级风控模块
 *
 * 状态空间模型：
 *   状态方程: σ²_t = σ²_{t-1} + w_t,   w_t ~ N(0, Q)
 *   观测方程: r²_t = σ²_t + v_t,        v_t ~ N(0, R)
 *
 * 其中：
 *   σ²_t = 隐藏的时变波动率（平方）
 *   r_t  = 日对数收益率
 *   Q    = 过程噪声，控制波动率被允许变化多快
 *   R    = 观测噪声，控制单日收益率平方有多不靠谱
 *
 * v2 升级：
 *   - EWMA 对比基准（快变量对照）
 *   - Regime 判定（low / medium / high）
 *   - RiskGate 风控闸门输出
 *   - Gain 诊断（响应性评估）
 */

import { TRADING_DAYS_PER_YEAR } from '../shared/constants'

// ── 类型定义 ──

export interface KalmanFilterInput {
  /** 过程噪声：状态变化速度（越大越灵敏） */
  processNoise: number
  /** 观测噪声：观测可靠度（越大越平滑） */
  measurementNoise: number
  /** EWMA span（日数），默认 20 */
  ewmaSpan?: number
  /** Regime 阈值覆盖 */
  regimeThresholds?: RegimeThresholds
}

export interface KalmanStep {
  /** 时间步索引 */
  t: number
  /** 观测值：日收益率平方 r²_t */
  observed: number
  /** 滤波估计：σ̂²_t */
  estimated: number
  /** 估计不确定性 P_t */
  errorCovariance: number
  /** 卡尔曼增益 K_t */
  kalmanGain: number
  /** 年化波动率 √(σ̂²_t × TRADING_DAYS_PER_YEAR) */
  annualizedVol: number
}

/** 波动率 Regime */
export type VolRegime = 'low' | 'medium' | 'high'

/** Regime 阈值（年化波动率） */
export interface RegimeThresholds {
  /** 低波动上界，默认 0.4 (40%) */
  low: number
  /** 高波动下界，默认 0.8 (80%) */
  high: number
}

/** EWMA 计算结果 */
export interface EWMAResult {
  /** 每步 EWMA 年化波动率 */
  values: number[]
  /** 最新 EWMA 年化波动率 */
  currentVol: number
}

/** Gain 诊断 */
export interface GainDiagnostic {
  /** Gain < 0.1 时为 true — 模型对新信息反应迟钝 */
  isLagging: boolean
  /** 响应性评级 */
  responsiveness: 'fast' | 'moderate' | 'slow'
}

/** 风险阶段（四象限） */
export type RiskPhase = 'rising' | 'falling' | 'shock' | 'stable'

/** 风险动量信号 — RiskGate v3 核心扩展 */
export interface RiskMomentum {
  /** Kalman Δ：最近 lookback 步的年化波动率变化量 */
  kalmanDelta: number
  /** EWMA / Kalman 收敛比 (> 1 = 发散, < 1 = 收敛) */
  convergenceRatio: number
  /** 综合风险阶段 */
  phase: RiskPhase
  /** 人类可读的风险方向描述 */
  phaseLabel: string
}

/** 风控闸门信号 */
export interface RiskGate {
  /** 当前 regime */
  regime: VolRegime
  /** 建议杠杆（归一化到 0.5–3x） */
  suggestedLeverage: number
  /** 建议止损宽度（年化 vol 的倍数比例） */
  suggestedStopWidth: number
  /** 是否允许趋势跟踪策略 */
  allowTrend: boolean
  /** 是否允许均值回归策略 */
  allowMeanRevert: boolean
  /** 是否强制 delta-neutral / 降杠杆 */
  forceNeutral: boolean
  /** 风险动量信号（v3 新增） */
  momentum: RiskMomentum
}

export interface KalmanFilterResult {
  steps: KalmanStep[]
  /** 当前（最新）年化波动率 */
  currentVol: number
  /** 历史最高年化波动率 */
  maxVol: number
  /** 历史最低年化波动率 */
  minVol: number
  /** 最终 Kalman Gain */
  finalGain: number

  // ── v2 新增 ──

  /** 当前 regime */
  regime: VolRegime
  /** 每步 regime 历史 */
  regimeHistory: VolRegime[]
  /** EWMA 对比基准 */
  ewma: EWMAResult
  /** Gain 诊断 */
  gainDiagnostic: GainDiagnostic
  /** 风控闸门信号 */
  riskGate: RiskGate
  /** 风险动量（顶层快捷引用 = riskGate.momentum） */
  momentum: RiskMomentum
}

// ── 预设参数 ──

export type KalmanPreset = 'track' | 'balanced' | 'smooth'

export const KALMAN_PRESETS: Record<KalmanPreset, { label: string; Q: number; R: number; desc: string }> = {
  track:    { label: '跟踪', Q: 0.00005, R: 0.00001, desc: '灵敏跟踪市场变化' },
  balanced: { label: '平衡', Q: 0.00001, R: 0.00005, desc: '兼顾响应与平滑' },
  smooth:   { label: '平滑', Q: 0.000001, R: 0.0001,  desc: '过滤短期噪声' },
}

export const DEFAULT_REGIME_THRESHOLDS: RegimeThresholds = {
  low: 0.4,   // 40%：结构性收敛 / 低风险窗口
  high: 0.8,  // 80%：事件驱动 / 去杠杆区
}

export const DEFAULT_EWMA_SPAN = 20

export const defaultKalmanInput: KalmanFilterInput = {
  processNoise: KALMAN_PRESETS.balanced.Q,
  measurementNoise: KALMAN_PRESETS.balanced.R,
  ewmaSpan: DEFAULT_EWMA_SPAN,
  regimeThresholds: DEFAULT_REGIME_THRESHOLDS,
}

// ── 辅助纯函数 ──

/**
 * EWMA 波动率计算
 * ewma_t = α × r²_t + (1-α) × ewma_{t-1}
 * α = 2 / (span + 1)
 *
 * 作为 Kalman 的"快变量对照"（short-term volatility proxy）
 */
export function computeEWMA(dailyReturns: number[], span: number): EWMAResult {
  if (dailyReturns.length < 2) {
    return { values: [], currentVol: 0 }
  }

  const alpha = 2 / (span + 1)
  const values: number[] = []

  // 初始化：用第一个观测的 r²
  let ewma = dailyReturns[0] * dailyReturns[0]

  for (let t = 0; t < dailyReturns.length; t++) {
    const rSq = dailyReturns[t] * dailyReturns[t]
    if (Number.isFinite(rSq)) {
      ewma = alpha * rSq + (1 - alpha) * ewma
    }
    // 年化
    values.push(Math.sqrt(Math.max(0, ewma) * TRADING_DAYS_PER_YEAR))
  }

  return {
    values,
    currentVol: values[values.length - 1],
  }
}

/** Regime 分类 — 纯阈值比较 */
export function classifyRegime(
  annualizedVol: number,
  thresholds: RegimeThresholds,
): VolRegime {
  if (annualizedVol < thresholds.low) return 'low'
  if (annualizedVol > thresholds.high) return 'high'
  return 'medium'
}

/** Gain 诊断 */
export function diagnoseGain(gain: number): GainDiagnostic {
  if (gain > 0.3) return { isLagging: false, responsiveness: 'fast' }
  if (gain > 0.1) return { isLagging: false, responsiveness: 'moderate' }
  return { isLagging: true, responsiveness: 'slow' }
}

// ── Phase 标签映射 ──
const PHASE_LABELS: Record<RiskPhase, string> = {
  rising: '风险上升',
  falling: '风险消退',
  shock: '事件余震',
  stable: '结构稳定',
}

/**
 * 风险动量计算
 *
 * 两个正交信号组合判定四象限：
 *   Kalman Δ  = 结构性风险趋势（慢变量 5 日差分）
 *   Convergence = EWMA / Kalman（快/慢变量发散度）
 *
 * 四象限规则：
 *   rising ⬆️  : Δ > 0 且 convergence > 1.2
 *   falling ⬇️ : Δ < 0 且 convergence < 0.9
 *   shock ⚡   : |Δ| < 阈值 但 convergence > 1.5（事件冲击余震）
 *   stable ◆   : 其余
 */
export function computeRiskMomentum(
  kalmanVols: number[],
  ewmaVols: number[],
  lookback = 5,
): RiskMomentum {
  const n = kalmanVols.length
  if (n < lookback + 1 || ewmaVols.length < 1) {
    return { kalmanDelta: 0, convergenceRatio: 1, phase: 'stable', phaseLabel: PHASE_LABELS.stable }
  }

  const currentKalman = kalmanVols[n - 1]
  const prevKalman = kalmanVols[n - 1 - lookback]
  const kalmanDelta = currentKalman - prevKalman

  const currentEwma = ewmaVols[ewmaVols.length - 1]
  const convergenceRatio = currentKalman > 0 ? currentEwma / currentKalman : 1

  // 四象限判定
  // Δ 阈值：年化 vol 的 2%（避免噪声触发）
  const deltaThreshold = 0.02
  let phase: RiskPhase

  if (Math.abs(kalmanDelta) < deltaThreshold && convergenceRatio > 1.5) {
    // Kalman 几乎没动，但 EWMA 远高于 Kalman → 事件冲击余震
    phase = 'shock'
  } else if (kalmanDelta > deltaThreshold && convergenceRatio > 1.2) {
    // 结构性上升 + EWMA 领先 Kalman → 风险加速
    phase = 'rising'
  } else if (kalmanDelta < -deltaThreshold && convergenceRatio < 0.9) {
    // 结构性下降 + EWMA 回落到 Kalman 之下 → 风险消退
    phase = 'falling'
  } else {
    phase = 'stable'
  }

  return {
    kalmanDelta,
    convergenceRatio,
    phase,
    phaseLabel: PHASE_LABELS[phase],
  }
}

/**
 * 风控闸门计算
 *
 * Regime → 策略允许/禁止
 * Vol → 杠杆/止损
 * Momentum → 方向性调整（v3 新增）
 */
export function computeRiskGate(
  annualizedVol: number,
  regime: VolRegime,
  momentum: RiskMomentum,
): RiskGate {
  // 杠杆：1/vol，归一化到 [0.5, 3]
  const rawLeverage = annualizedVol > 0 ? 1 / annualizedVol : 3
  let suggestedLeverage = Math.max(0.5, Math.min(3, rawLeverage))

  // 止损宽度：vol × 2（2倍标准差覆盖）
  const suggestedStopWidth = annualizedVol * 2

  // 基础策略许可（Regime 驱动）
  let allowTrend = regime === 'low'
  let allowMeanRevert = regime === 'medium'
  let forceNeutral = regime === 'high'

  // ── v3: Momentum 方向性修正 ──
  switch (momentum.phase) {
    case 'shock':
      // 余震期：无论 regime 如何，强制中性
      forceNeutral = true
      allowTrend = false
      allowMeanRevert = false
      suggestedLeverage = Math.min(suggestedLeverage, 1)
      break
    case 'rising':
      // 风险上升期：杠杆折扣 × 0.7
      suggestedLeverage *= 0.7
      suggestedLeverage = Math.max(0.5, suggestedLeverage)
      break
    case 'falling':
      // 风险消退期：开放均值回归窗口
      if (regime !== 'high') {
        allowMeanRevert = true
      }
      break
    // stable: 不做额外修正
  }

  return {
    regime,
    suggestedLeverage,
    suggestedStopWidth,
    allowTrend,
    allowMeanRevert,
    forceNeutral,
    momentum,
  }
}

// ── 空结果常量 ──

const EMPTY_MOMENTUM: RiskMomentum = {
  kalmanDelta: 0,
  convergenceRatio: 1,
  phase: 'stable',
  phaseLabel: PHASE_LABELS.stable,
}

const EMPTY_RESULT: KalmanFilterResult = {
  steps: [],
  currentVol: 0,
  maxVol: 0,
  minVol: 0,
  finalGain: 0,
  regime: 'low',
  regimeHistory: [],
  ewma: { values: [], currentVol: 0 },
  gainDiagnostic: { isLagging: false, responsiveness: 'moderate' },
  momentum: EMPTY_MOMENTUM,
  riskGate: {
    regime: 'low',
    suggestedLeverage: 3,
    suggestedStopWidth: 0,
    allowTrend: true,
    allowMeanRevert: false,
    forceNeutral: false,
    momentum: EMPTY_MOMENTUM,
  },
}

// ── 核心滤波函数 ──

/**
 * 执行卡尔曼滤波 + EWMA + Regime + RiskGate
 * @param dailyReturns 日对数收益率数组
 * @param input Q/R 参数 + EWMA/Regime 配置
 */
export function runKalmanFilter(
  dailyReturns: number[],
  input: KalmanFilterInput,
): KalmanFilterResult {
  const { processNoise: Q, measurementNoise: R } = input
  const thresholds = input.regimeThresholds ?? DEFAULT_REGIME_THRESHOLDS
  const ewmaSpan = input.ewmaSpan ?? DEFAULT_EWMA_SPAN

  if (dailyReturns.length < 2) {
    return EMPTY_RESULT
  }

  // ── 并行计算 EWMA ──
  const ewma = computeEWMA(dailyReturns, ewmaSpan)

  // ── Kalman 初始状态：用前 20 个有效观测估计初始波动率 ──
  const initWindow = Math.min(20, dailyReturns.length)
  let sum = 0
  let validCount = 0
  for (let i = 0; i < initWindow; i++) {
    const sq = dailyReturns[i] * dailyReturns[i]
    if (Number.isFinite(sq)) {
      sum += sq
      validCount++
    }
  }
  let x = validCount > 0 ? sum / validCount : 1e-10 // 初始状态估计 σ̂²_0
  let P = x * 0.5                                    // 初始不确定性

  const steps: KalmanStep[] = []
  const regimeHistory: VolRegime[] = []
  let maxVol = 0
  let minVol = Number.POSITIVE_INFINITY

  for (let t = 0; t < dailyReturns.length; t++) {
    const observation = dailyReturns[t] * dailyReturns[t] // r²_t

    // 防护：跳过无效观测（NaN / Infinity），保持上一步状态
    if (!Number.isFinite(observation)) {
      const annualizedVol = Math.sqrt(x * TRADING_DAYS_PER_YEAR)
      if (annualizedVol > maxVol) maxVol = annualizedVol
      if (annualizedVol < minVol) minVol = annualizedVol
      regimeHistory.push(classifyRegime(annualizedVol, thresholds))
      steps.push({
        t,
        observed: 0,
        estimated: x,
        errorCovariance: P,
        kalmanGain: 0,
        annualizedVol,
      })
      continue
    }

    // ── 预测步骤 ──
    const xPred = x           // 随机游走：预测 = 上一步估计
    const PPred = P + Q       // 预测不确定性

    // ── 更新步骤 ──
    const K = PPred / (PPred + R) // Kalman Gain
    x = xPred + K * (observation - xPred) // 状态更新
    P = (1 - K) * PPred       // 不确定性更新

    // 确保非负
    x = Math.max(x, 1e-10)
    P = Math.max(P, 1e-12)

    const annualizedVol = Math.sqrt(x * TRADING_DAYS_PER_YEAR)

    if (annualizedVol > maxVol) maxVol = annualizedVol
    if (annualizedVol < minVol) minVol = annualizedVol

    regimeHistory.push(classifyRegime(annualizedVol, thresholds))

    steps.push({
      t,
      observed: observation,
      estimated: x,
      errorCovariance: P,
      kalmanGain: K,
      annualizedVol,
    })
  }

  const last = steps[steps.length - 1]
  const currentVol = last.annualizedVol
  const finalGain = last.kalmanGain
  const regime = regimeHistory[regimeHistory.length - 1]

    const momentum = computeRiskMomentum(
      steps.map(s => s.annualizedVol),
      ewma.values,
    )

    return {
    steps,
    currentVol,
    maxVol,
    minVol,
    finalGain,
    regime,
    regimeHistory,
    ewma,
    gainDiagnostic: diagnoseGain(finalGain),
    momentum,
    riskGate: computeRiskGate(currentVol, regime, momentum),
  }
}
