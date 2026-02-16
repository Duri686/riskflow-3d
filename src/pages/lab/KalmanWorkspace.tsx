import { useKalmanSession } from "../../algorithms/kalman-filter/useSession";
import { VolatilityChart } from "../../algorithms/kalman-filter/VolatilityChart";
import { LabLayout } from "./LabLayout";
import { Sidebar } from "./kalman-filter/components/Sidebar";

export function KalmanWorkspace() {
  const kalman = useKalmanSession();

  return (
    <LabLayout activeId="kalman-filter" sidebar={<Sidebar session={kalman} />}>
      <div className="relative flex-1 flex flex-col gap-2 p-4 min-h-0 overflow-hidden">
        <div className="h-full min-h-0">
          <VolatilityChart
            result={kalman.result}
            dailyReturns={kalman.dailyReturns}
          />
        </div>
      </div>
    </LabLayout>
  );
}
