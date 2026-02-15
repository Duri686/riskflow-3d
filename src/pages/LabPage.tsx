import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ALGORITHM_SHORTCUTS,
  type AlgorithmId,
  DEFAULT_ALGORITHM_ID,
  getAlgorithmMeta,
  isAlgorithmId,
} from "../algorithms/registry";
import { MonteCarloWorkspace } from "./lab/MonteCarloWorkspace";
import { KalmanWorkspace } from "./lab/KalmanWorkspace";

export function LabPage() {
  const navigate = useNavigate();
  const params = useParams();
  const routeId = params.id as string | undefined;
  const algorithmId: AlgorithmId = isAlgorithmId(routeId ?? "")
    ? (routeId as AlgorithmId)
    : DEFAULT_ALGORITHM_ID;
  const currentMeta = getAlgorithmMeta(algorithmId);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) return;
      const targetAlgorithmId = ALGORITHM_SHORTCUTS[event.key];
      if (!targetAlgorithmId) return;
      event.preventDefault();
      navigate(`/lab/${targetAlgorithmId}`);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  if (algorithmId === "monte-carlo") {
    return <MonteCarloWorkspace />;
  }

  if (algorithmId === "kalman-filter") {
    return <KalmanWorkspace />;
  }

  // Fallback / WIP for other algorithms
  return (
    <div className="flex h-screen w-full items-center justify-center bg-rf-bg text-white">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold tracking-widest text-rf-primary mb-2">
          {currentMeta.title.toUpperCase()}
        </h1>
        <p className="font-mono text-sm text-gray-500">
          // WORKSPACE_UNDER_CONSTRUCTION
        </p>
        <button
          onClick={() => navigate(`/lab/${DEFAULT_ALGORITHM_ID}`)}
          className="mt-6 px-4 py-2 text-xs font-mono border border-white/20 hover:bg-white/5 rounded transition-colors"
        >
          return_to_base()
        </button>
      </div>
    </div>
  );
}
