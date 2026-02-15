import type { LucideIcon } from "lucide-react";
import {
	Activity,
	ArrowRight,
	ArrowUpRight,
	Check,
	Github,
	History,
	PieChart,
	Sigma,
	Sparkles,
	Terminal,
	Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
	ALGORITHM_CATALOG,
	ALGORITHM_SHORTCUTS,
	DEFAULT_ALGORITHM_ID,
	getAlgorithmMeta,
	type AlgorithmId,
} from "../algorithms/registry";
import { useLabStore } from "../store/useLabStore";

const shortcutByAlgorithm = Object.fromEntries(
	Object.entries(ALGORITHM_SHORTCUTS).map(([key, id]) => [id, key]),
);

const algorithmIconById: Record<AlgorithmId, LucideIcon> = {
	"monte-carlo": Sparkles,
	"black-scholes": Sigma,
	markowitz: PieChart,
	"kalman-filter": Activity,
};

/* 品牌标识 — 荧光青配色 */
function BrandMark() {
	return (
		<svg
			aria-hidden="true"
			className="h-4 w-4"
			fill="none"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>RiskFlow 品牌标识</title>
			<defs>
				<linearGradient id="rf-brand-stroke" x1="4" x2="20" y1="18" y2="6">
					<stop offset="0" stopColor="#00FF9D" />
					<stop offset="1" stopColor="#2E5BFF" />
				</linearGradient>
			</defs>
			<path
				d="M4 17.5L8.5 12.2L12.6 14.8L19.4 6.8"
				stroke="url(#rf-brand-stroke)"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
			<circle cx="19.4" cy="6.8" fill="url(#rf-brand-stroke)" r="2" />
			<path
				d="M4 20H20"
				stroke="rgba(255,255,255,0.12)"
				strokeLinecap="round"
				strokeWidth="1.4"
			/>
		</svg>
	);
}

