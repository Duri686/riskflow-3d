import type { ReactNode } from "react";

interface WorkspaceActionsShellProps {
	children: ReactNode;
	className?: string;
}

const combineClasses = (...classes: Array<string | undefined | false>) => {
	return classes.filter(Boolean).join(" ");
};

export const WorkspaceActionsShell = ({
	children,
	className,
}: WorkspaceActionsShellProps) => {
	return (
		<div
			className={combineClasses(
				"flex items-center gap-2 border-l border-[var(--color-bt-border)] pl-3",
				className,
			)}
		>
			{children}
		</div>
	);
};
