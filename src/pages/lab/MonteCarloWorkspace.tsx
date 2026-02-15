import { useEffect } from "react";
import { useMonteCarloSession } from "@/algorithms/monte-carlo/useSession";
import { ReturnDistribution } from "@/algorithms/monte-carlo/ReturnDistribution";
import { LabLayout } from "./LabLayout";
import { MaterialIcon } from "@/components/Logo";
import { Sidebar } from "./monte-carlo/components/Sidebar";
import { Footer } from "./monte-carlo/components/Footer";
import { TRADING_DAYS_PER_YEAR } from "@/algorithms/monte-carlo/constants";

export function MonteCarloWorkspace() {
  const monteCarlo = useMonteCarloSession();

  // 自动计算时间步数 Logic (Business Rule: Steps should align with years)
  // biome-ignore lint/correctness/useExhaustiveDependencies: trigger only on years change
  // biome-ignore lint/correctness/useExhaustiveDependencies: trigger only on years change
  useEffect(() => {
    const autoSteps = Math.round(monteCarlo.input.years * TRADING_DAYS_PER_YEAR);
    if (monteCarlo.input.steps !== autoSteps) {
      monteCarlo.updateInput("steps", autoSteps);
    }
  }, [monteCarlo.input.years]);

  const computedSteps = Math.round(monteCarlo.metrics.progress * monteCarlo.input.steps);
  const totalSteps = monteCarlo.input.steps;

  const actions = (
    <button
      type="button"
      onClick={() => monteCarlo.resimulate()}
      className="flex h-8 w-8 items-center justify-center rounded border border-white/10 bg-transparent text-rf-primary hover:bg-rf-primary/10"
      title="重新模拟"
    >
      <MaterialIcon name="bolt" className="text-base" />
    </button>
  );

  return (
    <LabLayout 
      activeId="monte-carlo" 
      sidebar={<Sidebar session={monteCarlo} />} 
      actions={actions}
    >
      <div className="relative flex-1 flex flex-col gap-2 p-4 min-h-0 overflow-hidden">
        <div className="h-full min-h-0">
          <ReturnDistribution
            key={`${monteCarlo.input.seed}`}
            terminalPrices={monteCarlo.terminalPrices}
            initialPrice={monteCarlo.input.initialPrice}
            paths={monteCarlo.input.paths}
            visiblePaths={Math.ceil(
              monteCarlo.metrics.progress * monteCarlo.input.paths,
            )}
          />
        </div>
      </div>

      <Footer 
        progress={monteCarlo.metrics.progress}
        currentStep={computedSteps}
        totalSteps={totalSteps}
        isPlaying={monteCarlo.isPlaying}
        onTogglePlay={monteCarlo.togglePlaying}
      />
    </LabLayout>
  );
}
