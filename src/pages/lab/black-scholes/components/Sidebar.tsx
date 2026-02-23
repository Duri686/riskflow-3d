import { Activity, Settings2 } from "lucide-react";
import type { OptionType } from "@/algorithms/black-scholes/engine";
import type {
	MetricType,
	useBSSession,
} from "@/algorithms/black-scholes/useSession";
import {
	BtSidebarRangeRow,
	BtSidebarSection,
	BtSidebarSegmented,
} from "@/components/ui/BtSidebarPrimitives";

interface SidebarProps {
	session: ReturnType<typeof useBSSession>;
}

const metricOptions: Array<{ value: MetricType; label: string }> = [
	{ value: "price", label: "Price" },
	{ value: "delta", label: "Delta" },
	{ value: "gamma", label: "Gamma" },
	{ value: "vega", label: "Vega" },
	{ value: "theta", label: "Theta" },
	{ value: "rho", label: "Rho" },
];

const optionTypeOptions: Array<{ value: OptionType; label: string }> = [
	{ value: "call", label: "CALL" },
	{ value: "put", label: "PUT" },
];

export function Sidebar({ session }: SidebarProps) {
	const { params, updateParams, activeMetric, setActiveMetric, S_RANGE, T_RANGE } =
		session;

	return (
		<section className="bt-sidebar-section">
			<div className="space-y-4">
				<BtSidebarSection
					title="Metric Axis"
					variant="panel"
					icon={<Activity className="h-3.5 w-3.5" strokeWidth={1.5} />}
				>
					<BtSidebarSegmented
						options={metricOptions}
						value={activeMetric}
						onChange={setActiveMetric}
						columns={2}
					/>
				</BtSidebarSection>

				<BtSidebarSection
					title="Option Type"
					variant="panel"
					icon={<Settings2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
				>
					<BtSidebarSegmented
						options={optionTypeOptions}
						value={params.type}
						onChange={(value) => updateParams({ type: value })}
						columns={2}
					/>
				</BtSidebarSection>

				<BtSidebarSection
					title="Parameters"
					variant="panel"
					icon={<Settings2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
				>
					<BtSidebarRangeRow
						label="Strike Price K"
						value={params.strike}
						min={S_RANGE.min}
						max={S_RANGE.max}
						step={1}
						sliderValue={params.strike}
						onChange={(value) => updateParams({ strike: value })}
					/>
					<BtSidebarRangeRow
						label="Volatility sigma"
						value={`${(params.volatility * 100).toFixed(0)}%`}
						min={0.1}
						max={1.5}
						step={0.01}
						sliderValue={params.volatility}
						onChange={(value) => updateParams({ volatility: value })}
					/>
					<BtSidebarRangeRow
						label="Risk-free Rate"
						value={`${(params.rate * 100).toFixed(1)}%`}
						min={0}
						max={0.1}
						step={0.001}
						sliderValue={params.rate}
						onChange={(value) => updateParams({ rate: value })}
					/>
					<BtSidebarRangeRow
						label="Marker Spot S"
						value={params.spot}
						min={S_RANGE.min}
						max={S_RANGE.max}
						step={1}
						sliderValue={params.spot}
						onChange={(value) => updateParams({ spot: value })}
						labelClassName="text-[var(--color-bt-accent)]"
					/>
					<BtSidebarRangeRow
						label="Marker Time T"
						value={`${params.time.toFixed(2)} Y`}
						min={T_RANGE.min}
						max={T_RANGE.max}
						step={0.01}
						sliderValue={params.time}
						onChange={(value) => updateParams({ time: value })}
						labelClassName="text-[var(--color-bt-accent)]"
					/>
				</BtSidebarSection>
			</div>
		</section>
	);
}
