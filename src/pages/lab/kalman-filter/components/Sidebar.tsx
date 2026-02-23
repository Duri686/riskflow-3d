import { useState } from "react";
import {
	Activity,
	ArrowDownRight,
	ArrowUpRight,
	ChevronDown,
	ChevronRight,
	Download,
	Minus,
	Settings,
	Shield,
	TriangleAlert,
	type LucideIcon,
} from "lucide-react";
import {
	DEFAULT_EWMA_SPAN,
	KALMAN_PRESETS,
	type KalmanPreset,
	type RiskPhase,
	type VolRegime,
} from "@/algorithms/kalman-filter/engine";
import {
	buildRiskSnapshot,
	downloadSnapshot,
} from "@/algorithms/kalman-filter/snapshot";
import type { useKalmanSession } from "@/algorithms/kalman-filter/useSession";
import { DataInputPanel } from "@/components/DataInputPanel";
import { BtButton } from "@/components/ui/BtButton";
import {
	BtSidebarDivider,
	BtSidebarGroupLabel,
	BtSidebarRangeRow,
	BtSidebarSection,
	BtSidebarSegmented,
	BtSidebarStatusChip,
	BtSidebarValueRow,
	type BtSidebarTone,
} from "@/components/ui/BtSidebarPrimitives";

interface SidebarProps {
	session: ReturnType<typeof useKalmanSession>;
}

const REGIME_STYLE: Record<VolRegime, { tone: BtSidebarTone; label: string }> = {
	low: { tone: "success", label: "低风险" },
	medium: { tone: "warning", label: "中等风险" },
	high: { tone: "danger", label: "高风险" },
};

const PHASE_STYLE: Record<
	RiskPhase,
	{ tone: BtSidebarTone; icon: LucideIcon }
> = {
	rising: { tone: "danger", icon: ArrowUpRight },
	falling: { tone: "success", icon: ArrowDownRight },
	shock: { tone: "warning", icon: TriangleAlert },
	stable: { tone: "muted", icon: Minus },
};

const getResponsivenessLabel = (responsiveness: "fast" | "moderate" | "slow") => {
	if (responsiveness === "fast") return "敏捷";
	if (responsiveness === "moderate") return "适中";
	return "迟钝";
};

const getDeltaTone = (value: number): BtSidebarTone => {
	if (value > 0.02) return "danger";
	if (value < -0.02) return "success";
	return "muted";
};

const getConvergenceTone = (value: number): BtSidebarTone => {
	if (value > 1.5) return "danger";
	if (value < 0.9) return "success";
	return "warning";
};

