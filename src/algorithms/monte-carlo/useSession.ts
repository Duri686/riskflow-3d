import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calculateSeriesParams } from "@/algorithms/shared/fetchKlines";
import {
	defaultMonteCarloInput,
	type MonteCarloInput,
	type MonteCarloMetricsPanel,
	type MonteCarloRenderLayer,
	type MonteCarloState,
	monteCarloEngine,
} from "./engine";
import {
	resolveMonteCarloBootstrapData,
	type MonteCarloBootstrapSource,
} from "./bootstrapData";

export interface MonteCarloSessionSnapshot {
	input: MonteCarloInput;
	state: MonteCarloState;
	isPlaying: boolean;
}

export interface MonteCarloMarketDataMeta {
	symbol: string;
	lookbackDays: number;
	source: MonteCarloBootstrapSource | "manual" | "default";
	latestDataDate: string | null;
}

const DEFAULT_MARKET_DATA_META: MonteCarloMarketDataMeta = {
	symbol: "BTCUSDT",
	lookbackDays: 365,
	source: "default",
	latestDataDate: null,
};

const createInitialState = (input: MonteCarloInput): MonteCarloState =>
	monteCarloEngine.createInitialState(input);

export const createDefaultMonteCarloSnapshot =
	(): MonteCarloSessionSnapshot => {
		const input = defaultMonteCarloInput;

		return {
			input,
			state: createInitialState(input),
			isPlaying: true,
		};
	};

