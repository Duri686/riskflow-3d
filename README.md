# RiskFlow 3D

RiskFlow 3D 是一个开源项目，目标是将金融量化算法以可交互的 3D 方式可视化，帮助学习者和开发者直观理解算法中的路径演化、风险分布和参数敏感性。

项目风格参考 Three.js 路径可视化体验，技术实现基于 React + Three.js (R3F)。

## Why This Project

- 降低量化算法理解门槛：从公式推导转向可视化认知。
- 统一算法演示接口：减少每个 Demo 的重复接入成本。
- 面向教学和开源协作：方便逐步扩展算法库与交互方式。

## Current Status

当前仓库处于 **初始化阶段（Phase 1 起步）**，已完成：

- 工程基础：Vite + React + TypeScript + ESLint。
- 统一引擎接口定义：`src/engine/types.ts`。
- Monte Carlo 核心模拟引擎（GBM 路径云 + 风险指标）：`src/algorithms/monteCarlo.ts`。
- 3D 路径点云场景组件：`src/components/PathCloudScene.tsx`。
- 首个可交互 Demo 页面：参数滑杆、播放控制、实时指标、进度展示（`src/App.tsx`）。
- 阶段文档沉淀：`docs/phase-1-algorithm-scope.md`、`docs/visualization-engine-interface.md`。

当前仍待完成：

- Black-Scholes / Markowitz / Kalman Filter 的可视化接入。
- 多算法导航与统一 Demo 容器（当前主要是 Monte Carlo 单页）。
- 测试体系、性能优化与文档完善。

## Phase-1 算法范围（冻结）

1. Monte Carlo（已实现首个 Demo）
2. Black-Scholes
3. Markowitz
4. Kalman Filter

详细说明见：

- `docs/phase-1-algorithm-scope.md`
- `docs/visualization-engine-interface.md`

## 统一引擎接口

核心接口位于：`src/engine/types.ts`

目标是标准化四层能力：

1. 算法输入
2. 时间步推进
3. 渲染层数据提取
4. 指标面板数据提取

## 已完成 Demo

### Monte Carlo Path Cloud

- 路径云 3D 可视化
- 参数滑块（路径数、步数、漂移率、波动率、期限、播放速度）
- 实时统计（均值、分位数、VaR95、ES95、亏损概率）

## Tech Stack

- Vite + React + TypeScript
- Three.js（通过 `@react-three/fiber` + `@react-three/drei`）

## Getting Started

```bash
npm install
npm run dev
```

## Available Scripts

- `npm run dev`: 本地开发
- `npm run build`: TypeScript 编译 + 生产构建
- `npm run preview`: 预览构建产物
- `npm run lint`: 代码检查

## Project Structure

```text
riskflow-3d/
├─ docs/
│  ├─ phase-1-algorithm-scope.md
│  └─ visualization-engine-interface.md
├─ src/
│  ├─ algorithms/
│  │  └─ monteCarlo.ts
│  ├─ components/
│  │  └─ PathCloudScene.tsx
│  ├─ engine/
│  │  └─ types.ts
│  ├─ App.tsx
│  └─ main.tsx
└─ package.json
```

## Roadmap (Short Term)

1. 抽象 Demo 页面结构，支持多算法切换。
2. 接入 Black-Scholes 与 Markowitz 的首版可视化。
3. 接入 Kalman Filter 演示，补齐 Phase 1 范围。
4. 增加基础测试与性能基线（渲染帧率、路径规模上限）。

## Contributing

欢迎通过 Issue / PR 参与：

- 新增算法可视化 Demo
- 优化渲染性能与交互体验
- 补充测试、文档与示例数据

## License

暂未指定许可证。项目对外发布前建议补充 `LICENSE`（如 MIT）。