export function HubPage() {
	const {
		globalUi: { recentAlgorithms },
	} = useLabStore();

	return (
		<div className="relative min-h-screen overflow-hidden bg-rf-bg">
			{/* 能量网格背景层 */}
			<div className="pointer-events-none absolute inset-0">
				{/* CSS 网格 — 4K 清晰 */}
				<div className="rf-grid-bg rf-grid-enter absolute inset-0" />
				{/* 顶部环境光 — 极淡荧光青 */}
				<div className="absolute -top-32 left-1/2 h-96 w-full max-w-3xl -translate-x-1/2 rounded-full bg-rf-primary/4 blur-3xl" />
				{/* 底部量化蓝环境光 */}
				<div className="absolute -bottom-48 left-1/2 h-80 w-full max-w-2xl -translate-x-1/2 rounded-full bg-rf-accent/3 blur-3xl" />
			</div>

			<div className="relative mx-auto max-w-5xl px-6 py-10 2xl:px-8 2xl:py-14">
				{/* 顶部导航 — 极简终端风 */}
				<nav className="rf-reveal flex items-center justify-between">
					<div className="flex items-center gap-2.5">
						<div className="rf-brand-badge grid h-8 w-8 place-items-center rounded-md">
							<BrandMark />
						</div>
						<span className="font-mono text-sm tracking-wide text-rf-text-secondary">
							RiskFlow 3D
						</span>
					</div>
					<div className="flex items-center gap-4">
						<span className="rounded-sm border border-rf-border px-2 py-0.5 font-mono text-xs text-rf-text-dim">
							Phase 1
						</span>
						<a
							className="inline-flex items-center gap-1.5 font-mono text-xs text-rf-text-muted no-underline transition-colors hover:text-rf-primary"
							href="https://github.com/Duri686/riskflow-3d"
							target="_blank"
							rel="noreferrer"
						>
							<Github className="h-3.5 w-3.5" strokeWidth={1.8} />
							<span>GitHub</span>
							<ArrowUpRight className="h-3 w-3" strokeWidth={2} />
						</a>
					</div>
				</nav>

				{/* Hero — 研究工作台标题 */}
				<section className="rf-reveal rf-delay-1 mt-16 mb-12 text-center sm:mt-24 sm:mb-14 2xl:mt-32 2xl:mb-18">
					<h1 className="m-0 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl 2xl:text-6xl">
						<span className="text-rf-text">不止读公式</span>
						<br />
						<span className="bg-linear-to-r from-rf-primary to-rf-accent bg-clip-text text-transparent">
							动手探索金融算法
						</span>
					</h1>

					<p className="mx-auto mt-5 max-w-md font-mono text-sm leading-relaxed text-rf-text-secondary sm:text-base 2xl:mt-7">
						4 种核心算法的 3D 交互实验室
						<br />
						<span className="text-rf-text-muted">
							调节参数 · 观察演化 · 建立金融直觉
						</span>
					</p>

					{/* CTA 按钮 — 荧光青边框 */}
					<div className="mt-10 2xl:mt-12">
						<Link
							className="rf-pill-hover group inline-flex items-center gap-2.5 rounded-sm border border-rf-primary/40 bg-rf-primary/8 px-7 py-3 font-mono text-sm font-semibold text-rf-text no-underline transition-colors hover:bg-rf-primary/15"
							to={`/lab/${DEFAULT_ALGORITHM_ID}`}
						>
							<Terminal className="h-4 w-4 text-rf-primary" strokeWidth={2} />
							<span>进入实验室</span>
							<ArrowRight className="h-3.5 w-3.5 text-rf-primary transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
						</Link>
					</div>

					{/* 能力标签 */}
					<div className="mt-6 flex flex-wrap items-center justify-center gap-2">
						{[
							{ icon: Sparkles, label: "参数实验", color: "text-rf-primary" },
							{ icon: PieChart, label: "3D 可视化", color: "text-rf-accent" },
							{ icon: Activity, label: "实时演化", color: "text-rf-primary" },
						].map(({ icon: Icon, label, color }) => (
							<span
								key={label}
								className="inline-flex items-center gap-1.5 rounded-sm border border-rf-border px-2.5 py-1 font-mono text-xs text-rf-text-muted"
							>
								<Icon className={`h-3 w-3 ${color}`} strokeWidth={2} />
								{label}
							</span>
						))}
					</div>
				</section>

				{/* 算法卡片 — Bento Grid 研究单元 */}
				<section>
					<div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
						{ALGORITHM_CATALOG.map((algo, index) => {
							const isReady = algo.status === "ready";
							const shortcut = shortcutByAlgorithm[algo.id];
							const AlgorithmIcon = algorithmIconById[algo.id];

							return (
								<Link
									key={algo.id}
									className={`rf-card-hover rf-glow-hover rf-reveal rf-stagger-${index + 1} group flex gap-4 p-5 no-underline text-inherit 2xl:p-6`}
									to={`/lab/${algo.id}`}
								>
									{/* 左侧图标 */}
									<div className="rf-icon-accent grid h-11 w-11 shrink-0 place-items-center rounded-lg">
										<AlgorithmIcon className="h-5 w-5" strokeWidth={1.8} />
									</div>

									{/* 右侧内容 */}
									<div className="grid min-w-0 flex-1 gap-2">
										{/* 标题行：标题 + 状态徽章 + 快捷键 */}
										<div className="flex items-center gap-2">
											<h3 className="rf-card-title m-0 font-display text-base font-semibold text-rf-text 2xl:text-lg">
												{algo.title}
											</h3>
											<span
												className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-xs font-bold ${
													isReady
														? "bg-rf-ready-bg text-rf-ready"
														: "bg-rf-wip-bg text-rf-wip"
												}`}
											>
												{isReady ? (
													<Check className="h-3 w-3" strokeWidth={2.4} />
												) : (
													<Wrench className="h-3 w-3" strokeWidth={2.2} />
												)}
												{isReady ? "就绪" : "开发中"}
											</span>
											{shortcut && (
												<span className="ml-auto rounded-sm border border-rf-border px-1.5 py-0.5 font-mono text-xs text-rf-text-dim">
													x{shortcut}
												</span>
											)}
										</div>

										{/* 描述 */}
										<p className="m-0 text-sm leading-relaxed text-rf-text-secondary">
											{algo.description}
										</p>

										{/* 标签 */}
										<div className="flex flex-wrap gap-1.5">
											{algo.tags.map((tag) => (
												<span
													key={tag}
													className="rounded-sm border border-rf-border px-2 py-0.5 font-mono text-xs text-rf-text-dim"
												>
													{tag}
												</span>
											))}
										</div>
									</div>
								</Link>
							);
						})}
					</div>
				</section>

				{/* 最近访问 */}
				{recentAlgorithms.length > 0 && (
					<section className="rf-reveal rf-delay-3 mt-6 flex items-center gap-1.5 font-mono text-xs text-rf-text-dim">
						<History className="h-3.5 w-3.5" strokeWidth={2} />
						<span>继续上次：</span>
						{recentAlgorithms.map((id, i) => {
							const meta = getAlgorithmMeta(id);
							return (
								<span key={id} className="inline-flex items-center">
									{i > 0 && <span className="mx-1 text-rf-text-dim/50">·</span>}
									<Link
										className="text-rf-text no-underline transition-colors hover:text-rf-primary"
										to={`/lab/${id}`}
									>
										{meta.title}
									</Link>
								</span>
							);
						})}
					</section>
				)}

				{/* Footer — 极简分隔线 */}
				<footer className="rf-reveal rf-delay-4 mt-16 flex items-center justify-between border-t border-rf-border pt-6 font-mono text-xs text-rf-text-dim 2xl:mt-20">
					<span>RiskFlow 3D · 金融算法交互实验室</span>
					<span>MIT · React + Three.js + Tailwind v4</span>
				</footer>
			</div>
		</div>
	);
}
