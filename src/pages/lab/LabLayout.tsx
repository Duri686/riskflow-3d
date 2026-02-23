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
import { BtButton } from "@/components/ui/BtButton";
import { KalmanWorkspace } from "./KalmanWorkspace";
import { MonteCarloWorkspace } from "./MonteCarloWorkspace";
import { BlackScholesWorkspace } from "./BlackScholesWorkspace";
import { MarkowitzWorkspace } from "./MarkowitzWorkspace";

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
	if (activeId === "markowitz") {
		return <MarkowitzWorkspace onSidebar={onSidebar} onActions={onActions} />;
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
	const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const [indicator, setIndicator] = useState({ left: 0, width: 0 });
	const activeIndex = ALGORITHM_CATALOG.findIndex((a) => a.id === activeId);

	useLayoutEffect(() => {
		const el = tabRefs.current[activeIndex];
		if (el) {
			setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
		}
	}, [activeIndex]);

	return (
		<div className="flex h-screen w-full flex-col bg-rf-bg pt-16 font-body text-white selection:bg-[var(--color-bt-accent)] selection:text-[var(--color-bt-accent-foreground)]">
			{/* 扫描线覆盖层 */}
			<div className="scanlines pointer-events-none fixed inset-0 z-50 opacity-10" />

			{/* ════════ 顶部导航栏（固定，永不卸载） ════════ */}
			<header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--color-bt-border)] bg-[var(--color-bt-background)] backdrop-blur-md">
				<div className="relative flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-10">
					<div className="pointer-events-none absolute inset-0 opacity-50">
						<div className="bt-noise-overlay" />
					</div>

					<div className="relative z-10 flex shrink-0 items-center gap-3">
						<span className="h-4 w-[2px] bg-[var(--color-bt-accent)]" />
						<RiskFlowLogo
							size="sm"
							showText={true}
							accentColor="var(--color-bt-accent)"
							className="flex items-center justify-center p-0 text-[var(--color-bt-foreground)]"
						/>
					</div>

					<nav className="relative z-10 min-w-0 flex-1 overflow-x-auto">
						<div className="relative flex min-w-max items-stretch gap-1 border-b border-[var(--color-bt-border)] pb-1">
							<div
								className="pointer-events-none absolute bottom-0 h-[2px] bg-[var(--color-bt-accent)] transition-[left,width] duration-200 ease-[var(--ease-bt)]"
								style={{
									width: indicator.width,
									left: indicator.left,
								}}
							/>

							{ALGORITHM_CATALOG.map((algo, index) => {
								const isActive = algo.id === activeId;
								return (
									<button
										ref={(el) => {
											tabRefs.current[index] = el;
										}}
										type="button"
										key={algo.id}
										onClick={() => switchTab(algo.id)}
										className={`relative z-10 inline-flex h-9 items-center gap-2 border-0 bg-transparent px-2 pb-1 font-bt-mono text-[10px] font-medium uppercase tracking-[0.1em] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bt-ring)] ${
											isActive
												? "text-[var(--color-bt-foreground)]"
												: "text-[var(--color-bt-muted-foreground)] hover:text-[var(--color-bt-foreground)]"
										}`}
									>
										<span className="text-[9px] tracking-[0.2em] opacity-70">
											{String(index + 1).padStart(2, "0")}
										</span>
										{algo.title}
									</button>
								);
							})}
						</div>
					</nav>

					<div className="relative z-10 flex shrink-0 items-center gap-2">
						<BtButton
							variant="ghost"
							size="icon"
							onClick={() => setRightPanelCollapsed(!isRightCollapsed)}
							title={isRightCollapsed ? "显示参数面板" : "隐藏参数面板"}
							className={isRightCollapsed ? "text-[var(--color-bt-accent)]" : undefined}
						>
							<MaterialIcon
								name={isRightCollapsed ? "dock_to_left" : "dock_to_right"}
								className="text-lg"
							/>
						</BtButton>
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
