# Black-Scholes 期权定价

> 状态：WIP

## 待实现文件

按照 Monte Carlo 模块的结构，需要创建：

- `engine.ts` — 纯计算（期权定价曲面、Greeks）
- `useSession.ts` — React 会话 hook
- `Scene.tsx` — 3D 期权价格曲面
- `ParamsPanel.tsx` — 参数面板（S, K, r, σ, T, 期权类型）
- `MetricsPanel.tsx` — Greeks 指标展示

## 核心指标

- 期权价格
- Delta, Gamma, Vega, Theta, Rho
