import { BarChart3, Info, X, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ReturnDistribution } from "@/algorithms/monte-carlo/ReturnDistribution";
import { MonteCarloScene } from "@/algorithms/monte-carlo/Scene";
import { useMonteCarloSession } from "@/algorithms/monte-carlo/useSession";
import {
	buildConclusionStats,
	buildMiniHistogram,
	formatConclusionValue,
	getConclusionState,
} from "@/algorithms/monte-carlo/insights";
import type { MiniHistogramResult } from "@/algorithms/monte-carlo/insights";
import { buildQuantileMarkers } from "@/algorithms/monte-carlo/sceneMarkers";
import { buildMonteCarloDataBadge } from "@/algorithms/monte-carlo/viewMeta";
import { TRADING_DAYS_PER_YEAR } from "@/algorithms/shared/constants";
import { BtButton } from "@/components/ui/BtButton";
import type { LabStatusMetric, LabStatusTone } from "@/components/ui/LabStatusStrip";
import { useCSSVar } from "@/hooks/useCSSVar";
import { Footer } from "@/pages/lab/monte-carlo/components/Footer";
import { Sidebar } from "@/pages/lab/monte-carlo/components/Sidebar";
import type { LabWorkspaceProps } from "@/pages/lab/types";

type ViewMode = "conclusion2d" | "explore3d";

interface MiniTerminalHistogramProps {
	histogram: MiniHistogramResult;
	width?: number;
	height?: number;
	className?: string;
}

const COMPACT_MEDIA_QUERY = "(max-width: 1023px)";
const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

function detectCompactViewport(): boolean {
	if (typeof window === "undefined") return false;
	return window.matchMedia(COMPACT_MEDIA_QUERY).matches;
}

function detectMobileViewport(): boolean {
	if (typeof window === "undefined") return false;
	return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}

function MiniTerminalHistogram({
	histogram,
	width = 220,
	height = 120,
	className = "h-[96px] w-[200px]",
}: MiniTerminalHistogramProps) {
	const padding = { top: 12, right: 10, bottom: 18, left: 10 };
	const chartWidth = width - padding.left - padding.right;
	const chartHeight = height - padding.top - padding.bottom;

	const { bins, maxCount, minReturn, maxReturn } = histogram;
	const range = Math.max(maxReturn - minReturn, 1e-6);
	const safeMaxCount = Math.max(maxCount, 1);
	const zeroX =
		padding.left +
		((Math.max(minReturn, Math.min(maxReturn, 0)) - minReturn) / range) * chartWidth;
	const axisLabelSize = width <= 220 ? 7 : 8;

	return (
		<svg
			viewBox={`0 0 ${width} ${height}`}
			className={className}
			preserveAspectRatio="xMidYMid meet"
		>
			<line
				x1={zeroX}
				y1={padding.top}
				x2={zeroX}
				y2={padding.top + chartHeight}
				stroke="var(--color-bt-muted-foreground)"
				strokeOpacity={0.5}
				strokeDasharray="3,3"
			/>

			{bins.map((bin, index) => {
				const barWidth = chartWidth / bins.length - 1;
				const x = padding.left + (index / bins.length) * chartWidth;
				const barHeight = (bin.count / safeMaxCount) * chartHeight;
				const y = padding.top + chartHeight - barHeight;
				const isGain = bin.center >= 0;

				return (
					<rect
						key={`${bin.center}-${index}`}
						x={x}
						y={y}
						width={Math.max(1, barWidth)}
						height={Math.max(1, barHeight)}
						fill={isGain ? "var(--color-bt-success)" : "var(--color-bt-danger)"}
						fillOpacity={0.88}
					/>
				);
			})}

			<text
				x={padding.left}
				y={height - 3}
				fill="var(--color-bt-muted-foreground)"
				fontSize={axisLabelSize}
			>
				{minReturn.toFixed(0)}%
			</text>
			<text
				x={width - padding.right}
				y={height - 3}
				fill="var(--color-bt-muted-foreground)"
				fontSize={axisLabelSize}
				textAnchor="end"
			>
				{maxReturn > 0 ? "+" : ""}
				{maxReturn.toFixed(0)}%
			</text>
		</svg>
	);
}

const toStatusTone = (
	stateTone: "bullish" | "neutral" | "bearish",
): LabStatusTone => {
	if (stateTone === "bullish") return "success";
	if (stateTone === "bearish") return "danger";
	return "foreground";
};

