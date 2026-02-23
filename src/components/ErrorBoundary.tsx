import { AlertTriangle } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { BtButton } from "@/components/ui/BtButton";

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

/**
 * App 级错误边界
 * 捕获子树中未处理的渲染异常，防止整个应用白屏
 */
export class ErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false, error: null };

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("[ErrorBoundary] 捕获到渲染异常:", error, info.componentStack);
	}

	handleReset = () => {
		this.setState({ hasError: false, error: null });
	};

	render() {
		if (this.state.hasError) {
			return (
				<div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[var(--color-bt-background)] px-6 text-[var(--color-bt-foreground)]">
					<div className="bt-noise-overlay" />
					<div className="relative z-10 w-full max-w-2xl border border-[var(--color-bt-border)] bg-[var(--color-bt-card)] p-8 md:p-10">
						<div className="flex items-center gap-3 border-b border-[var(--color-bt-border)] pb-4">
							<AlertTriangle className="h-5 w-5 text-[var(--color-bt-accent)]" strokeWidth={1.5} />
							<h1 className="font-bt-mono text-sm uppercase tracking-[0.18em] text-[var(--color-bt-foreground)]">
								Runtime Error
							</h1>
						</div>

						<p className="mt-5 text-base leading-relaxed text-[var(--color-bt-muted-foreground)]">
							{this.state.error?.message || "未知错误"}
						</p>

						<pre className="bt-scrollbar mt-5 max-h-44 overflow-auto border border-[var(--color-bt-border)] bg-[var(--color-bt-background)] p-3 font-bt-mono text-[10px] leading-relaxed text-[var(--color-bt-muted-foreground)]">
							{this.state.error?.stack?.slice(0, 700)}
						</pre>

						<div className="mt-6 flex items-center justify-end border-t border-[var(--color-bt-border)] pt-4">
							<BtButton variant="outline" size="md" onClick={this.handleReset}>
								重新加载
							</BtButton>
						</div>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
