import { ALGORITHM_CATALOG, type AlgorithmId } from "../../algorithms/registry";
import { useNavigate } from "react-router-dom";

interface AlgorithmNavProps {
	activeId: AlgorithmId;
}

export function AlgorithmNav({ activeId }: AlgorithmNavProps) {
	const navigate = useNavigate();

	return (
		<aside className="bg-rf-bg-elevated border border-rf-border rounded-panel p-4 backdrop-blur-sm">
			<h2 className="mt-0 mb-3">算法导航</h2>
			<nav className="grid gap-2">
				{ALGORITHM_CATALOG.map((item) => (
					<button
						type="button"
						key={item.id}
						onClick={() => navigate(`/lab/${item.id}`)}
						className={`cursor-pointer border rounded-btn p-2.5 text-inherit flex justify-between items-center gap-2.5 ${
							item.id === activeId
								? "border-rf-border-active bg-[rgba(22,43,63,0.7)]"
								: "border-rf-border bg-transparent"
						}`}
					>
						<div className="text-left">
							<strong className="block">{item.title}</strong>
							<span className="block text-rf-text-nav text-xs">
								{item.subtitle}
							</span>
						</div>
						<em className="not-italic text-[11px] text-rf-text-nav-em">
							{item.status === "ready" ? "就绪" : "开发中"}
						</em>
					</button>
				))}
			</nav>
		</aside>
	);
}
