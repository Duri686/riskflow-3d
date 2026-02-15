import { Link } from "react-router-dom";
import { ALGORITHM_CATALOG, type AlgorithmId } from "../../algorithms/registry";

interface AlgorithmNavProps {
	activeId: AlgorithmId;
}

export function AlgorithmNav({ activeId }: AlgorithmNavProps) {
	return (
		<aside className="bg-rf-bg-elevated border border-rf-border rounded-panel p-4 backdrop-blur-sm">
			<h2 className="mt-0 mb-3">算法导航</h2>
			<nav className="grid gap-2">
				{ALGORITHM_CATALOG.map((item) => (
					<Link
						key={item.id}
						className={`border rounded-btn p-2.5 no-underline text-inherit flex justify-between items-center gap-2.5 ${
							item.id === activeId
								? "border-rf-border-active bg-[rgba(22,43,63,0.7)]"
								: "border-rf-border"
						}`}
						to={`/lab/${item.id}`}
					>
						<div>
							<strong className="block">{item.title}</strong>
							<span className="block text-rf-text-nav text-xs">
								{item.subtitle}
							</span>
						</div>
						<em className="not-italic text-[11px] text-rf-text-nav-em">
							{item.status === "ready" ? "就绪" : "开发中"}
						</em>
					</Link>
				))}
			</nav>
		</aside>
	);
}
