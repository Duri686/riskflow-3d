import { ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ALGORITHM_SHORTCUTS, DEFAULT_ALGORITHM_ID } from "../algorithms/registry";
import { RiskFlowLogo, MaterialIcon } from "../components/Logo";

export function HubPage() {
	const navigate = useNavigate();

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

	return (
		<div className="relative h-screen w-full overflow-hidden bg-rf-bg selection:bg-rf-primary selection:text-white">
			{/* 扫描线覆盖层 */}
			<div className="scanline-overlay pointer-events-none fixed inset-0 z-50 opacity-20 mix-blend-overlay" />

			{/* 背景层 */}
			<div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
				{/* 抽象渐变 */}
				<div className="absolute -left-1/2 -top-1/2 h-[200%] w-[200%] animate-pulse bg-linear-to-br from-rf-primary/10 via-transparent to-rf-accent/5 blur-3xl" style={{ animationDuration: "4s" }} />
				{/* 3D 透视网格 */}
				<div className="absolute inset-0 top-[30%] flex h-[150%] items-center justify-center">
					<div className="perspective-grid animate-grid-move h-full w-full border-t border-rf-primary/20" />
				</div>
				{/* 暗角 */}
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050507_90%)]" />
			</div>

			{/* 顶部导航 */}
			<nav className="rf-reveal absolute left-0 top-0 z-20 flex w-full items-center justify-between px-8 py-6" style={{ animationDelay: "0.5s" }}>
				<RiskFlowLogo />
				<div className="hidden items-center gap-6 font-mono text-xs text-rf-accent/70 md:flex">
					<div className="flex items-center gap-2">
						<span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
						<span>SYSTEM_ONLINE</span>
					</div>
					<span>v.3.0.1-BETA</span>
				</div>
			</nav>

			{/* 主内容区 */}
			<main className="relative z-10 flex h-full w-full flex-col items-center justify-center px-4 text-center">
				{/* Hero 文字容器 */}
				<div className="group relative mb-12">
					{/* 装饰线 */}
					<div className="rf-reveal absolute -left-12 top-0 hidden h-full w-px bg-linear-to-b from-transparent via-rf-primary/50 to-transparent md:block" style={{ animationDelay: "1s" }} />
					<div className="rf-reveal absolute -right-12 top-0 hidden h-full w-px bg-linear-to-b from-transparent via-rf-primary/50 to-transparent md:block" style={{ animationDelay: "1s" }} />

					{/* 主标题 */}
					<h1 className="rf-reveal retro-text-shadow select-none bg-linear-to-b from-white via-white to-white/40 bg-clip-text font-display text-6xl font-bold leading-none tracking-tighter text-transparent md:text-8xl lg:text-9xl">
						RiskFlow 3D
					</h1>

					{/* 副标题 */}
					<div className="rf-reveal mt-6 flex items-center justify-center gap-2" style={{ animationDelay: "0.3s" }}>
						<MaterialIcon name="terminal" className="animate-pulse text-sm text-rf-accent md:text-base" />
						<p className="font-mono text-sm tracking-wide text-rf-accent md:text-base lg:text-lg">
							Stop reading formulas. Start exploring
							<span className="animate-blink text-white">_</span>
						</p>
					</div>
				</div>

				{/* CTA 按钮 */}
				<div className="rf-reveal relative mt-8" style={{ animationDelay: "0.6s" }}>
					{/* 装饰括号 */}
					<div className="absolute -left-8 top-1/2 hidden -translate-y-1/2 font-mono text-2xl text-white/20 sm:block">[</div>
					<div className="absolute -right-8 top-1/2 hidden -translate-y-1/2 font-mono text-2xl text-white/20 sm:block">]</div>

					<button
						type="button"
						onClick={() => navigate(`/lab/${DEFAULT_ALGORITHM_ID}`)}
						className="rf-pill-hover glow-border group relative overflow-hidden border-2 border-rf-primary bg-transparent px-10 py-4 font-display text-lg font-bold uppercase tracking-widest text-white transition-all duration-300 hover:scale-105 hover:bg-rf-primary active:scale-95"
					>
						{/* 闪光效果 */}
						<div className="absolute inset-0 h-full w-full -translate-x-full skew-x-12 bg-linear-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
						<span className="relative z-10 flex items-center gap-3">
							INITIALIZE LAB
							<ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" strokeWidth={2} />
						</span>
					</button>

					<p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white/30">
						Secure Connection // Port 443
					</p>
				</div>
			</main>

			{/* 底部状态栏 */}
			<footer className="rf-reveal pointer-events-none absolute bottom-0 left-0 z-20 flex w-full items-end justify-between px-8 py-6" style={{ animationDelay: "0.8s" }}>
				<div className="flex flex-col gap-1 font-mono text-[10px] text-white/40">
					<div className="flex items-center gap-2">
						<MaterialIcon name="memory" className="text-[14px]" />
						<span>MEM_USAGE: 14%</span>
					</div>
					<div className="flex items-center gap-2">
						<MaterialIcon name="network_check" className="text-[14px]" />
						<span>LATENCY: 12ms</span>
					</div>
				</div>

				{/* 装饰性音量条 */}
				<div className="flex h-8 items-end gap-1">
					<div className="h-2 w-1 animate-pulse bg-rf-primary/20" />
					<div className="h-4 w-1 animate-pulse bg-rf-primary/40" style={{ animationDelay: "0.1s" }} />
					<div className="h-6 w-1 animate-pulse bg-rf-primary/60" style={{ animationDelay: "0.2s" }} />
					<div className="h-3 w-1 animate-pulse bg-rf-primary/80" style={{ animationDelay: "0.3s" }} />
					<div className="h-5 w-1 animate-pulse bg-rf-primary" style={{ animationDelay: "0.4s" }} />
				</div>
			</footer>
		</div>
	);
}
