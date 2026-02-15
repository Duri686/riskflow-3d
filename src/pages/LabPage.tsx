import { useEffect, useState } from "react";
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
import { ProbabilityCone } from "../algorithms/monte-carlo/ProbabilityCone";
import { useMonteCarloSession } from "../algorithms/monte-carlo/useSession";
import { RiskFlowLogo, MaterialIcon } from "../components/Logo";

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

	// 移除全局最近算法记录：不再需要全局 store

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

	// 历史数据输入状态
	const [historyData, setHistoryData] = useState({
		highPrice: monteCarlo.input.initialPrice * 1.3,
		lowPrice: monteCarlo.input.initialPrice * 0.7,
		periodYears: 1,
	});

	// 计算估算波动率
	const estimatedVolatility = (() => {
		const { highPrice, lowPrice, periodYears } = historyData;
		if (highPrice <= lowPrice || lowPrice <= 0) return 0;
		const logRatio = Math.log(highPrice / lowPrice);
		const parkinsonFactor = 1 / Math.sqrt(4 * Math.log(2));
		return (parkinsonFactor * logRatio) / Math.sqrt(periodYears);
	})();

	// 历史数据变化时自动更新模拟参数
	useEffect(() => {
		const { highPrice, lowPrice, periodYears } = historyData;
		if (highPrice <= lowPrice || lowPrice <= 0) return;

		const currentPrice = monteCarlo.input.initialPrice;
		const midPrice = (highPrice + lowPrice) / 2;
		const impliedReturn = (midPrice - currentPrice) / currentPrice / periodYears;

		monteCarlo.updateMultipleInputs({
			volatility: Math.min(0.8, Math.max(0.05, estimatedVolatility)),
			drift: Math.min(0.3, Math.max(0, impliedReturn)),
			years: periodYears,
		});
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [historyData.highPrice, historyData.lowPrice, historyData.periodYears]);

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
									{/* 概率锥（价格置信区间）- 占 35% 高度 */}
									<div className="h-[35%] min-h-0">
										<ProbabilityCone
											stepStats={monteCarlo.state.cloud.stepStats}
											initialPrice={monteCarlo.input.initialPrice}
											currentStep={monteCarlo.state.currentStep}
											totalSteps={monteCarlo.input.steps}
										/>
									</div>
									{/* 收益分布直方图 - 占 65% 高度 */}
									<div className="h-[65%] min-h-0">
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
							{/* 进度条 + 步数 */}
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

							{/* 播放/暂停按钮（融合状态指示） */}
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

				{/* 右侧参数面板 */}
				{!isRightCollapsed && (
				<aside className="glass-panel rf-scrollbar z-20 flex w-64 shrink-0 flex-col overflow-y-auto border-l border-white/10">
					{/* 历史数据输入区块 */}
					<div className="border-b border-white/10 p-4">
						<div className="mb-3 flex items-center justify-between">
							<h2 className="font-display text-xs font-bold tracking-widest text-white">历史数据估算</h2>
							<span className="font-mono text-[8px] text-gray-600">Parkinson</span>
						</div>
						<div className="space-y-3">
							<div className="grid grid-cols-2 gap-2">
								<div>
									<label className="font-mono text-[9px] text-gray-500">历史最高价</label>
									<div className="flex items-center">
										<span className="font-mono text-[10px] text-gray-500">$</span>
										<input
											type="number"
											min={1}
											value={historyData.highPrice}
											onChange={(e) => setHistoryData(prev => ({ ...prev, highPrice: Math.max(1, Number(e.target.value)) }))}
											className="w-full border-b border-rf-primary/40 bg-transparent px-1 py-0.5 font-mono text-[11px] text-rf-text outline-none focus:border-rf-primary"
										/>
									</div>
								</div>
								<div>
									<label className="font-mono text-[9px] text-gray-500">历史最低价</label>
									<div className="flex items-center">
										<span className="font-mono text-[10px] text-gray-500">$</span>
										<input
											type="number"
											min={1}
											value={historyData.lowPrice}
											onChange={(e) => setHistoryData(prev => ({ ...prev, lowPrice: Math.max(1, Number(e.target.value)) }))}
											className="w-full border-b border-rf-primary/40 bg-transparent px-1 py-0.5 font-mono text-[11px] text-rf-text outline-none focus:border-rf-primary"
										/>
									</div>
								</div>
							</div>
							<div>
								<label className="font-mono text-[9px] text-gray-500">数据周期（年）</label>
								<input
									type="number"
									min={0.25}
									max={10}
									step={0.25}
									value={historyData.periodYears}
									onChange={(e) => setHistoryData(prev => ({ ...prev, periodYears: Math.max(0.25, Number(e.target.value)) }))}
									className="w-full border-b border-white/30 bg-transparent px-1 py-0.5 font-mono text-[11px] text-white outline-none"
								/>
							</div>
							<div className="rounded bg-rf-primary/10 border border-rf-primary/30 py-1.5 text-center font-mono text-[9px] text-rf-primary/70">
								✓ 自动联动模拟参数
							</div>
							{historyData.highPrice > historyData.lowPrice && (
								<div className="rounded bg-white/5 p-2 font-mono text-[9px]">
									<div className="flex justify-between text-gray-400">
										<span>估算波动率</span>
										<span className="text-rf-accent">
											{((1 / Math.sqrt(4 * Math.log(2))) * Math.log(historyData.highPrice / historyData.lowPrice) / Math.sqrt(historyData.periodYears) * 100).toFixed(1)}%
										</span>
									</div>
									<div className="mt-1 flex justify-between text-gray-400">
										<span>价格波动范围</span>
										<span className="text-white">
											{((historyData.highPrice - historyData.lowPrice) / historyData.lowPrice * 100).toFixed(0)}%
										</span>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* PARAMETERS 区块 */}
					<div className="border-b border-white/10 p-4">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="font-display text-xs font-bold tracking-widest text-white">模拟参数</h2>
						</div>
						<div className="space-y-3">
							{/* 初始价格 - 可输入 */}
							<div className="space-y-1">
								<div className="flex items-center justify-between font-mono text-[10px] text-gray-400">
									<span>初始价格 S₀</span>
									<div className="flex items-center gap-1">
										<span className="text-gray-500">$</span>
										<input
											type="number"
											min={1}
											max={10000}
											value={monteCarlo.input.initialPrice}
											onChange={(e) => monteCarlo.updateInput("initialPrice", Math.max(1, Number(e.target.value)))}
											className="w-16 border-b border-rf-accent/50 bg-transparent px-1 text-right text-rf-accent outline-none focus:border-rf-accent"
										/>
									</div>
								</div>
							</div>
							{/* 模拟周期（年） */}
							<div className="space-y-1">
								<div className="flex items-center justify-between font-mono text-[10px] text-gray-400">
									<span>模拟周期</span>
									<span className="text-white">{monteCarlo.input.years} 年</span>
								</div>
								<input
									type="range"
									min={1}
									max={5}
									step={0.5}
									value={monteCarlo.input.years}
									onChange={(e) => monteCarlo.updateInput("years", Number(e.target.value))}
									className="w-full"
								/>
							</div>
							{/* 时间步数（交易日） */}
							<div className="space-y-1">
								<div className="flex items-center justify-between font-mono text-[10px] text-gray-400">
									<span>时间步数</span>
									<span className="text-white">{monteCarlo.input.steps} 天</span>
								</div>
								<input
									type="range"
									min={30}
									max={365}
									value={monteCarlo.input.steps}
									onChange={(e) => monteCarlo.updateInput("steps", Number(e.target.value))}
									className="w-full"
								/>
								<div className="text-right font-mono text-[8px] text-gray-600">
									≈ {(monteCarlo.input.steps / 252).toFixed(1)} 年交易日
								</div>
							</div>
							{/* 路径数量 */}
							<div className="space-y-1">
								<div className="flex items-center justify-between font-mono text-[10px] text-gray-400">
									<span>模拟路径</span>
									<span className="text-white">{monteCarlo.input.paths} 条</span>
								</div>
								<input
									type="range"
									min={10}
									max={500}
									value={monteCarlo.input.paths}
									onChange={(e) => monteCarlo.updateInput("paths", Number(e.target.value))}
									className="w-full"
								/>
							</div>
							{/* 漂移率 */}
							<div className="space-y-2">
								<div className="flex justify-between font-mono text-[10px] text-gray-400">
									<span>预期收益率 μ</span>
									<span className="text-white">{(monteCarlo.input.drift * 100).toFixed(1)}%</span>
								</div>
								<input
									type="range"
									min={0}
									max={30}
									value={monteCarlo.input.drift * 100}
									onChange={(e) => monteCarlo.updateInput("drift", Number(e.target.value) / 100)}
									className="w-full"
								/>
							</div>
							{/* 波动率 */}
							<div className="space-y-2">
								<div className="flex justify-between font-mono text-[10px] text-gray-400">
									<span>波动率 σ</span>
									<span className="text-rf-accent">{(monteCarlo.input.volatility * 100).toFixed(1)}%</span>
								</div>
								<input
									type="range"
									min={5}
									max={80}
									value={monteCarlo.input.volatility * 100}
									onChange={(e) => monteCarlo.updateInput("volatility", Number(e.target.value) / 100)}
									className="w-full"
								/>
							</div>
						</div>
					</div>

					{/* 风险指标区块 */}
					<div className="p-5">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="font-display text-xs font-bold tracking-widest text-rf-text">风险指标</h2>
						</div>
						<div className="space-y-3">
							<div className="flex items-center justify-between font-mono text-[10px]">
								<span className="text-rf-text-secondary">当前均价</span>
								<span className="font-semibold text-rf-text">${monteCarlo.metrics.current.meanPrice.toFixed(2)}</span>
							</div>
							<div className="flex items-center justify-between font-mono text-[10px]">
								<span className="text-rf-text-secondary">5%/95% 分位</span>
								<span className="text-rf-text">
									<span className="text-[#00D4AA]">${monteCarlo.metrics.current.p05Price.toFixed(0)}</span>
									<span className="text-rf-text-muted"> / </span>
									<span className="text-[#FF4757]">${monteCarlo.metrics.current.p95Price.toFixed(0)}</span>
								</span>
							</div>
							<div className="flex items-center justify-between font-mono text-[10px]">
								<span className="text-rf-text-secondary">预期收益</span>
								<span className={`font-semibold ${monteCarlo.metrics.final.expectedReturn >= 0 ? 'text-[#FF4757]' : 'text-[#00D4AA]'}`}>
									{monteCarlo.metrics.final.expectedReturn > 0 ? '+' : ''}{(monteCarlo.metrics.final.expectedReturn * 100).toFixed(1)}%
								</span>
							</div>
							<div className="flex items-center justify-between font-mono text-[10px]">
								<span className="text-rf-text-secondary">最大损失 (VaR)</span>
								<span className="font-semibold text-[#FF4757]">{(monteCarlo.metrics.final.var95 * 100).toFixed(1)}%</span>
							</div>
							<div className="flex items-center justify-between font-mono text-[10px]">
								<span className="text-rf-text-secondary">极端损失 (CVaR)</span>
								<span className="font-semibold text-[#FF4757]">{(monteCarlo.metrics.final.expectedShortfall95 * 100).toFixed(1)}%</span>
							</div>
							<div className="flex items-center justify-between font-mono text-[10px]">
								<span className="text-rf-text-secondary">亏损概率</span>
								<span className="text-rf-text">{(monteCarlo.metrics.final.lossProbability * 100).toFixed(1)}%</span>
							</div>
						</div>
					</div>
				</aside>
				)}
			</div>
		</div>
	);
}
