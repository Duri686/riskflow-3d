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

export interface GlobalUiState {
	rightPanelCollapsed: boolean;
	timelineVisible: boolean;
	recentAlgorithms: AlgorithmId[];
}
