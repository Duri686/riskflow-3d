# RiskFlow 3D 页面信息架构与状态模型（V1）

## 1. 文档目标

本设计用于指导 `RiskFlow 3D` 的页面层实现，聚焦以下范围：

- 算法大厅（Hub）与统一工作台（Lab）的页面布局。
- 多算法切换交互与状态恢复策略。
- 可复用组件清单与状态模型（先不展开具体算法面板细节）。

本版基于当前已确认决策：

- 入口先到算法选择大厅。
- 工作台采用左侧算法导航 + 中央 3D 舞台 + 右侧信息栏。
- 算法切换后恢复该算法上次进度（而非每次重置）。

## 2. 信息架构（IA）

### 2.1 路由结构

- `/`：Algorithm Hub（算法选择大厅）
- `/lab/:algorithmId`：Unified Lab（统一工作台）

推荐首批 `algorithmId`：

- `monte-carlo`
- `black-scholes`
- `markowitz`
- `kalman-filter`

### 2.2 页面职责

- Hub：只负责算法发现与进入，不承载复杂运行交互。
- Lab：承载统一运行交互（播放、暂停、重置、参数和指标展示）。

## 3. 页面布局

### 3.1 Hub（算法大厅）

布局分区：

1. 顶部标题区：项目定位、阶段说明、进入 Lab 的引导。
2. 算法卡片网格：每张卡展示算法名、场景、状态（`Ready/WIP`）。
3. 快速入口：最近访问算法（Recent）和默认推荐算法（Monte Carlo）。

交互规则：

- 点击卡片进入 `/lab/:algorithmId`。
- `WIP` 卡片允许进入，但在 Lab 中显示占位内容而不是报错页。

### 3.2 Lab（统一工作台）

布局采用四区结构：

1. Top Bar（64px）
2. Left Nav（260px）
3. Center Stage（自适应，优先最大）
4. Right Panel（320px，可折叠）
5. Bottom Timeline（40px，可开关）

简版线框：

```text
[Top Bar.........................................................]
[Algo Nav][                 3D Stage                 ][Right Panel]
[Algo Nav][                 3D Stage                 ][Right Panel]
[Algo Nav][                 3D Stage                 ][Right Panel]
[Timeline........................................................]
```

## 4. 组件清单（不含算法内部实现）

### 4.1 Hub 组件

- `HubPage`
- `HubHeader`
- `AlgorithmCardGrid`
- `AlgorithmCard`
- `RecentAlgorithms`

### 4.2 Lab 组件

- `LabPage`
- `LabTopBar`
- `AlgorithmNav`
- `StageViewport`
- `RightPanelShell`
- `TimelineBar`

### 4.3 Right Panel 占位模块（V1）

- `PanelSection`（可折叠容器）
- `ParametersPanelPlaceholder`
- `MetricsPanelPlaceholder`
- `NotesPanelPlaceholder`

### 4.4 算法适配层组件

- `AlgorithmSceneHost`：根据 `algorithmId` 挂载对应 3D Scene。
- `AlgorithmPanelHost`：根据 `algorithmId` 挂载对应参数/指标面板。
- `WipAlgorithmFallback`：`WIP` 算法统一占位。

## 5. 状态模型

### 5.1 分层原则

- `GlobalState`：跨算法共享的 UI 状态。
- `AlgorithmSessionState`：按 `algorithmId` 持久化算法会话。
- `RuntimeState`：当前正在播放的瞬时状态（可从 session 派生）。

### 5.2 建议类型定义（草案）

```ts
type AlgorithmId = 'monte-carlo' | 'black-scholes' | 'markowitz' | 'kalman-filter'

type AlgorithmStatus = 'ready' | 'wip'

interface GlobalState {
  rightPanelCollapsed: boolean
  timelineVisible: boolean
  theme: 'dark' | 'light'
  locale: 'zh-CN' | 'en-US'
  recentAlgorithms: AlgorithmId[]
}

interface PlaybackState {
  isPlaying: boolean
  progress: number // 0..1
  step: number
  speed: number
}

interface CameraState {
  position: [number, number, number]
  target: [number, number, number]
  zoom?: number
}

interface AlgorithmSessionState<TParams = Record<string, number | string | boolean>> {
  algorithmId: AlgorithmId
  params: TParams
  playback: PlaybackState
  camera: CameraState
  rightPanelSections: {
    parametersOpen: boolean
    metricsOpen: boolean
    notesOpen: boolean
  }
  updatedAt: number
}

interface AppState {
  global: GlobalState
  sessions: Partial<Record<AlgorithmId, AlgorithmSessionState>>
}
```

## 6. 多算法切换规则（核心）

切换触发点：

- 左侧导航点击算法项。
- Hub 卡片进入 Lab。
- 快捷键 `Cmd/Ctrl + 1..4`。

切换流程：

1. 保存当前算法会话快照（`params/playback/camera/rightPanelSections`）。
2. 路由切换到目标 `algorithmId`。
3. 若存在目标会话快照则恢复；否则加载默认模板。
4. 主舞台执行 100-150ms 淡入过渡。
5. 首次恢复时显示一次性提示：`已恢复上次状态`。

重置规则：

- `Reset` 仅重置当前算法会话。
- 不修改其他算法会话与全局布局状态。

## 7. WIP 算法占位策略

`WIP` 算法进入 Lab 后：

- 中央区域：显示统一占位场景（网格 + 标题 + 进度文案）。
- 右侧区域：显示占位参数和预期指标列表（只读）。
- 顶部状态条：标注 `WIP`，并给出预计接入顺序。

目标是维持统一导航体验，不让用户“走死路”。

## 8. URL 与深链接策略

- Lab 页面使用 `:algorithmId` 做深链接，便于演示与分享。
- 可追加查询参数用于后续扩展（V2）：
  - `?preset=high-vol`
  - `?autoplay=1`
  - `?panel=metrics`

V1 不强制实现参数透传，只需保证路由稳定。

## 9. 实施阶段建议

### Phase A（页面骨架）

- 建立 `HubPage` 与 `LabPage` 路由。
- 落地 Top/Left/Center/Right/Bottom 五区布局。
- 把现有 Monte Carlo 页面逻辑迁移到 `AlgorithmSceneHost` 下。

### Phase B（会话状态）

- 实现 `sessions[algorithmId]` 存取。
- 完成切换恢复与当前算法重置规则。
- 添加最近访问算法列表。

### Phase C（WIP 与可扩展）

- 加入 WIP fallback。
- 预留 Right Panel 占位模块接口。
- 接入快捷键与轻量切换动效。

## 10. 验收标准（V1）

- 可以从 Hub 进入任一算法路由。
- 在 Lab 左侧切换算法时状态能按算法恢复。
- `Reset` 仅影响当前算法。
- `WIP` 算法可进入且有统一占位体验。
- 布局在桌面端可稳定展示（左中右结构完整）。
