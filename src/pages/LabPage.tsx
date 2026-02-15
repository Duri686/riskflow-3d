import { useEffect, useMemo } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
	ALGORITHM_SHORTCUTS,
	DEFAULT_ALGORITHM_ID,
	type AlgorithmId,
	getAlgorithmMeta,
	isAlgorithmId,
} from "../algorithms/registry";
import { MonteCarloMetrics } from "../algorithms/monte-carlo/MetricsPanel";
import { MonteCarloParamsPanel } from "../algorithms/monte-carlo/ParamsPanel";
import { MonteCarloScene } from "../algorithms/monte-carlo/Scene";
import { useMonteCarloSession } from "../algorithms/monte-carlo/useSession";
import { PanelSection } from "../components/PanelSection";
import { WipFallback } from "../components/WipFallback";
import { TopBar } from "../layouts/parts/TopBar";
import { useLabStore } from "../store/useLabStore";
import {
	DEFAULT_PANEL_SECTIONS,
	type PanelSectionsState,
} from "../store/types";

export function LabPage() {
	const params = useParams<{ algorithmId: string }>();
	const navigate = useNavigate();
	const rawAlgorithmId = params.algorithmId;
	const resolvedAlgorithmId: AlgorithmId | null =
		rawAlgorithmId && isAlgorithmId(rawAlgorithmId) ? rawAlgorithmId : null;
	const isValidAlgorithm = resolvedAlgorithmId !== null;
	const algorithmId: AlgorithmId = resolvedAlgorithmId ?? DEFAULT_ALGORITHM_ID;

	const {
		globalUi,
		getSession,
		markRecent,
		resetSession,
		setRightPanelCollapsed,
		upsertSession,
	} = useLabStore();

	const monteCarlo = useMonteCarloSession();
	const { restoreSession, getSnapshot } = monteCarlo;
	const activeSession = getSession(algorithmId);
	const panelSections: PanelSectionsState =
		activeSession?.panelSections ?? DEFAULT_PANEL_SECTIONS;
	const currentMeta = getAlgorithmMeta(algorithmId);
	const isMonteCarlo = algorithmId === "monte-carlo";
	const timelineProgress = isMonteCarlo ? monteCarlo.metrics.progress : 0;

	// 1) 仅在算法切换时记录最近访问，避免函数引用变更导致的重复触发
	useEffect(() => {
		if (!isValidAlgorithm) return;
		markRecent(algorithmId);
	}, [algorithmId, isValidAlgorithm, markRecent]);

	// 2) 仅处理蒙特卡洛的会话恢复/持久化，避免依赖不稳定对象引用造成循环
	useEffect(() => {
		if (!isValidAlgorithm || algorithmId !== "monte-carlo") return;
		// 恢复会话（进入页面时）
		restoreSession(activeSession?.monteCarlo);
		return () => {
			// 持久化会话（离开页面时）
			upsertSession(algorithmId, {
				monteCarlo: getSnapshot(),
			});
		};
	}, [
		algorithmId,
		isValidAlgorithm,
		activeSession?.monteCarlo,
		upsertSession,
		restoreSession,
		getSnapshot,
	]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (!event.metaKey && !event.ctrlKey) {
				return;
			}

			const targetAlgorithmId = ALGORITHM_SHORTCUTS[event.key];
			if (!targetAlgorithmId) {
				return;
			}

			event.preventDefault();
			navigate(`/lab/${targetAlgorithmId}`);
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [navigate]);

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
							<span
								className={
									monteCarlo.isPlaying
										? "text-rf-ready"
										: "text-rf-wip"
								}
							>
								{monteCarlo.isPlaying ? "● 运行中" : "⏸ 暂停"}
							</span>
						</div>
						<div className="progress-track">
							<div
								className="progress-bar"
								style={{
									width: `${timelineProgress * 100}%`,
								}}
							/>
						</div>
					</div>
				</>
			);
		}
		return <WipFallback title={currentMeta.title} algorithmId={algorithmId} />;
	}, [algorithmId, currentMeta.title, isMonteCarlo, monteCarlo.isPlaying, monteCarlo.renderLayer, timelineProgress]);

	if (!isValidAlgorithm) {
		return <Navigate to={`/lab/${DEFAULT_ALGORITHM_ID}`} replace />;
	}

	return (
		<div className="flex h-screen flex-col">
			<TopBar
				meta={currentMeta}
				activeId={algorithmId}
				rightPanelCollapsed={globalUi.rightPanelCollapsed}
				onToggleRightPanel={() =>
					setRightPanelCollapsed(!globalUi.rightPanelCollapsed)
				}
				onReset={handleResetCurrent}
			/>

			<div className="flex min-h-0 flex-1">
				<main className="relative min-w-0 flex-1 p-3">
					<div className="relative h-full overflow-hidden rounded-card border border-rf-border bg-rf-scene-bg [&_canvas]:rounded-card">
						{stageContent}
					</div>
				</main>

				{globalUi.rightPanelCollapsed ? null : (
					<aside className="w-80 shrink-0 overflow-y-auto border-l border-rf-border bg-rf-bg-elevated/60 backdrop-blur-md">
						<div className="grid content-start gap-2.5 p-3">
							<PanelSection
								title="参数面板"
								open={panelSections.parametersOpen}
								onToggle={() =>
									togglePanelSection("parametersOpen")
								}
							>
								{isMonteCarlo ? (
									<MonteCarloParamsPanel
										input={monteCarlo.input}
										isPlaying={monteCarlo.isPlaying}
										onUpdateInput={monteCarlo.updateInput}
										onTogglePlaying={
											monteCarlo.togglePlaying
										}
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
								onToggle={() =>
									togglePanelSection("metricsOpen")
								}
							>
								{isMonteCarlo ? (
									<MonteCarloMetrics
										metrics={monteCarlo.metrics}
									/>
								) : (
									<p className="m-0 text-sm text-rf-text-dim">
										TODO: 指标面板（{currentMeta.title}）
									</p>
								)}
							</PanelSection>

							<PanelSection
								title="说明与笔记"
								open={panelSections.notesOpen}
								onToggle={() =>
									togglePanelSection("notesOpen")
								}
							>
								<p className="m-0 text-sm text-rf-text-dim">
									TODO: 公式推导、实验记录和学习笔记。
								</p>
							</PanelSection>
						</div>
					</aside>
				)}
			</div>
		</div>
	);
}
