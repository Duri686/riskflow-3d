import { useCallback, useMemo, useState } from 'react'
import {
  type KalmanFilterInput,
  type KalmanFilterResult,
  type KalmanPreset,
  KALMAN_PRESETS,
  defaultKalmanInput,
  runKalmanFilter,
} from './engine'

export function useKalmanSession() {
  const [input, setInput] = useState<KalmanFilterInput>(defaultKalmanInput)
  const [preset, setPreset] = useState<KalmanPreset>('balanced')
  const [dailyReturns, setDailyReturns] = useState<number[]>([])

  /** 滤波结果（输入或参数变化时自动重算） */
  const result = useMemo<KalmanFilterResult>(() => {
    if (dailyReturns.length < 2) {
      return { steps: [], currentVol: 0, maxVol: 0, minVol: 0, finalGain: 0 }
    }
    return runKalmanFilter(dailyReturns, input)
  }, [dailyReturns, input])

  /** 切换预设 */
  const applyPreset = useCallback((p: KalmanPreset) => {
    setPreset(p)
    const cfg = KALMAN_PRESETS[p]
    setInput({ processNoise: cfg.Q, measurementNoise: cfg.R })
  }, [])

  /** 手动调节 Q/R */
  const updateInput = useCallback((key: keyof KalmanFilterInput, value: number) => {
    setInput((prev) => ({ ...prev, [key]: value }))
    setPreset('balanced') // 手动调节后预设标记取消
  }, [])

  /** 从收盘价序列设置日收益率 */
  const setClosesData = useCallback((closes: number[]) => {
    if (closes.length < 2) {
      setDailyReturns([])
      return
    }
    const returns: number[] = []
    for (let i = 1; i < closes.length; i++) {
      const r = Math.log(closes[i] / closes[i - 1])
      if (Number.isFinite(r)) {
        returns.push(r)
      }
    }
    setDailyReturns(returns)
  }, [])

  return {
    input,
    preset,
    result,
    dailyReturns,
    applyPreset,
    updateInput,
    setClosesData,
  }
}