export function MonteCarloWorkspace({
	onSidebar,
	onHeaderAction,
	onStatus,
}: LabWorkspaceProps) {
	const [viewMode, setViewMode] = useState<ViewMode>("conclusion2d");
	const [isCompactViewport, setCompactViewport] =
		useState<boolean>(() => detectCompactViewport());
	const [isMobileViewport, setMobileViewport] =
		useState<boolean>(() => detectMobileViewport());
	const [isDataBadgeOpen, setDataBadgeOpen] = useState(false);
	const [isAnchorPanelOpen, setAnchorPanelOpen] = useState(false);
	const [isStatusExpanded, setStatusExpanded] =
		useState<boolean>(() => !detectCompactViewport());
	const p5Color = useCSSVar("--color-bt-danger", "#ff4757");
	const p50Color = useCSSVar("--color-bt-foreground", "#fafafa");
	const p95Color = useCSSVar("--color-bt-success", "#00d4aa");
	const monteCarlo = useMonteCarloSession();
	const {
		input,
		metrics,
		terminalPrices,
		renderLayer,
		isPlaying,
		isBootstrapping,
		marketDataMeta,
		togglePlaying,
		resimulate,
		updateInput,
	} = monteCarlo;
	const resimulateRef = useRef(resimulate);

	useEffect(() => {
		const compactQuery = window.matchMedia(COMPACT_MEDIA_QUERY);
		const mobileQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
		const syncViewportState = () => {
			const isCompact = compactQuery.matches;
			const isMobile = mobileQuery.matches;
			setCompactViewport(isCompact);
			setMobileViewport(isMobile);
			setDataBadgeOpen(false);
			setAnchorPanelOpen(false);
			setStatusExpanded(!isCompact);
		};
		syncViewportState();

		const handleCompactChange = () => syncViewportState();
		const handleMobileChange = () => syncViewportState();
		compactQuery.addEventListener("change", handleCompactChange);
		mobileQuery.addEventListener("change", handleMobileChange);
		return () => {
			compactQuery.removeEventListener("change", handleCompactChange);
			mobileQuery.removeEventListener("change", handleMobileChange);
		};
	}, []);

	useEffect(() => {
		resimulateRef.current = resimulate;
	}, [resimulate]);

	const handleResimulate = useCallback(() => {
		resimulateRef.current();
	}, []);

	useEffect(() => {
		const autoSteps = Math.round(input.years * TRADING_DAYS_PER_YEAR);
		if (input.steps !== autoSteps) {
			updateInput("steps", autoSteps);
		}
	}, [input.years, input.steps, updateInput]);

	const handleViewModeChange = useCallback((nextMode: ViewMode) => {
		setViewMode(nextMode);
		setDataBadgeOpen(false);
		setAnchorPanelOpen(false);
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: 依赖 session 整体
	useEffect(() => {
		onSidebar(<Sidebar session={monteCarlo} />);
	}, [monteCarlo, onSidebar]);

	useEffect(() => {
		onHeaderAction(null);
		return () => onHeaderAction(null);
	}, [onHeaderAction]);

	const dataBadge = buildMonteCarloDataBadge(marketDataMeta);
	const conclusionStats = buildConclusionStats(metrics.final);
	const conclusionState = getConclusionState(conclusionStats);
	const isStatusDetailVisible = !isCompactViewport || isStatusExpanded;

	const stateValue = conclusionState.label;
	const winRateValue = formatConclusionValue("winRate", conclusionStats.winRate);
	const p50Value = formatConclusionValue("p50", conclusionStats.p50);
	const cvarValue = formatConclusionValue("cvar", conclusionStats.cvar);

	useEffect(() => {
		const statusMetrics: LabStatusMetric[] = [
			{
				id: "mc-state",
				label: "结论状态",
				value: stateValue,
				tone: toStatusTone(conclusionState.tone),
			},
			{
				id: "mc-win-rate",
				label: "胜率",
				value: winRateValue,
				tone: "success",
			},
			{
				id: "mc-p50",
				label: "P50",
				value: p50Value,
				tone: "foreground",
			},
			{
				id: "mc-cvar95",
				label: "CVaR95",
				value: cvarValue,
				tone: "danger",
			},
		];

		onStatus({
			title: "Monte Carlo Status",
			metrics: isStatusDetailVisible ? statusMetrics : statusMetrics.slice(0, 2),
			action: isCompactViewport ? (
				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={handleResimulate}
						className="inline-flex h-8 min-w-[3.75rem] items-center justify-center gap-1 border border-[var(--color-bt-accent)]/55 bg-[var(--color-bt-muted)] px-2 font-bt-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-bt-accent)] transition-colors duration-150 ease-[var(--ease-bt)] hover:border-[var(--color-bt-accent)]"
					>
						<Zap className="h-3 w-3" strokeWidth={1.6} />
						重算
					</button>
					<button
						type="button"
						onClick={() => setStatusExpanded((previous) => !previous)}
						aria-expanded={isStatusExpanded}
						aria-controls="lab-status-strip"
						className="inline-flex h-8 min-w-[3.75rem] items-center justify-center border border-[var(--color-bt-border)] bg-[var(--color-bt-overlay)] px-2 font-bt-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-bt-muted-foreground)] transition-colors duration-150 ease-[var(--ease-bt)] hover:text-[var(--color-bt-foreground)]"
					>
						{isStatusExpanded ? "收起" : "更多"}
					</button>
				</div>
			) : (
				<BtButton
					variant="primary"
					size="sm"
					onClick={handleResimulate}
					startIcon={<Zap className="h-4 w-4" strokeWidth={1.5} />}
				>
					重新模拟
				</BtButton>
			),
		});
	}, [
		cvarValue,
		conclusionState.tone,
		handleResimulate,
		isCompactViewport,
		isStatusDetailVisible,
		isStatusExpanded,
		onStatus,
		p50Value,
		stateValue,
		winRateValue,
	]);

	useEffect(() => {
		return () => onStatus(null);
	}, [onStatus]);

	const computedSteps = Math.round(metrics.progress * input.steps);
	const totalSteps = input.steps;
	const visiblePaths = Math.ceil(metrics.progress * input.paths);
	const visibleTerminalPrices = terminalPrices.slice(0, Math.max(1, visiblePaths));
	const miniHistogram = buildMiniHistogram(visibleTerminalPrices, input.initialPrice, 18);

	const quantileMarkers = buildQuantileMarkers({
		currentStep: renderLayer.currentStep,
		totalSteps: renderLayer.totalSteps,
		initialPrice: input.initialPrice,
		p05Price: metrics.current.p05Price,
		meanPrice: metrics.current.meanPrice,
		p95Price: metrics.current.p95Price,
		p05Color: p5Color,
		p50Color,
		p95Color,
	});

	const toggleCompactActionPanel = useCallback(() => {
		if (viewMode === "conclusion2d") {
			setDataBadgeOpen((previous) => !previous);
			return;
		}
		setAnchorPanelOpen((previous) => !previous);
	}, [viewMode]);

	return (
		<>
			<div
				className={`relative flex h-full flex-1 flex-col overflow-hidden ${
					isCompactViewport ? "gap-1.5 p-2 sm:p-3" : "gap-2 p-4"
				}`}
			>
				<div className="relative h-full min-h-0 overflow-hidden border border-[var(--color-bt-border)] bg-[var(--color-bt-background)]">
					{isCompactViewport ? (
						<div className="relative flex h-full min-h-0 flex-col">
							<div className="relative min-h-0 flex-1 overflow-hidden">
								{viewMode === "conclusion2d" ? (
									<div className="h-full px-0.5 pb-1 pt-0.5">
										<div className="h-full min-h-0">
											<ReturnDistribution
												key={`${input.seed}`}
												terminalPrices={terminalPrices}
												initialPrice={input.initialPrice}
												paths={input.paths}
												latestDataDate={marketDataMeta.latestDataDate}
												visiblePaths={visiblePaths}
												showLatestDataDate={false}
												showDecisionPanel={false}
												layoutMode={isMobileViewport ? "compact-h5" : "compact"}
											/>
										</div>
									</div>
								) : (
									<>
										<MonteCarloScene layer={renderLayer} markers={quantileMarkers} />
										{isAnchorPanelOpen ? (
											<div
												id="mc-anchor-panel"
												className="pointer-events-auto absolute inset-x-2 bottom-2 z-20 border border-[var(--color-bt-border)] bg-[var(--color-bt-overlay)] px-2.5 py-2 backdrop-blur-[1px]"
											>
												<div className="flex items-center justify-between">
													<p className="font-bt-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-bt-muted-foreground)]">
														终点分布锚点
													</p>
													<button
														type="button"
														onClick={() => setAnchorPanelOpen(false)}
														aria-label="关闭终点分布锚点面板"
														className="inline-flex h-6 w-6 items-center justify-center border border-[var(--color-bt-border)] text-[var(--color-bt-muted-foreground)] transition-colors duration-150 ease-[var(--ease-bt)] hover:text-[var(--color-bt-foreground)]"
													>
														<X className="h-3.5 w-3.5" strokeWidth={1.6} />
													</button>
												</div>

												<div className="mt-2">
													<MiniTerminalHistogram
														histogram={miniHistogram}
														width={280}
														height={126}
														className="h-[86px] w-full"
													/>
												</div>
											</div>
										) : null}
									</>
								)}

								{viewMode === "conclusion2d" && isDataBadgeOpen ? (
									<div
										id="mc-data-badge-panel"
										className="pointer-events-auto absolute inset-x-2 bottom-2 z-30 border border-[var(--color-bt-border)] bg-[var(--color-bt-overlay)] px-2.5 py-2 font-bt-mono text-[9px] uppercase tracking-[0.1em] text-[var(--color-bt-muted-foreground)] backdrop-blur-[1px]"
									>
										<div className="flex items-start justify-between gap-2">
											<div className="space-y-1">
												<p>{dataBadge.sourceText}</p>
												{dataBadge.dateText ? <p>{dataBadge.dateText}</p> : null}
												{isBootstrapping ? (
													<p className="text-[var(--color-bt-accent)]">正在初始化数据...</p>
												) : null}
											</div>
											<button
												type="button"
												onClick={() => setDataBadgeOpen(false)}
												aria-label="关闭数据面板"
												className="inline-flex h-6 w-6 items-center justify-center border border-[var(--color-bt-border)] text-[var(--color-bt-muted-foreground)] transition-colors duration-150 ease-[var(--ease-bt)] hover:text-[var(--color-bt-foreground)]"
											>
												<X className="h-3.5 w-3.5" strokeWidth={1.6} />
											</button>
										</div>
									</div>
								) : null}
							</div>

							<div className="shrink-0 border-t border-[var(--color-bt-border)] px-2 py-2">
								<div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
									<div
										role="radiogroup"
										aria-label="视图模式"
										className="isolate grid h-10 w-full grid-cols-2 divide-x divide-[var(--color-bt-border)] border border-[var(--color-bt-border)] bg-[var(--color-bt-overlay)]"
									>
										<button
											type="button"
											role="radio"
											aria-checked={viewMode === "conclusion2d"}
											onClick={() => handleViewModeChange("conclusion2d")}
											className={`h-10 w-full appearance-none border-0 px-2.5 text-[10px] leading-none font-bt-mono uppercase tracking-[0.1em] transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-bt-ring)] ${
												viewMode === "conclusion2d"
													? "bg-[var(--color-bt-muted)] text-[var(--color-bt-accent)]"
													: "text-[var(--color-bt-muted-foreground)] hover:bg-[var(--color-bt-overlay-soft)] hover:text-[var(--color-bt-foreground)]"
											}`}
										>
											2D 结论视图
										</button>
										<button
											type="button"
											role="radio"
											aria-checked={viewMode === "explore3d"}
											onClick={() => handleViewModeChange("explore3d")}
											className={`h-10 w-full appearance-none border-0 px-2.5 text-[10px] leading-none font-bt-mono uppercase tracking-[0.1em] transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-bt-ring)] ${
												viewMode === "explore3d"
													? "bg-[var(--color-bt-muted)] text-[var(--color-bt-accent)]"
													: "text-[var(--color-bt-muted-foreground)] hover:bg-[var(--color-bt-overlay-soft)] hover:text-[var(--color-bt-foreground)]"
											}`}
										>
											3D 探索视图
										</button>
									</div>

									<button
										type="button"
										onClick={toggleCompactActionPanel}
										aria-expanded={
											viewMode === "conclusion2d" ? isDataBadgeOpen : isAnchorPanelOpen
										}
										aria-controls={
											viewMode === "conclusion2d" ? "mc-data-badge-panel" : "mc-anchor-panel"
										}
										className={`inline-flex h-10 items-center gap-1.5 border border-[var(--color-bt-border)] px-2.5 font-bt-mono text-[10px] uppercase tracking-[0.1em] transition-colors duration-150 ease-[var(--ease-bt)] ${
											(viewMode === "conclusion2d" && isDataBadgeOpen) ||
											(viewMode === "explore3d" && isAnchorPanelOpen)
												? "border-[var(--color-bt-accent)]/50 bg-[var(--color-bt-muted)] text-[var(--color-bt-accent)]"
												: "bg-[var(--color-bt-overlay)] text-[var(--color-bt-muted-foreground)] hover:text-[var(--color-bt-foreground)]"
										}`}
									>
										{viewMode === "conclusion2d" ? (
											<Info className="h-3.5 w-3.5" strokeWidth={1.6} />
										) : (
											<BarChart3 className="h-3.5 w-3.5" strokeWidth={1.6} />
										)}
										{viewMode === "conclusion2d" ? "数据" : "锚点"}
									</button>
								</div>
							</div>
						</div>
					) : (
						<>
							<div className="pointer-events-none absolute inset-x-4 top-4 z-30 flex items-start justify-between">
								<div
									role="radiogroup"
									aria-label="视图模式"
									className="pointer-events-auto isolate inline-flex shrink-0 items-center divide-x divide-[var(--color-bt-border)] border border-[var(--color-bt-border)] bg-[var(--color-bt-overlay)] p-0.5"
								>
									<button
										type="button"
										role="radio"
										aria-checked={viewMode === "conclusion2d"}
										onClick={() => handleViewModeChange("conclusion2d")}
										className={`appearance-none border-0 px-2.5 py-1 text-[10px] leading-none font-bt-mono uppercase tracking-[0.08em] transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-bt-ring)] ${
											viewMode === "conclusion2d"
												? "bg-[var(--color-bt-muted)] text-[var(--color-bt-accent)]"
												: "text-[var(--color-bt-muted-foreground)] hover:bg-[var(--color-bt-overlay-soft)] hover:text-[var(--color-bt-foreground)]"
										}`}
									>
										2D 结论视图
									</button>
									<button
										type="button"
										role="radio"
										aria-checked={viewMode === "explore3d"}
										onClick={() => handleViewModeChange("explore3d")}
										className={`appearance-none border-0 px-2.5 py-1 text-[10px] leading-none font-bt-mono uppercase tracking-[0.08em] transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-bt-ring)] ${
											viewMode === "explore3d"
												? "bg-[var(--color-bt-muted)] text-[var(--color-bt-accent)]"
												: "text-[var(--color-bt-muted-foreground)] hover:bg-[var(--color-bt-overlay-soft)] hover:text-[var(--color-bt-foreground)]"
										}`}
									>
										3D 探索视图
									</button>
								</div>
							</div>

							{viewMode === "conclusion2d" ? (
								<>
									<div className="pointer-events-none absolute left-4 top-20 z-20 border border-[var(--color-bt-border)] bg-[var(--color-bt-overlay)] px-2.5 py-1 font-bt-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-bt-muted-foreground)]">
										<span>{dataBadge.sourceText}</span>
										{dataBadge.dateText ? (
											<span className="text-[var(--color-bt-muted-foreground)]/70">
												{" "}
												· {dataBadge.dateText.replace("最新数据日期: ", "")}
											</span>
										) : null}
									</div>

									<div className="h-full px-1.5 pb-1.5 pt-20">
										<div className="h-full">
											<ReturnDistribution
												key={`${input.seed}`}
												terminalPrices={terminalPrices}
												initialPrice={input.initialPrice}
												paths={input.paths}
												latestDataDate={marketDataMeta.latestDataDate}
												visiblePaths={visiblePaths}
												showLatestDataDate={false}
												showDecisionPanel={false}
												layoutMode="full"
											/>
										</div>
									</div>
								</>
							) : (
								<>
									<MonteCarloScene layer={renderLayer} markers={quantileMarkers} />
									<div className="pointer-events-none absolute bottom-4 right-4 z-10 border border-[var(--color-bt-border)] bg-[var(--color-bt-overlay)] px-2 py-2">
										<p className="mb-1 font-bt-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-bt-muted-foreground)]">
											终点分布锚点
										</p>
										<MiniTerminalHistogram histogram={miniHistogram} />
									</div>
								</>
							)}

							{viewMode === "explore3d" ? (
								<div className="pointer-events-none absolute left-4 top-20 space-y-1 border border-[var(--color-bt-border)] bg-[var(--color-bt-overlay)] px-3 py-2 font-bt-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-bt-muted-foreground)]">
									<p>{dataBadge.sourceText}</p>
									{dataBadge.dateText ? <p>{dataBadge.dateText}</p> : null}
									{isBootstrapping ? (
										<p className="text-[var(--color-bt-accent)]">正在初始化数据...</p>
									) : null}
								</div>
							) : null}
						</>
					)}
				</div>
			</div>

			<Footer
				progress={metrics.progress}
				currentStep={computedSteps}
				totalSteps={totalSteps}
				isPlaying={isPlaying}
				onTogglePlay={togglePlaying}
				compact={isCompactViewport}
			/>
		</>
	);
}
