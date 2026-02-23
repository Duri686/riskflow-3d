import { useCallback, useState } from "react";
import { ChevronDown, ChevronRight, Gauge, Settings } from "lucide-react";
import { formatMonteCarloDataSource } from "@/algorithms/monte-carlo/viewMeta";
import type { useMonteCarloSession } from "@/algorithms/monte-carlo/useSession";
import { TRADING_DAYS_PER_YEAR } from "@/algorithms/shared/constants";
import { DataInputPanel } from "@/components/DataInputPanel";
import {
	BtSidebarDivider,
	BtSidebarGroupLabel,
	BtSidebarRangeRow,
	BtSidebarSection,
} from "@/components/ui/BtSidebarPrimitives";
import { RiskCard } from "@/pages/lab/monte-carlo/components/RiskCard";

interface SidebarProps {
	session: ReturnType<typeof useMonteCarloSession>;
}

const HOLDING_PERIOD_OPTIONS = [
	{ label: "90天", years: 90 / TRADING_DAYS_PER_YEAR },
	{ label: "6个月", years: 180 / TRADING_DAYS_PER_YEAR },
	{ label: "1年", years: 1 },
] as const;

export function Sidebar({ session }: SidebarProps) {
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [showSigmaMuSliders, setShowSigmaMuSliders] = useState(false);
	const {
		input,
		updateInput,
		updateMultipleInputs,
		metrics,
		applyMarketData,
		marketDataMeta,
	} = session;
	const sourceLabel = formatMonteCarloDataSource(marketDataMeta.source).replace(
		"数据来源: ",
		"",
	);

	const handleDataLoaded = useCallback(
		(data: {
			closes: number[];
			symbol: string;
			lookbackDays: number;
			latestDataDate?: string | null;
			currentPrice: number;
			sigma: number;
			mu: number;
		}) => {
			applyMarketData({
				closes: data.closes,
				symbol: data.symbol,
				lookbackDays: data.lookbackDays,
				latestDataDate: data.latestDataDate,
				source: "manual",
			});
		},
		[applyMarketData],
	);

	return (
		<>
			<DataInputPanel onDataLoaded={handleDataLoaded} />

			<BtSidebarSection
				title="Simulation Params"
				icon={<Gauge className="h-3.5 w-3.5" strokeWidth={1.5} />}
			>
				<BtSidebarRangeRow
					label="买入价格"
					value={
						<div className="flex h-11 w-[7.2rem] items-center border border-[var(--color-bt-border)] bg-[var(--color-bt-input)] px-2">
							<span className="font-bt-mono text-[12px] text-[var(--color-bt-muted-foreground)]">
								$
							</span>
							<input
								type="number"
								min={1}
								max={200000}
								value={input.initialPrice}
								onChange={(event) =>
									updateInput(
										"initialPrice",
										Math.max(1, Number(event.target.value)),
									)
								}
								className="h-full w-full border-0 bg-transparent px-1 text-right font-bt-mono text-[14px] tracking-[0.01em] text-[var(--color-bt-foreground)] outline-none [font-variant-numeric:tabular-nums]"
							/>
						</div>
					}
					min={1}
					max={200000}
					sliderValue={input.initialPrice}
					onChange={(value) => updateInput("initialPrice", Math.max(1, value))}
				/>

				<div className="space-y-2">
					<BtSidebarGroupLabel className="text-[11px] normal-case tracking-[0.08em]">
						持仓周期
					</BtSidebarGroupLabel>
					<div className="grid grid-cols-3 gap-2">
						{HOLDING_PERIOD_OPTIONS.map((option) => {
							const isActive = Math.abs(input.years - option.years) < 0.01;
							return (
								<button
									type="button"
									key={option.label}
									onClick={() => {
										updateMultipleInputs({
											years: option.years,
											steps: Math.round(option.years * TRADING_DAYS_PER_YEAR),
										});
									}}
									className={`h-11 border px-2.5 font-bt-mono text-[11px] tracking-[0.08em] transition-colors duration-150 ease-[var(--ease-bt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bt-ring)] ${
										isActive
											? "border-[var(--color-bt-accent)] bg-[var(--color-bt-muted)] text-[var(--color-bt-accent)]"
											: "border-[var(--color-bt-border)] text-[var(--color-bt-muted-foreground)] hover:text-[var(--color-bt-foreground)]"
									}`}
								>
									{option.label}
								</button>
							);
						})}
					</div>
				</div>

				<div className="bt-sidebar-panel space-y-3">
					<button
						type="button"
						onClick={() => setShowSigmaMuSliders(!showSigmaMuSliders)}
						className="flex w-full items-center justify-between border-0 bg-transparent p-0 font-bt-mono text-[10px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)]"
					>
						<span>参数来源: {sourceLabel}</span>
						<span className="inline-flex items-center gap-1 text-[var(--color-bt-accent)]">
							自定义
							{showSigmaMuSliders ? (
								<ChevronDown className="h-3 w-3" strokeWidth={1.5} />
							) : (
								<ChevronRight className="h-3 w-3" strokeWidth={1.5} />
							)}
						</span>
					</button>

					<div className="grid grid-cols-2 gap-3">
						<p className="space-y-0.5">
							<span className="block font-bt-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-bt-muted-foreground)]">
								sigma 波动率
							</span>
							<strong className="font-bt-mono text-[var(--color-bt-foreground)]">
								{(input.volatility * 100).toFixed(1)}%
							</strong>
						</p>
						<p className="space-y-0.5">
							<span className="block font-bt-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-bt-muted-foreground)]">
								mu 预期收益
							</span>
							<strong
								className={`font-bt-mono ${
									input.drift >= 0
										? "text-[var(--color-bt-success)]"
										: "text-[var(--color-bt-danger)]"
								}`}
							>
								{input.drift > 0 ? "+" : ""}
								{(input.drift * 100).toFixed(1)}%
							</strong>
						</p>
					</div>

					{showSigmaMuSliders ? (
						<>
							<BtSidebarDivider />
							<div className="space-y-3 pt-3">
								<BtSidebarRangeRow
									label="波动率 sigma"
									value={`${(input.volatility * 100).toFixed(1)}%`}
									min={5}
									max={200}
									sliderValue={input.volatility * 100}
									onChange={(value) => updateInput("volatility", value / 100)}
									className="text-[10px]"
									labelClassName="uppercase tracking-[0.12em]"
									valueClassName="text-[var(--color-bt-foreground)]"
								/>
								<BtSidebarRangeRow
									label="预期收益率 mu"
									value={`${input.drift > 0 ? "+" : ""}${(input.drift * 100).toFixed(1)}%`}
									min={-30}
									max={30}
									sliderValue={input.drift * 100}
									onChange={(value) => updateInput("drift", value / 100)}
									className="text-[10px]"
									labelClassName="uppercase tracking-[0.12em]"
									valueClassName={
										input.drift >= 0
											? "text-[var(--color-bt-success)]"
											: "text-[var(--color-bt-danger)]"
									}
								/>
							</div>
						</>
					) : null}
				</div>

				<button
					type="button"
					onClick={() => setShowAdvanced(!showAdvanced)}
					className="flex h-11 w-full items-center justify-center gap-1 border border-[var(--color-bt-border)] bg-transparent font-bt-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-bt-muted-foreground)] transition-colors duration-150 ease-[var(--ease-bt)] hover:text-[var(--color-bt-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bt-ring)]"
				>
					<Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
					高级设置
					{showAdvanced ? (
						<ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
					) : (
						<ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
					)}
				</button>

				{showAdvanced ? (
					<div className="bt-sidebar-panel space-y-3">
						<BtSidebarRangeRow
							label="时间步数"
							value={`${input.steps} 天`}
							min={30}
							max={TRADING_DAYS_PER_YEAR * 5}
							sliderValue={input.steps}
							onChange={(value) => updateInput("steps", value)}
							className="text-[10px]"
							labelClassName="uppercase tracking-[0.12em]"
						/>
						<BtSidebarRangeRow
							label="模拟路径"
							value={`${input.paths} 条`}
							min={50}
							max={1000}
							step={50}
							sliderValue={input.paths}
							onChange={(value) => updateInput("paths", value)}
							className="text-[10px]"
							labelClassName="uppercase tracking-[0.12em]"
						/>
					</div>
				) : null}
			</BtSidebarSection>

			<RiskCard metrics={metrics} />
		</>
	);
}
