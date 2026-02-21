import type { MarkowitzPreset, MarkowitzSession } from "./useSession"

interface ParamsPanelProps {
  session: MarkowitzSession
}

const PRESET_OPTIONS: Array<{ id: MarkowitzPreset; label: string }> = [
  { id: "equal", label: "等权" },
  { id: "growth", label: "进攻" },
  { id: "defensive", label: "防守" },
  { id: "risk-balance", label: "风险平衡" },
]

const formatPercent = (value: number, digits = 1): string =>
  `${(value * 100).toFixed(digits)}%`

export function ParamsPanel({ session }: ParamsPanelProps) {
  const {
    assets,
    input,
    updateInput,
    updateWeight,
    applyPreset,
    randomizeCloud,
    resetDefaults,
  } = session

  const totalWeight = input.weights.reduce((sum, weight) => sum + weight, 0)

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-rf-primary">
            资产配置
          </h3>
          <span className="font-mono text-[10px] text-gray-400">
            总计 {formatPercent(totalWeight, 2)}
          </span>
        </div>

        <div className="space-y-3">
          {assets.map((asset, index) => (
            <label key={asset.id} className="block">
              <div className="mb-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-wide text-gray-400">
                <span>{asset.label}</span>
                <span className="text-white">{formatPercent(input.weights[index], 1)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.round(input.maxWeight * 100)}
                step={1}
                value={Math.round(input.weights[index] * 100)}
                onChange={(event) =>
                  updateWeight(index, Number(event.target.value) / 100)
                }
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/5 p-3">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-rf-primary">
          约束条件
        </h3>

        <div className="space-y-3">
          <label className="block">
            <div className="mb-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-wide text-gray-400">
              <span>无风险利率</span>
              <span className="text-white">{formatPercent(input.riskFreeRate, 2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={8}
              step={0.1}
              value={input.riskFreeRate * 100}
              onChange={(event) =>
                updateInput("riskFreeRate", Number(event.target.value) / 100)
              }
            />
          </label>

          <label className="block">
            <div className="mb-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-wide text-gray-400">
              <span>单资产权重上限</span>
              <span className="text-white">{formatPercent(input.maxWeight, 0)}</span>
            </div>
            <input
              type="range"
              min={25}
              max={100}
              step={1}
              value={Math.round(input.maxWeight * 100)}
              onChange={(event) =>
                updateInput("maxWeight", Number(event.target.value) / 100)
              }
            />
          </label>

          <label className="block">
            <div className="mb-1 flex items-center justify-between text-[10px] font-mono uppercase tracking-wide text-gray-400">
              <span>随机组合数量</span>
              <span className="text-white">{input.samples}</span>
            </div>
            <input
              type="range"
              min={500}
              max={5000}
              step={100}
              value={input.samples}
              onChange={(event) =>
                updateInput("samples", Number(event.target.value))
              }
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/5 p-3">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-rf-primary">
          组合预设
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {PRESET_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => applyPreset(option.id)}
              className="rounded border border-white/10 bg-transparent px-2 py-1.5 text-[10px] font-mono uppercase tracking-wide text-gray-300 transition-colors hover:border-rf-primary/40 hover:text-rf-primary"
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={randomizeCloud}
            className="flex-1 rounded border border-white/10 bg-transparent px-2 py-1.5 text-[10px] font-mono uppercase tracking-wide text-gray-300 transition-colors hover:border-rf-primary/40 hover:text-rf-primary"
          >
            重采样
          </button>
          <button
            type="button"
            onClick={resetDefaults}
            className="flex-1 rounded border border-white/10 bg-transparent px-2 py-1.5 text-[10px] font-mono uppercase tracking-wide text-gray-300 transition-colors hover:border-rf-primary/40 hover:text-rf-primary"
          >
            重置
          </button>
        </div>
      </section>
    </div>
  )
}
