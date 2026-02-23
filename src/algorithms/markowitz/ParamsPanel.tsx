import type { MarkowitzPreset, MarkowitzSession } from "@/algorithms/markowitz/useSession";
import { BtSectionHeading } from "@/components/ui/BtSectionHeading";

interface ParamsPanelProps {
	session: MarkowitzSession;
}

const PRESET_OPTIONS: Array<{ id: MarkowitzPreset; label: string }> = [
	{ id: "equal", label: "等权" },
	{ id: "growth", label: "进攻" },
	{ id: "defensive", label: "防守" },
	{ id: "risk-balance", label: "风险平衡" },
];

const formatPercent = (value: number, digits = 1): string =>
	`${(value * 100).toFixed(digits)}%`;

export function ParamsPanel({ session }: ParamsPanelProps) {
	const {
		assets,
		input,
		updateInput,
		updateWeight,
		applyPreset,
		randomizeCloud,
		resetDefaults,
	} = session;

	const totalWeight = input.weights.reduce((sum, weight) => sum + weight, 0);

	return (
		<div className="space-y-4">
			<section className="border border-[var(--color-bt-border)] bg-[var(--color-bt-muted)] px-3 py-3">
				<BtSectionHeading title="Asset Allocation" meta={`总计 ${formatPercent(totalWeight, 2)}`} />

				<div className="mt-3 space-y-3">
					{assets.map((asset, index) => (
						<label key={asset.id} className="block space-y-1.5">
							<div className="flex items-center justify-between font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)]">
								<span>{asset.label}</span>
								<span className="text-[var(--color-bt-foreground)] [font-variant-numeric:tabular-nums]">
									{formatPercent(input.weights[index], 1)}
								</span>
							</div>
							<input
								type="range"
								min={0}
								max={Math.round(input.maxWeight * 100)}
								step={1}
								value={Math.round(input.weights[index] * 100)}
								onChange={(event) =>
									updateWeight(index, Number(event.target.value) / 100)
								}
								className="bt-range"
							/>
						</label>
					))}
				</div>
			</section>

			<section className="border border-[var(--color-bt-border)] bg-[var(--color-bt-muted)] px-3 py-3">
				<BtSectionHeading title="Constraints" />

				<div className="mt-3 space-y-3">
					<label className="block space-y-1.5">
						<div className="flex items-center justify-between font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)]">
							<span>无风险利率</span>
							<span className="text-[var(--color-bt-foreground)] [font-variant-numeric:tabular-nums]">
								{formatPercent(input.riskFreeRate, 2)}
							</span>
						</div>
						<input
							type="range"
							min={0}
							max={8}
							step={0.1}
							value={input.riskFreeRate * 100}
							onChange={(event) =>
								updateInput("riskFreeRate", Number(event.target.value) / 100)
							}
							className="bt-range"
						/>
					</label>

					<label className="block space-y-1.5">
						<div className="flex items-center justify-between font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)]">
							<span>单资产权重上限</span>
							<span className="text-[var(--color-bt-foreground)] [font-variant-numeric:tabular-nums]">
								{formatPercent(input.maxWeight, 0)}
							</span>
						</div>
						<input
							type="range"
							min={25}
							max={100}
							step={1}
							value={Math.round(input.maxWeight * 100)}
							onChange={(event) =>
								updateInput("maxWeight", Number(event.target.value) / 100)
							}
							className="bt-range"
						/>
					</label>

					<label className="block space-y-1.5">
						<div className="flex items-center justify-between font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)]">
							<span>随机组合数量</span>
							<span className="text-[var(--color-bt-foreground)] [font-variant-numeric:tabular-nums]">{input.samples}</span>
						</div>
						<input
							type="range"
							min={500}
							max={5000}
							step={100}
							value={input.samples}
							onChange={(event) =>
								updateInput("samples", Number(event.target.value))
							}
							className="bt-range"
						/>
					</label>
				</div>
			</section>

			<section className="border border-[var(--color-bt-border)] bg-[var(--color-bt-muted)] px-3 py-3">
				<BtSectionHeading title="Portfolio Presets" />

				<div className="mt-3 grid grid-cols-2 gap-2">
					{PRESET_OPTIONS.map((option) => (
						<button
							key={option.id}
							type="button"
							onClick={() => applyPreset(option.id)}
							className="h-11 border border-[var(--color-bt-border)] bg-[var(--color-bt-background)] px-2.5 font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)] transition-colors duration-150 ease-[var(--ease-bt)] hover:border-[var(--color-bt-accent)] hover:text-[var(--color-bt-foreground)]"
						>
							{option.label}
						</button>
					))}
				</div>

				<div className="mt-2 grid grid-cols-2 gap-2">
					<button
						type="button"
						onClick={randomizeCloud}
						className="h-11 border border-[var(--color-bt-border)] bg-[var(--color-bt-background)] px-2.5 font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)] transition-colors duration-150 ease-[var(--ease-bt)] hover:border-[var(--color-bt-accent)] hover:text-[var(--color-bt-foreground)]"
					>
						重采样
					</button>
					<button
						type="button"
						onClick={resetDefaults}
						className="h-11 border border-[var(--color-bt-border)] bg-[var(--color-bt-background)] px-2.5 font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)] transition-colors duration-150 ease-[var(--ease-bt)] hover:border-[var(--color-bt-accent)] hover:text-[var(--color-bt-foreground)]"
					>
						重置
					</button>
				</div>
			</section>
		</div>
	);
}
