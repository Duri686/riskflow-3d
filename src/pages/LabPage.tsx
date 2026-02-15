import { useEffect, useMemo } from "react";
import {
	ALGORITHM_CATALOG,
	ALGORITHM_SHORTCUTS,
	type AlgorithmId,
	getAlgorithmMeta,
} from "../algorithms/registry";
import { MonteCarloMetrics } from "../algorithms/monte-carlo/MetricsPanel";
import { MonteCarloParamsPanel } from "../algorithms/monte-carlo/ParamsPanel";
import { MonteCarloScene } from "../algorithms/monte-carlo/Scene";
import { useMonteCarloSession } from "../algorithms/monte-carlo/useSession";
import { RiskFlowLogo, MaterialIcon } from "../components/Logo";
import { PanelSection } from "../components/PanelSection";
import { WipFallback } from "../components/WipFallback";
import { useLabStore } from "../store/useLabStore";
import {
	DEFAULT_PANEL_SECTIONS,
	type PanelSectionsState,
} from "../store/types";

const ALGORITHM_SUBTITLES: Record<AlgorithmId, string> = {
	"monte-carlo": "STOCHASTIC // SIMULATION",
	"black-scholes": "PRICING // OPTIONS",
	markowitz: "FRONTIER // OPTIMIZATION",
	"kalman-filter": "SIGNAL // PROCESSING",
};

