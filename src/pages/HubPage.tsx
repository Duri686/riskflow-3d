import { ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
	ALGORITHM_SHORTCUTS,
	DEFAULT_ALGORITHM_ID,
} from "@/algorithms/registry";
import { RiskFlowLogo } from "@/components/Logo";
import { BtButton } from "@/components/ui/BtButton";

const manifestoMetrics = [
	{ label: "算法模块", value: "04" },
	{ label: "实时决策维度", value: "3D" },
	{ label: "核心目标", value: "RISK TO SIGNAL" },
] as const;

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
		<div className="relative min-h-screen overflow-hidden bg-[var(--color-bt-background)] text-[var(--color-bt-foreground)] selection:bg-[var(--color-bt-accent)] selection:text-[var(--color-bt-accent-foreground)]">
			<div className="bt-noise-overlay" />
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_70%_at_78%_0%,rgba(255,61,0,0.16),transparent_52%)]" />
			<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:100%_54px] opacity-20" />

			<div className="pointer-events-none absolute -right-3 top-18 hidden select-none font-bt-sans text-[clamp(8rem,20vw,16rem)] leading-none font-semibold tracking-[-0.06em] text-[var(--color-bt-muted)]/45 lg:block">
				RISK
			</div>

			<nav className="relative z-20 border-b border-[var(--color-bt-border)]">
				<div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-6 md:px-12">
					<RiskFlowLogo
						size="sm"
						accentColor="var(--color-bt-accent)"
						className="text-[var(--color-bt-foreground)]"
					/>
					<span className="font-bt-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-bt-muted-foreground)]">
						Command + 1~4
					</span>
				</div>
			</nav>

			<main className="relative z-10 mx-auto flex min-h-[calc(100vh-89px)] w-full max-w-[1200px] flex-col justify-between gap-18 px-6 pb-10 pt-10 md:px-12 md:pt-16">
				<section>
					<p className="font-bt-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-bt-muted-foreground)]">
						Quantitative Risk Interface
					</p>
					<h1 className="mt-5 max-w-[11ch] font-bt-sans text-5xl leading-[0.94] font-semibold uppercase tracking-[-0.055em] text-[var(--color-bt-foreground)] sm:text-6xl md:text-7xl lg:text-8xl">
						<span className="block">Make Risk</span>
						<span className="block text-[var(--color-bt-accent)]">Legible.</span>
					</h1>
					<p className="mt-7 max-w-2xl text-base leading-relaxed text-[var(--color-bt-muted-foreground)] md:text-lg">
						把 Monte Carlo、Kalman、Black-Scholes 与 Markowitz 放进同一块交互画布，
						让你在拖拽参数时直接看到风险如何扩散、收敛与拐点切换。
					</p>

					<div className="mt-10 flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:gap-10">
						<BtButton
							variant="primary"
							size="lg"
							onClick={() => navigate(`/lab/${DEFAULT_ALGORITHM_ID}`)}
							endIcon={<ArrowRight className="h-4 w-4" strokeWidth={1.5} />}
						>
							进入实验工作台
						</BtButton>
						<p className="font-bt-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-bt-muted-foreground)]">
							快捷键: cmd/ctrl + 1 2 3 4
						</p>
					</div>
				</section>

				<section className="grid gap-6 border-t border-[var(--color-bt-border)] pt-8 sm:grid-cols-3">
					{manifestoMetrics.map((metric) => (
						<div key={metric.label} className="space-y-2">
							<p className="font-bt-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-bt-muted-foreground)]">
								{metric.label}
							</p>
							<p className="font-bt-sans text-[clamp(1.5rem,5vw,2.2rem)] leading-none font-semibold uppercase tracking-[-0.04em] text-[var(--color-bt-foreground)]">
								{metric.value}
							</p>
						</div>
					))}
				</section>
			</main>
		</div>
	);
}
