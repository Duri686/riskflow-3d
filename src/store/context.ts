import { createContext } from "react";
import type { AlgorithmId } from "../algorithms/registry";
import type { AlgorithmSessionState, GlobalUiState } from "./types";

export interface LabStoreValue {
	globalUi: GlobalUiState;
	sessions: Partial<Record<AlgorithmId, AlgorithmSessionState>>;
	navigateToHub: () => void;
	navigateToLab: (algorithmId: AlgorithmId) => void;
	setRightPanelCollapsed: (collapsed: boolean) => void;
	setTimelineVisible: (visible: boolean) => void;
	markRecent: (algorithmId: AlgorithmId) => void;
	getSession: (algorithmId: AlgorithmId) => AlgorithmSessionState | undefined;
	upsertSession: (
		algorithmId: AlgorithmId,
		payload: Partial<Omit<AlgorithmSessionState, "algorithmId" | "updatedAt">>,
	) => void;
	resetSession: (algorithmId: AlgorithmId) => void;
}

export const LabStoreContext = createContext<LabStoreValue | null>(null);
