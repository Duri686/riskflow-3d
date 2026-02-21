import { useEffect, useState } from "react";
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
import { MaterialIcon } from "@/components/Logo";
import { Sidebar } from "./monte-carlo/components/Sidebar";
import { Footer } from "./monte-carlo/components/Footer";
import { TRADING_DAYS_PER_YEAR } from "@/algorithms/shared/constants";

interface MonteCarloWorkspaceProps {
  onSidebar: (node: React.ReactNode) => void;
  onActions: (node: React.ReactNode) => void;
}

type ViewMode = "conclusion2d" | "explore3d";

function ConclusionStrip({
  stateLabel,
  stateTone,
  winRate,
  p50,
  cvar,
  p95,
  upDownRatio,
}: {
  stateLabel: string;
  stateTone: "bullish" | "neutral" | "bearish";
  winRate: string;
  p50: string;
  cvar: string;
  p95: string;
  upDownRatio: string;
}) {
  const toneClass =
    stateTone === "bullish"
      ? "text-rf-accent"
      : stateTone === "bearish"
        ? "text-rf-chart-3"
        : "text-white";

  return (
    <div className="rounded-full bg-black/38 px-4 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.26)] backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-center gap-2.5 font-mono text-[10px] text-gray-300">
        <span>
          结论 <strong className={toneClass}>{stateLabel}</strong>
        </span>
        <span className="text-white/25">|</span>
        <span>
          胜率 <strong className="text-rf-accent">{winRate}</strong>
        </span>
        <span>
          P50 <strong className="text-white">{p50}</strong>
        </span>
        <span>
          CVaR <strong className="text-rf-chart-3">{cvar}</strong>
        </span>
        <span>
          P95 <strong className="text-rf-accent">{p95}</strong>
        </span>
        <span>
          盈亏比 <strong className="text-white">{upDownRatio}</strong>
        </span>
      </div>
    </div>
  );
}

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
        stroke="rgba(255,255,255,0.35)"
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
            rx={1}
            fill={isGain ? "rgba(34, 211, 238, 0.88)" : "rgba(168, 85, 247, 0.82)"}
          />
        );
      })}

      <text
        x={padding.left}
        y={height - 3}
        fill="rgba(156, 163, 175, 0.95)"
        fontSize={8}
      >
        {minReturn.toFixed(0)}%
      </text>
      <text
        x={width - padding.right}
        y={height - 3}
        fill="rgba(156, 163, 175, 0.95)"
        fontSize={8}
        textAnchor="end"
      >
        {maxReturn > 0 ? "+" : ""}
        {maxReturn.toFixed(0)}%
      </text>
    </svg>
  );
}

