import { useEffect } from "react";
import { useBSSession } from "@/algorithms/black-scholes/useSession";
import { Scene } from "@/algorithms/black-scholes/Scene";
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
			<div className="flex items-center gap-4 mr-2">
				<div className="flex flex-col items-end">
					<span className="text-[10px] uppercase text-gray-400 font-mono tracking-wider">Option Price</span>
					<span className="text-rf-primary font-bold font-display text-sm">
						{bs.currentResult.price.toFixed(4)}
					</span>
				</div>
				<div className="h-6 w-px bg-white/10" />
				<div className="flex items-center gap-3">
					{[
						{ label: "Δ", val: bs.currentResult.delta },
						{ label: "Γ", val: bs.currentResult.gamma },
						{ label: "θ", val: bs.currentResult.theta },
					].map((g) => (
						<div key={g.label} className="flex flex-col items-start min-w-[32px]">
							<span className="text-[10px] uppercase text-gray-500 font-mono">{g.label}</span>
							<span className="text-white text-[11px] font-mono font-bold">
								{g.val.toFixed(3)}
							</span>
						</div>
					))}
				</div>
			</div>
		);
	}, [bs.currentResult, onActions]);

	return (
		<div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
			<Scene session={bs} />
		</div>
	);
}
