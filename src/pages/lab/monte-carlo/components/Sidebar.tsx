import { useCallback, useState } from "react";
import { Gauge, Settings, ChevronDown, ChevronRight } from "lucide-react";
import { DataInputPanel } from "@/components/DataInputPanel";
import { RiskCard } from "./RiskCard";
import type { useMonteCarloSession } from "@/algorithms/monte-carlo/useSession";
import { TRADING_DAYS_PER_YEAR } from "@/algorithms/shared/constants";

interface SidebarProps {
  session: ReturnType<typeof useMonteCarloSession>;
}

export function Sidebar({ session }: SidebarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSigmaMuSliders, setShowSigmaMuSliders] = useState(false);
  const { input, updateInput, updateMultipleInputs, metrics, applyMarketData } = session;

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
      
      <div className="border-b border-border-subtle py-4">
        <div className="mx-4 mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-display text-xs font-bold tracking-widest text-white">
            <Gauge className="h-3.5 w-3.5 text-accent-purple" />
            模拟参数
          </h2>
        </div>
        <div className="mx-4 space-y-3">
          {/* 核心参数：买入价格 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[10px] text-text-muted">
              <span>买入价格</span>
              <div className="flex items-center gap-1">
                <span className="text-text-muted">$</span>
                <input
                  type="number"
                  min={1}
                  max={200000}
                  value={input.initialPrice}
                  onChange={(e) =>
                    updateInput("initialPrice", Math.max(1, Number(e.target.value)))
                  }
                  className="w-20 border-b border-accent-green/50 bg-transparent px-1 text-right text-accent-green outline-none focus:border-accent-green"
                />
              </div>
            </div>
            <input
              type="range"
              min={1}
              max={200000}
              value={input.initialPrice}
              onChange={(e) =>
                updateInput("initialPrice", Math.max(1, Number(e.target.value)))
              }
              className="w-full"
            />
          </div>

          {/* 核心参数：持仓周期（快捷选项） */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[10px] text-text-muted">
              <span>持仓周期</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {[
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
                    className={`rounded py-1 font-mono text-[10px] transition-all ${
                      isActive
                        ? "border border-accent-purple bg-accent-purple/20 text-accent-purple"
                        : "border border-border-subtle hover:bg-white/5"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* σ/μ 只读展示 + 可展开微调 */}
          <div className="rounded-lg border border-border-subtle bg-dark-bg p-3">
            <button
              type="button"
              onClick={() => setShowSigmaMuSliders(!showSigmaMuSliders)}
              className="flex w-full items-center justify-between bg-transparent font-mono text-[10px] text-text-muted"
            >
              <span className="font-bold">参数来源: 默认值</span>
              <span className="flex items-center gap-0.5 text-accent-purple">
                自定义{" "}
                {showSigmaMuSliders ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </span>
            </button>
            <div className="mt-2 grid grid-cols-2 gap-4 font-mono text-[10px]">
              <div>
                <div className="text-text-muted opacity-50">σ 波动率</div>
                <div className="mt-0.5 text-xs font-semibold text-accent-green">
                  {(input.volatility * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-text-muted opacity-50">μ 预期收益</div>
                <div
                  className={`mt-0.5 text-xs font-semibold ${
                    input.drift >= 0 ? "text-accent-green" : "text-accent-red"
                  }`}
                >
                  {input.drift > 0 ? "+" : ""}
                  {(input.drift * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            {showSigmaMuSliders && (
              <div className="mt-2 space-y-2 border-t border-border-subtle pt-2">
                <div className="space-y-1">
                  <div className="flex justify-between font-mono text-[9px] text-text-muted">
                    <span>波动率 σ</span>
                    <span className="text-accent-green">
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
                  <div className="flex justify-between font-mono text-[9px] text-text-muted">
                    <span>预期收益率 μ</span>
                    <span
                      className={
                        input.drift >= 0 ? "text-accent-green" : "text-accent-red"
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
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border-subtle py-2 text-xs text-text-muted transition-colors hover:bg-white/5"
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
            <div className="space-y-2 rounded-lg border border-border-subtle bg-dark-bg p-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between font-mono text-[9px] text-text-muted">
                  <span>时间步数</span>
                  <span className="text-white">
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
                <div className="flex items-center justify-between font-mono text-[9px] text-text-muted">
                  <span>模拟路径</span>
                  <span className="text-white">
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
