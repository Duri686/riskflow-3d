/**
 * Risk Snapshot Export — 风险状态快照导出
 *
 * 将当前 Kalman/EWMA/Regime/RiskGate 的完整计算结果，
 * 以稳定、可版本化的 JSON Schema 输出。
 *
 * 定位：纯计算结果快照（状态），非 UI / 非完整历史序列。
 * 消费方：策略系统、回测引擎、审计日志、自动化风控。
 *
 * Schema 版本：risk_snapshot.v1（冻结）
 *
 * ── 治理规则 ──
 * momentum 是信号（signal），不是指令（directive）。
 * risk_gate.strategy_bias 由 RiskGate 综合裁决（regime × stability × momentum），
 * 因此 momentum.direction="up" 不等于 strategy_bias="aggressive"。
 * 下游消费方不应将 momentum 直接映射为交易动作。
 */

import { TRADING_DAYS_PER_YEAR } from '../shared/constants'
import type {
  KalmanFilterInput,
  KalmanFilterResult,
  KalmanPreset,
  VolRegime,
} from './engine'
import { DEFAULT_EWMA_SPAN, DEFAULT_REGIME_THRESHOLDS } from './engine'

// ── Schema 类型定义 ──

export interface RiskSnapshotV1 {
  schema_version: 'risk_snapshot.v1'
  generated_at: string

  /** 引擎标识 — 拆分为三层，防止多引擎并存时语义漂移 */
  engine: {
    /** 平台名 */
    name: 'riskflow'
    /** 波动率模型 */
    volatility_model: 'kalman'
    /** Schema 兼容版本 */
    version: '1.0.0'
  }

  asset: {
    /** 交易对标识（如 "BTC/USDT"） */
    symbol: string
    market_type: 'crypto'
    exchange: 'binance'
  }

  window: {
    /** 数据回溯天数 */
    lookback_days: number
    /** 实际数据点数（日收益率条数） */
    data_points: number
    /** 年化交易日数 */
    trading_days_per_year: number
  }

  parameters: {
    /** 当前预设模式 */
    kalman_mode: KalmanPreset
    /** EWMA 窗口 */
    ewma_span: number
    /**
     * Regime 分类阈值 — 显式闭区间定义
     * 消除隐含假设，使快照脱离代码仍可自解释
     */
    regime_thresholds: {
      low: { max: number }
      medium: { min: number; max: number }
      high: { min: number }
    }
  }

  risk_snapshot: {
    volatility: {
      /** Kalman 年化波动率（0–1） */
      kalman_sigma: number
      /** EWMA 年化波动率（0–1） */
      ewma_sigma: number
      /**
       * Kalman Gain — 滤波器对新数据的响应权重
       * 高 → 快速响应新波动率；低 → 平滑稳定
       */
      kalman_gain: {
        value: number
        interpretation: 'higher means faster reaction to new volatility'
      }
    }
    regime: {
      /** 当前 regime：low | medium | high */
      level: VolRegime
      /**
       * 状态稳定度（stability）
       * ⚠️ 这不是"模型置信度"，而是"当前 regime 维持的稳定程度"
       */
      stability: {
        /** 一致性比例（0–1） */
        value: number
        /** 计算窗口长度 */
        window: number
        /** 字段语义定义（含低值解读） */
        definition: 'fraction of last N steps with same regime; low value indicates regime transition or choppiness'
      }
    }
    momentum: {
      /** Kalman Δ 百分比变化 */
      kalman_delta_pct: number
      /** 风险方向：up | down | flat */
      direction: 'up' | 'down' | 'flat'
      /** 风险阶段：rising | falling | shock | stable */
      phase: string
      /** EWMA / Kalman 收敛比 */
      convergence_ratio: number
    }
    risk_gate: {
      /** 风控状态：open | restricted */
      status: 'open' | 'restricted'
      /** 最大仓位比例（0–1） */
      position_cap: number
      /** 杠杆上限 */
      leverage_cap: number
      /** 是否允许加仓 */
      add_position_allowed: boolean
      /** 策略偏好：aggressive | neutral | defensive */
      strategy_bias: 'aggressive' | 'neutral' | 'defensive'
      /**
       * 决策依据 — 人类可读的裁决来源
       * 用于审计复盘，不参与计算
       * 例：["regime=medium", "stability=0.3", "momentum=up"]
       */
      basis: string[]
    }
  }
}

// ── 资产元数据 ──

export interface AssetMeta {
  /** Binance symbol（如 "BTCUSDT"） */
  symbol: string
  /** 用户选择的回溯天数 */
  lookbackDays: number
}

// ── 辅助映射 ──

const SYMBOL_DISPLAY: Record<string, string> = {
  BTCUSDT: 'BTC/USDT',
  ETHUSDT: 'ETH/USDT',
  BNBUSDT: 'BNB/USDT',
  SOLUSDT: 'SOL/USDT',
  XRPUSDT: 'XRP/USDT',
  ADAUSDT: 'ADA/USDT',
  DOGEUSDT: 'DOGE/USDT',
  TRXUSDT: 'TRX/USDT',
  AVAXUSDT: 'AVAX/USDT',
  LINKUSDT: 'LINK/USDT',
  DOTUSDT: 'DOT/USDT',
  MATICUSDT: 'MATIC/USDT',
  SHIBUSDT: 'SHIB/USDT',
  LTCUSDT: 'LTC/USDT',
  BCHUSDT: 'BCH/USDT',
  ATOMUSDT: 'ATOM/USDT',
  UNIUSDT: 'UNI/USDT',
  NEARUSDT: 'NEAR/USDT',
  APTUSDT: 'APT/USDT',
  SUIUSDT: 'SUI/USDT',
}

