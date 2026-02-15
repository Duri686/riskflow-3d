const formatPercent = (value: number): string => `${(value * 100).toFixed(2)}%`;

interface TimelineBarProps {
	progress: number;
	isMonteCarlo: boolean;
}

export function TimelineBar({ progress, isMonteCarlo }: TimelineBarProps) {
	return (
		<footer className="mt-3.5 bg-rf-bg-elevated border border-rf-border rounded-panel p-4 backdrop-blur-sm">
			{isMonteCarlo ? (
				<>
					<div className="flex justify-between mb-2">
						<span>播放时间线</span>
						<strong>{formatPercent(progress)}</strong>
					</div>
					<div className="progress-track">
						<div
							className="progress-bar"
							style={{ width: `${progress * 100}%` }}
						/>
					</div>
				</>
			) : (
				<p className="m-0">TODO: 时间线将支持关键帧与事件标注。</p>
			)}
		</footer>
	);
}