export function MonteCarloWorkspace({ onSidebar, onActions }: MonteCarloWorkspaceProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("conclusion2d");
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

  // 自动计算时间步数 Logic (Business Rule: Steps should align with years)
  useEffect(() => {
    const autoSteps = Math.round(input.years * TRADING_DAYS_PER_YEAR);
    if (input.steps !== autoSteps) {
      updateInput("steps", autoSteps);
    }
  }, [input.years, input.steps, updateInput]);

  // 注入 sidebar
  // biome-ignore lint/correctness/useExhaustiveDependencies: 依赖 session 整体
  useEffect(() => {
    onSidebar(<Sidebar session={monteCarlo} />);
  }, [monteCarlo, onSidebar]);

  // 注入 actions
  useEffect(() => {
    onActions(
      <button
        type="button"
        onClick={resimulate}
        className="flex h-8 w-8 items-center justify-center rounded border border-white/10 bg-transparent text-rf-primary hover:bg-rf-primary/10"
        title="重新模拟"
      >
        <MaterialIcon name="bolt" className="text-base" />
      </button>,
    );
  }, [resimulate, onActions]);

  const computedSteps = Math.round(metrics.progress * input.steps);
  const totalSteps = input.steps;
  const visiblePaths = Math.ceil(metrics.progress * input.paths);
  const visibleTerminalPrices = terminalPrices.slice(0, Math.max(1, visiblePaths));

  const dataBadge = buildMonteCarloDataBadge(marketDataMeta);
  const conclusionStats = buildConclusionStats(metrics.final);
  const conclusionState = getConclusionState(conclusionStats);
  const miniHistogram = buildMiniHistogram(visibleTerminalPrices, input.initialPrice, 18);

  const quantileMarkers = buildQuantileMarkers({
    currentStep: renderLayer.currentStep,
    totalSteps: renderLayer.totalSteps,
    initialPrice: input.initialPrice,
    p05Price: metrics.current.p05Price,
    meanPrice: metrics.current.meanPrice,
    p95Price: metrics.current.p95Price,
  });

  return (
    <>
      <div className="relative flex-1 flex flex-col gap-2 p-4 min-h-0 overflow-hidden">
        <div className="relative h-full min-h-0 overflow-hidden rounded-xl border border-white/10 bg-rf-bg-dark/60">
          <div className="pointer-events-auto absolute left-4 top-4 z-30 flex items-center gap-1 rounded-full bg-black/45 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setViewMode("conclusion2d")}
              className={`rounded-full px-2.5 py-1 font-mono text-[10px] transition-colors ${
                viewMode === "conclusion2d"
                  ? "bg-rf-primary/25 text-rf-primary"
                  : "text-gray-300 hover:bg-white/10"
              }`}
            >
              2D 结论视图
            </button>
            <button
              type="button"
              onClick={() => setViewMode("explore3d")}
              className={`rounded-full px-2.5 py-1 font-mono text-[10px] transition-colors ${
                viewMode === "explore3d"
                  ? "bg-rf-primary/25 text-rf-primary"
                  : "text-gray-300 hover:bg-white/10"
              }`}
            >
              3D 探索视图
            </button>
          </div>

          {viewMode === "conclusion2d" ? (
            <>
              <div className="pointer-events-none absolute left-1/2 top-4 z-20 w-[min(900px,calc(100%-260px))] -translate-x-1/2">
                <ConclusionStrip
                  stateLabel={conclusionState.label}
                  stateTone={conclusionState.tone}
                  winRate={formatConclusionValue("winRate", conclusionStats.winRate)}
                  p50={formatConclusionValue("p50", conclusionStats.p50)}
                  cvar={formatConclusionValue("cvar", conclusionStats.cvar)}
                  p95={formatConclusionValue("p95", conclusionStats.p95)}
                  upDownRatio={formatConclusionValue("upDownRatio", conclusionStats.upDownRatio)}
                />
              </div>

              <div className="pointer-events-none absolute left-4 top-16 z-20 rounded bg-black/32 px-2.5 py-1 font-mono text-[10px] text-gray-300 backdrop-blur-sm">
                <span>{dataBadge.sourceText}</span>
                {dataBadge.dateText && <span className="text-gray-500"> · {dataBadge.dateText.replace("最新数据日期: ", "")}</span>}
              </div>

              <div className="h-full px-1.5 pb-1.5 pt-14">
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

              <div className="pointer-events-none absolute left-1/2 top-4 z-10 w-[min(820px,calc(100%-180px))] -translate-x-1/2 rounded border border-white/15 bg-black/40 px-3 py-2 backdrop-blur-sm">
                <div className="flex items-center justify-between font-mono text-[10px] text-gray-200">
                  <span>
                    结论 <strong className={conclusionState.tone === "bullish" ? "text-rf-accent" : conclusionState.tone === "bearish" ? "text-rf-chart-3" : "text-white"}>{conclusionState.label}</strong>
                  </span>
                  <span>
                    胜率 <strong className="text-rf-accent">{formatConclusionValue("winRate", conclusionStats.winRate)}</strong>
                  </span>
                  <span>
                    P50 <strong className="text-white">{formatConclusionValue("p50", conclusionStats.p50)}</strong>
                  </span>
                  <span>
                    CVaR <strong className="text-rf-chart-3">{formatConclusionValue("cvar", conclusionStats.cvar)}</strong>
                  </span>
                  <span>
                    P95 <strong className="text-rf-accent">{formatConclusionValue("p95", conclusionStats.p95)}</strong>
                  </span>
                  <span>
                    盈亏比 <strong className="text-white">{formatConclusionValue("upDownRatio", conclusionStats.upDownRatio)}</strong>
                  </span>
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-4 right-4 z-10 rounded border border-white/15 bg-black/35 px-2 py-2 backdrop-blur-sm">
                <p className="mb-1 font-mono text-[10px] text-gray-300">终点分布锚点</p>
                <MiniTerminalHistogram histogram={miniHistogram} />
              </div>
            </>
          )}

          {viewMode === "explore3d" && (
            <div className="pointer-events-none absolute left-4 top-16 space-y-1 rounded border border-white/10 bg-black/35 px-3 py-2 font-mono text-[10px] text-gray-300 backdrop-blur-sm">
              <p>{dataBadge.sourceText}</p>
              {dataBadge.dateText && <p>{dataBadge.dateText}</p>}
              {isBootstrapping && <p className="text-rf-accent">正在初始化数据...</p>}
            </div>
          )}
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
