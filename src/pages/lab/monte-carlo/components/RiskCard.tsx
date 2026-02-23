import { ShieldAlert, ShieldCheck, TrendingUp, TrendingDown } from "lucide-react";
import type { MonteCarloMetricsPanel } from "@/algorithms/monte-carlo/engine";
import { BtSectionHeading } from "@/components/ui/BtSectionHeading";

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
			colorClass: "text-[var(--color-bt-success)]",
			panelClass: "border-[var(--color-bt-success)]/40 bg-[var(--color-bt-success-soft)]",
		};
	}
	if (winRate >= 0.5 && medianReturn > 0) {
		return {
			icon: TrendingUp,
			text: "中性偏多，注意仓位",
			colorClass: "text-[var(--color-bt-success)]",
			panelClass: "border-[var(--color-bt-success)]/40 bg-[var(--color-bt-success-soft)]",
		};
	}
	if (winRate >= 0.4) {
		return {
			icon: ShieldAlert,
			text: "风险较高，建议观望",
			colorClass: "text-[var(--color-bt-warning)]",
			panelClass: "border-[var(--color-bt-warning)]/40 bg-[var(--color-bt-warning-soft)]",
		};
	}
	return {
		icon: TrendingDown,
		text: "风险极高，不建议入场",
		colorClass: "text-[var(--color-bt-danger)]",
		panelClass: "border-[var(--color-bt-danger)]/40 bg-[var(--color-bt-danger-soft)]",
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
		<section className="border-b border-[var(--color-bt-border)] px-4 py-5">
			<BtSectionHeading
				title="Risk Verdict"
				icon={<ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.5} />}
			/>

			<div
				className={`mt-4 flex items-center gap-2 border px-3 py-2 ${verdict.panelClass}`}
			>
				<VerdictIcon className={`h-4 w-4 shrink-0 ${verdict.colorClass}`} strokeWidth={1.5} />
				<span className={`font-bt-sans text-sm font-semibold ${verdict.colorClass}`}>
					{verdict.text}
				</span>
			</div>

			<div className="mt-4 space-y-2">
				<div className="flex items-center justify-between border-b border-[var(--color-bt-border)] pb-2 font-bt-mono text-[10px] uppercase tracking-[0.12em]">
					<span className="text-[var(--color-bt-muted-foreground)]">当前均价</span>
					<span className="font-semibold text-[var(--color-bt-foreground)]">
						${metrics.current.meanPrice.toFixed(2)}
					</span>
				</div>
				<div className="flex items-center justify-between border-b border-[var(--color-bt-border)] pb-2 font-bt-mono text-[10px] uppercase tracking-[0.12em]">
					<span className="text-[var(--color-bt-muted-foreground)]">价格区间 5~95%</span>
					<span className="text-[var(--color-bt-foreground)]">
						<span className="text-[var(--color-bt-danger)]">${metrics.current.p05Price.toFixed(0)}</span>
						<span className="text-[var(--color-bt-muted-foreground)]"> ~ </span>
						<span className="text-[var(--color-bt-success)]">${metrics.current.p95Price.toFixed(0)}</span>
					</span>
				</div>
				<div className="flex items-center justify-between font-bt-mono text-[10px] uppercase tracking-[0.12em]">
					<span className="text-[var(--color-bt-muted-foreground)]">盈亏比</span>
					<span
						className={`font-semibold ${(metrics.final.upDownRatio ?? 0) >= 1 ? "text-[var(--color-bt-success)]" : "text-[var(--color-bt-danger)]"}`}
					>
						{(metrics.final.upDownRatio ?? 0).toFixed(2)}
					</span>
				</div>
			</div>
		</section>
	);
}
