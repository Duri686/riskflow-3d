# 卡尔曼滤波 状态估计

> 状态：WIP

## 待实现文件

按照 Monte Carlo 模块的结构，需要创建：

- `engine.ts` — 纯计算（状态预测、更新、滤波）
- `useSession.ts` — React 会话 hook
- `Scene.tsx` — 观测与估计轨迹 3D 可视化
- `ParamsPanel.tsx` — 参数面板（状态转移、观测矩阵、噪声参数）
- `MetricsPanel.tsx` — 指标展示（滤波误差、残差、置信区间）

## 核心指标

- 滤波误差
- 残差
- 置信区间