export function useMonteCarloSession() {
	const [input, setInput] = useState<MonteCarloInput>(defaultMonteCarloInput);
	const [state, setState] = useState<MonteCarloState>(() =>
		createInitialState(defaultMonteCarloInput),
	);
	const [isPlaying, setIsPlaying] = useState(true);
	const [bootstrapAttempted, setBootstrapAttempted] = useState(false);
	const [marketDataMeta, setMarketDataMeta] = useState<MonteCarloMarketDataMeta>(
		DEFAULT_MARKET_DATA_META,
	);
	const isBootstrapping = !bootstrapAttempted;

	const animationFrameRef = useRef<number | null>(null);
	const lastTimeRef = useRef<number | null>(null);
	const frameRef = useRef(0);

	const inputRef = useRef(input);
	const stateRef = useRef(state);
	const isPlayingRef = useRef(isPlaying);

	useEffect(() => {
		inputRef.current = input;
	}, [input]);

	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	useEffect(() => {
		isPlayingRef.current = isPlaying;
	}, [isPlaying]);

	const restartWithInput = useCallback(
		(nextInput: MonteCarloInput, nextIsPlaying: boolean) => {
			setInput(nextInput);
			setState(createInitialState(nextInput));
			setIsPlaying(nextIsPlaying);
			lastTimeRef.current = null;
			frameRef.current = 0;
		},
		[],
	);

	const restoreSession = useCallback(
		(snapshot?: MonteCarloSessionSnapshot) => {
			if (!snapshot) {
				restartWithInput(defaultMonteCarloInput, true);
				return;
			}

			setInput(snapshot.input);
			setState(snapshot.state);
			setIsPlaying(snapshot.isPlaying);
			lastTimeRef.current = null;
			frameRef.current = 0;
		},
		[restartWithInput],
	);

	const getSnapshot = useCallback((): MonteCarloSessionSnapshot => {
		return {
			input: inputRef.current,
			state: stateRef.current,
			isPlaying: isPlayingRef.current,
		};
	}, []);

	useEffect(() => {
		if (!isPlaying) {
			return undefined;
		}

		const tick = (timestamp: number) => {
			const previous = lastTimeRef.current ?? timestamp;
			const dtSeconds = Math.min(
				0.1,
				Math.max(0.001, (timestamp - previous) / 1000),
			);
			lastTimeRef.current = timestamp;
			frameRef.current += 1;
			let reachedEnd = false;

			setState((previousState) => {
				const next = monteCarloEngine.advance(previousState, input, {
					dtSeconds,
					elapsedSeconds: timestamp / 1000,
					frame: frameRef.current,
				});

				reachedEnd = next.currentStep >= next.cloud.totalSteps;
				return next;
			});

			if (reachedEnd) {
				setIsPlaying(false);
				return;
			}

			animationFrameRef.current = window.requestAnimationFrame(tick);
		};

		animationFrameRef.current = window.requestAnimationFrame(tick);

		return () => {
			if (animationFrameRef.current !== null) {
				window.cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [input, isPlaying]);

	const renderLayer = useMemo<MonteCarloRenderLayer>(
		() => monteCarloEngine.getRenderLayer(state, input),
		[state, input],
	);

	const metrics = useMemo<MonteCarloMetricsPanel>(
		() => monteCarloEngine.getMetricsPanel(state, input),
		[state, input],
	);

	const updateInput = useCallback(
		(key: keyof MonteCarloInput, value: number) => {
			restartWithInput(
				{
					...inputRef.current,
					[key]: value,
				},
				true,
			);
		},
		[restartWithInput],
	);

	const updateMultipleInputs = useCallback(
		(updates: Partial<MonteCarloInput>) => {
			restartWithInput(
				{
					...inputRef.current,
					...updates,
				},
				true,
			);
		},
		[restartWithInput],
	);

	const togglePlaying = useCallback(() => {
		setIsPlaying((previous) => !previous);
	}, []);

	const resimulate = useCallback(() => {
		restartWithInput(
			{
				...inputRef.current,
				seed: inputRef.current.seed + 1,
			},
			true,
		);
	}, [restartWithInput]);

	const resetDefaults = useCallback(() => {
		restartWithInput(defaultMonteCarloInput, true);
	}, [restartWithInput]);

	const applyMarketData = useCallback(
		(data: {
			closes: number[];
			symbol: string;
			lookbackDays: number;
			latestDataDate?: string | null;
			source?: MonteCarloMarketDataMeta["source"];
		}) => {
			setBootstrapAttempted(true);

			setMarketDataMeta({
				symbol: data.symbol,
				lookbackDays: data.lookbackDays,
				source: data.source ?? "manual",
				latestDataDate: data.latestDataDate ?? null,
			});

			if (data.closes.length < 2) {
				return;
			}

			const { sigma, mu } = calculateSeriesParams(data.closes);
			const latestClose = data.closes[data.closes.length - 1];

			const updates: Partial<MonteCarloInput> = {
				volatility: Math.min(2, Math.max(0.05, sigma)),
				drift: Math.min(0.3, Math.max(-0.3, mu)),
			};

			if (Number.isFinite(latestClose) && latestClose > 0) {
				updates.initialPrice = Math.round(latestClose);
			}

			restartWithInput(
				{
					...inputRef.current,
					...updates,
				},
				true,
			);
		},
		[restartWithInput],
	);

	useEffect(() => {
		if (bootstrapAttempted) {
			return;
		}

		let cancelled = false;

		void resolveMonteCarloBootstrapData(
			marketDataMeta.symbol,
			marketDataMeta.lookbackDays,
		)
			.then((bootstrapped) => {
				if (cancelled) {
					return;
				}
				applyMarketData({
					...bootstrapped,
					source: bootstrapped.source,
				});
			})
			.catch((error) => {
				console.warn(
					"[MonteCarlo] bootstrap data load failed:",
					error instanceof Error ? error.message : error,
				);
				if (!cancelled) {
					setBootstrapAttempted(true);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [
		bootstrapAttempted,
		applyMarketData,
		marketDataMeta.symbol,
		marketDataMeta.lookbackDays,
	]);

	return useMemo(
		() => ({
			input,
			state,
			isPlaying,
			isBootstrapping,
			marketDataMeta,
			renderLayer,
			metrics,
			terminalPrices: state.cloud.terminalPrices,
			updateInput,
			updateMultipleInputs,
			togglePlaying,
			resimulate,
			resetDefaults,
			restoreSession,
			getSnapshot,
			applyMarketData,
		}),
		[
			input,
			state,
			isPlaying,
			isBootstrapping,
			marketDataMeta,
			renderLayer,
			metrics,
			updateInput,
			updateMultipleInputs,
			togglePlaying,
			resimulate,
			resetDefaults,
			restoreSession,
			getSnapshot,
			applyMarketData,
		],
	);
}
