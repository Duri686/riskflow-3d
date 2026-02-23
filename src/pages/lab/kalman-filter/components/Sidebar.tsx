import { useState } from "react";
import {
	Activity,
	Settings,
	ChevronDown,
	ChevronRight,
	Shield,
	Download,
} from "lucide-react";
import { DataInputPanel } from "@/components/DataInputPanel";
import { BtButton } from "@/components/ui/BtButton";
import { BtSectionHeading } from "@/components/ui/BtSectionHeading";
import {
	KALMAN_PRESETS,
	DEFAULT_EWMA_SPAN,
	type KalmanPreset,
} from "@/algorithms/kalman-filter/engine";
import type { useKalmanSession } from "@/algorithms/kalman-filter/useSession";
import {
	buildRiskSnapshot,
	downloadSnapshot,
} from "@/algorithms/kalman-filter/snapshot";

interface SidebarProps {
	session: ReturnType<typeof useKalmanSession>;
}

const REGIME_STYLE: Record<string, { color: string; label: string }> = {
	low: { color: "var(--color-bt-success)", label: "低风险" },
	medium: { color: "var(--color-bt-warning)", label: "中等风险" },
	high: { color: "var(--color-bt-danger)", label: "高风险" },
};

const PHASE_STYLE: Record<string, { color: string; icon: string }> = {
	rising: { color: "var(--color-bt-danger)", icon: "⬆️" },
	falling: { color: "var(--color-bt-success)", icon: "⬇️" },
	shock: { color: "var(--color-bt-warning)", icon: "⚡" },
	stable: { color: "var(--color-bt-muted-foreground)", icon: "◆" },
};

