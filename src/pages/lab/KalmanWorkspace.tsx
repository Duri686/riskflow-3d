import { useEffect } from "react";
import { useKalmanSession } from "@/algorithms/kalman-filter/useSession";
import { VolatilityChart } from "@/algorithms/kalman-filter/VolatilityChart";
import {
	WorkspaceActionDivider,
	WorkspaceActionMetric,
	WorkspaceActionsShell,
} from "@/components/ui/WorkspaceActions";
import { Sidebar } from "./kalman-filter/components/Sidebar";

interface KalmanWorkspaceProps {
  onSidebar: (node: React.ReactNode) => void;
  onActions: (node: React.ReactNode) => void;
}

export function KalmanWorkspace({ onSidebar, onActions }: KalmanWorkspaceProps) {
  const kalman = useKalmanSession();
  const hasData = kalman.result.steps.length > 0;

  const regimeLabel =
    kalman.result.regime === "low"
      ? "低风险"
      : kalman.result.regime === "high"
        ? "高风险"
        : "中风险";
  const regimeTone =
    kalman.result.regime === "low"
      ? "success"
      : kalman.result.regime === "high"
        ? "danger"
        : "warning";

  // 注入 sidebar
  // biome-ignore lint/correctness/useExhaustiveDependencies: 依赖 session 整体
  useEffect(() => {
    onSidebar(<Sidebar session={kalman} />);
  }, [kalman, onSidebar]);

	useEffect(() => {
    if (!hasData) {
      onActions(
        <WorkspaceActionsShell>
          <WorkspaceActionMetric
            label="Kalman"
            value="等待数据"
            tone="muted"
          />
        </WorkspaceActionsShell>,
      );
      return;
    }

    onActions(
      <WorkspaceActionsShell>
        <WorkspaceActionMetric
          label="风险状态"
          value={regimeLabel}
          tone={regimeTone}
        />
        <WorkspaceActionDivider />
        <WorkspaceActionMetric
          label="Kalman sigma"
          value={`${(kalman.result.currentVol * 100).toFixed(1)}%`}
        />
        <WorkspaceActionDivider />
        <WorkspaceActionMetric
          label="Phase"
          value={kalman.result.momentum.phaseLabel}
          tone={regimeTone}
        />
      </WorkspaceActionsShell>,
    );
  }, [
    hasData,
    kalman.result.currentVol,
    kalman.result.momentum.phaseLabel,
    onActions,
    regimeLabel,
    regimeTone,
  ]);

  return (
    <div className="relative flex-1 flex flex-col gap-2 p-4 min-h-0 overflow-hidden">
      <div className="h-full min-h-0">
        <VolatilityChart
          result={kalman.result}
          dailyReturns={kalman.dailyReturns}
          isBootstrapping={kalman.isBootstrapping}
        />
      </div>
    </div>
  );
}
