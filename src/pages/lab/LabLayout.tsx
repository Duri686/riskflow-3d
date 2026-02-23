import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
	ALGORITHM_CATALOG,
	ALGORITHM_SHORTCUTS,
	type AlgorithmId,
	DEFAULT_ALGORITHM_ID,
	getAlgorithmMeta,
	isAlgorithmId,
} from "@/algorithms/registry";
import { RiskFlowLogo } from "@/components/Logo";
import { BtButton } from "@/components/ui/BtButton";
import { BlackScholesWorkspace } from "@/pages/lab/BlackScholesWorkspace";
import { KalmanWorkspace } from "@/pages/lab/KalmanWorkspace";
import { MarkowitzWorkspace } from "@/pages/lab/MarkowitzWorkspace";
import { MonteCarloWorkspace } from "@/pages/lab/MonteCarloWorkspace";

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

	const meta = getAlgorithmMeta(activeId);
	return (
		<div className="flex flex-1 items-center justify-center">
			<div className="border border-[var(--color-bt-border)] bg-[var(--color-bt-card)] px-8 py-6 text-center">
				<h1 className="font-bt-sans text-3xl font-semibold uppercase tracking-[-0.04em] text-[var(--color-bt-foreground)]">
					{meta.title}
				</h1>
				<p className="mt-3 font-bt-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-bt-muted-foreground)]">
					Workspace Under Construction
				</p>
			</div>
		</div>
	);
}

export function LabLayout() {
	const params = useParams();
	const routeId = params.id as string | undefined;

	const [activeId, setActiveId] = useState<AlgorithmId>(() =>
		isAlgorithmId(routeId ?? "")
			? (routeId as AlgorithmId)
			: DEFAULT_ALGORITHM_ID,
	);

	const [sidebar, setSidebar] = useState<React.ReactNode>(null);
	const [actions, setActions] = useState<React.ReactNode>(null);
	const [isRightCollapsed, setRightPanelCollapsed] = useState(false);

	const navigate = useNavigate();

	const switchTab = useCallback(
		(id: AlgorithmId) => {
			setActiveId((prev) => {
				if (prev === id) return prev;
				setSidebar(null);
				setActions(null);
				return id;
			});
			navigate(`/lab/${id}`, { replace: true });
		},
		[navigate],
	);

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

	useEffect(() => {
		const mediaQuery = window.matchMedia("(max-width: 1023px)");
		const syncRightPanelState = (matches: boolean) => {
			setRightPanelCollapsed(matches);
		};
		syncRightPanelState(mediaQuery.matches);
		const handleChange = (event: MediaQueryListEvent) => {
			syncRightPanelState(event.matches);
		};
		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, []);

	const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const [indicator, setIndicator] = useState({ left: 0, width: 0 });
	const activeIndex = ALGORITHM_CATALOG.findIndex((algorithm) => algorithm.id === activeId);

	useLayoutEffect(() => {
		const el = tabRefs.current[activeIndex];
		if (el) {
			setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
		}
	}, [activeIndex]);

	return (
		<div className="relative flex h-screen w-full flex-col overflow-hidden bg-[var(--color-bt-background)] pt-16 text-[var(--color-bt-foreground)]">
			<div className="bt-noise-overlay" />
			<div className="pointer-events-none absolute inset-0 bt-divider-grid opacity-10" />
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_40%_at_80%_0%,rgba(255,61,0,0.12),transparent_62%)]" />

			<header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--color-bt-border)] bg-[var(--color-bt-background)]">
				<div className="relative flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-10">
					<div className="relative z-10 flex shrink-0 items-center gap-3">
						<span className="h-4 w-[2px] bg-[var(--color-bt-accent)]" />
						<RiskFlowLogo size="sm" className="text-[var(--color-bt-foreground)]" />
					</div>

					<nav className="relative z-10 min-w-0 flex-1 overflow-x-auto bt-scrollbar">
						<div className="relative flex min-w-max items-stretch gap-1 border-b border-[var(--color-bt-border)] pb-1">
							<div
								className="pointer-events-none absolute bottom-0 h-[2px] bg-[var(--color-bt-accent)] transition-[left,width] duration-200 ease-[var(--ease-bt)]"
								style={{ width: indicator.width, left: indicator.left }}
							/>

							{ALGORITHM_CATALOG.map((algorithm, index) => {
								const isActive = algorithm.id === activeId;
								return (
									<button
										ref={(el) => {
											tabRefs.current[index] = el;
										}}
										type="button"
										key={algorithm.id}
										onClick={() => switchTab(algorithm.id)}
										className={`relative z-10 inline-flex h-9 items-center gap-2 border-0 bg-transparent px-2 pb-1 font-bt-mono text-[10px] font-medium uppercase tracking-[0.1em] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bt-ring)] ${
											isActive
												? "text-[var(--color-bt-foreground)]"
												: "text-[var(--color-bt-muted-foreground)] hover:text-[var(--color-bt-foreground)]"
										}`}
									>
										<span className="text-[9px] tracking-[0.2em] opacity-70">
											{String(index + 1).padStart(2, "0")}
										</span>
										{algorithm.title}
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
							aria-label={isRightCollapsed ? "显示参数面板" : "隐藏参数面板"}
							title={isRightCollapsed ? "显示参数面板" : "隐藏参数面板"}
							aria-pressed={!isRightCollapsed}
							className={isRightCollapsed ? "text-[var(--color-bt-accent)]" : undefined}
						>
							{isRightCollapsed ? (
								<PanelRightOpen className="h-4 w-4" strokeWidth={1.5} />
							) : (
								<PanelRightClose className="h-4 w-4" strokeWidth={1.5} />
							)}
						</BtButton>
						{actions}
					</div>
				</div>
			</header>

			<div className="relative flex flex-1 overflow-hidden">
				<main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
					<div className="pointer-events-none absolute inset-0">
						<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_44px]" />
						<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.2),rgba(10,10,10,0.88)_60%)]" />
					</div>

					<div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
						<WorkspaceContent
							activeId={activeId}
							onSidebar={setSidebar}
							onActions={setActions}
						/>
					</div>
				</main>

				{!isRightCollapsed ? (
					<>
						<button
							type="button"
							aria-label="关闭参数面板"
							onClick={() => setRightPanelCollapsed(true)}
							className="absolute inset-0 z-20 bg-[var(--color-bt-background)]/60 lg:hidden"
						/>
						<aside className="bt-scrollbar absolute inset-y-0 right-0 z-30 flex w-[min(20rem,calc(100vw-3rem))] flex-col overflow-y-auto border-l border-[var(--color-bt-border)] bg-[var(--color-bt-card)] lg:static lg:z-20 lg:w-72 lg:shrink-0">
							{sidebar}
						</aside>
					</>
				) : null}
			</div>
		</div>
	);
}
