export interface EngineClock {
  dtSeconds: number
  elapsedSeconds: number
  frame: number
}

export interface VisualizationEngine<TInput, TState, TRenderLayer, TMetricsPanel> {
  id: string
  displayName: string
  createInitialState: (input: TInput) => TState
  advance: (state: TState, input: TInput, clock: EngineClock) => TState
  getRenderLayer: (state: TState, input: TInput) => TRenderLayer
  getMetricsPanel: (state: TState, input: TInput) => TMetricsPanel
}
