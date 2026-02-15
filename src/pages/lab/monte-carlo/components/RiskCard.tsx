import { ShieldAlert, ShieldCheck, TrendingUp, TrendingDown } from "lucide-react";
import type { MonteCarloMetricsPanel } from "../../../../algorithms/monte-carlo/engine";

interface RiskCardProps {
  metrics: MonteCarloMetricsPanel;
}

/** 综合风险评价逻辑 */
function getVerdict(
  winRate: number,
  upDownRatio: number,
  medianReturn: number,
) {
  if (winRate >= 0.6 && upDownRatio >= 1.5 && medianReturn > 0.05) {
    return {
      icon: ShieldCheck,
      text: "风险可控，正向预期",
      color: "text-[#00D4AA]",
      bg: "bg-[#00D4AA]/10 border-[#00D4AA]/30",
    };
  }
  if (winRate >= 0.5 && medianReturn > 0) {
    return {
      icon: TrendingUp,
      text: "中性偏多，注意仓位",
      color: "text-[#00D4AA]",
      bg: "bg-[#00D4AA]/10 border-[#00D4AA]/30",
    };
  }
  if (winRate >= 0.4) {
    return {
      icon: ShieldAlert,
      text: "风险较高，建议观望",
      color: "text-yellow-400",
      bg: "bg-yellow-400/10 border-yellow-400/30",
    };
  }
  return {
    icon: TrendingDown,
    text: "风险极高，不建议入场",
    color: "text-[#FF4757]",
    bg: "bg-[#FF4757]/10 border-[#FF4757]/30",
  };
}

export function RiskCard({ metrics }: RiskCardProps) {
  const winRate = 1 - metrics.final.lossProbability;
  const verdict = getVerdict(
    winRate,
    metrics.final.upDownRatio ?? 0,
    metrics.final.medianReturn,
  );
  const VerdictIcon = verdict.icon;

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-display text-xs font-bold tracking-widest text-white">
          <ShieldAlert className="h-3.5 w-3.5 text-yellow-400" />
          风险评估
        </h2>
      </div>

      {/* 综合评价卡片 */}
      <div
        className={`mb-3 flex items-center gap-2 rounded border p-2.5 ${verdict.bg}`}
      >
        <VerdictIcon className={`h-4 w-4 shrink-0 ${verdict.color}`} />
        <span className={`font-display text-xs font-bold ${verdict.color}`}>
          {verdict.text}
        </span>
      </div>

      {/* 关键指标 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between font-mono text-[10px]">
          <span className="text-gray-500">当前均价</span>
          <span className="font-semibold text-white">
            ${metrics.current.meanPrice.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between font-mono text-[10px]">
          <span className="text-gray-500">价格区间 (5~95%)</span>
          <span className="text-white">
            <span className="text-[#FF4757]">
              ${metrics.current.p05Price.toFixed(0)}
            </span>
            <span className="text-gray-600"> ~ </span>
            <span className="text-[#00D4AA]">
              ${metrics.current.p95Price.toFixed(0)}
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between font-mono text-[10px]">
          <span className="text-gray-500">盈亏比</span>
          <span
            className={`font-semibold ${(metrics.final.upDownRatio ?? 0) >= 1 ? "text-[#00D4AA]" : "text-[#FF4757]"}`}
          >
            {(metrics.final.upDownRatio ?? 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
