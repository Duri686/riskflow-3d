import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
	ALGORITHM_CATALOG,
	ALGORITHM_SHORTCUTS,
	type AlgorithmId,
	DEFAULT_ALGORITHM_ID,
	getAlgorithmMeta,
	isAlgorithmId,
} from "@/algorithms/registry";
import { MaterialIcon, RiskFlowLogo } from "@/components/Logo";
import { KalmanWorkspace } from "./KalmanWorkspace";
import { MonteCarloWorkspace } from "./MonteCarloWorkspace";
import { BlackScholesWorkspace } from "./BlackScholesWorkspace";

/** 按 activeId 渲染对应 Workspace */
function WorkspaceContent({
	activeId,
	onSidebar,
	onActions,
}: {
	activeId: AlgorithmId;
	onSidebar: (node: React.ReactNode) => void;
	onActions: (node: React.ReactNode) => void;
}) {
	if (activeId === "monte-carlo") {
		return <MonteCarloWorkspace onSidebar={onSidebar} onActions={onActions} />;
	}
	if (activeId === "kalman-filter") {
		return <KalmanWorkspace onSidebar={onSidebar} onActions={onActions} />;
	}
	if (activeId === "black-scholes") {
		return <BlackScholesWorkspace onSidebar={onSidebar} onActions={onActions} />;
	}

	// WIP Fallback
	const meta = getAlgorithmMeta(activeId);
	return (
		<div className="flex flex-1 items-center justify-center">
			<div className="text-center">
				<h1 className="font-display text-2xl font-bold tracking-widest text-rf-primary mb-2">
					{meta.title.toUpperCase()}
				</h1>
				<p className="font-mono text-sm text-gray-500">
					{/* WORKSPACE_UNDER_CONSTRUCTION */}
				</p>
			</div>
		</div>
	);
}

export function LabLayout() {
	const params = useParams();
	const routeId = params.id as string | undefined;

	/* ─── activeId：本地 state，首次从 URL 读取 ─── */
	const [activeId, setActiveId] = useState<AlgorithmId>(() =>
		isAlgorithmId(routeId ?? "")
			? (routeId as AlgorithmId)
			: DEFAULT_ALGORITHM_ID,
	);

	/* ─── sidebar / actions：由 Workspace 通过回调注入 ─── */
	const [sidebar, setSidebar] = useState<React.ReactNode>(null);
	const [actions, setActions] = useState<React.ReactNode>(null);

	const [isRightCollapsed, setRightPanelCollapsed] = useState(false);

	const navigate = useNavigate();

	/* ─── Tab 切换：更新 state + 通过 React Router 同步 URL ─── */
	const switchTab = useCallback((id: AlgorithmId) => {
		setActiveId((prev) => {
			if (prev === id) return prev;
			setSidebar(null);
			setActions(null);
			return id;
		});
		navigate(`/lab/${id}`, { replace: true });
	}, [navigate]);

	/* ─── 键盘快捷键 Cmd+1~4 ─── */
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (!event.metaKey && !event.ctrlKey) return;
			const targetId = ALGORITHM_SHORTCUTS[event.key];
			if (!targetId) return;
			event.preventDefault();
			switchTab(targetId);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [switchTab]);

	/* ─── 滑动指示器：ref 测量实际宽度和位置 ─── */
	const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
	const [indicator, setIndicator] = useState({ left: 0, width: 0 });
	const activeIndex = ALGORITHM_CATALOG.findIndex((a) => a.id === activeId);

	useLayoutEffect(() => {
		const el = tabRefs.current[activeIndex];
		if (el) {
			setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
		}
	}, [activeIndex]);

	return (
		<div className="flex h-screen w-full flex-col bg-rf-bg pt-14 font-body text-white selection:bg-rf-primary selection:text-white">
			{/* 扫描线覆盖层 */}
			<div className="scanlines pointer-events-none fixed inset-0 z-50 opacity-10" />

			{/* ════════ 顶部导航栏（固定，永不卸载） ════════ */}
			<header className="fixed inset-x-0 top-0 z-50 flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-rf-surface-solid/80 px-6 backdrop-blur-md">
				<div className="flex items-center gap-3">
					<RiskFlowLogo
						size="sm"
						showText={true}
						className="flex items-center justify-center p-0"
					/>
				</div>
				{/* ═══════ Tab Switch (弹性动画) ═══════ */}
				<nav className="ml-4 flex flex-1 items-center overflow-x-auto">
					{/* 药丸形容器 */}
					<div
						className="inline-flex items-center rounded-full p-1"
						style={{ background: "rgba(255, 255, 255, 0.06)" }}
					>
						<div className="relative flex items-stretch">
							{/* 滑动指示器 — 宽度和位置跟随 active tab */}
							<div
								className="pointer-events-none absolute inset-y-0 rounded-full"
								style={{
									width: indicator.width,
									left: indicator.left,
									transition:
										"left cubic-bezier(.88, -.35, .565, 1.35) 0.4s, width cubic-bezier(.88, -.35, .565, 1.35) 0.4s",
									background:
										"linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)",
									boxShadow: "0 2px 15px 0 rgba(139, 92, 246, 0.25)",
								}}
							/>
							{ALGORITHM_CATALOG.map((algo, index) => {
								const isActive = algo.id === activeId;
								return (
									<a
										ref={(el) => {
											tabRefs.current[index] = el;
										}}
										role="button"
										tabIndex={0}
										key={algo.id}
										onClick={() => switchTab(algo.id)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												switchTab(algo.id);
											}
										}}
										className={`relative z-10 flex h-8 cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-5 text-xs transition-colors duration-200 ${
											isActive
												? "text-white font-bold"
												: "text-gray-500 hover:text-gray-300 font-medium"
										}`}
									>
										<span className="opacity-40 text-xs">
											{String(index + 1).padStart(2, "0")}
										</span>
										{algo.title.toUpperCase()}
									</a>
								);
							})}
						</div>
					</div>
				</nav>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setRightPanelCollapsed(!isRightCollapsed)}
							className={`flex h-8 w-8 items-center justify-center rounded border bg-transparent transition-colors ${
								isRightCollapsed
									? "border-rf-primary/50 text-rf-primary"
									: "border-white/10 text-gray-400 hover:bg-white/5"
							}`}
							title={isRightCollapsed ? "显示参数面板" : "隐藏参数面板"}
						>
							<MaterialIcon
								name={isRightCollapsed ? "dock_to_left" : "dock_to_right"}
								className="text-base"
							/>
						</button>
						{actions}
					</div>
				</div>
			</header>

			{/* ════════ 主内容区 ════════ */}
			<div className="relative flex flex-1 overflow-hidden">
				<main className="relative flex flex-1 flex-col overflow-hidden bg-rf-bg min-h-0">
					{/* 3D 网格背景 */}
					<div className="pointer-events-none absolute inset-0 overflow-hidden">
						<div className="bg-grid-3d absolute inset-0 opacity-20" />
						<div className="absolute inset-0 bg-linear-to-t from-rf-bg via-transparent to-rf-bg" />
					</div>

					{/* 内容区 — 按 activeId 渲染 */}
					<div className="relative z-10 flex flex-1 flex-col min-h-0 overflow-hidden">
						<WorkspaceContent
							activeId={activeId}
							onSidebar={setSidebar}
							onActions={setActions}
						/>
					</div>
				</main>

				{/* 右侧参数面板 */}
				{!isRightCollapsed && (
					<aside className="glass-panel rf-scrollbar z-20 flex w-72 shrink-0 flex-col overflow-y-auto border-l border-white/10">
						{sidebar}
					</aside>
				)}
			</div>
		</div>
	);
}
