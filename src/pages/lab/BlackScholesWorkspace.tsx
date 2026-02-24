import { useEffect } from "react";
import { useBSSession } from "@/algorithms/black-scholes/useSession";
import { Scene } from "@/algorithms/black-scholes/Scene";
import { Sidebar } from "@/pages/lab/black-scholes/components/Sidebar";
import type { LabWorkspaceProps } from "@/pages/lab/types";

export function BlackScholesWorkspace({
	onSidebar,
	onHeaderAction,
	onStatus,
}: LabWorkspaceProps) {
	const bs = useBSSession();
	const optionPrice = bs.currentResult.price.toFixed(4);
	const delta = bs.currentResult.delta.toFixed(3);
	const gamma = bs.currentResult.gamma.toFixed(3);
	const theta = bs.currentResult.theta.toFixed(3);

	// biome-ignore lint/correctness/useExhaustiveDependencies: 依赖 bs 整体
	useEffect(() => {
		onSidebar(<Sidebar session={bs} />);
	}, [bs, onSidebar]);

	useEffect(() => {
		onHeaderAction(null);
		return () => onHeaderAction(null);
	}, [onHeaderAction]);

	useEffect(() => {
		onStatus({
			title: "Black-Scholes Status",
			metrics: [
				{
					id: "bs-price",
					label: "Option Price",
					value: optionPrice,
					tone: "accent",
				},
				{
					id: "bs-delta",
					label: "Δ",
					value: delta,
					tone: "foreground",
				},
				{
					id: "bs-gamma",
					label: "Γ",
					value: gamma,
					tone: "foreground",
				},
				{
					id: "bs-theta",
					label: "θ",
					value: theta,
					tone: "warning",
				},
			],
		});
	}, [delta, gamma, onStatus, optionPrice, theta]);

	useEffect(() => {
		return () => onStatus(null);
	}, [onStatus]);

	return (
		<div className="relative flex h-full  flex-1 flex-col overflow-hidden p-4">
			<div className="relative min-h-0 flex-1 overflow-hidden border border-[var(--color-bt-border)] bg-[var(--color-bt-background)]">
				<Scene session={bs} isBootstrapping={bs.isBootstrapping} />
			</div>
		</div>
	);
}
