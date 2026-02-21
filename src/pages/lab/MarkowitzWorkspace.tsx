import { useEffect } from "react"
import { Scene } from "@/algorithms/markowitz/Scene"
import { useMarkowitzSession } from "@/algorithms/markowitz/useSession"
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
      <div className="mr-2 flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="font-mono text-[10px] uppercase tracking-wider text-gray-400">
            当前夏普
          </span>
          <span className="font-display text-sm font-bold text-rf-accent">
            {markowitz.metrics.current.sharpe.toFixed(3)}
          </span>
        </div>
        <div className="h-6 w-px bg-white/10" />
        <div className="flex flex-col items-end">
          <span className="font-mono text-[10px] uppercase tracking-wider text-gray-400">
            收益率 / 波动率
          </span>
          <span className="font-mono text-[11px] text-white">
            {formatPercent(markowitz.metrics.current.expectedReturn)} / {formatPercent(markowitz.metrics.current.volatility)}
          </span>
        </div>
      </div>,
    )
  }, [markowitz.metrics, onActions])

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <Scene layer={markowitz.renderLayer} />
    </div>
  )
}
