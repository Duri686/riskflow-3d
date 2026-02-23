import {
	ShieldAlert,
	ShieldCheck,
	TrendingUp,
	TrendingDown,
	type LucideIcon,
} from "lucide-react";
import type { MonteCarloMetricsPanel } from "@/algorithms/monte-carlo/engine";
import {
	BtSidebarSection,
	BtSidebarStatusChip,
	BtSidebarValueRow,
	type BtSidebarTone,
} from "@/components/ui/BtSidebarPrimitives";

interface RiskCardProps {
	metrics: MonteCarloMetricsPanel;
}

/** 综合风险评价逻辑 */
function getVerdict(
	winRate: number,
	upDownRatio: number,
	medianReturn: number,
): { icon: LucideIcon; text: string; colorClass: string; tone: BtSidebarTone } {
	if (winRate >= 0.6 && upDownRatio >= 1.5 && medianReturn > 0.05) {
		return {
			icon: ShieldCheck,
			text: "风险可控，正向预期",
			colorClass: "text-[var(--color-bt-success)]",
			tone: "success",
		};
	}
	if (winRate >= 0.5 && medianReturn > 0) {
		return {
			icon: TrendingUp,
			text: "中性偏多，注意仓位",
			colorClass: "text-[var(--color-bt-success)]",
			tone: "success",
		};
	}
	if (winRate >= 0.4) {
		return {
			icon: ShieldAlert,
			text: "风险较高，建议观望",
			colorClass: "text-[var(--color-bt-warning)]",
			tone: "warning",
		};
	}
	return {
		icon: TrendingDown,
		text: "风险极高，不建议入场",
		colorClass: "text-[var(--color-bt-danger)]",
		tone: "danger",
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
		<BtSidebarSection
			title="Risk Verdict"
			icon={<ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.5} />}
		>
			<BtSidebarStatusChip
				icon={<VerdictIcon className={`h-4 w-4 shrink-0 ${verdict.colorClass}`} strokeWidth={1.5} />}
				label={verdict.text}
				tone={verdict.tone}
				className="min-h-0 py-2 text-[11px] normal-case tracking-[0.06em]"
			/>

			<div className="space-y-2">
				<BtSidebarValueRow
					label="当前均价"
					value={`$${metrics.current.meanPrice.toFixed(2)}`}
					tone="foreground"
				/>
				<BtSidebarValueRow
					label="价格区间 5~95%"
					value={
						<span className="font-bt-mono">
							<span className="text-[var(--color-bt-danger)]">
								${metrics.current.p05Price.toFixed(0)}
							</span>
							<span className="text-[var(--color-bt-muted-foreground)]"> ~ </span>
							<span className="text-[var(--color-bt-success)]">
								${metrics.current.p95Price.toFixed(0)}
							</span>
						</span>
					}
					tone="foreground"
				/>
				<BtSidebarValueRow
					label="盈亏比"
					value={(metrics.final.upDownRatio ?? 0).toFixed(2)}
					tone={(metrics.final.upDownRatio ?? 0) >= 1 ? "success" : "danger"}
					withDivider={false}
				/>
			</div>
		</BtSidebarSection>
	);
}
