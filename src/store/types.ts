import type { AlgorithmId } from "../algorithms/registry";
import type { MonteCarloSessionSnapshot } from "../algorithms/monte-carlo/useSession";

export interface PanelSectionsState {
	parametersOpen: boolean;
	metricsOpen: boolean;
	notesOpen: boolean;
}

export const DEFAULT_PANEL_SECTIONS: PanelSectionsState = {
	parametersOpen: true,
	metricsOpen: true,
	notesOpen: true,
};

export interface AlgorithmSessionState {
	algorithmId: AlgorithmId;
	panelSections: PanelSectionsState;
	monteCarlo?: MonteCarloSessionSnapshot;
	updatedAt: number;
}

export type ViewType = "hub" | "lab";

export interface GlobalUiState {
	currentView: ViewType;
	currentAlgorithmId: AlgorithmId;
	rightPanelCollapsed: boolean;
	timelineVisible: boolean;
	recentAlgorithms: AlgorithmId[];
}