export function Sidebar({ session }: SidebarProps) {
	const [showAdvanced, setShowAdvanced] = useState(false);
	const { result } = session;
	const hasData = result.steps.length > 0;

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

			<section className="border-b border-[var(--color-bt-border)] px-4 py-5">
				<BtSectionHeading
					title="Kalman Filter"
					icon={<Activity className="h-3.5 w-3.5" strokeWidth={1.5} />}
				/>

				<div className="mt-4 space-y-4">
					<div className="space-y-2">
					<p className="font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)]">
							滤波模式
						</p>
						<div className="grid grid-cols-3 gap-2">
							{(
								Object.entries(KALMAN_PRESETS) as [
									KalmanPreset,
									(typeof KALMAN_PRESETS)[KalmanPreset],
								][]
							).map(([key, cfg]) => (
								<button
									type="button"
									key={key}
									onClick={() => session.applyPreset(key)}
									title={cfg.desc}
									className={`h-11 border px-2.5 font-bt-mono text-[11px] tracking-[0.08em] transition-colors duration-150 ease-[var(--ease-bt)] ${
										session.preset === key
											? "border-[var(--color-bt-accent)] bg-[var(--color-bt-muted)] text-[var(--color-bt-accent)]"
											: "border-[var(--color-bt-border)] text-[var(--color-bt-muted-foreground)] hover:text-[var(--color-bt-foreground)]"
									}`}
								>
									{cfg.label}
								</button>
							))}
						</div>
					</div>

					<button
						type="button"
						onClick={() => setShowAdvanced(!showAdvanced)}
					className="flex h-11 w-full items-center justify-between border border-[var(--color-bt-border)] bg-transparent px-3 font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)] transition-colors duration-150 ease-[var(--ease-bt)] hover:text-[var(--color-bt-foreground)]"
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
						<div className="space-y-3 border border-[var(--color-bt-border)] bg-[var(--color-bt-muted)] px-3 py-3">
							<div className="space-y-1.5">
								<div className="flex justify-between font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)]">
									<span>Q 状态变化速度</span>
									<span className="text-[var(--color-bt-foreground)]">
										{session.input.processNoise.toExponential(1)}
									</span>
								</div>
								<input
									type="range"
									min={-7}
									max={-2}
									step={0.1}
									value={Math.log10(session.input.processNoise)}
									onChange={(e) =>
										session.updateInput(
											"processNoise",
											10 ** Number(e.target.value),
										)
									}
									className="bt-range"
								/>
							</div>

							<div className="space-y-1.5">
								<div className="flex justify-between font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)]">
									<span>R 观测噪声程度</span>
									<span className="text-[var(--color-bt-foreground)]">
										{session.input.measurementNoise.toExponential(1)}
									</span>
								</div>
								<input
									type="range"
									min={-6}
									max={-1}
									step={0.1}
									value={Math.log10(session.input.measurementNoise)}
									onChange={(e) =>
										session.updateInput(
											"measurementNoise",
											10 ** Number(e.target.value),
										)
									}
									className="bt-range"
								/>
							</div>

							<div className="space-y-1.5">
								<div className="flex justify-between font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)]">
									<span>EWMA span</span>
									<span className="text-[var(--color-bt-foreground)]">
										{session.input.ewmaSpan ?? DEFAULT_EWMA_SPAN}d
									</span>
								</div>
								<input
									type="range"
									min={10}
									max={30}
									step={1}
									value={session.input.ewmaSpan ?? DEFAULT_EWMA_SPAN}
									onChange={(e) =>
										session.setEwmaSpan(Number(e.target.value))
									}
									className="bt-range"
								/>
							</div>
						</div>
					) : null}

					{hasData ? (
						<div className="space-y-3 border border-[var(--color-bt-border)] bg-[var(--color-bt-muted)] px-3 py-3">
							<div className="flex items-center gap-1.5 font-bt-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-bt-muted-foreground)]">
								<Shield className="h-3.5 w-3.5" strokeWidth={1.5} />
								风险状态
							</div>

							<div
								className="flex items-center gap-2 border px-2 py-1.5"
								style={{
									backgroundColor: `${REGIME_STYLE[result.regime].color}10`,
									borderColor: `${REGIME_STYLE[result.regime].color}40`,
								}}
							>
								<div
									className="h-2 w-2"
									style={{ backgroundColor: REGIME_STYLE[result.regime].color }}
								/>
								<span
									className="font-bt-mono text-[11px] font-semibold"
									style={{ color: REGIME_STYLE[result.regime].color }}
								>
									{REGIME_STYLE[result.regime].label}
								</span>
							</div>

							<div className="space-y-1.5 text-[11px]">
								<p className="flex items-center justify-between font-bt-mono">
									<span className="text-[var(--color-bt-muted-foreground)]">Kalman σ</span>
									<strong className="text-[var(--color-bt-success)]">
										{(result.currentVol * 100).toFixed(1)}%
									</strong>
								</p>
								<p className="flex items-center justify-between font-bt-mono">
									<span className="text-[var(--color-bt-muted-foreground)]">EWMA σ</span>
									<strong className="text-[var(--color-bt-warning)]">
										{(result.ewma.currentVol * 100).toFixed(1)}%
									</strong>
								</p>
								<p className="flex items-center justify-between font-bt-mono">
									<span className="text-[var(--color-bt-muted-foreground)]">Gain</span>
									<span className="text-[var(--color-bt-foreground)]">
										{result.finalGain.toFixed(3)}
										<span
											className="ml-1 text-[9px]"
											style={{
												color: result.gainDiagnostic.isLagging
													? "var(--color-bt-danger)"
													: "var(--color-bt-muted-foreground)",
											}}
										>
											{result.gainDiagnostic.responsiveness === "fast"
												? "敏捷"
												: result.gainDiagnostic.responsiveness === "moderate"
													? "适中"
													: "迟钝"}
										</span>
									</span>
								</p>
							</div>

							<div className="space-y-1.5 border-t border-[var(--color-bt-border)] pt-2">
								<p className="font-bt-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-bt-muted-foreground)]">
									风险动量
								</p>
								<div
									className="flex items-center gap-2 border px-2 py-1.5"
									style={{
										backgroundColor: `${PHASE_STYLE[result.momentum.phase].color}10`,
										borderColor: `${PHASE_STYLE[result.momentum.phase].color}40`,
									}}
								>
									<span className="text-xs">{PHASE_STYLE[result.momentum.phase].icon}</span>
									<span
										className="font-bt-mono text-[10px] font-semibold"
										style={{ color: PHASE_STYLE[result.momentum.phase].color }}
									>
										{result.momentum.phaseLabel}
									</span>
								</div>

								<p className="flex items-center justify-between font-bt-mono text-[10px]">
									<span className="text-[var(--color-bt-muted-foreground)]">Kalman Δ</span>
									<span
										style={{
											color:
												result.momentum.kalmanDelta > 0.02
													? "var(--color-bt-danger)"
													: result.momentum.kalmanDelta < -0.02
														? "var(--color-bt-success)"
														: "var(--color-bt-muted-foreground)",
										}}
									>
										{result.momentum.kalmanDelta > 0 ? "+" : ""}
										{(result.momentum.kalmanDelta * 100).toFixed(1)}%
									</span>
								</p>

								<p className="flex items-center justify-between font-bt-mono text-[10px]">
									<span className="text-[var(--color-bt-muted-foreground)]">收敛比</span>
									<span
										style={{
											color:
												result.momentum.convergenceRatio > 1.5
													? "var(--color-bt-danger)"
													: result.momentum.convergenceRatio < 0.9
														? "var(--color-bt-success)"
														: "var(--color-bt-warning)",
										}}
									>
										{result.momentum.convergenceRatio.toFixed(2)}x
									</span>
								</p>
							</div>

							<div className="space-y-1.5 border-t border-[var(--color-bt-border)] pt-2">
								<p className="font-bt-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-bt-muted-foreground)]">
									风控建议
								</p>

								<p className="flex items-center justify-between font-bt-mono text-[10px]">
									<span className="text-[var(--color-bt-muted-foreground)]">杠杆</span>
									<span className="text-[var(--color-bt-foreground)]">
										≤ {result.riskGate.suggestedLeverage.toFixed(1)}x
										{result.momentum.phase === "rising" ? (
											<span className="ml-1 text-[var(--color-bt-danger)]">×0.7</span>
										) : null}
									</span>
								</p>

								<p className="flex items-center justify-between font-bt-mono text-[10px]">
									<span className="text-[var(--color-bt-muted-foreground)]">止损</span>
									<span className="text-[var(--color-bt-foreground)]">
										±{(result.riskGate.suggestedStopWidth * 100).toFixed(0)}%
									</span>
								</p>

								{result.momentum.phase === "shock" ? (
									<div
										className="border px-1.5 py-1 font-bt-mono text-[9px]"
										style={{
											backgroundColor: "var(--color-bt-warning-soft)",
											borderColor: "color-mix(in oklab, var(--color-bt-warning) 40%, transparent)",
											color: "var(--color-bt-warning)",
										}}
									>
										余震期：全部策略强制中性
									</div>
								) : null}

								<div className="flex flex-col gap-1.5">
									<StrategyChip
										label="趋势跟踪"
										condition="σ < 40%"
										active={result.riskGate.allowTrend}
									/>
									<StrategyChip
										label="均值回归"
										condition="40-80%"
										active={result.riskGate.allowMeanRevert}
									/>
									<StrategyChip
										label="强制中性"
										condition="σ > 80%"
										active={result.riskGate.forceNeutral}
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
								className="mt-1 w-full justify-center"
								startIcon={<Download className="h-3.5 w-3.5" strokeWidth={1.5} />}
							>
								下载风险快照
							</BtButton>
						</div>
					) : null}
				</div>
			</section>
		</>
	);
}

function StrategyChip({
	label,
	condition,
	active,
}: {
	label: string;
	condition: string;
	active: boolean;
}) {
	return (
		<span
			className="flex items-center justify-between border px-2 py-1 font-bt-mono text-[10px] uppercase tracking-[0.08em]"
			style={{
				backgroundColor: active
					? "var(--color-bt-success-soft)"
					: "color-mix(in oklab, var(--color-bt-muted-foreground) 8%, transparent)",
				color: active
					? "var(--color-bt-success)"
					: "var(--color-bt-muted-foreground)",
				borderColor: active
					? "color-mix(in oklab, var(--color-bt-success) 35%, transparent)"
					: "color-mix(in oklab, var(--color-bt-muted-foreground) 25%, transparent)",
			}}
		>
			<span>{label}</span>
			<span className="text-[9px] opacity-75">{condition}</span>
		</span>
	);
}
