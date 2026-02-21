import type { OptionType } from "@/algorithms/black-scholes/engine";
import type { MetricType, useBSSession } from "@/algorithms/black-scholes/useSession";
import { MaterialIcon } from "@/components/Logo";

interface SidebarProps {
	session: ReturnType<typeof useBSSession>;
}

export function Sidebar({ session }: SidebarProps) {
	const { params, updateParams, activeMetric, setActiveMetric, S_RANGE, T_RANGE } = session;

	const metrics: { id: MetricType; label: string }[] = [
		{ id: "price", label: "Price" },
		{ id: "delta", label: "Delta" },
		{ id: "gamma", label: "Gamma" },
		{ id: "vega", label: "Vega" },
		{ id: "theta", label: "Theta" },
		{ id: "rho", label: "Rho" },
	];
	const optionTypes: OptionType[] = ["call", "put"];

	return (
		<div className="flex flex-col gap-6 p-4">
			{/* Metric Toggle */}
			<section>
				<h3 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-widest text-rf-primary uppercase">
					<MaterialIcon name="show_chart" className="text-sm" />
					Metric (Z-Axis)
				</h3>
				<div className="grid grid-cols-2 gap-2">
					{metrics.map((m) => (
						<button
							key={m.id}
							type="button"
							onClick={() => setActiveMetric(m.id)}
							className={`h-9 rounded-lg border text-xs font-bold transition-all ${
								activeMetric === m.id
									? "border-rf-primary bg-rf-primary/20 text-rf-primary shadow-[0_0_15px_rgba(139,92,246,0.3)]"
									: "border-white/5 bg-white/5 text-gray-500 hover:bg-white/10"
							}`}
						>
							{m.label}
						</button>
					))}
				</div>
			</section>

			{/* Option Type */}
			<section>
				<h3 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-widest text-rf-primary uppercase">
					<MaterialIcon name="category" className="text-sm" />
					Option Type
				</h3>
				<div className="flex bg-white/5 p-1 rounded-lg">
					{optionTypes.map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => updateParams({ type: t })}
							className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${
								params.type === t
									? "bg-rf-primary text-white shadow-lg"
									: "text-gray-500 hover:text-gray-300"
							}`}
						>
							{t.toUpperCase()}
						</button>
					))}
				</div>
			</section>

			{/* Parameters */}
			<section className="flex flex-col gap-4">
				<h3 className="flex items-center gap-2 text-xs font-bold tracking-widest text-rf-primary uppercase">
					<MaterialIcon name="settings" className="text-sm" />
					Parameters
				</h3>

				{/* Strike Price */}
				<div className="flex flex-col gap-2">
					<div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-gray-400">
						<span>Strike Price (K)</span>
						<span className="text-white font-bold">{params.strike}</span>
					</div>
					<input
						type="range"
						min={S_RANGE.min}
						max={S_RANGE.max}
						step={1}
						value={params.strike}
						onChange={(e) => updateParams({ strike: Number(e.target.value) })}
						className="rf-range h-1"
					/>
				</div>

				{/* Volatility */}
				<div className="flex flex-col gap-2">
					<div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-gray-400">
						<span>Volatility (σ)</span>
						<span className="text-white font-bold">{(params.volatility * 100).toFixed(0)}%</span>
					</div>
					<input
						type="range"
						min={0.1}
						max={1.5}
						step={0.01}
						value={params.volatility}
						onChange={(e) => updateParams({ volatility: Number(e.target.value) })}
						className="rf-range h-1"
					/>
				</div>

				{/* Risk-free Rate */}
				<div className="flex flex-col gap-2">
					<div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-gray-400">
						<span>Risk-free Rate (r)</span>
						<span className="text-white font-bold">{(params.rate * 100).toFixed(1)}%</span>
					</div>
					<input
						type="range"
						min={0}
						max={0.1}
						step={0.001}
						value={params.rate}
						onChange={(e) => updateParams({ rate: Number(e.target.value) })}
						className="rf-range h-1"
					/>
				</div>

				{/* Current Spot (Marker only) */}
				<div className="flex flex-col gap-2 border-t border-white/5 pt-4">
					<div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-rf-accent">
						<span>Marker Spot (S)</span>
						<span className="text-white font-bold">{params.spot}</span>
					</div>
					<input
						type="range"
						min={S_RANGE.min}
						max={S_RANGE.max}
						step={1}
						value={params.spot}
						onChange={(e) => updateParams({ spot: Number(e.target.value) })}
						className="rf-range accent-rf-accent h-1"
					/>
				</div>

				{/* Current Time (Marker only) */}
				<div className="flex flex-col gap-2">
					<div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-rf-accent">
						<span>Marker Time (T)</span>
						<span className="text-white font-bold">{params.time.toFixed(2)} Y</span>
					</div>
					<input
						type="range"
						min={T_RANGE.min}
						max={T_RANGE.max}
						step={0.01}
						value={params.time}
						onChange={(e) => updateParams({ time: Number(e.target.value) })}
						className="rf-range accent-rf-accent h-1"
					/>
				</div>
			</section>
		</div>
	);
}
