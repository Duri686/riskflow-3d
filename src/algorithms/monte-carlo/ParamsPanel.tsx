import type { MonteCarloInput } from "@/algorithms/monte-carlo/engine";

interface SliderConfig {
	key: keyof MonteCarloInput;
	label: string;
	min: number;
	max: number;
	step: number;
	valueFormatter?: (value: number) => string;
}

const sliderConfigs: SliderConfig[] = [
	{ key: "paths", label: "路径数量", min: 80, max: 600, step: 10 },
	{ key: "steps", label: "时间步数", min: 30, max: 360, step: 10 },
	{
		key: "drift",
		label: "漂移率 (μ)",
		min: -0.2,
		max: 0.3,
		step: 0.01,
		valueFormatter: (value) => `${(value * 100).toFixed(1)}%`,
	},
	{
		key: "volatility",
		label: "波动率 (σ)",
		min: 0.05,
		max: 0.8,
		step: 0.01,
		valueFormatter: (value) => `${(value * 100).toFixed(1)}%`,
	},
	{ key: "years", label: "期限（年）", min: 0.2, max: 3, step: 0.1 },
	{ key: "playbackSpeed", label: "播放速度", min: 4, max: 120, step: 1 },
];

interface MonteCarloParamsPanelProps {
	input: MonteCarloInput;
	isPlaying: boolean;
	onUpdateInput: (key: keyof MonteCarloInput, value: number) => void;
	onTogglePlaying: () => void;
	onResimulate: () => void;
}

export function MonteCarloParamsPanel({
	input,
	isPlaying,
	onUpdateInput,
	onTogglePlaying,
	onResimulate,
}: MonteCarloParamsPanelProps) {
	return (
		<div className="grid gap-3.5">
			{sliderConfigs.map((config) => {
				const currentValue = input[config.key];

				return (
					<label key={config.key} className="grid gap-1">
						<div className="flex items-baseline justify-between text-xs">
							<span className="text-[var(--color-bt-muted-foreground)]">{config.label}</span>
							<strong className="font-bt-mono text-[var(--color-bt-foreground)]">
								{config.valueFormatter
									? config.valueFormatter(currentValue)
									: Number.isInteger(currentValue)
										? currentValue
										: currentValue.toFixed(2)}
							</strong>
						</div>
						<input
							type="range"
							min={config.min}
							max={config.max}
							step={config.step}
							value={currentValue}
							onChange={(event) => onUpdateInput(config.key, Number(event.target.value))}
							className="bt-range"
						/>
					</label>
				);
			})}
			<div className="flex gap-2 pt-1">
				<button
					type="button"
					onClick={onTogglePlaying}
					className="flex h-11 flex-1 items-center justify-center border border-[var(--color-bt-border)] px-3 py-1.5 font-bt-mono text-xs uppercase tracking-[0.12em] text-[var(--color-bt-muted-foreground)] transition-colors duration-150 ease-[var(--ease-bt)] hover:text-[var(--color-bt-foreground)]"
				>
					{isPlaying ? "暂停" : "继续"}
				</button>
				<button
					type="button"
					onClick={onResimulate}
					className="flex h-11 flex-1 items-center justify-center border border-[var(--color-bt-border)] px-3 py-1.5 font-bt-mono text-xs uppercase tracking-[0.12em] text-[var(--color-bt-muted-foreground)] transition-colors duration-150 ease-[var(--ease-bt)] hover:text-[var(--color-bt-foreground)]"
				>
					重新模拟
				</button>
			</div>
		</div>
	);
}
