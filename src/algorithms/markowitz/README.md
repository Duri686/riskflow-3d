# Markowitz 投资组合优化

> 状态：READY

## 已实现文件

- `engine.ts` - 组合收益/波动率计算、随机组合采样、有效前沿近似
- `useSession.ts` - 会话状态管理、权重重平衡、预设策略
- `Scene.tsx` - 3D 前沿与组合点云可视化
- `ParamsPanel.tsx` - 权重、无风险利率、约束与采样参数控制
- `MetricsPanel.tsx` - 当前组合、最小方差点、最大 Sharpe 点与分散化指标

## 核心指标

- 最小方差组合 (Global Minimum Variance)
- 最大 Sharpe 组合 (Tangency Portfolio)
- 当前组合收益/波动率/Sharpe
- 权重分布与有效资产数
