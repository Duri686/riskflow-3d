import { useCallback, useState } from "react";
import { Gauge, Settings, ChevronDown, ChevronRight } from "lucide-react";
import { DataInputPanel } from "@/components/DataInputPanel";
import { BtSectionHeading } from "@/components/ui/BtSectionHeading";
import { RiskCard } from "./RiskCard";
import type { useMonteCarloSession } from "@/algorithms/monte-carlo/useSession";
import { TRADING_DAYS_PER_YEAR } from "@/algorithms/shared/constants";
import { formatMonteCarloDataSource } from "@/algorithms/monte-carlo/viewMeta";

interface SidebarProps {
  session: ReturnType<typeof useMonteCarloSession>;
}

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
  const sourceLabel = formatMonteCarloDataSource(marketDataMeta.source).replace("数据来源: ", "");

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
      <section className="border-b border-[var(--color-bt-border)] px-4 py-5">
        <BtSectionHeading
          title="Simulation Params"
          icon={<Gauge className="h-3.5 w-3.5" strokeWidth={1.5} />}
        />

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)]">
              <span>买入价格</span>
              <div className="flex items-center gap-2">
                <div className="flex h-11 w-[7.2rem] items-center border border-[var(--color-bt-border)] bg-[var(--color-bt-input)] px-2">
                  <span className="font-bt-mono text-[12px] text-[var(--color-bt-muted-foreground)]">$</span>
                  <input
                    type="number"
                    min={1}
                    max={200000}
                    value={input.initialPrice}
                    onChange={(e) =>
                      updateInput("initialPrice", Math.max(1, Number(e.target.value)))
                    }
                    className="h-full w-full border-0 bg-transparent px-1 text-right font-bt-mono text-[14px] tracking-[0.01em] text-[var(--color-bt-foreground)] outline-none [font-variant-numeric:tabular-nums]"
                  />
                </div>
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
              className="bt-range"
            />
          </div>

          <div className="space-y-2">
            <p className="font-bt-mono text-[11px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)]">
              持仓周期
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "90天", years: 90 / TRADING_DAYS_PER_YEAR },
                { label: "6个月", years: 180 / TRADING_DAYS_PER_YEAR },
                { label: "1年", years: 1 },
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
                    className={`h-11 border px-2.5 font-bt-mono text-[11px] tracking-[0.08em] transition-colors duration-150 ease-[var(--ease-bt)] ${
                      isActive
                        ? "border-[var(--color-bt-accent)] bg-[var(--color-bt-muted)] text-[var(--color-bt-accent)]"
                        : "border-[var(--color-bt-border)] text-[var(--color-bt-muted-foreground)] hover:text-[var(--color-bt-foreground)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border border-[var(--color-bt-border)] bg-[var(--color-bt-muted)] px-3 py-3">
            <button
              type="button"
              onClick={() => setShowSigmaMuSliders(!showSigmaMuSliders)}
              className="flex w-full items-center justify-between border-0 bg-transparent p-0 font-bt-mono text-[10px] tracking-[0.08em] text-[var(--color-bt-muted-foreground)]"
            >
              <span>参数来源: {sourceLabel}</span>
              <span className="flex items-center gap-1 text-[var(--color-bt-accent)]">
                自定义
                {showSigmaMuSliders ? (
                  <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
                ) : (
                  <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
                )}
              </span>
            </button>

            <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
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
                    input.drift >= 0 ? "text-[var(--color-bt-accent)]" : "text-[#ff8c73]"
                  }`}
                >
                  {input.drift > 0 ? "+" : ""}
                  {(input.drift * 100).toFixed(1)}%
                </strong>
              </p>
            </div>

            {showSigmaMuSliders ? (
              <div className="mt-3 space-y-3 border-t border-[var(--color-bt-border)] pt-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-bt-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-bt-muted-foreground)]">
                    <span>波动率 sigma</span>
                    <span className="text-[var(--color-bt-foreground)]">
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
                    className="bt-range"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-bt-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-bt-muted-foreground)]">
                    <span>预期收益率 mu</span>
                    <span
                      className={
                        input.drift >= 0 ? "text-[var(--color-bt-accent)]" : "text-[#ff8c73]"
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
                    className="bt-range"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex h-10 w-full items-center justify-center gap-1 border border-[var(--color-bt-border)] bg-transparent font-bt-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-bt-muted-foreground)] transition-colors duration-150 ease-[var(--ease-bt)] hover:text-[var(--color-bt-foreground)]"
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
            <div className="space-y-3 border border-[var(--color-bt-border)] bg-[var(--color-bt-muted)] px-3 py-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-bt-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-bt-muted-foreground)]">
                  <span>时间步数</span>
                  <span className="text-[var(--color-bt-foreground)]">{input.steps} 天</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={TRADING_DAYS_PER_YEAR * 5}
                  value={input.steps}
                  onChange={(e) => updateInput("steps", Number(e.target.value))}
                  className="bt-range"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-bt-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-bt-muted-foreground)]">
                  <span>模拟路径</span>
                  <span className="text-[var(--color-bt-foreground)]">{input.paths} 条</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={1000}
                  step={50}
                  value={input.paths}
                  onChange={(e) => updateInput("paths", Number(e.target.value))}
                  className="bt-range"
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <RiskCard metrics={metrics} />
    </>
  );
}
