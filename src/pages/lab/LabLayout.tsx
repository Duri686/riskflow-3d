import { RiskFlowLogo, MaterialIcon } from "../../components/Logo";
import { ALGORITHM_CATALOG, type AlgorithmId } from "../../algorithms/registry";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

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
        <div className="flex-1 overflow-x-auto px-4">
          <div className="flex w-max items-center gap-1">
            {ALGORITHM_CATALOG.map((algo, index) => {
              const isActive = algo.id === activeId;
              const isDisabled = algo.status === "wip";
              return (
                <button
                  type="button"
                  key={algo.id}
                  onClick={() => !isDisabled && navigateToLab(algo.id)}
                  disabled={isDisabled}
                  className={`group relative rounded-sm border px-2.5 py-1.5 text-left transition-all ${
                    isActive
                      ? "border-rf-primary/50 bg-rf-primary/10"
                      : isDisabled
                        ? "cursor-not-allowed border-transparent opacity-30"
                        : "border-transparent hover:border-white/10 hover:bg-white/5"
                  }`}
                  title={algo.title}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-gray-600">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`truncate font-display text-[11px] font-medium ${isActive ? "text-white" : "text-gray-500"}`}
                    >
                      {algo.title.toUpperCase()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
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
