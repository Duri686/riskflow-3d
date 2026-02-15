import { useState, useCallback } from 'react'
import {
  RefreshCw, AlertCircle, CheckCircle2, Loader2,
  Database, ClipboardPaste,
} from 'lucide-react'
import {
  fetchBinanceKlines,
  calculateSeriesParams,
  SYMBOL_OPTIONS,
  PERIOD_OPTIONS,
} from '../algorithms/monte-carlo/fetchKlines'

interface DataInputPanelProps {
  /** 数据加载后的回调（收盘价 + 估算参数） */
  onDataLoaded: (data: {
    closes: number[]
    currentPrice: number
    sigma: number
    mu: number
    dailyReturns: number[]
    count: number
  }) => void
}

/**
 * 共享数据输入组件
 * 币种选择 + 币安 API 获取 + 手动粘贴
 * 蒙特卡洛和卡尔曼滤波模块共用
 */
export function DataInputPanel({ onDataLoaded }: DataInputPanelProps) {
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [fetchPeriod, setFetchPeriod] = useState(365)
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [closeSeriesText, setCloseSeriesText] = useState('')
  const [dataStatus, setDataStatus] = useState<{
    hasSeries: boolean
    sigma: number
    mu: number
    count: number
  } | null>(null)

  const processCloses = useCallback((closes: number[], currentPrice: number) => {
    if (closes.length < 2) return
    const { sigma, mu, dailyReturns } = calculateSeriesParams(closes)
    setDataStatus({ hasSeries: true, sigma, mu, count: closes.length })
    onDataLoaded({ closes, currentPrice, sigma, mu, dailyReturns, count: closes.length })
  }, [onDataLoaded])

  const handleFetchKlines = useCallback(async () => {
    setIsFetching(true)
    setFetchError(null)
    try {
      const { closes, currentPrice } = await fetchBinanceKlines(symbol, '1d', fetchPeriod)
      processCloses(closes, currentPrice)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : '获取失败')
    } finally {
      setIsFetching(false)
    }
  }, [symbol, fetchPeriod, processCloses])

  const handleTextChange = useCallback((text: string) => {
    setCloseSeriesText(text)
    if (!text.trim()) return
    const tokens = text
      .split(/[\s,，、；]+/)
      .map((t) => Number(t))
      .filter((n) => Number.isFinite(n) && n > 0)
    if (tokens.length >= 2) {
      processCloses(tokens, tokens[tokens.length - 1])
    }
  }, [processCloses])

  return (
    <div className="border-b border-white/10 py-4">
      <div className="mx-4 mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-display text-xs font-bold tracking-widest text-white">
          <Database className="h-3.5 w-3.5 text-rf-primary" />
          数据输入
        </h2>
        <span className="font-mono text-[8px] text-gray-600">Binance API</span>
      </div>
      <div className="mx-4 space-y-3">
        {/* 交易对 + 周期 */}
        <div className="flex items-center gap-2">
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="flex-1 rounded border border-white/20 bg-rf-surface-solid px-2 py-1.5 font-mono text-[11px] text-white outline-none focus:border-rf-primary"
          >
            {SYMBOL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={fetchPeriod}
            onChange={(e) => setFetchPeriod(Number(e.target.value))}
            className="w-16 rounded border border-white/20 bg-rf-surface-solid px-1.5 py-1.5 font-mono text-[11px] text-white outline-none focus:border-rf-primary"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 获取按钮 */}
        <button
          type="button"
          onClick={handleFetchKlines}
          disabled={isFetching}
          className={`flex w-full items-center justify-center gap-1.5 rounded border py-1.5 font-mono text-[10px] font-medium transition-all ${
            isFetching
              ? 'border-white/10 bg-white/5 text-gray-500'
              : 'border-rf-primary/50 bg-rf-primary/10 text-rf-primary hover:bg-rf-primary/20'
          }`}
        >
          {isFetching ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> 获取中...</>
          ) : (
            <><RefreshCw className="h-3 w-3" /> 获取日线数据</>
          )}
        </button>

        {/* 状态反馈 */}
        {fetchError && (
          <div className="flex items-center gap-1.5 rounded border border-red-500/30 bg-red-500/10 px-2 py-1.5 font-mono text-[9px] text-red-400">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{fetchError}</span>
          </div>
        )}
        {dataStatus?.hasSeries && (
          <div className="rounded border border-rf-primary/30 bg-rf-primary/10 p-2 font-mono text-[9px]">
            <div className="mb-1 flex items-center gap-1.5 text-rf-primary/70">
              <CheckCircle2 className="h-3 w-3 shrink-0" />
              <span>已加载 {dataStatus.count} 天收盘价</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>年化波动率 σ</span>
              <span className="text-rf-accent">{(dataStatus.sigma * 100).toFixed(1)}%</span>
            </div>
            <div className="mt-1 flex justify-between text-gray-400">
              <span>年化收益率 μ</span>
              <span className={dataStatus.mu >= 0 ? 'text-[#00D4AA]' : 'text-[#FF4757]'}>
                {dataStatus.mu > 0 ? '+' : ''}{(dataStatus.mu * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* 手动粘贴 */}
        <div>
          <label className="flex items-center gap-1 font-mono text-[9px] text-gray-500">
            <ClipboardPaste className="h-3 w-3" />
            或手动粘贴收盘价（逗号/空格分隔）
          </label>
          <textarea
            value={closeSeriesText}
            onChange={(e) => handleTextChange(e.target.value)}
            rows={2}
            placeholder="例如：97500, 98200, 96800, ..."
            className="mt-1 w-full resize-y rounded border border-white/10 bg-transparent px-2 py-1 font-mono text-[10px] text-white outline-none placeholder:text-gray-600 focus:border-white/30"
          />
        </div>
      </div>
    </div>
  )
}
