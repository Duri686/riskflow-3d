import { Activity, Settings2 } from "lucide-react";
import type { OptionType } from "@/algorithms/black-scholes/engine";
import type { MetricType, useBSSession } from "@/algorithms/black-scholes/useSession";
import { BtSectionHeading } from "@/components/ui/BtSectionHeading";

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
		<div className="flex flex-col gap-4 p-4">
			<section className="border border-[var(--color-bt-border)] bg-[var(--color-bt-muted)] px-3 py-3">
				<BtSectionHeading
					title="Metric Axis"
					icon={<Activity className="h-3.5 w-3.5" strokeWidth={1.5} />}
				/>
				<div className="mt-3 grid grid-cols-2 gap-2">
					{metrics.map((m) => (
						<button
							key={m.id}
							type="button"
							onClick={() => setActiveMetric(m.id)}
							className={`h-11 border px-2.5 font-bt-mono text-[11px] tracking-[0.08em] transition-colors duration-150 ease-[var(--ease-bt)] ${
								activeMetric === m.id
									? "border-[var(--color-bt-accent)] bg-[var(--color-bt-muted)] text-[var(--color-bt-accent)]"
									: "border-[var(--color-bt-border)] text-[var(--color-bt-muted-foreground)] hover:text-[var(--color-bt-foreground)]"
							}`}
						>
							{m.label}
						</button>
					))}
				</div>
			</section>

			<section className="border border-[var(--color-bt-border)] bg-[var(--color-bt-muted)] px-3 py-3">
				<BtSectionHeading
					title="Option Type"
					icon={<Settings2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
				/>
				<div className="mt-3 grid grid-cols-2 gap-2">
					{optionTypes.map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => updateParams({ type: t })}
							className={`h-11 border px-2.5 font-bt-mono text-[11px] tracking-[0.08em] transition-colors duration-150 ease-[var(--ease-bt)] ${
								params.type === t
									? "border-[var(--color-bt-accent)] bg-[var(--color-bt-muted)] text-[var(--color-bt-accent)]"
									: "border-[var(--color-bt-border)] text-[var(--color-bt-muted-foreground)] hover:text-[var(--color-bt-foreground)]"
							}`}
						>
							{t.toUpperCase()}
						</button>
					))}
				</div>
			</section>

			<section className="border border-[var(--color-bt-border)] bg-[var(--color-bt-muted)] px-3 py-3">
				<BtSectionHeading
					title="Parameters"
					icon={<Settings2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
				/>

				<div className="mt-3 space-y-3">
					<div className="space-y-1.5">
						<div className="flex justify-between font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)]">
							<span>Strike Price K</span>
							<span className="text-[var(--color-bt-foreground)] font-semibold [font-variant-numeric:tabular-nums]">{params.strike}</span>
						</div>
						<input
							type="range"
							min={S_RANGE.min}
							max={S_RANGE.max}
							step={1}
							value={params.strike}
							onChange={(e) => updateParams({ strike: Number(e.target.value) })}
							className="bt-range"
						/>
					</div>

					<div className="space-y-1.5">
						<div className="flex justify-between font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)]">
							<span>Volatility sigma</span>
							<span className="text-[var(--color-bt-foreground)] font-semibold [font-variant-numeric:tabular-nums]">
								{(params.volatility * 100).toFixed(0)}%
							</span>
						</div>
						<input
							type="range"
							min={0.1}
							max={1.5}
							step={0.01}
							value={params.volatility}
							onChange={(e) => updateParams({ volatility: Number(e.target.value) })}
							className="bt-range"
						/>
					</div>

					<div className="space-y-1.5">
						<div className="flex justify-between font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)]">
							<span>Risk-free Rate</span>
							<span className="text-[var(--color-bt-foreground)] font-semibold [font-variant-numeric:tabular-nums]">
								{(params.rate * 100).toFixed(1)}%
							</span>
						</div>
						<input
							type="range"
							min={0}
							max={0.1}
							step={0.001}
							value={params.rate}
							onChange={(e) => updateParams({ rate: Number(e.target.value) })}
							className="bt-range"
						/>
					</div>

					<div className="space-y-1.5 border-t border-[var(--color-bt-border)] pt-3">
						<div className="flex justify-between font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-accent)]">
							<span>Marker Spot S</span>
							<span className="text-[var(--color-bt-foreground)] font-semibold [font-variant-numeric:tabular-nums]">{params.spot}</span>
						</div>
						<input
							type="range"
							min={S_RANGE.min}
							max={S_RANGE.max}
							step={1}
							value={params.spot}
							onChange={(e) => updateParams({ spot: Number(e.target.value) })}
							className="bt-range"
						/>
					</div>

					<div className="space-y-1.5">
						<div className="flex justify-between font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-accent)]">
							<span>Marker Time T</span>
							<span className="text-[var(--color-bt-foreground)] font-semibold [font-variant-numeric:tabular-nums]">
								{params.time.toFixed(2)} Y
							</span>
						</div>
						<input
							type="range"
							min={T_RANGE.min}
							max={T_RANGE.max}
							step={0.01}
							value={params.time}
							onChange={(e) => updateParams({ time: Number(e.target.value) })}
							className="bt-range"
						/>
					</div>
				</div>
			</section>
		</div>
	);
}
