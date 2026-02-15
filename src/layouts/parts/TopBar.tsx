import { Link } from "react-router-dom";
import {
	ALGORITHM_CATALOG,
	type AlgorithmId,
	type AlgorithmMeta,
} from "../../algorithms/registry";

interface TopBarProps {
	meta: AlgorithmMeta;
	activeId: AlgorithmId;
	rightPanelCollapsed: boolean;
	onToggleRightPanel: () => void;
	onReset: () => void;
}

export function TopBar({
	meta,
	activeId,
	rightPanelCollapsed,
	onToggleRightPanel,
	onReset,
}: TopBarProps) {
	return (
		<header className="flex shrink-0 items-center gap-3 border-b border-rf-border bg-rf-bg-elevated/80 px-4 py-2 backdrop-blur-md">
			<Link
				to="/"
				className="text-sm text-rf-text-secondary no-underline transition-colors hover:text-rf-text"
			>
				← 大厅
			</Link>

			<span className="h-5 w-px bg-rf-border" />

			<span className="truncate text-sm font-semibold">
				{meta.title}
				<span className="mx-1.5 text-rf-text-dim">·</span>
				<span className="font-normal text-rf-text-secondary">
					{meta.subtitle}
				</span>
			</span>

			<div className="flex-1" />

			<nav className="hidden gap-1 sm:flex">
				{ALGORITHM_CATALOG.map((item) => (
					<Link
						key={item.id}
						to={`/lab/${item.id}`}
						className={`rounded-pill px-2.5 py-1 text-xs no-underline transition-colors ${
							item.id === activeId
								? "border border-rf-accent/30 bg-rf-accent/15 text-rf-accent"
								: "border border-transparent text-rf-text-dim hover:text-rf-text-secondary"
						}`}
					>
						{item.title}
					</Link>
				))}
			</nav>

			<span className="h-5 w-px bg-rf-border" />

			<div className="flex gap-1.5">
				<button
					type="button"
					onClick={onReset}
					className="rounded-btn px-2.5 py-1 text-xs"
				>
					重置
				</button>
				<button
					type="button"
					onClick={onToggleRightPanel}
					className="rounded-btn px-2.5 py-1 text-xs"
				>
					{rightPanelCollapsed ? "展开" : "收起"}
				</button>
			</div>
		</header>
	);
}
