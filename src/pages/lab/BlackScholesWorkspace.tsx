import { useEffect } from "react";
import { useBSSession } from "@/algorithms/black-scholes/useSession";
import { Scene } from "@/algorithms/black-scholes/Scene";
import {
	WorkspaceActionDivider,
	WorkspaceActionMetric,
	WorkspaceActionsShell,
} from "@/components/ui/WorkspaceActions";
import { Sidebar } from "./black-scholes/components/Sidebar";

interface BlackScholesWorkspaceProps {
	onSidebar: (node: React.ReactNode) => void;
	onActions: (node: React.ReactNode) => void;
}

export function BlackScholesWorkspace({ onSidebar, onActions }: BlackScholesWorkspaceProps) {
	const bs = useBSSession();

	// Inject sidebar
	// biome-ignore lint/correctness/useExhaustiveDependencies: 依赖 bs 整体
	useEffect(() => {
		onSidebar(<Sidebar session={bs} />);
	}, [bs, onSidebar]);

	// Actions (Header metric results)
	useEffect(() => {
		onActions(
			<WorkspaceActionsShell>
				<WorkspaceActionMetric
					label="Option Price"
					value={bs.currentResult.price.toFixed(4)}
					tone="accent"
				/>
				<WorkspaceActionDivider />
				<div className="flex items-center gap-3">
					{[
						{ label: "Δ", val: bs.currentResult.delta },
						{ label: "Γ", val: bs.currentResult.gamma },
						{ label: "θ", val: bs.currentResult.theta },
					].map((g) => (
						<WorkspaceActionMetric
							key={g.label}
							label={g.label}
							value={g.val.toFixed(3)}
							align="start"
						/>
					))}
				</div>
			</WorkspaceActionsShell>
		);
	}, [bs.currentResult, onActions]);

	return (
		<div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
			<Scene session={bs} isBootstrapping={bs.isBootstrapping} />
		</div>
	);
}
