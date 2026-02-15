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
    <div className="z-20 flex shrink-0 items-center gap-4 border-t border-white/5 bg-rf-bg/60 px-4 py-2">
      <div className="flex flex-1 items-center gap-3">
        <div className="relative h-0.5 flex-1 rounded-full bg-white/10">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-rf-accent to-rf-primary"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="font-mono text-[10px] tabular-nums text-gray-500">
          {currentStep}/{totalSteps}
        </span>
      </div>

      {progress >= 1 ? (
        <div className="flex h-7 w-20 items-center justify-center gap-2 rounded border border-rf-accent/50 bg-rf-accent/10 font-mono text-[10px] font-medium text-rf-accent">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rf-accent" />
          <span className="w-12 text-center">已完成</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={onTogglePlay}
          className={`flex h-7 w-20 items-center justify-center gap-2 rounded border font-mono text-[10px] font-medium transition-all ${
            isPlaying
              ? "border-rf-accent/50 bg-rf-accent/10 text-rf-accent hover:bg-rf-accent/20"
              : "border-rf-primary/50 bg-rf-primary/10 text-rf-primary hover:bg-rf-primary/20"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${isPlaying ? "animate-pulse bg-rf-accent" : "bg-rf-primary"}`}
          />
          <span className="w-12 text-center">
            {isPlaying ? "运行中" : "已暂停"}
          </span>
        </button>
      )}
    </div>
  );
}
