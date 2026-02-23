import { useEffect } from "react"
import { Scene } from "@/algorithms/markowitz/Scene"
import { useMarkowitzSession } from "@/algorithms/markowitz/useSession"
import {
  WorkspaceActionDivider,
  WorkspaceActionMetric,
  WorkspaceActionsShell,
} from "@/components/ui/WorkspaceActions"
import { Sidebar } from "./markowitz/components/Sidebar"

interface MarkowitzWorkspaceProps {
  onSidebar: (node: React.ReactNode) => void
  onActions: (node: React.ReactNode) => void
}

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`

export function MarkowitzWorkspace({
  onSidebar,
  onActions,
}: MarkowitzWorkspaceProps) {
  const markowitz = useMarkowitzSession()

  useEffect(() => {
    onSidebar(<Sidebar session={markowitz} />)
  }, [markowitz, onSidebar])

  useEffect(() => {
    onActions(
      <WorkspaceActionsShell>
        <WorkspaceActionMetric
          label="当前夏普"
          value={markowitz.metrics.current.sharpe.toFixed(3)}
          tone="accent"
        />
        <WorkspaceActionDivider />
        <WorkspaceActionMetric
          label="收益率 / 波动率"
          value={`${formatPercent(markowitz.metrics.current.expectedReturn)} / ${formatPercent(markowitz.metrics.current.volatility)}`}
        />
      </WorkspaceActionsShell>,
    )
  }, [markowitz.metrics, onActions])

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <Scene layer={markowitz.renderLayer} />
    </div>
  )
}
