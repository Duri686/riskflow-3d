# RiskFlow 3D - 统一可视化引擎接口

## 设计目标
统一算法演示接入方式，避免每个 Demo 重复实现状态机与渲染桥接。

## 抽象接口
见代码：`src/engine/types.ts`

```ts
interface VisualizationEngine<TInput, TState, TRenderLayer, TMetricsPanel> {
  id: string
  displayName: string
  createInitialState(input: TInput): TState
  advance(state: TState, input: TInput, clock: EngineClock): TState
  getRenderLayer(state: TState, input: TInput): TRenderLayer
  getMetricsPanel(state: TState, input: TInput): TMetricsPanel
}
```

## 四层职责拆分
1. **算法输入层（Input）**
   - 管理参数面板输入与边界校验。
   - 示例：Monte Carlo 的路径数、波动率、漂移率。

2. **时间步推进层（advance）**
   - 按帧/按时间推进模拟状态。
   - 支持暂停、继续、重置。

3. **渲染层（RenderLayer）**
   - 从算法状态提取前端渲染所需数据（位置、颜色、可见点数等）。
   - 该层不处理业务含义，只描述“如何画”。

4. **指标面板层（MetricsPanel）**
   - 从算法状态提取统计指标。
   - 与渲染层解耦，方便替换不同 UI 组件。

## 实施策略
- 首个实现：`src/algorithms/monteCarlo.ts`。
- 后续算法（Black-Scholes / Markowitz / Kalman）按相同接口接入。
- UI 层只依赖统一接口，不感知具体算法内部结构。