export function LabPage() {
	const {
		globalUi,
		getSession,
		markRecent,
		resetSession,
		upsertSession,
		navigateToLab,
		navigateToHub,
	} = useLabStore();

	const algorithmId: AlgorithmId = globalUi.currentAlgorithmId;

	const monteCarlo = useMonteCarloSession();
	const { restoreSession, getSnapshot } = monteCarlo;
	const activeSession = getSession(algorithmId);
	const panelSections: PanelSectionsState =
		activeSession?.panelSections ?? DEFAULT_PANEL_SECTIONS;
	const currentMeta = getAlgorithmMeta(algorithmId);
	const isMonteCarlo = algorithmId === "monte-carlo";
	const timelineProgress = isMonteCarlo ? monteCarlo.metrics.progress : 0;

	useEffect(() => {
		markRecent(algorithmId);
	}, [algorithmId, markRecent]);

	useEffect(() => {
		if (algorithmId !== "monte-carlo") return;
		restoreSession(activeSession?.monteCarlo);
		return () => {
			upsertSession(algorithmId, {
				monteCarlo: getSnapshot(),
			});
		};
	}, [
		algorithmId,
		activeSession?.monteCarlo,
		upsertSession,
		restoreSession,
		getSnapshot,
	]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (!event.metaKey && !event.ctrlKey) return;
			const targetAlgorithmId = ALGORITHM_SHORTCUTS[event.key];
			if (!targetAlgorithmId) return;
			event.preventDefault();
			navigateToLab(targetAlgorithmId);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [navigateToLab]);

	const togglePanelSection = (key: keyof PanelSectionsState) => {
		upsertSession(algorithmId, {
			panelSections: {
				...panelSections,
				[key]: !panelSections[key],
			},
		});
	};

	const handleResetCurrent = () => {
		if (isMonteCarlo) {
			monteCarlo.resetDefaults();
		}
		resetSession(algorithmId);
	};

	const stageContent = useMemo(() => {
		if (isMonteCarlo) {
			return (
				<>
					<MonteCarloScene layer={monteCarlo.renderLayer} />
					<div className="scene-hud">
						<div className="scene-hud-row">
							<span>
								步数 {monteCarlo.renderLayer.currentStep}/
								{monteCarlo.renderLayer.totalSteps}
							</span>
							<span>
								可见 {monteCarlo.renderLayer.visiblePoints.toLocaleString()}
							</span>
							<span className={monteCarlo.isPlaying ? "text-rf-ready" : "text-rf-wip"}>
								{monteCarlo.isPlaying ? "● 运行中" : "⏸ 暂停"}
							</span>
						</div>
						<div className="progress-track">
							<div className="progress-bar" style={{ width: `${timelineProgress * 100}%` }} />
						</div>
					</div>
				</>
			);
		}
		return <WipFallback title={currentMeta.title} algorithmId={algorithmId} />;
	}, [algorithmId, currentMeta.title, isMonteCarlo, monteCarlo.isPlaying, monteCarlo.renderLayer, timelineProgress]);

	return (
		<div className="flex h-screen w-full bg-rf-bg selection:bg-rf-primary selection:text-white">
			{/* 扫描线覆盖层 */}
			<div className="scanline-overlay pointer-events-none fixed inset-0 z-50 opacity-20 mix-blend-overlay" />

			{/* 左侧导航栏 */}
			<aside className="z-10 flex w-full shrink-0 flex-col border-r border-white/10 bg-rf-surface-solid md:w-[350px] lg:w-[400px]">
				{/* 头部 */}
				<div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
					<div className="flex flex-col">
						<button
							type="button"
							onClick={navigateToHub}
							className="flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-left"
						>
							<RiskFlowLogo size="sm" showText={false} />
							<h1 className="m-0 font-display text-2xl font-bold tracking-tight text-white">
								RISKFLOW
							</h1>
						</button>
						<div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-rf-text-muted">
							<span className="text-rf-accent">● SYS: ONLINE</span>
							<span className="opacity-50">//</span>
							<span>LATENCY: 12ms</span>
						</div>
					</div>
				</div>

				{/* 算法列表 */}
				<nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-6">
					<div className="mb-2 px-2 font-mono text-[10px] uppercase tracking-widest text-rf-text-muted">
						Select Module
					</div>

					{ALGORITHM_CATALOG.map((algo, index) => {
						const isActive = algo.id === algorithmId;
						return (
							<button
								type="button"
								key={algo.id}
								onClick={() => navigateToLab(algo.id)}
								className={`group relative flex w-full cursor-pointer flex-col gap-1 border-l-4 p-4 text-left transition-all duration-300 ${
									isActive
										? "border-rf-primary bg-rf-primary/10 hover:bg-rf-primary/20"
										: "border-transparent hover:border-white/20 hover:bg-white/5"
								}`}
							>
								<div className="flex w-full items-center justify-between">
									<span className={`font-mono text-xs tracking-wider ${isActive ? "text-rf-primary" : "text-rf-text-muted group-hover:text-rf-accent"}`}>
										[{String(index + 1).padStart(2, "0")}]
									</span>
									<MaterialIcon
										name={isActive ? "settings" : "arrow_forward"}
										className={`text-sm ${isActive ? "animate-spin text-rf-primary" : "text-rf-text-muted opacity-0 group-hover:opacity-100"}`}
									/>
								</div>
								<span className={`text-glow font-display text-lg font-bold tracking-wide ${isActive ? "text-white" : "text-rf-text-muted group-hover:text-white"}`}>
									{algo.title.toUpperCase()}
								</span>
								<span className="font-mono text-[10px] uppercase tracking-wider text-rf-text-muted/60 group-hover:text-rf-text-muted">
									{ALGORITHM_SUBTITLES[algo.id]}
								</span>
								{isActive && (
									<div className="absolute right-0 top-0 h-2 w-2 border-r border-t border-rf-primary/50" />
								)}
							</button>
						);
					})}
				</nav>

				{/* 底部操作 */}
				<div className="mt-auto border-t border-white/10 bg-rf-bg-section-body p-4">
					<div className="flex flex-col gap-3">
						<button
							type="button"
							onClick={handleResetCurrent}
							className="group flex cursor-pointer items-center gap-3 rounded border-none bg-transparent px-3 py-2 text-left transition-colors hover:bg-white/5"
						>
							<MaterialIcon name="tune" className="text-rf-text-muted group-hover:text-white" />
							<span className="font-mono text-sm font-medium text-rf-text-muted group-hover:text-white">
								SYS_CONFIG
							</span>
						</button>
						<button
							type="button"
							onClick={navigateToHub}
							className="group flex cursor-pointer items-center gap-3 rounded border-none bg-transparent px-3 py-2 text-left transition-colors hover:bg-red-500/10"
						>
							<MaterialIcon name="power_settings_new" className="text-rf-text-muted group-hover:text-red-400" />
							<span className="font-mono text-sm font-medium text-rf-text-muted group-hover:text-red-400">
								TERMINATE_SESSION
							</span>
						</button>
					</div>
				</div>
			</aside>

			{/* 右侧主预览区 */}
			<main className="relative flex h-full flex-1 flex-col overflow-hidden bg-cover bg-center">
				{/* 背景覆盖层 */}
				<div className="absolute inset-0 z-0 bg-rf-bg/80 backdrop-blur-sm" />
				{/* 点阵网格 */}
				<div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: "radial-gradient(#444 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

				{/* 内容容器 */}
				<div className="relative z-10 flex h-full flex-col p-8 md:p-12">
					{/* 顶部状态栏 */}
					<header className="mb-8 flex items-start justify-between">
						<div className="glass-panel flex items-center gap-4 rounded-sm px-4 py-2">
							<span className="h-2 w-2 animate-pulse rounded-full bg-rf-accent shadow-[0_0_8px_#00BFA5]" />
							<p className="text-glow-secondary font-mono text-sm uppercase tracking-widest text-rf-accent">
								SYSTEM::READY
							</p>
							<div className="h-4 w-px bg-white/20" />
							<p className="font-mono text-sm uppercase tracking-widest text-rf-text-muted">
								MODULE: {currentMeta.title.toUpperCase().replace(/ /g, "_")}_V4.2
							</p>
						</div>
						<div className="hidden gap-2 md:flex">
							<div className="glass-panel flex items-center justify-center px-3 py-2">
								<MaterialIcon name="wifi" className="text-sm text-rf-text-muted" />
							</div>
							<div className="glass-panel flex items-center justify-center px-3 py-2">
								<MaterialIcon name="memory" className="text-sm text-rf-text-muted" />
							</div>
							<div className="glass-panel flex items-center justify-center px-3 py-2">
								<MaterialIcon name="schedule" className="text-sm text-rf-text-muted" />
							</div>
						</div>
					</header>

					{/* 中央可视化区域 */}
					<div className="relative flex h-full max-h-[60vh] w-full flex-1 items-center justify-center self-center">
						{/* 外框 */}
						<div className="absolute inset-0 rounded-sm border border-white/10">
							<div className="absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-rf-primary" />
							<div className="absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-rf-primary" />
							<div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-rf-primary" />
							<div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-rf-primary" />
						</div>

						{/* 3D 场景容器 */}
						<div className="relative h-full w-full overflow-hidden bg-black/40">
							<div className="absolute inset-0 bg-linear-to-t from-rf-primary/10 via-transparent to-transparent" />
							{stageContent}
							{/* 中心文字水印 */}
							<div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
								<h2 className="select-none font-display text-6xl font-bold tracking-tighter text-white/10 md:text-8xl">
									{currentMeta.title.toUpperCase()}
								</h2>
							</div>
						</div>

						{/* 浮动信息卡片 */}
						<div className="absolute bottom-8 left-8 max-w-md">
							<div className="glass-panel group relative overflow-hidden rounded-sm border-l-2 border-l-rf-accent p-6">
								<div className="absolute -left-full top-0 h-full w-full skew-x-12 bg-linear-to-r from-transparent via-white/5 to-transparent transition-all duration-1000 group-hover:left-full" />
								<h3 className="mb-2 flex items-center gap-2 font-display text-xl font-bold text-white">
									<MaterialIcon name="analytics" className="text-rf-accent" />
									Simulation Core
								</h3>
								<p className="font-body text-sm leading-relaxed text-rf-text-muted">
									{currentMeta.description}
								</p>
								<div className="mt-4 flex gap-4 font-mono text-xs text-rf-accent">
									<span>VAR_95: READY</span>
									<span>VOLATILITY: AUTO</span>
								</div>
							</div>
						</div>

						{/* 操作按钮 */}
						<div className="absolute bottom-8 right-8">
							<button
								type="button"
								onClick={() => isMonteCarlo && monteCarlo.togglePlaying()}
								className="glow-border group relative overflow-hidden border border-rf-primary bg-rf-primary/10 px-10 py-4 font-display font-bold uppercase tracking-widest text-white transition-all duration-200 hover:bg-rf-primary/20"
							>
								<span className="text-glow relative z-10 flex items-center gap-2">
									{isMonteCarlo && monteCarlo.isPlaying ? "Pause Engine" : "Initialize Engine"}
									<MaterialIcon name="arrow_forward" className="text-lg transition-transform group-hover:translate-x-1" />
								</span>
								<div className="absolute inset-0 translate-y-full bg-rf-primary/20 transition-transform duration-300 group-hover:translate-y-0" />
							</button>
						</div>
					</div>

					{/* 底部装饰代码 */}
					<div className="mt-auto flex items-end justify-between pt-6 opacity-40 transition-opacity hover:opacity-80">
						<div className="flex flex-col gap-1 font-mono text-[10px] text-rf-text-muted">
							<p>&gt; CHECKING_INTEGRITY... OK</p>
							<p>&gt; LOADING_ASSETS... [||||||||||] 100%</p>
							<p>&gt; AWAITING_INPUT_</p>
						</div>
						<div className="text-right font-mono text-[10px] text-rf-text-muted">
							RISKFLOW_OS v2.0.4
							<br />
							SECURE_CONNECTION
						</div>
					</div>
				</div>
			</main>

			{/* 右侧参数面板（可选） */}
			{!globalUi.rightPanelCollapsed && (
				<aside className="hidden w-80 shrink-0 flex-col overflow-y-auto border-l border-white/10 bg-rf-surface-solid xl:flex">
					<div className="grid content-start gap-2.5 p-3">
						<PanelSection
							title="参数面板"
							open={panelSections.parametersOpen}
							onToggle={() => togglePanelSection("parametersOpen")}
						>
							{isMonteCarlo ? (
								<MonteCarloParamsPanel
									input={monteCarlo.input}
									isPlaying={monteCarlo.isPlaying}
									onUpdateInput={monteCarlo.updateInput}
									onTogglePlaying={monteCarlo.togglePlaying}
									onResimulate={monteCarlo.resimulate}
								/>
							) : (
								<p className="m-0 text-sm text-rf-text-dim">
									TODO: 参数面板（{currentMeta.title}）
								</p>
							)}
						</PanelSection>

						<PanelSection
							title="风险指标"
							open={panelSections.metricsOpen}
							onToggle={() => togglePanelSection("metricsOpen")}
						>
							{isMonteCarlo ? (
								<MonteCarloMetrics metrics={monteCarlo.metrics} />
							) : (
								<p className="m-0 text-sm text-rf-text-dim">
									TODO: 指标面板（{currentMeta.title}）
								</p>
							)}
						</PanelSection>

						<PanelSection
							title="说明与笔记"
							open={panelSections.notesOpen}
							onToggle={() => togglePanelSection("notesOpen")}
						>
							<p className="m-0 text-sm text-rf-text-dim">
								TODO: 公式推导、实验记录和学习笔记。
							</p>
						</PanelSection>
					</div>
				</aside>
			)}
		</div>
	);
}
