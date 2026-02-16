import { useState } from "react";
import { Activity, Settings, ChevronDown, ChevronRight, Shield } from "lucide-react";
import { DataInputPanel } from "@/components/DataInputPanel";
import {
  KALMAN_PRESETS,
  DEFAULT_EWMA_SPAN,
  type KalmanPreset,
} from "@/algorithms/kalman-filter/engine";
import type { useKalmanSession } from "@/algorithms/kalman-filter/useSession";

interface SidebarProps {
  session: ReturnType<typeof useKalmanSession>;
}

// ── Regime 颜色映射 ──
const REGIME_STYLE: Record<string, { color: string; label: string }> = {
  low: { color: "#00D4AA", label: "低风险" },
  medium: { color: "#FFB74D", label: "中等风险" },
  high: { color: "#FF4757", label: "高风险" },
};

// ── Phase 颜色映射（四象限） ──
const PHASE_STYLE: Record<string, { color: string; icon: string }> = {
  rising: { color: "#FF4757", icon: "⬆️" },
  falling: { color: "#00D4AA", icon: "⬇️" },
  shock: { color: "#FFB74D", icon: "⚡" },
  stable: { color: "#6B7280", icon: "◆" },
};

export function Sidebar({ session }: SidebarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { result } = session;
  const hasData = result.steps.length > 0;

  return (
    <>
      <DataInputPanel
        onDataLoaded={(data) => {
          session.setClosesData(data.closes);
        }}
      />

      <div className="border-b border-white/10 py-4">
        <div className="mx-4 mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-display text-xs font-bold tracking-widest text-white">
            <Activity className="h-3.5 w-3.5 text-rf-accent" />
            滤波参数
          </h2>
        </div>
        <div className="mx-4 space-y-3">
          {/* 预设选择 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[10px] text-gray-400">
              <span>滤波模式</span>
            </div>
            <div className="flex gap-1.5">
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
                  className={`flex-1 rounded px-1 py-1 font-mono text-[10px] transition-all ${
                    session.preset === key
                      ? "border border-rf-accent/60 bg-rf-accent/15 text-rf-accent"
                      : "border border-white/10 bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300"
                  }`}
                  title={cfg.desc}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* 高级设置 */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex w-full items-center gap-1 bg-transparent font-mono text-[9px] text-gray-600 hover:text-gray-400"
          >
            <Settings className="h-3 w-3" />
            高级设置
            {showAdvanced ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          {showAdvanced && (
            <div className="space-y-2 rounded border border-white/10 bg-white/5 p-2">
              {/* Q 滑块 */}
              <div className="space-y-1">
                <div className="flex justify-between font-mono text-[9px] text-gray-500">
                  <span>Q 状态变化速度</span>
                  <span className="text-rf-accent">
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
                  className="w-full"
                />
              </div>
              {/* R 滑块 */}
              <div className="space-y-1">
                <div className="flex justify-between font-mono text-[9px] text-gray-500">
                  <span>R 观测噪声程度</span>
                  <span className="text-rf-accent">
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
                  className="w-full"
                />
              </div>
              {/* EWMA span 滑块 */}
              <div className="space-y-1">
                <div className="flex justify-between font-mono text-[9px] text-gray-500">
                  <span>EWMA span (日)</span>
                  <span className="text-rf-accent">
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
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* ── 风控面板 ── */}
          {hasData && (
            <div className="space-y-2 rounded border border-white/10 bg-white/5 p-2.5">
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-gray-400">
                <Shield className="h-3 w-3" />
                风险状态
              </div>

              {/* Regime 指示器 */}
              <div
                className="flex items-center gap-2 rounded px-2 py-1.5"
                style={{
                  backgroundColor: `${REGIME_STYLE[result.regime].color}10`,
                  border: `1px solid ${REGIME_STYLE[result.regime].color}30`,
                }}
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: REGIME_STYLE[result.regime].color }}
                />
                <span
                  className="font-mono text-[11px] font-bold"
                  style={{ color: REGIME_STYLE[result.regime].color }}
                >
                  {REGIME_STYLE[result.regime].label}
                </span>
              </div>

              {/* Kalman vs EWMA */}
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-gray-400">Kalman σ</span>
                <span className="font-semibold text-[#00D4AA]">
                  {(result.currentVol * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-gray-400">EWMA σ</span>
                <span className="font-semibold text-[#FFB74D]">
                  {(result.ewma.currentVol * 100).toFixed(1)}%
                </span>
              </div>

              {/* Gain 诊断 */}
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-gray-400">Gain</span>
                <span className="text-white">
                  {result.finalGain.toFixed(3)}
                  <span
                    className="ml-1"
                    style={{
                      color: result.gainDiagnostic.isLagging ? "#FF4757" : "#6B7280",
                      fontSize: "8px",
                    }}
                  >
                    {result.gainDiagnostic.responsiveness === "fast"
                      ? "敏捷"
                      : result.gainDiagnostic.responsiveness === "moderate"
                        ? "适中"
                        : "迟钝 ⚠️"}
                  </span>
                </span>
              </div>

              {/* ── 风险动量面板（v3 新增）── */}
              <div className="mt-1 border-t border-white/10 pt-1.5 space-y-1.5">
                <div className="font-mono text-[9px] text-gray-500 mb-1">
                  风险动量
                </div>
                {/* Phase 指示器 */}
                <div
                  className="flex items-center gap-2 rounded px-2 py-1"
                  style={{
                    backgroundColor: `${PHASE_STYLE[result.momentum.phase].color}10`,
                    border: `1px solid ${PHASE_STYLE[result.momentum.phase].color}30`,
                  }}
                >
                  <span style={{ fontSize: "12px" }}>
                    {PHASE_STYLE[result.momentum.phase].icon}
                  </span>
                  <span
                    className="font-mono text-[10px] font-bold"
                    style={{ color: PHASE_STYLE[result.momentum.phase].color }}
                  >
                    {result.momentum.phaseLabel}
                  </span>
                </div>
                {/* Kalman Δ */}
                <div className="flex items-center justify-between font-mono text-[9px]">
                  <span className="text-gray-500">Kalman Δ</span>
                  <span style={{
                    color: result.momentum.kalmanDelta > 0.02
                      ? "#FF4757"
                      : result.momentum.kalmanDelta < -0.02
                        ? "#00D4AA"
                        : "#6B7280",
                  }}>
                    {result.momentum.kalmanDelta > 0 ? "+" : ""}
                    {(result.momentum.kalmanDelta * 100).toFixed(1)}%
                    {result.momentum.kalmanDelta > 0.02 ? " ↑" : result.momentum.kalmanDelta < -0.02 ? " ↓" : " →"}
                  </span>
                </div>
                {/* Convergence Ratio */}
                <div className="flex items-center justify-between font-mono text-[9px]">
                  <span className="text-gray-500">收敛比</span>
                  <span style={{
                    color: result.momentum.convergenceRatio > 1.5
                      ? "#FF4757"
                      : result.momentum.convergenceRatio < 0.9
                        ? "#00D4AA"
                        : "#FFB74D",
                  }}>
                    {result.momentum.convergenceRatio.toFixed(2)}x
                    <span className="ml-1" style={{ fontSize: "7px", opacity: 0.7 }}>
                      {result.momentum.convergenceRatio > 1.2 ? "发散" : result.momentum.convergenceRatio < 0.9 ? "收敛" : "均衡"}
                    </span>
                  </span>
                </div>
              </div>

              {/* 风控闸门 */}
              <div className="mt-1 border-t border-white/10 pt-1.5">
                <div className="font-mono text-[9px] text-gray-500 mb-1">
                  风控建议
                </div>
                <div className="flex items-center justify-between font-mono text-[9px]">
                  <span className="text-gray-500">杠杆</span>
                  <span className="text-gray-300">
                    ≤ {result.riskGate.suggestedLeverage.toFixed(1)}x
                    {result.momentum.phase === "rising" && (
                      <span className="ml-1 text-[7px]" style={{ color: "#FF4757" }}>
                        ×0.7
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-[9px]">
                  <span className="text-gray-500">止损</span>
                  <span className="text-gray-300">
                    ±{(result.riskGate.suggestedStopWidth * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1.5 font-mono text-[8px] text-gray-600 mb-1">
                  策略许可（Regime × Momentum 驱动）
                </div>
                {/* Shock 覆盖提示 */}
                {result.momentum.phase === "shock" && (
                  <div
                    className="mb-1 rounded px-1.5 py-0.5 font-mono text-[8px]"
                    style={{
                      backgroundColor: "rgba(255, 183, 77, 0.1)",
                      border: "1px solid rgba(255, 183, 77, 0.3)",
                      color: "#FFB74D",
                    }}
                  >
                    ⚡ 余震期 · 全部策略强制中性
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <StrategyChip
                    label="趋势跟踪"
                    condition="σ < 40%"
                    active={result.riskGate.allowTrend}
                  />
                  <StrategyChip
                    label="均值回归"
                    condition="40–80%"
                    active={result.riskGate.allowMeanRevert}
                  />
                  <StrategyChip
                    label="强制中性"
                    condition="σ > 80%"
                    active={result.riskGate.forceNeutral}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/** 策略标签 — 显示激活条件 */
function StrategyChip({ label, condition, active }: { label: string; condition: string; active: boolean }) {
  return (
    <span
      className="flex items-center justify-between rounded px-1.5 py-0.5 font-mono text-[9px]"
      style={{
        backgroundColor: active ? "rgba(0, 212, 170, 0.12)" : "rgba(107, 114, 128, 0.05)",
        color: active ? "#00D4AA" : "#4B5563",
        border: `1px solid ${active ? "rgba(0, 212, 170, 0.3)" : "rgba(107, 114, 128, 0.15)"}`,
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: "7px", opacity: 0.7 }}>{condition}</span>
    </span>
  );
}
