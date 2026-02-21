# AGENTS.md - RiskFlow 3D 开发指南

## 项目概述

RiskFlow 3D 是一个金融风险可视化 Web 应用，使用 React + TypeScript + Three.js (react-three-fiber) 构建 Monte Carlo、Kalman Filter、Black-Scholes、Markowitz 等金融算法引擎的 3D 可视化。

## 技术栈

- **前端框架**: React 19 + TypeScript 5.9
- **构建工具**: Vite 7
- **3D 渲染**: Three.js + @react-three/fiber + @react-three/drei
- **样式**: Tailwind CSS 4
- **测试**: Vitest 4
- **代码质量**: ESLint 9

---

## 开发命令

### 基础命令

```bash
# 开发服务器 (热重载)
npm run dev

# 生产构建
npm run build

# 本地预览生产构建
npm run preview

# 运行 lint 检查
npm run lint
```

### 测试命令

```bash
# 运行所有测试 (一次性)
npm run test

# 监听模式 (文件变更自动重跑)
npm run test:watch

# 运行单个测试文件
npx vitest run src/algorithms/monte-carlo/engine.test.ts

# 运行单个测试用例 (按名称过滤)
npx vitest run -t "固定种子复现性"

# 运行指定目录的所有测试
npx vitest run src/algorithms/monte-carlo/
```

---

## 代码风格规范

### 1. TypeScript 严格模式

项目启用 `strict: true`，所有 TypeScript 规则必须遵守：

- 禁止 `any` 类型（除非类型无法推断）
- 禁止 `@ts-ignore`、`@ts-expect-error`
- 必须显式声明函数返回值类型（除非 `void` 或类型明显）
- 接口/类型优先使用 type 别名

### 2. 导入规范

```typescript
// ✅ 正确：使用路径别名 @/
import { monteCarloEngine } from '@/algorithms/monte-carlo/engine'
import type { MonteCarloInput } from '@/algorithms/monte-carlo/engine'

// ✅ 正确：同模块的 type 和 value 分离导入
import { calculateRiskMetrics } from './engine'
import type { MonteCarloInput } from './engine'

// ❌ 错误：混用类型和值导入
import { calculateRiskMetrics, type MonteCarloInput } from './engine'
```

### 3. 组件规范

```typescript
// ✅ 函数组件使用 arrow function
export const ErrorBoundary = ({ children }: { children: ReactNode }) => {
  return <>{children}</>
}

// ✅ 复杂组件使用 class component (如 ErrorBoundary)
export class ErrorBoundary extends Component<Props, State> {
  // ...
}
```

### 4. 命名约定

- **文件**: PascalCase (如 `MonteCarloEngine.tsx`)
- **组件**: PascalCase
- **函数/变量**: camelCase
- **常量**: UPPER_SNAKE_CASE
- **接口/类型**: PascalCase，前缀 `I` 仅在语义必需时使用

### 5. Tailwind CSS

- 使用 Tailwind 4 语法
- 自定义颜色前缀 `rf-` (如 `bg-rf-bg)
- 使用 @apply 抽取重复样式到 CSS 文件
- 响应式断点: 默认移动优先

### 6. 错误处理

- 捕获并记录所有异步操作错误
- 使用 ErrorBoundary 包裹可能崩溃的组件树
- 生产环境不暴露敏感错误信息到 UI
- 日志格式: `[ComponentName] 错误描述: {error}`

### 7. 测试规范

```typescript
// 测试文件命名: *.test.ts
// 辅助函数放在测试文件顶部

/** 构造测试参数的辅助函数 */
const makeInput = (overrides: Partial<MonteCarloInput> = {}): MonteCarloInput => ({
  paths: 5000,
  steps: 252,
  // ...
  ...overrides,
})

describe('模块名', () => {
  describe('子场景', () => {
    it('期望行为描述', () => {
      // given / when / then 结构
      const result = calculateSomething()
      expect(result).toBe(42)
    })
  })
})
```

### 8. 路径别名配置

```json
// tsconfig.app.json
{
  "paths": {
    "@/*": ["src/*"]
  }
}
```

所有 `src/` 内的导入必须使用 `@/` 前缀。

---

## 目录结构

```
src/
├── algorithms/           # 金融算法引擎
│   ├── monte-carlo/      # Monte Carlo GBM
│   ├── kalman-filter/    # Kalman Filter
│   ├── black-scholes/    # Black-Scholes
│   ├── markowitz/        # Markowitz 组合优化
│   └── shared/           # 共享常量/工具
├── components/           # React 组件
├── pages/               # 页面组件
├── hooks/               # 自定义 Hooks
├── engine/              # 3D 渲染引擎
├── data/                # 静态数据
└── assets/              # 静态资源
```

---

## 常用开发模式

### 3D 场景开发

```typescript
// 使用 @react-three/fiber 创建 3D 场景
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'

<Canvas>
  <PerspectiveCamera makeDefault position={[0, 0, 10]} />
  <OrbitControls />
  <YourScene />
</Canvas>
```

### 金融算法状态管理

```typescript
// 算法状态通常包含: input, cloud, currentStep
interface EngineState {
  input: MonteCarloInput
  cloud: CloudData
  currentStep: number
  elapsedSeconds: number
}
```

---

## Git 提交规范

使用 conventional commits:

- `feat:` 新功能
- `fix:` Bug 修复
- `refactor:` 代码重构
- `test:` 添加/修改测试
- `docs:` 文档更新
- `chore:` 构建/工具链变更

---

## 性能注意事项

- 3D 渲染使用 requestAnimationFrame 节流
- 大数据量使用 Web Worker 离线计算
- 测试用例需覆盖边界条件和数值稳定性
- Monte Carlo 等随机算法需验证分布一致性
