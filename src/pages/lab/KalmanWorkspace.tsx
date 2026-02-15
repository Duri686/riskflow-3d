import { useCallback, useState } from "react";
import { Activity, Settings, ChevronDown, ChevronRight } from "lucide-react";
import { useKalmanSession } from "../../algorithms/kalman-filter/useSession";
import { VolatilityChart } from "../../algorithms/kalman-filter/VolatilityChart";
import { DataInputPanel } from "../../components/DataInputPanel";
import { LabLayout } from "./LabLayout";
import { KALMAN_PRESETS, type KalmanPreset } from "../../algorithms/kalman-filter/engine";

export function KalmanWorkspace() {
  const kalman = useKalmanSession();
  const [showKalmanAdvanced, setShowKalmanAdvanced] = useState(false);

  // 共享数据输入回调
  const handleDataLoaded = useCallback(
    (data: {
      closes: number[];
    }) => {
      kalman.setClosesData(data.closes);
    },
    [kalman],
  );

  const sidebar = (
    <>
      <DataInputPanel onDataLoaded={handleDataLoaded} />
      
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
                  onClick={() => kalman.applyPreset(key)}
                  className={`flex-1 rounded px-1 py-1 font-mono text-[10px] transition-all ${
                    kalman.preset === key
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

          {/* 高级 Q/R 滑块 */}
          <button
            type="button"
            onClick={() => setShowKalmanAdvanced(!showKalmanAdvanced)}
            className="flex w-full items-center gap-1 bg-transparent font-mono text-[9px] text-gray-600 hover:text-gray-400"
          >
            <Settings className="h-3 w-3" />
            高级设置
            {showKalmanAdvanced ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          {showKalmanAdvanced && (
            <div className="space-y-2 rounded border border-white/10 bg-white/5 p-2">
              <div className="space-y-1">
                <div className="flex justify-between font-mono text-[9px] text-gray-500">
                  <span>Q 状态变化速度</span>
                  <span className="text-rf-accent">
                    {kalman.input.processNoise.toExponential(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={-7}
                  max={-2}
                  step={0.1}
                  value={Math.log10(kalman.input.processNoise)}
                  onChange={(e) =>
                    kalman.updateInput(
                      "processNoise",
                      10 ** Number(e.target.value),
                    )
                  }
                  className="w-full"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between font-mono text-[9px] text-gray-500">
                  <span>R 观测噪声程度</span>
                  <span className="text-rf-accent">
                    {kalman.input.measurementNoise.toExponential(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={-6}
                  max={-1}
                  step={0.1}
                  value={Math.log10(kalman.input.measurementNoise)}
                  onChange={(e) =>
                    kalman.updateInput(
                      "measurementNoise",
                      10 ** Number(e.target.value),
                    )
                  }
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* 波动率洞察 */}
          {kalman.result.steps.length > 0 && (
            <div className="space-y-2 rounded border border-rf-accent/30 bg-rf-accent/5 p-2.5">
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-gray-400">当前波动率</span>
                <span className="font-semibold text-[#00D4AA]">
                  σ {(kalman.result.currentVol * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-gray-400">最高波动率</span>
                <span className="text-[#FF4757]">
                  σ {(kalman.result.maxVol * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-gray-400">最低波动率</span>
                <span className="text-gray-300">
                  σ {(kalman.result.minVol * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-gray-400">Kalman Gain</span>
                <span className="text-white">
                  {kalman.result.finalGain.toFixed(3)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <LabLayout activeId="kalman-filter" sidebar={sidebar}>
      <div className="relative flex-1 flex flex-col gap-2 p-4 min-h-0 overflow-hidden">
        <div className="h-full min-h-0">
          <VolatilityChart
            result={kalman.result}
            dailyReturns={kalman.dailyReturns}
          />
        </div>
      </div>
    </LabLayout>
  );
}
