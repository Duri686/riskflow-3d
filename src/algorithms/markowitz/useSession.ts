import { useCallback, useMemo, useState } from "react"
import {
  MARKOWITZ_ASSETS,
  defaultMarkowitzInput,
  markowitzEngine,
  rebalanceWeights,
  sanitizeMarkowitzInput,
  type MarkowitzInput,
  type MarkowitzMetricsPanel,
  type MarkowitzRenderLayer,
  type MarkowitzState,
} from "./engine"

export type MarkowitzPreset = "equal" | "growth" | "defensive" | "risk-balance"

const PRESET_WEIGHTS: Record<MarkowitzPreset, number[]> = {
  equal: [0.25, 0.25, 0.25, 0.25],
  growth: [0.42, 0.33, 0.15, 0.1],
  defensive: [0.09, 0.13, 0.36, 0.42],
  "risk-balance": [0.14, 0.16, 0.3, 0.4],
}

export function useMarkowitzSession() {
  const [input, setInput] = useState<MarkowitzInput>(defaultMarkowitzInput)

  const state = useMemo<MarkowitzState>(
    () => markowitzEngine.createInitialState(input),
    [input],
  )

  const renderLayer = useMemo<MarkowitzRenderLayer>(
    () => markowitzEngine.getRenderLayer(state, input),
    [state, input],
  )

  const metrics = useMemo<MarkowitzMetricsPanel>(
    () => markowitzEngine.getMetricsPanel(state, input),
    [state, input],
  )

  const updateInput = useCallback((key: keyof MarkowitzInput, value: number) => {
    setInput((previous) => {
      const nextInput: MarkowitzInput = {
        ...previous,
        [key]: value,
      }
      return sanitizeMarkowitzInput(nextInput)
    })
  }, [])

  const updateWeight = useCallback((index: number, value: number) => {
    setInput((previous) => {
      const nextWeights = rebalanceWeights(
        previous.weights,
        index,
        value,
        previous.maxWeight,
      )

      return sanitizeMarkowitzInput({
        ...previous,
        weights: nextWeights,
      })
    })
  }, [])

  const applyPreset = useCallback((preset: MarkowitzPreset) => {
    setInput((previous) =>
      sanitizeMarkowitzInput({
        ...previous,
        weights: PRESET_WEIGHTS[preset],
      }),
    )
  }, [])

  const randomizeCloud = useCallback(() => {
    setInput((previous) =>
      sanitizeMarkowitzInput({
        ...previous,
        seed: previous.seed + 1,
      }),
    )
  }, [])

  const resetDefaults = useCallback(() => {
    setInput(defaultMarkowitzInput)
  }, [])

  return useMemo(
    () => ({
      assets: MARKOWITZ_ASSETS,
      input,
      state,
      renderLayer,
      metrics,
      updateInput,
      updateWeight,
      applyPreset,
      randomizeCloud,
      resetDefaults,
    }),
    [
      input,
      state,
      renderLayer,
      metrics,
      updateInput,
      updateWeight,
      applyPreset,
      randomizeCloud,
      resetDefaults,
    ],
  )
}

export type MarkowitzSession = ReturnType<typeof useMarkowitzSession>
