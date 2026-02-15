/**
 * 卡尔曼滤波引擎 — 波动率状态估计
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
 */

// ── 类型定义 ──

export interface KalmanFilterInput {
  /** 过程噪声：状态变化速度（越大越灵敏） */
  processNoise: number
  /** 观测噪声：观测可靠度（越大越平滑） */
  measurementNoise: number
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
  /** 年化波动率 √(σ̂²_t × 252) */
  annualizedVol: number
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
}

// ── 预设参数 ──

export type KalmanPreset = 'track' | 'balanced' | 'smooth'

export const KALMAN_PRESETS: Record<KalmanPreset, { label: string; Q: number; R: number; desc: string }> = {
  track:    { label: '跟踪', Q: 0.00005, R: 0.00001, desc: '灵敏跟踪市场变化' },
  balanced: { label: '平衡', Q: 0.00001, R: 0.00005, desc: '兼顾响应与平滑' },
  smooth:   { label: '平滑', Q: 0.000001, R: 0.0001,  desc: '过滤短期噪声' },
}

export const defaultKalmanInput: KalmanFilterInput = {
  processNoise: KALMAN_PRESETS.balanced.Q,
  measurementNoise: KALMAN_PRESETS.balanced.R,
}

// ── 核心滤波函数 ──

/**
 * 执行卡尔曼滤波
 * @param dailyReturns 日对数收益率数组
 * @param input Q/R 参数
 */
export function runKalmanFilter(
  dailyReturns: number[],
  input: KalmanFilterInput,
): KalmanFilterResult {
  const { processNoise: Q, measurementNoise: R } = input

  if (dailyReturns.length < 2) {
    return { steps: [], currentVol: 0, maxVol: 0, minVol: 0, finalGain: 0 }
  }

  // 初始状态：用前 20 个观测估计初始波动率
  const initWindow = Math.min(20, dailyReturns.length)
  let sum = 0
  for (let i = 0; i < initWindow; i++) {
    sum += dailyReturns[i] * dailyReturns[i]
  }
  let x = sum / initWindow // 初始状态估计 σ̂²_0
  let P = x * 0.5          // 初始不确定性

  const steps: KalmanStep[] = []
  let maxVol = 0
  let minVol = Number.POSITIVE_INFINITY

  for (let t = 0; t < dailyReturns.length; t++) {
    const observation = dailyReturns[t] * dailyReturns[t] // r²_t

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

    const annualizedVol = Math.sqrt(x * 252)

    if (annualizedVol > maxVol) maxVol = annualizedVol
    if (annualizedVol < minVol) minVol = annualizedVol

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

  return {
    steps,
    currentVol: last.annualizedVol,
    maxVol,
    minVol,
    finalGain: last.kalmanGain,
  }
}
