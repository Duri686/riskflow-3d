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
import { BtButton } from "@/components/ui/BtButton";
import { WorkspaceActionsShell } from "@/components/ui/WorkspaceActions";
import { useCSSVar } from "@/hooks/useCSSVar";
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
      ? "text-[var(--color-bt-accent)]"
      : stateTone === "bearish"
        ? "text-[var(--color-bt-danger)]"
        : "text-[var(--color-bt-foreground)]";

  return (
    <div
      className="border border-[var(--color-bt-border)] bg-[var(--color-bt-overlay)] px-4 py-1.5 backdrop-blur-sm"
      style={{ boxShadow: "var(--shadow-bt-overlay)" }}
    >
      <div className="flex items-center gap-2.5 overflow-hidden whitespace-nowrap font-bt-mono text-[10px] uppercase tracking-[0.08em] text-[var(--color-bt-muted-foreground)]">
        <span>
          结论 <strong className={toneClass}>{stateLabel}</strong>
        </span>
        <span className="text-[var(--color-bt-border)]">|</span>
        <span>
          胜率 <strong className="text-[var(--color-bt-accent)]">{winRate}</strong>
        </span>
        <span>
          P50 <strong className="text-[var(--color-bt-foreground)]">{p50}</strong>
        </span>
        <span className="hidden md:inline">
          CVaR <strong className="text-[var(--color-bt-danger)]">{cvar}</strong>
        </span>
        <span className="hidden lg:inline">
          P95 <strong className="text-[var(--color-bt-success)]">{p95}</strong>
        </span>
        <span className="hidden xl:inline">
          盈亏比 <strong className="text-[var(--color-bt-foreground)]">{upDownRatio}</strong>
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
            rx={1}
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

export function MonteCarloWorkspace({ onSidebar, onActions }: MonteCarloWorkspaceProps) {
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
      <WorkspaceActionsShell className="pl-2">
        <BtButton
          variant="ghost"
          size="icon"
          onClick={resimulate}
          className="text-[var(--color-bt-accent)]"
          title="重新模拟"
        >
          <MaterialIcon name="bolt" className="text-base" />
        </BtButton>
      </WorkspaceActionsShell>,
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
    p05Color: p5Color,
    p50Color,
    p95Color,
  });

  return (
    <>
      <div className="relative flex-1 flex flex-col gap-2 p-4 min-h-0 overflow-hidden">
        <div className="relative h-full min-h-0 overflow-hidden rounded-xl border border-white/10 bg-rf-bg-dark/60">
          <div className="pointer-events-none absolute inset-x-4 top-4 z-30 flex flex-col items-start gap-2">
            <div
              role="radiogroup"
              aria-label="视图模式"
              className="pointer-events-auto isolate inline-flex shrink-0 items-center divide-x divide-[var(--color-bt-border)] border border-[var(--color-bt-border)] bg-[var(--color-bt-overlay)] p-0.5 backdrop-blur-sm"
              style={{ boxShadow: "var(--shadow-bt-overlay)" }}
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

            <div className="w-auto min-w-0 max-w-[980px]">
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
          </div>

          {viewMode === "conclusion2d" ? (
            <>
              <div className="pointer-events-none absolute left-4 top-24 z-20 border border-[var(--color-bt-border)] bg-[var(--color-bt-overlay)] px-2.5 py-1 font-bt-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-bt-muted-foreground)] backdrop-blur-sm">
                <span>{dataBadge.sourceText}</span>
                {dataBadge.dateText && <span className="text-[var(--color-bt-muted-foreground)]/70"> · {dataBadge.dateText.replace("最新数据日期: ", "")}</span>}
              </div>

              <div className="h-full px-1.5 pb-1.5 pt-24">
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

              <div className="pointer-events-none absolute bottom-4 right-4 z-10 border border-[var(--color-bt-border)] bg-[var(--color-bt-overlay)] px-2 py-2 backdrop-blur-sm">
                <p className="mb-1 font-bt-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-bt-muted-foreground)]">终点分布锚点</p>
                <MiniTerminalHistogram histogram={miniHistogram} />
              </div>
            </>
          )}

          {viewMode === "explore3d" && (
            <div className="pointer-events-none absolute left-4 top-24 space-y-1 border border-[var(--color-bt-border)] bg-[var(--color-bt-overlay)] px-3 py-2 font-bt-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-bt-muted-foreground)] backdrop-blur-sm">
              <p>{dataBadge.sourceText}</p>
              {dataBadge.dateText && <p>{dataBadge.dateText}</p>}
              {isBootstrapping && <p className="text-[var(--color-bt-accent)]">正在初始化数据...</p>}
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
