import { useEffect } from "react";
import { Scene } from "@/algorithms/markowitz/Scene";
import { useMarkowitzSession } from "@/algorithms/markowitz/useSession";
import { Sidebar } from "@/pages/lab/markowitz/components/Sidebar";
import type { LabWorkspaceProps } from "@/pages/lab/types";

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

export function MarkowitzWorkspace({
	onSidebar,
	onHeaderAction,
	onStatus,
}: LabWorkspaceProps) {
	const markowitz = useMarkowitzSession();
	const sharpe = markowitz.metrics.current.sharpe;
	const expectedReturn = markowitz.metrics.current.expectedReturn;
	const volatility = markowitz.metrics.current.volatility;
	const diversificationScore = markowitz.metrics.diversificationScore;
	const sharpeValue = sharpe.toFixed(3);
	const returnValue = formatPercent(expectedReturn);
	const volatilityValue = formatPercent(volatility);
	const diversificationValue = `${diversificationScore.toFixed(0)}/100`;

	useEffect(() => {
		onSidebar(<Sidebar session={markowitz} />);
	}, [markowitz, onSidebar]);

	useEffect(() => {
		onHeaderAction(null);
		return () => onHeaderAction(null);
	}, [onHeaderAction]);

	useEffect(() => {
		onStatus({
			title: "Markowitz Status",
			metrics: [
				{
					id: "mkt-sharpe",
					label: "Sharpe",
					value: sharpeValue,
					tone: "accent",
				},
				{
					id: "mkt-return",
					label: "收益率",
					value: returnValue,
					tone: "foreground",
				},
				{
					id: "mkt-vol",
					label: "波动率",
					value: volatilityValue,
					tone: "warning",
				},
				{
					id: "mkt-diversification",
					label: "分散化评分",
					value: diversificationValue,
					tone: "success",
				},
			],
		});
	}, [
		diversificationValue,
		onStatus,
		returnValue,
		sharpeValue,
		volatilityValue,
	]);

	useEffect(() => {
		return () => onStatus(null);
	}, [onStatus]);

	return (
		<div className="relative flex h-full  flex-1 flex-col overflow-hidden p-4">
			<div className="relative min-h-0 flex-1 overflow-hidden border border-[var(--color-bt-border)] bg-[var(--color-bt-background)]">
				<Scene layer={markowitz.renderLayer} />
			</div>
		</div>
	);
}
