import { RiskFlowLogo, MaterialIcon } from "../../components/Logo";
import { ALGORITHM_CATALOG, type AlgorithmId } from "../../algorithms/registry";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useLayoutEffect, useCallback } from "react";

interface LabLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  activeId: AlgorithmId;
  actions?: React.ReactNode;
}

export function LabLayout({ children, sidebar, activeId, actions }: LabLayoutProps) {
  const navigate = useNavigate();
  const [isRightCollapsed, setRightPanelCollapsed] = useState(false);
  const navigateToLab = (id: AlgorithmId) => navigate(`/lab/${id}`);
  const navigateToHub = () => navigate("/");

  /* ─── 滑动指示器状态 ─── */
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const activeIndex = ALGORITHM_CATALOG.findIndex((a) => a.id === activeId);
    const el = tabRefs.current[activeIndex];
    const container = containerRef.current;
    if (el && container) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setIndicator({
        left: elRect.left - containerRect.left,
        width: elRect.width,
      });
    }
  }, [activeId]);

  useLayoutEffect(() => {
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  return (
    <div className="flex h-screen w-full flex-col bg-rf-bg pt-14 font-body text-white selection:bg-rf-primary selection:text-white">
      {/* 扫描线覆盖层 */}
      <div className="scanlines pointer-events-none fixed inset-0 z-50 opacity-10" />

      {/* 顶部导航栏 */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-rf-surface-solid/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={navigateToHub}
            className="flex h-8 w-8 items-center justify-center border-none bg-transparent p-0"
          >
            <RiskFlowLogo size="sm" showText={false} />
          </button>
          <h1 className="flex items-center font-display text-sm font-bold tracking-[0.2em] text-white">
            RISKFLOW
          </h1>
        </div>
        {/* ═══════ 导航标签 ═══════ */}
        <nav className="ml-4 flex-1 overflow-x-auto">
          <div
            ref={containerRef}
            className="relative inline-flex items-center gap-0.5 rounded-xl border border-white/10 bg-white/3 p-1 backdrop-blur-md"
          >
            {/* 滑动指示器 */}
            <div
              className="pointer-events-none absolute top-1 bottom-1 rounded-lg bg-linear-to-r from-rf-primary/80 to-rf-primary shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all duration-300 ease-out"
              style={{ left: indicator.left, width: indicator.width }}
            />
            {ALGORITHM_CATALOG.map((algo, index) => {
              const isActive = algo.id === activeId;
              const isDisabled = algo.status === "wip";
              return (
                <button
                  type="button"
                  key={algo.id}
                  ref={(el) => { tabRefs.current[index] = el; }}
                  onClick={() => !isDisabled && navigateToLab(algo.id)}
                  disabled={isDisabled}
                  className={`relative z-10 flex items-center gap-2 rounded-lg bg-transparent px-4 py-1.5 transition-colors ${
                    isActive
                      ? "text-white"
                      : isDisabled
                        ? "cursor-not-allowed text-white/20"
                        : "text-gray-400 hover:text-white"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold ${
                      isActive
                        ? "bg-white/20"
                        : isDisabled
                          ? "bg-white/5 opacity-30"
                          : "bg-white/5 group-hover:bg-white/10"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`whitespace-nowrap text-xs ${
                      isActive ? "font-semibold" : "font-medium"
                    }`}
                  >
                    {algo.title.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRightPanelCollapsed(!isRightCollapsed)}
              className={`flex h-8 w-8 items-center justify-center rounded border bg-transparent transition-colors ${
                isRightCollapsed
                  ? "border-rf-primary/50 text-rf-primary"
                  : "border-white/10 text-gray-400 hover:bg-white/5"
              }`}
              title={isRightCollapsed ? "显示参数面板" : "隐藏参数面板"}
            >
              <MaterialIcon
                name={isRightCollapsed ? "dock_to_left" : "dock_to_right"}
                className="text-base"
              />
            </button>
            {actions}
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* 中间可视化区域 */}
        <main className="relative flex flex-1 flex-col overflow-hidden bg-rf-bg min-h-0">
          {/* 3D 网格背景 */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="bg-grid-3d absolute inset-0 opacity-20" />
            <div className="absolute inset-0 bg-linear-to-t from-rf-bg via-transparent to-rf-bg" />
          </div>

          {/* 内容区 */}
          <div className="relative z-10 flex flex-1 flex-col min-h-0 overflow-hidden">
            {children}
          </div>
        </main>

        {/* ════════ 右侧参数面板 ════════ */}
        {!isRightCollapsed && (
          <aside className="glass-panel rf-scrollbar z-20 flex w-72 shrink-0 flex-col overflow-y-auto border-l border-white/10">
            {sidebar}
          </aside>
        )}
      </div>
    </div>
  );
}
