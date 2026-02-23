interface FooterProps {
	progress: number;
	currentStep: number;
	totalSteps: number;
	isPlaying: boolean;
	onTogglePlay: () => void;
}

export function Footer({
	progress,
	currentStep,
	totalSteps,
	isPlaying,
	onTogglePlay,
}: FooterProps) {
	return (
		<div className="z-20 flex shrink-0 items-center gap-4 border-t border-[var(--color-bt-border)] bg-[var(--color-bt-card)] px-4 py-2">
			<div className="flex flex-1 items-center gap-3">
				<div className="relative h-0.5 flex-1 bg-[var(--color-bt-border)]">
					<div
						className="absolute inset-y-0 left-0 bg-[var(--color-bt-accent)]"
						style={{ width: `${progress * 100}%` }}
					/>
				</div>
				<span className="font-bt-mono text-[10px] tabular-nums text-[var(--color-bt-muted-foreground)]">
					{currentStep}/{totalSteps}
				</span>
			</div>

			{progress >= 1 ? (
				<div className="flex h-8 min-w-20 items-center justify-center gap-2 border border-[var(--color-bt-success)]/50 bg-[var(--color-bt-success-soft)] px-2 font-bt-mono text-[10px] font-medium text-[var(--color-bt-success)]">
					<span className="h-1.5 w-1.5 shrink-0 bg-[var(--color-bt-success)]" />
					<span>已完成</span>
				</div>
			) : (
				<button
					type="button"
					onClick={onTogglePlay}
					className={`flex h-8 min-w-20 items-center justify-center gap-2 border px-2 font-bt-mono text-[10px] font-medium transition-colors duration-150 ease-[var(--ease-bt)] ${
						isPlaying
							? "border-[var(--color-bt-success)]/50 bg-[var(--color-bt-success-soft)] text-[var(--color-bt-success)] hover:bg-[var(--color-bt-success-soft)]/80"
							: "border-[var(--color-bt-warning)]/50 bg-[var(--color-bt-warning-soft)] text-[var(--color-bt-warning)] hover:bg-[var(--color-bt-warning-soft)]/80"
					}`}
				>
					<span
						className={`h-1.5 w-1.5 shrink-0 ${
							isPlaying
								? "bg-[var(--color-bt-success)] animate-pulse"
								: "bg-[var(--color-bt-warning)]"
						}`}
					/>
					<span>{isPlaying ? "运行中" : "已暂停"}</span>
				</button>
			)}
		</div>
	);
}
