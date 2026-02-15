# Markowitz 投资组合优化

> 状态：WIP

## 待实现文件

按照 Monte Carlo 模块的结构，需要创建：

- `engine.ts` — 纯计算（有效前沿、权重优化）
- `useSession.ts` — React 会话 hook
- `Scene.tsx` — 3D 有效前沿可视化
- `ParamsPanel.tsx` — 参数面板（资产、约束条件、无风险利率）
- `MetricsPanel.tsx` — 指标展示（Sharpe、最小方差点等）

## 核心指标

- 最小方差组合
- 最大 Sharpe 组合
- 权重分布