/** Regime 稳定度窗口 */
const STABILITY_WINDOW = 20

// ── 核心构建函数 ──

/**
 * 构建 Risk Snapshot v1 JSON 对象
 *
 * 纯函数，无副作用。输入完全来自引擎计算结果和用户参数。
 */
export function buildRiskSnapshot(
  result: KalmanFilterResult,
  input: KalmanFilterInput,
  preset: KalmanPreset,
  assetMeta: AssetMeta,
): RiskSnapshotV1 {
  const { regime, momentum, riskGate } = result

  // ── regime 稳定度：最近 N 步 regime 一致性 ──
  const history = result.regimeHistory
  const windowSize = Math.min(STABILITY_WINDOW, history.length)
  let matchCount = 0
  if (windowSize > 0) {
    const currentRegime = history[history.length - 1]
    for (let i = history.length - windowSize; i < history.length; i++) {
      if (history[i] === currentRegime) matchCount++
    }
  }
  const stability = windowSize > 0 ? matchCount / windowSize : 0

  // ── momentum direction ──
  const deltaThreshold = 0.02
  const direction: 'up' | 'down' | 'flat' =
    momentum.kalmanDelta > deltaThreshold ? 'up'
    : momentum.kalmanDelta < -deltaThreshold ? 'down'
    : 'flat'

  // ── risk_gate.status ──
  const status: 'open' | 'restricted' = riskGate.forceNeutral ? 'restricted' : 'open'

  // ── position_cap：杠杆归一化到 0–1 ──
  const positionCap = Math.min(1, Math.max(0, riskGate.suggestedLeverage / 3))

  // ── strategy_bias ──
  const strategyBias: 'aggressive' | 'neutral' | 'defensive' =
    riskGate.forceNeutral ? 'defensive'
    : riskGate.allowTrend ? 'aggressive'
    : 'neutral'

  // ── add_position_allowed ──
  const addPositionAllowed = !riskGate.forceNeutral && regime !== 'high'

  // ── 决策依据（审计用） ──
  const basis: string[] = [
    `regime=${regime}`,
    `stability=${stability.toFixed(2)}`,
    `momentum=${momentum.phase}`,
  ]
  if (riskGate.forceNeutral) basis.push('force_neutral=true')
  if (momentum.phase === 'shock') basis.push('shock_override')

  const lowThreshold = input.regimeThresholds?.low ?? DEFAULT_REGIME_THRESHOLDS.low
  const highThreshold = input.regimeThresholds?.high ?? DEFAULT_REGIME_THRESHOLDS.high

  return {
    schema_version: 'risk_snapshot.v1',
    generated_at: new Date().toISOString(),
    engine: {
      name: 'riskflow',
      volatility_model: 'kalman',
      version: '1.0.0',
    },

    asset: {
      symbol: SYMBOL_DISPLAY[assetMeta.symbol] ?? assetMeta.symbol,
      market_type: 'crypto',
      exchange: 'binance',
    },

    window: {
      lookback_days: assetMeta.lookbackDays,
      data_points: result.steps.length,
      trading_days_per_year: TRADING_DAYS_PER_YEAR,
    },

    parameters: {
      kalman_mode: preset,
      ewma_span: input.ewmaSpan ?? DEFAULT_EWMA_SPAN,
      regime_thresholds: {
        low: { max: lowThreshold },
        medium: { min: lowThreshold, max: highThreshold },
        high: { min: highThreshold },
      },
    },

    risk_snapshot: {
      volatility: {
        kalman_sigma: Number(result.currentVol.toFixed(4)),
        ewma_sigma: Number(result.ewma.currentVol.toFixed(4)),
        kalman_gain: {
          value: Number(result.finalGain.toFixed(4)),
          interpretation: 'higher means faster reaction to new volatility',
        },
      },
      regime: {
        level: regime,
        stability: {
          value: Number(stability.toFixed(3)),
          window: windowSize,
          definition: 'fraction of last N steps with same regime; low value indicates regime transition or choppiness',
        },
      },
      momentum: {
        kalman_delta_pct: Number(momentum.kalmanDelta.toFixed(4)),
        direction,
        phase: momentum.phase,
        convergence_ratio: Number(momentum.convergenceRatio.toFixed(3)),
      },
      risk_gate: {
        status,
        position_cap: Number(positionCap.toFixed(3)),
        leverage_cap: Number(riskGate.suggestedLeverage.toFixed(2)),
        add_position_allowed: addPositionAllowed,
        strategy_bias: strategyBias,
        basis,
      },
    },
  }
}

// ── 浏览器下载辅助 ──

/**
 * 触发 JSON 文件下载
 *
 * 优先使用 File System Access API（原生保存对话框），
 * 不支持时降级为 data URI anchor 方案。
 *
 * 文件名格式：risk_snapshot_{symbol}_{YYYYMMDD_HHmmss}.json
 */
export async function downloadSnapshot(snapshot: RiskSnapshotV1): Promise<void> {
  const json = JSON.stringify(snapshot, null, 2)

  const symbol = snapshot.asset.symbol.replace('/', '-')
  const d = new Date(snapshot.generated_at)
  const pad = (n: number) => String(n).padStart(2, '0')
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  const filename = `risk_snapshot_${symbol}_${ts}.json`

  // ── 方案 1：File System Access API（原生保存对话框） ──
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] },
        }],
      })
      const writable = await handle.createWritable()
      await writable.write(json)
      await writable.close()
      return
    } catch (e) {
      // 用户取消保存
      if ((e as Error).name === 'AbortError') return
    }
  }

  // ── 方案 2：降级 — data URI anchor ──
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`
  const a = document.createElement('a')
  a.href = dataUri
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
