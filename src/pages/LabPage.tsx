import { useEffect, useMemo, useState, useCallback } from "react";
import {
  RefreshCw, AlertCircle, CheckCircle2, Loader2,
  Database, ClipboardPaste, Settings, ChevronDown, ChevronRight,
  TrendingUp, TrendingDown, ShieldAlert, ShieldCheck, Gauge,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ALGORITHM_CATALOG,
  ALGORITHM_SHORTCUTS,
  type AlgorithmId,
  getAlgorithmMeta,
  isAlgorithmId,
  DEFAULT_ALGORITHM_ID,
} from "../algorithms/registry";
import { ReturnDistribution } from "../algorithms/monte-carlo/ReturnDistribution";
import { useMonteCarloSession } from "../algorithms/monte-carlo/useSession";
import { RiskFlowLogo, MaterialIcon } from "../components/Logo";
import {
  fetchBinanceKlines,
  calculateSeriesParams,
  SYMBOL_OPTIONS,
  PERIOD_OPTIONS,
} from "../algorithms/monte-carlo/fetchKlines";

/** 综合风险评价 */
function getVerdict(winRate: number, upDownRatio: number, medianReturn: number) {
  // winRate 0~1, upDownRatio 正数越大越好, medianReturn 可正可负
  if (winRate >= 0.6 && upDownRatio >= 1.5 && medianReturn > 0.05) {
    return { icon: ShieldCheck, text: "风险可控，正向预期", color: "text-[#00D4AA]", bg: "bg-[#00D4AA]/10 border-[#00D4AA]/30" };
  }
  if (winRate >= 0.5 && medianReturn > 0) {
    return { icon: TrendingUp, text: "中性偏多，注意仓位", color: "text-[#00D4AA]", bg: "bg-[#00D4AA]/10 border-[#00D4AA]/30" };
  }
  if (winRate >= 0.4) {
    return { icon: ShieldAlert, text: "风险较高，建议观望", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30" };
  }
  return { icon: TrendingDown, text: "风险极高，不建议入场", color: "text-[#FF4757]", bg: "bg-[#FF4757]/10 border-[#FF4757]/30" };
}

export function LabPage() {
  const navigate = useNavigate();
  const params = useParams();
  const routeId = params.id as string | undefined;
  const algorithmId: AlgorithmId = isAlgorithmId(routeId ?? "")
    ? (routeId as AlgorithmId)
    : DEFAULT_ALGORITHM_ID;
  const [isRightCollapsed, setRightPanelCollapsed] = useState(false);
  const navigateToLab = (id: AlgorithmId) => navigate(`/lab/${id}`);
  const navigateToHub = () => navigate("/");
  const monteCarlo = useMonteCarloSession();
  const currentMeta = getAlgorithmMeta(algorithmId);
  const isMonteCarlo = algorithmId === "monte-carlo";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) return;
      const targetAlgorithmId = ALGORITHM_SHORTCUTS[event.key];
      if (!targetAlgorithmId) return;
      event.preventDefault();
      navigate(`/lab/${targetAlgorithmId}`);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  const computedSteps = isMonteCarlo
    ? Math.round(monteCarlo.metrics.progress * monteCarlo.input.steps)
    : 0;
  const totalSteps = isMonteCarlo ? monteCarlo.input.steps : 0;

  // ── 数据输入状态 ──
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [fetchPeriod, setFetchPeriod] = useState(365);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchedCloses, setFetchedCloses] = useState<number[]>([]);
  const [closeSeriesText, setCloseSeriesText] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSigmaMuSliders, setShowSigmaMuSliders] = useState(false);

  // 从收盘价序列（粘贴或 API）计算 σ/μ
  const seriesEstimates = useMemo(() => {
    const source = fetchedCloses.length >= 2 ? fetchedCloses : (() => {
      const tokens = closeSeriesText
        .split(/[\s,]+/)
        .map((t) => Number(t))
        .filter((n) => Number.isFinite(n) && n > 0);
      return tokens.length >= 2 ? tokens : [];
    })();

    if (source.length < 2) {
      return { hasSeries: false as const, sigma: 0.3, mu: 0, count: 0 };
    }

    const { sigma, mu } = calculateSeriesParams(source);
    return { hasSeries: true as const, sigma, mu, count: source.length };
  }, [fetchedCloses, closeSeriesText]);

  // 一键获取币安 K 线数据
  const handleFetchKlines = useCallback(async () => {
    setIsFetching(true);
    setFetchError(null);
    try {
      const { closes, currentPrice } = await fetchBinanceKlines(symbol, "1d", fetchPeriod);
      setFetchedCloses(closes);
      if (currentPrice > 0) {
        monteCarlo.updateInput("initialPrice", Math.round(currentPrice));
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "获取失败");
    } finally {
      setIsFetching(false);
    }
  }, [symbol, fetchPeriod, monteCarlo]);

  // 数据变化时自动更新模拟参数
  useEffect(() => {
    if (!seriesEstimates.hasSeries) return;
    monteCarlo.updateMultipleInputs({
      volatility: Math.min(2, Math.max(0.05, seriesEstimates.sigma)),
      drift: Math.min(0.3, Math.max(-0.3, seriesEstimates.mu)),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesEstimates.sigma, seriesEstimates.mu, seriesEstimates.hasSeries]);

  // 自动计算时间步数 = 持仓年数 × 252
  useEffect(() => {
    const autoSteps = Math.round(monteCarlo.input.years * 252);
    if (monteCarlo.input.steps !== autoSteps) {
      monteCarlo.updateInput("steps", autoSteps);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monteCarlo.input.years]);

  // 综合评价
  const winRate = 1 - monteCarlo.metrics.final.lossProbability;
  const verdict = getVerdict(
    winRate,
    monteCarlo.metrics.final.upDownRatio ?? 0,
    monteCarlo.metrics.final.medianReturn,
  );
  const VerdictIcon = verdict.icon;

  return (
    <div className="flex h-screen w-full flex-col bg-rf-bg pt-14 font-body text-white selection:bg-rf-primary selection:text-white">
      {/* 扫描线覆盖层 */}
      <div className="scanlines pointer-events-none fixed inset-0 z-50 opacity-10" />

      {/* 顶部导航栏 */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-rf-surface-solid/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={navigateToHub}
            className="flex h-8 w-8 items-center justify-center border-none bg-transparent p-0"
          >
            <RiskFlowLogo size="sm" showText={false} />
          </button>
          <h1 className="flex items-center font-display text-sm font-bold tracking-[0.2em] text-white">
            RISKFLOW 
          </h1>
        </div>
        <div className="flex-1 overflow-x-auto px-4">
          <div className="flex w-max items-center gap-1">
            {ALGORITHM_CATALOG.map((algo, index) => {
              const isActive = algo.id === algorithmId;
              const isDisabled = algo.id !== "monte-carlo";
              return (
                <button
                  type="button"
                  key={algo.id}
                  onClick={() => !isDisabled && navigateToLab(algo.id)}
                  disabled={isDisabled}
                  className={`group relative rounded-sm border px-2.5 py-1.5 text-left transition-all ${
                    isActive
                      ? "border-rf-primary/50 bg-rf-primary/10"
                      : isDisabled
                      ? "cursor-not-allowed border-transparent opacity-30"
                      : "border-transparent hover:border-white/10 hover:bg-white/5"
                  }`}
                  title={algo.title}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-gray-600">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={`truncate font-display text-[11px] font-medium ${isActive ? "text-white" : "text-gray-500"}`}>
                      {algo.title.toUpperCase()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRightPanelCollapsed(!isRightCollapsed)}
              className={`flex h-8 w-8 items-center justify-center rounded border bg-transparent transition-colors ${
                isRightCollapsed ? "border-rf-primary/50 text-rf-primary" : "border-white/10 text-gray-400 hover:bg-white/5"
              }`}
              title={isRightCollapsed ? "显示参数面板" : "隐藏参数面板"}
            >
              <MaterialIcon name={isRightCollapsed ? "dock_to_left" : "dock_to_right"} className="text-base" />
            </button>
            <button
              type="button"
              onClick={() => monteCarlo.resimulate()}
              className="flex h-8 w-8 items-center justify-center rounded border border-white/10 bg-transparent text-rf-primary hover:bg-rf-primary/10"
              title="重新模拟"
            >
              <MaterialIcon name="bolt" className="text-base" />
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="relative flex flex-1 overflow-hidden">

        {/* 中间可视化区域 */}
        <main className="relative flex flex-1 flex-col overflow-hidden bg-rf-bg min-h-0">
          {/* 3D 网格背景 */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="bg-grid-3d absolute inset-0 opacity-20" />
            <div className="absolute inset-0 bg-linear-to-t from-rf-bg via-transparent to-rf-bg" />
          </div>

          {/* 内容区 */}
          <div className="relative z-10 flex flex-1 flex-col min-h-0 overflow-hidden">
            {/* 收益分布可视化区域 */}
            <div className="relative flex-1 flex flex-col gap-2 p-4 min-h-0 overflow-hidden">
              {isMonteCarlo ? (
                <>
                  <div className="h-full min-h-0">
                    <ReturnDistribution
                      key={`${monteCarlo.input.seed}`}
                      terminalPrices={monteCarlo.terminalPrices}
                      initialPrice={monteCarlo.input.initialPrice}
                      paths={monteCarlo.input.paths}
                      visiblePaths={Math.ceil(monteCarlo.metrics.progress * monteCarlo.input.paths)}
                    />
                  </div>
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <p className="font-mono text-sm text-gray-500">
                    // {currentMeta.title.toUpperCase()}_VISUALIZATION_PENDING
                  </p>
                </div>
              )}
            </div>

            {/* 底部控制栏 */}
            <div className="z-20 flex shrink-0 items-center gap-4 border-t border-white/5 bg-rf-bg/60 px-4 py-2">
              <div className="flex flex-1 items-center gap-3">
                <div className="relative h-0.5 flex-1 rounded-full bg-white/10">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-rf-accent to-rf-primary"
                    style={{ width: `${monteCarlo.metrics.progress * 100}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] tabular-nums text-gray-500">
                  {computedSteps}/{totalSteps}
                </span>
              </div>

              {monteCarlo.metrics.progress >= 1 ? (
                <div className="flex h-7 w-20 items-center justify-center gap-2 rounded border border-rf-accent/50 bg-rf-accent/10 font-mono text-[10px] font-medium text-rf-accent">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rf-accent" />
                  <span className="w-12 text-center">已完成</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => monteCarlo.togglePlaying()}
                  className={`flex h-7 w-20 items-center justify-center gap-2 rounded border font-mono text-[10px] font-medium transition-all ${
                    monteCarlo.isPlaying
                      ? "border-rf-accent/50 bg-rf-accent/10 text-rf-accent hover:bg-rf-accent/20"
                      : "border-rf-primary/50 bg-rf-primary/10 text-rf-primary hover:bg-rf-primary/20"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${monteCarlo.isPlaying ? "animate-pulse bg-rf-accent" : "bg-rf-primary"}`} />
                  <span className="w-12 text-center">{monteCarlo.isPlaying ? "运行中" : "已暂停"}</span>
                </button>
              )}
            </div>
          </div>
        </main>

        {/* ════════ 右侧参数面板 ════════ */}
        {!isRightCollapsed && (
        <aside className="glass-panel rf-scrollbar z-20 flex w-72 shrink-0 flex-col overflow-y-auto border-l border-white/10">

          {/* ── ① 数据输入 ── */}
          <div className="border-b border-white/10 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 font-display text-xs font-bold tracking-widest text-white">
                <Database className="h-3.5 w-3.5 text-rf-primary" />
                数据输入
              </h2>
              <span className="font-mono text-[8px] text-gray-600">Binance API</span>
            </div>
            <div className="space-y-3">
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
                    ? "border-white/10 bg-white/5 text-gray-500"
                    : "border-rf-primary/50 bg-rf-primary/10 text-rf-primary hover:bg-rf-primary/20"
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
              {seriesEstimates.hasSeries && (
                <div className="rounded border border-rf-primary/30 bg-rf-primary/10 p-2 font-mono text-[9px]">
                  <div className="mb-1 flex items-center gap-1.5 text-rf-primary/70">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    <span>已加载 {seriesEstimates.count} 天收盘价</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>年化波动率 σ</span>
                    <span className="text-rf-accent">{(seriesEstimates.sigma * 100).toFixed(1)}%</span>
                  </div>
                  <div className="mt-1 flex justify-between text-gray-400">
                    <span>年化收益率 μ</span>
                    <span className={seriesEstimates.mu >= 0 ? 'text-[#00D4AA]' : 'text-[#FF4757]'}>
                      {seriesEstimates.mu > 0 ? '+' : ''}{(seriesEstimates.mu * 100).toFixed(1)}%
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
                  onChange={(e) => {
                    setCloseSeriesText(e.target.value);
                    if (e.target.value.trim()) setFetchedCloses([]);
                  }}
                  rows={2}
                  placeholder="例如：97500, 98200, 96800, ..."
                  className="mt-1 w-full resize-y rounded border border-white/10 bg-transparent px-2 py-1 font-mono text-[10px] text-white outline-none placeholder:text-gray-600 focus:border-white/30"
                />
              </div>
            </div>
          </div>

          {/* ── ② 模拟参数（精简） ── */}
          <div className="border-b border-white/10 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 font-display text-xs font-bold tracking-widest text-white">
                <Gauge className="h-3.5 w-3.5 text-rf-accent" />
                模拟参数
              </h2>
            </div>
            <div className="space-y-3">
              {/* 核心参数：买入价格 */}
              <div className="flex items-center justify-between font-mono text-[10px] text-gray-400">
                <span>买入价格</span>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">$</span>
                  <input
                    type="number"
                    min={1}
                    max={1000000}
                    value={monteCarlo.input.initialPrice}
                    onChange={(e) => monteCarlo.updateInput("initialPrice", Math.max(1, Number(e.target.value)))}
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
                    { label: '30天', days: 30, years: 30 / 365 },
                    { label: '90天', days: 90, years: 90 / 365 },
                    { label: '6个月', days: 180, years: 0.5 },
                    { label: '1年', days: 365, years: 1 },
                  ].map((opt) => {
                    const isActive = Math.abs(monteCarlo.input.years - opt.years) < 0.01;
                    return (
                      <button
                        type="button"
                        key={opt.label}
                        onClick={() => {
                          monteCarlo.updateInput("years", opt.years);
                          monteCarlo.updateInput("steps", Math.round(opt.years * 252));
                        }}
                        className={`flex-1 rounded px-1 py-1 font-mono text-[10px] transition-all ${
                          isActive
                            ? 'border border-rf-accent/60 bg-rf-accent/15 text-rf-accent'
                            : 'border border-white/10 bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'
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
                  <span>参数来源：{seriesEstimates.hasSeries ? "数据估算" : "默认值"}</span>
                  <span className="flex items-center gap-0.5 text-gray-600 hover:text-gray-400">
                    自定义 {showSigmaMuSliders ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </span>
                </button>
                <div className="mt-1.5 flex items-center justify-between font-mono text-[10px]">
                  <span className="text-gray-400">σ <span className="text-rf-accent">{(monteCarlo.input.volatility * 100).toFixed(1)}%</span></span>
                  <span className="text-gray-400">μ <span className={monteCarlo.input.drift >= 0 ? 'text-[#00D4AA]' : 'text-[#FF4757]'}>{monteCarlo.input.drift > 0 ? '+' : ''}{(monteCarlo.input.drift * 100).toFixed(1)}%</span></span>
                </div>
                {showSigmaMuSliders && (
                  <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[9px] text-gray-500">
                        <span>波动率 σ</span>
                        <span className="text-rf-accent">{(monteCarlo.input.volatility * 100).toFixed(1)}%</span>
                      </div>
                      <input
                        type="range" min={5} max={200}
                        value={monteCarlo.input.volatility * 100}
                        onChange={(e) => monteCarlo.updateInput("volatility", Number(e.target.value) / 100)}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[9px] text-gray-500">
                        <span>预期收益率 μ</span>
                        <span className={monteCarlo.input.drift >= 0 ? 'text-[#00D4AA]' : 'text-[#FF4757]'}>
                          {monteCarlo.input.drift > 0 ? '+' : ''}{(monteCarlo.input.drift * 100).toFixed(1)}%
                        </span>
                      </div>
                      <input
                        type="range" min={-30} max={30}
                        value={monteCarlo.input.drift * 100}
                        onChange={(e) => monteCarlo.updateInput("drift", Number(e.target.value) / 100)}
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
                {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
              {showAdvanced && (
                <div className="space-y-2 rounded border border-white/10 bg-white/5 p-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-mono text-[9px] text-gray-500">
                      <span>时间步数</span>
                      <span className="text-gray-400">{monteCarlo.input.steps} 天</span>
                    </div>
                    <input
                      type="range" min={30} max={1260}
                      value={monteCarlo.input.steps}
                      onChange={(e) => monteCarlo.updateInput("steps", Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-mono text-[9px] text-gray-500">
                      <span>模拟路径</span>
                      <span className="text-gray-400">{monteCarlo.input.paths} 条</span>
                    </div>
                    <input
                      type="range" min={50} max={1000} step={50}
                      value={monteCarlo.input.paths}
                      onChange={(e) => monteCarlo.updateInput("paths", Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── ③ 风险评估（精简 + 综合评价） ── */}
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 font-display text-xs font-bold tracking-widest text-white">
                <ShieldAlert className="h-3.5 w-3.5 text-yellow-400" />
                风险评估
              </h2>
            </div>

            {/* 综合评价卡片 */}
            <div className={`mb-3 flex items-center gap-2 rounded border p-2.5 ${verdict.bg}`}>
              <VerdictIcon className={`h-4 w-4 shrink-0 ${verdict.color}`} />
              <span className={`font-display text-xs font-bold ${verdict.color}`}>{verdict.text}</span>
            </div>

            {/* 不重复的关键指标 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-gray-500">当前均价</span>
                <span className="font-semibold text-white">${monteCarlo.metrics.current.meanPrice.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-gray-500">价格区间 (5~95%)</span>
                <span className="text-white">
                  <span className="text-[#FF4757]">${monteCarlo.metrics.current.p05Price.toFixed(0)}</span>
                  <span className="text-gray-600"> ~ </span>
                  <span className="text-[#00D4AA]">${monteCarlo.metrics.current.p95Price.toFixed(0)}</span>
                </span>
              </div>
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-gray-500">盈亏比</span>
                <span className={`font-semibold ${(monteCarlo.metrics.final.upDownRatio ?? 0) >= 1 ? 'text-[#00D4AA]' : 'text-[#FF4757]'}`}>
                  {(monteCarlo.metrics.final.upDownRatio ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </aside>
        )}
      </div>
    </div>
  );
}
