import type { AlgorithmId } from "@/algorithms/registry";

export interface LabBottomNavItem {
	id: AlgorithmId;
	indexLabel: string;
	shortLabel: string;
}

interface LabBottomNavProps {
	items: LabBottomNavItem[];
	activeId: AlgorithmId;
	onChange: (id: AlgorithmId) => void;
}

const combineClasses = (...classes: Array<string | undefined | false>) => {
	return classes.filter(Boolean).join(" ");
};

export const LabBottomNav = ({
	items,
	activeId,
	onChange,
}: LabBottomNavProps) => {
	return (
		<nav
			aria-label="Lab 算法导航"
			className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-bt-border)] bg-[var(--color-bt-background)]/98 backdrop-blur-[1px] md:hidden"
		>
			<ul
				className="grid grid-cols-4"
				style={{
					paddingBottom: "env(safe-area-inset-bottom)",
				}}
			>
				{items.map((item) => {
					const isActive = item.id === activeId;

					return (
						<li key={item.id}>
							<button
								type="button"
								onClick={() => onChange(item.id)}
								aria-current={isActive ? "page" : undefined}
								className={combineClasses(
									"relative flex h-14 min-h-11 w-full flex-col items-center justify-center gap-0.5 px-1 font-bt-mono uppercase tracking-[0.14em] text-[var(--color-bt-muted-foreground)] transition-colors duration-150 ease-[var(--ease-bt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-bt-ring)]",
									isActive && "text-[var(--color-bt-foreground)]",
								)}
							>
								<span className="text-[9px] opacity-80">{item.indexLabel}</span>
								<span className="text-[10px] font-semibold">{item.shortLabel}</span>
								<span
									className={combineClasses(
										"absolute bottom-0 left-0 h-[2px] w-full origin-left bg-[var(--color-bt-accent)] transition-transform duration-150 ease-[var(--ease-bt)]",
										isActive ? "scale-x-100" : "scale-x-0",
									)}
								/>
							</button>
						</li>
					);
				})}
			</ul>
		</nav>
	);
};
