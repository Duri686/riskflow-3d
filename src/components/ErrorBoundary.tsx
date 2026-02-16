import { Component, type ErrorInfo, type ReactNode } from "react";

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
        <div className="flex h-screen w-full flex-col items-center justify-center bg-rf-bg text-white">
          <div className="max-w-md text-center">
            <div className="mb-4 font-mono text-4xl text-red-500">⚠</div>
            <h1 className="mb-2 font-display text-xl font-bold tracking-widest">
              RUNTIME ERROR
            </h1>
            <p className="mb-4 font-mono text-sm text-gray-400">
              {this.state.error?.message || "未知错误"}
            </p>
            <pre className="mb-6 max-h-32 overflow-auto rounded border border-white/10 bg-white/5 p-3 text-left font-mono text-[10px] text-gray-500">
              {this.state.error?.stack?.slice(0, 500)}
            </pre>
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded border border-white/20 bg-transparent px-6 py-2 font-mono text-sm text-white transition-colors hover:bg-white/10"
            >
              重新加载
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
