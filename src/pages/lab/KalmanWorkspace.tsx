import { useEffect } from "react";
import { useKalmanSession } from "../../algorithms/kalman-filter/useSession";
import { VolatilityChart } from "../../algorithms/kalman-filter/VolatilityChart";
import { Sidebar } from "./kalman-filter/components/Sidebar";

interface KalmanWorkspaceProps {
  onSidebar: (node: React.ReactNode) => void;
  onActions: (node: React.ReactNode) => void;
}

export function KalmanWorkspace({ onSidebar, onActions }: KalmanWorkspaceProps) {
  const kalman = useKalmanSession();

  // 注入 sidebar
  // biome-ignore lint/correctness/useExhaustiveDependencies: 依赖 session 整体
  useEffect(() => {
    onSidebar(<Sidebar session={kalman} />);
  }, [kalman, onSidebar]);

  // 无特殊 actions
  useEffect(() => {
    onActions(null);
  }, [onActions]);

  return (
    <div className="relative flex-1 flex flex-col gap-2 p-4 min-h-0 overflow-hidden">
      <div className="h-full min-h-0">
        <VolatilityChart
          result={kalman.result}
          dailyReturns={kalman.dailyReturns}
        />
      </div>
    </div>
  );
}
