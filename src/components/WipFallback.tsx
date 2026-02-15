import type { AlgorithmId } from "../algorithms/registry";

const wipTodoMap: Record<Exclude<AlgorithmId, "monte-carlo">, string[]> = {
	"black-scholes": [
		"TODO: 期权价格曲面（S × T）",
		"TODO: Greeks 实时热力图",
		"TODO: 预设场景（实值/平值/虚值）",
	],
	markowitz: [
		"TODO: 有效前沿 3D 可视化",
		"TODO: 权重约束编辑器",
		"TODO: 最大 Sharpe / 最小方差标注",
	],
	"kalman-filter": [
		"TODO: 状态估计与观测轨迹",
		"TODO: Q/R 噪声参数动态对比",
		"TODO: 残差和置信区间面板",
	],
};

interface WipFallbackProps {
	title: string;
	algorithmId: AlgorithmId;
}

export function WipFallback({ title, algorithmId }: WipFallbackProps) {
	const todos =
		algorithmId === "monte-carlo"
			? []
			: wipTodoMap[algorithmId];

	return (
		<div className="min-h-full grid content-center justify-items-center text-center gap-2.5">
			<h2 className="mt-0 mb-0.5">{title} · 开发中</h2>
			<p>TODO: 中央 3D 舞台内容将按算法逐步接入。</p>
			{todos.length > 0 && (
				<ul className="m-0 pl-4.5 text-left">
					{todos.map((todo) => (
						<li key={todo}>{todo}</li>
					))}
				</ul>
			)}
		</div>
	);
}
