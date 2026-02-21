import { useEffect } from "react";
import { useMonteCarloSession } from "@/algorithms/monte-carlo/useSession";
import { ReturnDistribution } from "@/algorithms/monte-carlo/ReturnDistribution";
import { MaterialIcon } from "@/components/Logo";
import { Sidebar } from "./monte-carlo/components/Sidebar";
import { Footer } from "./monte-carlo/components/Footer";
import { TRADING_DAYS_PER_YEAR } from "@/algorithms/shared/constants";

interface MonteCarloWorkspaceProps {
  onSidebar: (node: React.ReactNode) => void;
  onActions: (node: React.ReactNode) => void;
}

export function MonteCarloWorkspace({ onSidebar, onActions }: MonteCarloWorkspaceProps) {
  const monteCarlo = useMonteCarloSession();
  const {
    input,
    metrics,
    terminalPrices,
    isPlaying,
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

  return (
    <>
      <div className="relative flex-1 flex flex-col gap-2 p-4 min-h-0 overflow-hidden">
        <div className="h-full min-h-0">
          <ReturnDistribution
            key={`${input.seed}`}
            terminalPrices={terminalPrices}
            initialPrice={input.initialPrice}
            paths={input.paths}
            latestDataDate={marketDataMeta.latestDataDate}
            visiblePaths={Math.ceil(
              metrics.progress * input.paths,
            )}
          />
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
