import { useEffect } from "react";
import { useKalmanSession } from "@/algorithms/kalman-filter/useSession";
import { VolatilityChart } from "@/algorithms/kalman-filter/VolatilityChart";
import type { LabStatusTone } from "@/components/ui/LabStatusStrip";
import { Sidebar } from "@/pages/lab/kalman-filter/components/Sidebar";
import type { LabWorkspaceProps } from "@/pages/lab/types";

const toRegimeLabel = (regime: "low" | "medium" | "high") => {
	if (regime === "low") return "低风险";
	if (regime === "high") return "高风险";
	return "中风险";
};

const toRegimeTone = (regime: "low" | "medium" | "high"): LabStatusTone => {
	if (regime === "low") return "success";
	if (regime === "high") return "danger";
	return "warning";
};

const toPhaseTone = (phase: "rising" | "falling" | "shock" | "stable"): LabStatusTone => {
	if (phase === "rising") return "danger";
	if (phase === "falling") return "success";
	if (phase === "shock") return "warning";
	return "muted";
};

export function KalmanWorkspace({
	onSidebar,
	onHeaderAction,
	onStatus,
}: LabWorkspaceProps) {
	const kalman = useKalmanSession();
	const hasData = kalman.result.steps.length > 0;
	const regime = kalman.result.regime;
	const phase = kalman.result.momentum.phase;
	const phaseLabel = kalman.result.momentum.phaseLabel;
	const kalmanSigma = kalman.result.currentVol;
	const ewmaSigma = kalman.result.ewma.currentVol;

	// biome-ignore lint/correctness/useExhaustiveDependencies: 依赖 session 整体
	useEffect(() => {
		onSidebar(<Sidebar session={kalman} />);
	}, [kalman, onSidebar]);

	useEffect(() => {
		onHeaderAction(null);
		return () => onHeaderAction(null);
	}, [onHeaderAction]);

	const statusTone = toRegimeTone(regime);
	const riskValue = hasData ? toRegimeLabel(regime) : "等待数据";
	const kalmanSigmaValue = hasData ? `${(kalmanSigma * 100).toFixed(1)}%` : "--";
	const ewmaSigmaValue = hasData ? `${(ewmaSigma * 100).toFixed(1)}%` : "--";
	const phaseValue = hasData ? phaseLabel : "--";
	const phaseTone = hasData ? toPhaseTone(phase) : "muted";

	useEffect(() => {
		onStatus({
			title: "Kalman Filter Status",
			metrics: [
				{
					id: "kalman-risk",
					label: "风险状态",
					value: riskValue,
					tone: hasData ? statusTone : "muted",
				},
				{
					id: "kalman-sigma",
					label: "Kalman σ",
					value: kalmanSigmaValue,
					tone: hasData ? "foreground" : "muted",
				},
				{
					id: "ewma-sigma",
					label: "EWMA σ",
					value: ewmaSigmaValue,
					tone: hasData ? "warning" : "muted",
				},
				{
					id: "kalman-phase",
					label: "Phase",
					value: phaseValue,
					tone: phaseTone,
				},
			],
			loading: !hasData,
		});
	}, [
		ewmaSigmaValue,
		hasData,
		kalmanSigmaValue,
		onStatus,
		phaseTone,
		phaseValue,
		riskValue,
		statusTone,
	]);

	useEffect(() => {
		return () => onStatus(null);
	}, [onStatus]);

	return (
		<div className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-4">
			<div className="h-full min-h-0 border border-[var(--color-bt-border)] bg-[var(--color-bt-background)]">
				<VolatilityChart
					result={kalman.result}
					dailyReturns={kalman.dailyReturns}
					isBootstrapping={kalman.isBootstrapping}
				/>
			</div>
		</div>
	);
}
