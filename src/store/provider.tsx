import {
	type PropsWithChildren,
	useCallback,
	useMemo,
	useState,
} from "react";
import type { AlgorithmId } from "../algorithms/registry";
import { DEFAULT_ALGORITHM_ID } from "../algorithms/registry";
import { LabStoreContext, type LabStoreValue } from "./context";
import {
	DEFAULT_PANEL_SECTIONS,
	type AlgorithmSessionState,
	type GlobalUiState,
} from "./types";

export function LabStoreProvider({ children }: PropsWithChildren) {
	const [globalUi, setGlobalUi] = useState<GlobalUiState>({
		rightPanelCollapsed: false,
		timelineVisible: true,
		recentAlgorithms: [DEFAULT_ALGORITHM_ID],
	});
	const [sessions, setSessions] = useState<
		Partial<Record<AlgorithmId, AlgorithmSessionState>>
	>({});

	const setRightPanelCollapsed = useCallback((collapsed: boolean) => {
		setGlobalUi((previous) => ({ ...previous, rightPanelCollapsed: collapsed }));
	}, []);

	const setTimelineVisible = useCallback((visible: boolean) => {
		setGlobalUi((previous) => ({ ...previous, timelineVisible: visible }));
	}, []);

	const markRecent = useCallback((algorithmId: AlgorithmId) => {
		setGlobalUi((previous) => {
			const withoutCurrent = previous.recentAlgorithms.filter(
				(item) => item !== algorithmId,
			);

			return {
				...previous,
				recentAlgorithms: [algorithmId, ...withoutCurrent].slice(0, 4),
			};
		});
	}, []);

	const getSession = useCallback(
		(algorithmId: AlgorithmId) => sessions[algorithmId],
		[sessions],
	);

	const upsertSession = useCallback(
		(
			algorithmId: AlgorithmId,
			payload: Partial<Omit<AlgorithmSessionState, "algorithmId" | "updatedAt">>,
		) => {
			setSessions((previous) => {
				const previousSession = previous[algorithmId];

				return {
					...previous,
					[algorithmId]: {
						algorithmId,
						panelSections:
							payload.panelSections ??
							previousSession?.panelSections ??
							DEFAULT_PANEL_SECTIONS,
						monteCarlo: payload.monteCarlo ?? previousSession?.monteCarlo,
						updatedAt: Date.now(),
					},
				};
			});
		},
		[],
	);

	const resetSession = useCallback((algorithmId: AlgorithmId) => {
		setSessions((previous) => {
			const next = { ...previous };
			delete next[algorithmId];
			return next;
		});
	}, []);

	const value = useMemo<LabStoreValue>(
		() => ({
			globalUi,
			sessions,
			setRightPanelCollapsed,
			setTimelineVisible,
			markRecent,
			getSession,
			upsertSession,
			resetSession,
		}),
		[
			getSession,
			globalUi,
			markRecent,
			resetSession,
			sessions,
			setRightPanelCollapsed,
			setTimelineVisible,
			upsertSession,
		],
	);

	return (
		<LabStoreContext.Provider value={value}>{children}</LabStoreContext.Provider>
	);
}
