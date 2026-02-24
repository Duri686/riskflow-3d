import { Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMonteCarloSession } from "@/algorithms/monte-carlo/useSession";
import { MonteCarloScene } from "@/algorithms/monte-carlo/Scene";
import { buildQuantileMarkers } from "@/algorithms/monte-carlo/sceneMarkers";
import {
	buildConclusionStats,
	getConclusionState,
	buildMiniHistogram,
	formatConclusionValue,
	type MiniHistogramResult,
} from "@/algorithms/monte-carlo/insights";
import { buildMonteCarloDataBadge } from "@/algorithms/monte-carlo/viewMeta";
import { ReturnDistribution } from "@/algorithms/monte-carlo/ReturnDistribution";
import { BtButton } from "@/components/ui/BtButton";
import type { LabStatusTone } from "@/components/ui/LabStatusStrip";
import { useCSSVar } from "@/hooks/useCSSVar";
import { TRADING_DAYS_PER_YEAR } from "@/algorithms/shared/constants";
import { Footer } from "@/pages/lab/monte-carlo/components/Footer";
import { Sidebar } from "@/pages/lab/monte-carlo/components/Sidebar";
import type { LabWorkspaceProps } from "@/pages/lab/types";

type ViewMode = "conclusion2d" | "explore3d";

function MiniTerminalHistogram({ histogram }: { histogram: MiniHistogramResult }) {
	const width = 220;
	const height = 120;
	const padding = { top: 12, right: 10, bottom: 18, left: 10 };
	const chartWidth = width - padding.left - padding.right;
	const chartHeight = height - padding.top - padding.bottom;

	const { bins, maxCount, minReturn, maxReturn } = histogram;
	const range = Math.max(maxReturn - minReturn, 1e-6);
	const safeMaxCount = Math.max(maxCount, 1);
	const zeroX =
		padding.left +
		((Math.max(minReturn, Math.min(maxReturn, 0)) - minReturn) / range) * chartWidth;

	return (
		<svg
			viewBox={`0 0 ${width} ${height}`}
			className="h-[96px] w-[200px]"
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
				fontSize={8}
			>
				{minReturn.toFixed(0)}%
			</text>
			<text
				x={width - padding.right}
				y={height - 3}
				fill="var(--color-bt-muted-foreground)"
				fontSize={8}
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

	const stateValue = conclusionState.label;
	const winRateValue = formatConclusionValue("winRate", conclusionStats.winRate);
	const p50Value = formatConclusionValue("p50", conclusionStats.p50);
	const cvarValue = formatConclusionValue("cvar", conclusionStats.cvar);

	useEffect(() => {
		onStatus({
			title: "Monte Carlo Status",
			metrics: [
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
			],
			action: (
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

	return (
		<>
			<div className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-4">
				<div className="relative h-full min-h-0 overflow-hidden border border-[var(--color-bt-border)] bg-[var(--color-bt-background)]">
					<div className="pointer-events-none absolute inset-x-4 top-4 z-30 flex flex-col items-start gap-2">
						<div
							role="radiogroup"
							aria-label="视图模式"
							className="pointer-events-auto isolate inline-flex shrink-0 items-center divide-x divide-[var(--color-bt-border)] border border-[var(--color-bt-border)] bg-[var(--color-bt-overlay)] p-0.5"
						>
							<button
								type="button"
								role="radio"
								aria-checked={viewMode === "conclusion2d"}
								onClick={() => setViewMode("conclusion2d")}
								className={`appearance-none border-0 px-2.5 py-1 leading-none font-bt-mono text-[10px] uppercase tracking-[0.08em] transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-bt-ring)] ${
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
								onClick={() => setViewMode("explore3d")}
								className={`appearance-none border-0 px-2.5 py-1 leading-none font-bt-mono text-[10px] uppercase tracking-[0.08em] transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-bt-ring)] ${
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
				</div>
			</div>

			<Footer
				progress={metrics.progress}
				currentStep={computedSteps}
				totalSteps={totalSteps}
				isPlaying={isPlaying}
				onTogglePlay={togglePlaying}
			/>
		</>
	);
}
