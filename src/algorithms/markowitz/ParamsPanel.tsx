import type {
	MarkowitzPreset,
	MarkowitzSession,
} from "@/algorithms/markowitz/useSession";
import {
	BtSidebarGroupLabel,
	BtSidebarRangeRow,
	BtSidebarSection,
} from "@/components/ui/BtSidebarPrimitives";

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

const actionButtonClass =
	"h-11 border border-[var(--color-bt-border)] bg-[var(--color-bt-background)] px-2.5 font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)] transition-colors duration-150 ease-[var(--ease-bt)] hover:border-[var(--color-bt-accent)] hover:text-[var(--color-bt-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bt-ring)]";

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
			<BtSidebarSection
				title="Asset Allocation"
				meta={`总计 ${formatPercent(totalWeight, 2)}`}
				variant="panel"
			>
				{assets.map((asset, index) => (
					<BtSidebarRangeRow
						key={asset.id}
						label={asset.label}
						value={formatPercent(input.weights[index], 1)}
						min={0}
						max={Math.round(input.maxWeight * 100)}
						step={1}
						sliderValue={Math.round(input.weights[index] * 100)}
						onChange={(value) => updateWeight(index, value / 100)}
					/>
				))}
			</BtSidebarSection>

			<BtSidebarSection title="Constraints" variant="panel">
				<BtSidebarRangeRow
					label="无风险利率"
					value={formatPercent(input.riskFreeRate, 2)}
					min={0}
					max={8}
					step={0.1}
					sliderValue={input.riskFreeRate * 100}
					onChange={(value) => updateInput("riskFreeRate", value / 100)}
				/>
				<BtSidebarRangeRow
					label="单资产权重上限"
					value={formatPercent(input.maxWeight, 0)}
					min={25}
					max={100}
					step={1}
					sliderValue={Math.round(input.maxWeight * 100)}
					onChange={(value) => updateInput("maxWeight", value / 100)}
				/>
				<BtSidebarRangeRow
					label="随机组合数量"
					value={input.samples}
					min={500}
					max={5000}
					step={100}
					sliderValue={input.samples}
					onChange={(value) => updateInput("samples", value)}
				/>
			</BtSidebarSection>

			<BtSidebarSection title="Portfolio Presets" variant="panel">
				<div className="grid grid-cols-2 gap-2">
					{PRESET_OPTIONS.map((option) => (
						<button
							key={option.id}
							type="button"
							onClick={() => applyPreset(option.id)}
							className={actionButtonClass}
						>
							{option.label}
						</button>
					))}
				</div>

				<div className="space-y-2">
					<BtSidebarGroupLabel>Cloud Controls</BtSidebarGroupLabel>
					<div className="grid grid-cols-2 gap-2">
						<button type="button" onClick={randomizeCloud} className={actionButtonClass}>
							重采样
						</button>
						<button type="button" onClick={resetDefaults} className={actionButtonClass}>
							重置
						</button>
					</div>
				</div>
			</BtSidebarSection>
		</div>
	);
}