export function Sidebar({ session }: SidebarProps) {
	const [showAdvanced, setShowAdvanced] = useState(false);
	const { result } = session;
	const hasData = result.steps.length > 0;
	const phaseConfig = PHASE_STYLE[result.momentum.phase];
	const PhaseIcon = phaseConfig.icon;

	return (
		<>
			<DataInputPanel
				onDataLoaded={(data) => {
					session.setClosesData(data.closes, {
						symbol: data.symbol,
						lookbackDays: data.lookbackDays,
					});
				}}
			/>

			<BtSidebarSection
				title="Kalman Filter"
				icon={<Activity className="h-3.5 w-3.5" strokeWidth={1.5} />}
			>
				<div className="space-y-2">
					<BtSidebarGroupLabel className="text-[11px] normal-case tracking-[0.08em]">
						滤波模式
					</BtSidebarGroupLabel>
					<BtSidebarSegmented
						value={session.preset}
						onChange={(value) => session.applyPreset(value)}
						columns={3}
						options={(
							Object.entries(KALMAN_PRESETS) as [
								KalmanPreset,
								(typeof KALMAN_PRESETS)[KalmanPreset],
							][]
						).map(([key, config]) => ({
							value: key,
							label: config.label,
							title: config.desc,
						}))}
					/>
				</div>

				<button
					type="button"
					onClick={() => setShowAdvanced(!showAdvanced)}
					className="flex h-11 w-full items-center justify-between border border-[var(--color-bt-border)] bg-transparent px-3 font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)] transition-colors duration-150 ease-[var(--ease-bt)] hover:text-[var(--color-bt-foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bt-ring)]"
				>
					<span className="inline-flex items-center gap-1.5">
						<Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
						高级设置
					</span>
					{showAdvanced ? (
						<ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
					) : (
						<ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
					)}
				</button>

				{showAdvanced ? (
					<div className="bt-sidebar-panel space-y-3">
						<BtSidebarRangeRow
							label="Q 状态变化速度"
							value={session.input.processNoise.toExponential(1)}
							min={-7}
							max={-2}
							step={0.1}
							sliderValue={Math.log10(session.input.processNoise)}
							onChange={(value) =>
								session.updateInput("processNoise", 10 ** value)
							}
						/>
						<BtSidebarRangeRow
							label="R 观测噪声程度"
							value={session.input.measurementNoise.toExponential(1)}
							min={-6}
							max={-1}
							step={0.1}
							sliderValue={Math.log10(session.input.measurementNoise)}
							onChange={(value) =>
								session.updateInput("measurementNoise", 10 ** value)
							}
						/>
						<BtSidebarRangeRow
							label="EWMA span"
							value={`${session.input.ewmaSpan ?? DEFAULT_EWMA_SPAN}d`}
							min={10}
							max={30}
							step={1}
							sliderValue={session.input.ewmaSpan ?? DEFAULT_EWMA_SPAN}
							onChange={(value) => session.setEwmaSpan(value)}
						/>
					</div>
				) : null}

				{hasData ? (
					<>
						<div className="bt-sidebar-panel space-y-3">
							<BtSidebarGroupLabel className="inline-flex items-center gap-1.5">
								<Shield className="h-3.5 w-3.5" strokeWidth={1.5} />
								风险状态
							</BtSidebarGroupLabel>

							<BtSidebarStatusChip
								tone={REGIME_STYLE[result.regime].tone}
								label={REGIME_STYLE[result.regime].label}
							/>

							<BtSidebarValueRow
								label="Kalman sigma"
								value={`${(result.currentVol * 100).toFixed(1)}%`}
								tone="success"
								className="text-[11px] normal-case tracking-[0.08em]"
								labelClassName="normal-case tracking-[0.08em]"
								valueClassName="text-[11px]"
							/>
							<BtSidebarValueRow
								label="EWMA sigma"
								value={`${(result.ewma.currentVol * 100).toFixed(1)}%`}
								tone="warning"
								className="text-[11px] normal-case tracking-[0.08em]"
								labelClassName="normal-case tracking-[0.08em]"
								valueClassName="text-[11px]"
							/>
							<BtSidebarValueRow
								label="Gain"
								value={`${result.finalGain.toFixed(3)} ${getResponsivenessLabel(result.gainDiagnostic.responsiveness)}`}
								tone={result.gainDiagnostic.isLagging ? "danger" : "foreground"}
								withDivider={false}
								className="text-[11px] normal-case tracking-[0.08em]"
								labelClassName="normal-case tracking-[0.08em]"
								valueClassName="text-[11px]"
							/>

							<BtSidebarDivider />

							<BtSidebarGroupLabel>风险动量</BtSidebarGroupLabel>
							<BtSidebarStatusChip
								tone={phaseConfig.tone}
								icon={<PhaseIcon className="h-3.5 w-3.5" strokeWidth={1.5} />}
								label={result.momentum.phaseLabel}
							/>
							<BtSidebarValueRow
								label="Kalman Δ"
								value={`${result.momentum.kalmanDelta > 0 ? "+" : ""}${(result.momentum.kalmanDelta * 100).toFixed(1)}%`}
								tone={getDeltaTone(result.momentum.kalmanDelta)}
							/>
							<BtSidebarValueRow
								label="收敛比"
								value={`${result.momentum.convergenceRatio.toFixed(2)}x`}
								tone={getConvergenceTone(result.momentum.convergenceRatio)}
								withDivider={false}
							/>

							<BtSidebarDivider />

							<BtSidebarGroupLabel>风控建议</BtSidebarGroupLabel>
							<BtSidebarValueRow
								label="杠杆"
								value={`≤ ${result.riskGate.suggestedLeverage.toFixed(1)}x`}
								tone="foreground"
							/>
							<BtSidebarValueRow
								label="止损"
								value={`±${(result.riskGate.suggestedStopWidth * 100).toFixed(0)}%`}
								tone="foreground"
								withDivider={false}
							/>

							{result.momentum.phase === "shock" ? (
								<BtSidebarStatusChip
									tone="warning"
									label="余震期：全部策略强制中性"
									className="min-h-0 py-1.5 normal-case tracking-[0.08em]"
								/>
							) : null}

							<div className="space-y-1.5">
								<BtSidebarStatusChip
									tone={result.riskGate.allowTrend ? "success" : "muted"}
									label="趋势跟踪"
									meta="σ < 40%"
									className="min-h-0 py-1.5"
								/>
								<BtSidebarStatusChip
									tone={result.riskGate.allowMeanRevert ? "success" : "muted"}
									label="均值回归"
									meta="40~80%"
									className="min-h-0 py-1.5"
								/>
								<BtSidebarStatusChip
									tone={result.riskGate.forceNeutral ? "warning" : "muted"}
									label="强制中性"
									meta="σ > 80%"
									className="min-h-0 py-1.5"
								/>
							</div>
						</div>

						<BtButton
							variant="primary"
							size="md"
							onClick={() => {
								const snapshot = buildRiskSnapshot(
									result,
									session.input,
									session.preset,
									session.assetMeta,
								);
								downloadSnapshot(snapshot);
							}}
							className="w-full justify-center"
							startIcon={<Download className="h-3.5 w-3.5" strokeWidth={1.5} />}
						>
							下载风险快照
						</BtButton>
					</>
				) : null}
			</BtSidebarSection>
		</>
	);
}
