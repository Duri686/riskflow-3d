import { useCallback, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  Database,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  fetchBinanceKlines,
  calculateSeriesParams,
  formatDataDate,
  SYMBOL_OPTIONS,
  PERIOD_OPTIONS,
} from "@/algorithms/shared/fetchKlines";
import { BtButton } from "@/components/ui/BtButton";
import { BtSelect, BtTextArea } from "@/components/ui/BtField";
import { BtSectionHeading } from "@/components/ui/BtSectionHeading";

interface DataInputPanelProps {
  /** 数据加载后的回调（收盘价 + 估算参数 + 资产元数据） */
  onDataLoaded: (data: {
    closes: number[];
    currentPrice: number;
    sigma: number;
    mu: number;
    dailyReturns: number[];
    count: number;
    /** Binance symbol（如 "BTCUSDT"） */
    symbol: string;
    /** 用户选择的回溯天数 */
    lookbackDays: number;
    /** 最新一条日线日期（YYYY-MM-DD） */
    latestDataDate?: string | null;
  }) => void;
}

/**
 * 共享数据输入组件
 * 币种选择 + 币安 API 获取 + 手动粘贴
 * 蒙特卡洛和卡尔曼滤波模块共用
 */
export function DataInputPanel({ onDataLoaded }: DataInputPanelProps) {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [fetchPeriod, setFetchPeriod] = useState(365);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [closeSeriesText, setCloseSeriesText] = useState("");
  const [dataStatus, setDataStatus] = useState<{
    hasSeries: boolean;
    sigma: number;
    mu: number;
    count: number;
  } | null>(null);

  const processCloses = useCallback(
    (closes: number[], currentPrice: number, latestDataDate?: string | null) => {
      if (closes.length < 2) return;
      const { sigma, mu, dailyReturns } = calculateSeriesParams(closes);
      setDataStatus({ hasSeries: true, sigma, mu, count: closes.length });
      onDataLoaded({
        closes,
        currentPrice,
        sigma,
        mu,
        dailyReturns,
        count: closes.length,
        symbol,
        lookbackDays: fetchPeriod,
        latestDataDate,
      });
    },
    [onDataLoaded, symbol, fetchPeriod],
  );

  const handleFetchKlines = useCallback(async () => {
    setIsFetching(true);
    setFetchError(null);
    try {
      const { closes, currentPrice, latestCloseTime } = await fetchBinanceKlines(
        symbol,
        "1d",
        fetchPeriod,
      );
      processCloses(closes, currentPrice, formatDataDate(latestCloseTime));
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "获取失败");
    } finally {
      setIsFetching(false);
    }
  }, [symbol, fetchPeriod, processCloses]);

  const handleTextChange = useCallback((text: string) => {
    setCloseSeriesText(text);
    if (!text.trim()) return;
    const tokens = text
      .split(/[\s,，、；]+/)
      .map((t) => Number(t))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (tokens.length >= 2) {
      processCloses(tokens, tokens[tokens.length - 1], null);
    }
  }, [processCloses]);

  return (
    <section className="border-b border-[var(--color-bt-border)] px-4 py-5">
      <BtSectionHeading
        title="Data Input"
        meta="BINANCE API"
        icon={<Database className="h-3.5 w-3.5" strokeWidth={1.5} />}
      />

      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_5rem]">
          <BtSelect
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="h-11 pl-3 pr-9 font-bt-mono text-[15px] tracking-[0.03em]"
            aria-label="交易对"
          >
            {SYMBOL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </BtSelect>

          <BtSelect
            value={fetchPeriod}
            onChange={(e) => setFetchPeriod(Number(e.target.value))}
            className="h-11 pl-3 pr-8 font-bt-sans text-[14px] font-semibold tracking-normal [font-variant-numeric:tabular-nums]"
            aria-label="回溯周期"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label.replace(/\s+/g, "")}
              </option>
            ))}
          </BtSelect>
        </div>

        <div className="flex items-center justify-between border-b border-[var(--color-bt-border)] pb-3">
          <BtButton
            variant="primary"
            size="md"
            onClick={handleFetchKlines}
            disabled={isFetching}
            startIcon={
              isFetching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
              )
            }
          >
            {isFetching ? "获取中" : "获取日线数据"}
          </BtButton>

          <span className="font-bt-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-bt-muted-foreground)]">
            {symbol.replace("USDT", "/USDT")}
          </span>
        </div>

        {fetchError ? (
          <div className="border border-[#66271a] bg-[#1d0d09] px-3 py-2 text-sm text-[#ff8c73]">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-[1px] h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>{fetchError}</span>
            </div>
          </div>
        ) : null}

        {dataStatus?.hasSeries ? (
          <div className="border border-[var(--color-bt-border)] bg-[var(--color-bt-muted)] px-3 py-3">
            <div className="mb-2 flex items-center gap-2 font-bt-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-bt-muted-foreground)]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-bt-accent)]" strokeWidth={1.5} />
              已加载 {dataStatus.count} 天收盘价
            </div>
            <div className="grid gap-1 text-sm text-[var(--color-bt-muted-foreground)]">
              <p className="flex items-center justify-between">
                <span>年化波动率 sigma</span>
                <span className="font-bt-mono text-[var(--color-bt-foreground)]">
                  {(dataStatus.sigma * 100).toFixed(1)}%
                </span>
              </p>
              <p className="flex items-center justify-between">
                <span>年化收益率 mu</span>
                <span
                  className={`font-bt-mono ${
                    dataStatus.mu >= 0
                      ? "text-[var(--color-bt-accent)]"
                      : "text-[#ff8c73]"
                  }`}
                >
                  {dataStatus.mu > 0 ? "+" : ""}
                  {(dataStatus.mu * 100).toFixed(1)}%
                </span>
              </p>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="flex items-center gap-1.5 font-bt-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-bt-muted-foreground)]">
            <ClipboardPaste className="h-3.5 w-3.5" strokeWidth={1.5} />
            手动粘贴收盘价
          </label>
          <BtTextArea
            value={closeSeriesText}
            onChange={(e) => handleTextChange(e.target.value)}
            rows={3}
            placeholder="例如: 97500, 98200, 96800"
            className="font-bt-mono text-[13px] leading-6"
          />
        </div>
      </div>
    </section>
  );
}
