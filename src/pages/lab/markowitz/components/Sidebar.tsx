import { MetricsPanel } from "@/algorithms/markowitz/MetricsPanel";
import { ParamsPanel } from "@/algorithms/markowitz/ParamsPanel";
import type { MarkowitzSession } from "@/algorithms/markowitz/useSession";

interface SidebarProps {
	session: MarkowitzSession;
}

export function Sidebar({ session }: SidebarProps) {
	return (
		<section className="bt-sidebar-section">
			<div className="space-y-4">
				<ParamsPanel session={session} />
				<MetricsPanel metrics={session.metrics} assets={session.assets} />
			</div>
		</section>
	);
}
