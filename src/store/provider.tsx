import {
	type PropsWithChildren,
	useCallback,
	useMemo,
	useState,
	useEffect,
} from "react";
import type { AlgorithmId } from "../algorithms/registry";
import { DEFAULT_ALGORITHM_ID, isAlgorithmId } from "../algorithms/registry";
import { LabStoreContext, type LabStoreValue } from "./context";
import {
	DEFAULT_PANEL_SECTIONS,
	type AlgorithmSessionState,
	type GlobalUiState,
} from "./types";

// 将 URL 路径解析为视图状态（不触发副作用）
function parsePathnameToState(pathname: string): {
  view: "hub" | "lab";
  algorithmId: AlgorithmId;
} {
  if (pathname === "/" || pathname === "") {
    return { view: "hub", algorithmId: DEFAULT_ALGORITHM_ID };
  }

  if (pathname.startsWith("/lab/")) {
    const id = pathname.slice(5).split("/")[0];
    if (id && isAlgorithmId(id)) {
      return { view: "lab", algorithmId: id } as const;
    }
    return { view: "lab", algorithmId: DEFAULT_ALGORITHM_ID };
  }

  return { view: "hub", algorithmId: DEFAULT_ALGORITHM_ID };
}

export function LabStoreProvider({ children }: PropsWithChildren) {
	const [globalUi, setGlobalUi] = useState<GlobalUiState>(() => {
		const initial = parsePathnameToState(window.location.pathname);
		return {
			currentView: initial.view,
			currentAlgorithmId: initial.algorithmId,
			leftPanelCollapsed: false,
			rightPanelCollapsed: false,
			timelineVisible: true,
			recentAlgorithms: [DEFAULT_ALGORITHM_ID],
		};
	});
	const [sessions, setSessions] = useState<
		Partial<Record<AlgorithmId, AlgorithmSessionState>>
	>({});

	// 规范化 URL：当 state 与地址不一致时，用 replaceState 对齐（避免额外历史记录）
	useEffect(() => {
		const canonical =
			globalUi.currentView === "hub"
				? "/"
				: `/lab/${globalUi.currentAlgorithmId}`;
		if (window.location.pathname !== canonical) {
			window.history.replaceState(null, "", canonical);
		}
	}, [globalUi.currentView, globalUi.currentAlgorithmId]);

	const navigateToHub = useCallback(() => {
		// 更新地址栏且不触发页面刷新
		window.history.pushState({ view: "hub" }, "", "/");
		setGlobalUi((previous) => ({ ...previous, currentView: "hub" }));
	}, []);

	const navigateToLab = useCallback((algorithmId: AlgorithmId) => {
		window.history.pushState(
			{ view: "lab", algorithmId },
			"",
			`/lab/${algorithmId}`,
		);
		setGlobalUi((previous) => ({
			...previous,
			currentView: "lab",
			currentAlgorithmId: algorithmId,
		}));
	}, []);

	// 前进/后退：监听 popstate，同步状态到当前 URL
	useEffect(() => {
		const onPopState = () => {
			const { view, algorithmId } = parsePathnameToState(
				window.location.pathname,
			);
			setGlobalUi((prev) => ({
				...prev,
				currentView: view,
				currentAlgorithmId: algorithmId,
			}));
		};

		window.addEventListener("popstate", onPopState);
		return () => window.removeEventListener("popstate", onPopState);
	}, []);

	const setLeftPanelCollapsed = useCallback((collapsed: boolean) => {
		setGlobalUi((previous) => ({ ...previous, leftPanelCollapsed: collapsed }));
	}, []);

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
			navigateToHub,
			navigateToLab,
			setLeftPanelCollapsed,
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
			navigateToHub,
			navigateToLab,
			resetSession,
			sessions,
			setLeftPanelCollapsed,
			setRightPanelCollapsed,
			setTimelineVisible,
			upsertSession,
		],
	);

	return (
		<LabStoreContext.Provider value={value}>{children}</LabStoreContext.Provider>
	);
}
