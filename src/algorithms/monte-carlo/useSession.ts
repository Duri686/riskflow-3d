import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	defaultMonteCarloInput,
	type MonteCarloInput,
	type MonteCarloMetricsPanel,
	type MonteCarloRenderLayer,
	type MonteCarloState,
	monteCarloEngine,
} from "./engine";

export interface MonteCarloSessionSnapshot {
	input: MonteCarloInput;
	state: MonteCarloState;
	isPlaying: boolean;
}

const createInitialState = (input: MonteCarloInput): MonteCarloState =>
	monteCarloEngine.createInitialState(input);

export const createDefaultMonteCarloSnapshot = (): MonteCarloSessionSnapshot => {
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

	return {
		input,
		state,
		isPlaying,
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
	};
}
