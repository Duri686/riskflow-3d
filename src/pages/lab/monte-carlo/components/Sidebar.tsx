import { useCallback, useState } from "react";
import { Gauge, Settings, ChevronDown, ChevronRight } from "lucide-react";
import { DataInputPanel } from "@/components/DataInputPanel";
import { RiskCard } from "./RiskCard";
import type { useMonteCarloSession } from "@/algorithms/monte-carlo/useSession";
import type { MonteCarloInput } from "@/algorithms/monte-carlo/engine";
import { TRADING_DAYS_PER_YEAR } from "@/algorithms/monte-carlo/constants";

interface SidebarProps {
  session: ReturnType<typeof useMonteCarloSession>;
}

export function Sidebar({ session }: SidebarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSigmaMuSliders, setShowSigmaMuSliders] = useState(false);
  const { input, updateInput, updateMultipleInputs, metrics } = session;

  const handleDataLoaded = useCallback(
    (data: {
      currentPrice: number;
      sigma: number;
      mu: number;
    }) => {
      const updates: Partial<MonteCarloInput> = {
        volatility: Math.min(2, Math.max(0.05, data.sigma)),
        drift: Math.min(0.3, Math.max(-0.3, data.mu)),
      };
      if (data.currentPrice > 0) {
        updates.initialPrice = Math.round(data.currentPrice);
      }
      updateMultipleInputs(updates);
    },
    [updateMultipleInputs],
  );

  return (
    <>
      <DataInputPanel onDataLoaded={handleDataLoaded} />
      
      <div className="border-b border-white/10 py-4">
        <div className="mx-4 mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-display text-xs font-bold tracking-widest text-white">
            <Gauge className="h-3.5 w-3.5 text-rf-accent" />
            模拟参数
          </h2>
        </div>
        <div className="mx-4 space-y-3">
          {/* 核心参数：买入价格 */}
          <div className="flex items-center justify-between font-mono text-[10px] text-gray-400">
            <span>买入价格</span>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">$</span>
              <input
                type="number"
                min={1}
                max={1000000}
                value={input.initialPrice}
                onChange={(e) =>
                  updateInput("initialPrice", Math.max(1, Number(e.target.value)))
                }
                className="w-20 border-b border-rf-accent/50 bg-transparent px-1 text-right text-rf-accent outline-none focus:border-rf-accent"
              />
            </div>
          </div>

          {/* 核心参数：持仓周期（快捷选项） */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[10px] text-gray-400">
              <span>持仓周期</span>
            </div>
            <div className="flex gap-1.5">
              {[
                { label: "30天", days: 30, years: 30 / TRADING_DAYS_PER_YEAR },
                { label: "90天", days: 90, years: 90 / TRADING_DAYS_PER_YEAR },
                { label: "6个月", days: 180, years: 180 / TRADING_DAYS_PER_YEAR },
                { label: "1年", days: 365, years: 1 },
              ].map((opt) => {
                const isActive = Math.abs(input.years - opt.years) < 0.01;
                return (
                  <button
                    type="button"
                    key={opt.label}
                    onClick={() => {
                      updateMultipleInputs({
                        years: opt.years,
                        steps: Math.round(opt.years * TRADING_DAYS_PER_YEAR),
                      });
                    }}
                    className={`flex-1 rounded px-1 py-1 font-mono text-[10px] transition-all ${
                      isActive
                        ? "border border-rf-accent/60 bg-rf-accent/15 text-rf-accent"
                        : "border border-white/10 bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* σ/μ 只读展示 + 可展开微调 */}
          <div className="rounded border border-white/10 bg-white/5 px-2.5 py-2">
            <button
              type="button"
              onClick={() => setShowSigmaMuSliders(!showSigmaMuSliders)}
              className="flex w-full items-center justify-between bg-transparent font-mono text-[9px] text-gray-500"
            >
              <span>参数来源：默认值</span>
              <span className="flex items-center gap-0.5 text-gray-600 hover:text-gray-400">
                自定义{" "}
                {showSigmaMuSliders ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </span>
            </button>
            <div className="mt-1.5 flex items-center justify-between font-mono text-[10px]">
              <span className="text-gray-400">
                σ{" "}
                <span className="text-rf-accent">
                  {(input.volatility * 100).toFixed(1)}%
                </span>
              </span>
              <span className="text-gray-400">
                μ{" "}
                <span
                  className={
                    input.drift >= 0 ? "text-[#00D4AA]" : "text-[#FF4757]"
                  }
                >
                  {input.drift > 0 ? "+" : ""}
                  {(input.drift * 100).toFixed(1)}%
                </span>
              </span>
            </div>
            {showSigmaMuSliders && (
              <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[9px] text-gray-500">
                    <span>波动率 σ</span>
                    <span className="text-rf-accent">
                      {(input.volatility * 100).toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={200}
                    value={input.volatility * 100}
                    onChange={(e) =>
                      updateInput("volatility", Number(e.target.value) / 100)
                    }
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[9px] text-gray-500">
                    <span>预期收益率 μ</span>
                    <span
                      className={
                        input.drift >= 0 ? "text-[#00D4AA]" : "text-[#FF4757]"
                      }
                    >
                      {input.drift > 0 ? "+" : ""}
                      {(input.drift * 100).toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-30}
                    max={30}
                    value={input.drift * 100}
                    onChange={(e) =>
                      updateInput("drift", Number(e.target.value) / 100)
                    }
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ⚙️ 高级设置（折叠） */}
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
              <div className="space-y-1">
                <div className="flex items-center justify-between font-mono text-[9px] text-gray-500">
                  <span>时间步数</span>
                  <span className="text-gray-400">
                    {input.steps} 天
                  </span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={TRADING_DAYS_PER_YEAR * 5}
                  value={input.steps}
                  onChange={(e) =>
                    updateInput("steps", Number(e.target.value))
                  }
                  className="w-full"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between font-mono text-[9px] text-gray-500">
                  <span>模拟路径</span>
                  <span className="text-gray-400">
                    {input.paths} 条
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={1000}
                  step={50}
                  value={input.paths}
                  onChange={(e) =>
                    updateInput("paths", Number(e.target.value))
                  }
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <RiskCard metrics={metrics} />
    </>
  );
}
