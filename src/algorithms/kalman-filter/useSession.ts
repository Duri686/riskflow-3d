import { useCallback, useMemo, useState } from "react";
import {
	defaultKalmanInput,
	DEFAULT_EWMA_SPAN,
	DEFAULT_REGIME_THRESHOLDS,
	KALMAN_PRESETS,
	type KalmanFilterInput,
	type KalmanFilterResult,
	type KalmanPreset,
	type RegimeThresholds,
	runKalmanFilter,
} from "./engine";

export function useKalmanSession() {
	const [input, setInput] = useState<KalmanFilterInput>(defaultKalmanInput);
	const [preset, setPreset] = useState<KalmanPreset>("balanced");
	const [dailyReturns, setDailyReturns] = useState<number[]>([]);

	/** 滤波结果（输入或参数变化时自动重算） */
	const result = useMemo<KalmanFilterResult>(() => {
		if (dailyReturns.length < 2) {
			return {
				steps: [],
				currentVol: 0,
				maxVol: 0,
				minVol: 0,
				finalGain: 0,
				regime: "low" as const,
				regimeHistory: [],
				ewma: { values: [], currentVol: 0 },
				gainDiagnostic: { isLagging: false, responsiveness: "moderate" as const },
				riskGate: {
					regime: "low" as const,
					suggestedLeverage: 3,
					suggestedStopWidth: 0,
					allowTrend: true,
					allowMeanRevert: false,
					forceNeutral: false,
				},
			};
		}
		return runKalmanFilter(dailyReturns, input);
	}, [dailyReturns, input]);

	/** 切换预设 */
	const applyPreset = useCallback((p: KalmanPreset) => {
		setPreset(p);
		const cfg = KALMAN_PRESETS[p];
		setInput((prev) => ({
			...prev,
			processNoise: cfg.Q,
			measurementNoise: cfg.R,
		}));
	}, []);

	/** 手动调节 Q/R */
	const updateInput = useCallback(
		(key: keyof KalmanFilterInput, value: number) => {
			setInput((prev) => ({ ...prev, [key]: value }));
			setPreset("balanced"); // 手动调节后预设标记取消
		},
		[],
	);

	/** 更新 EWMA span */
	const setEwmaSpan = useCallback((span: number) => {
		const clamped = Math.max(10, Math.min(30, Math.round(span)));
		setInput((prev) => ({ ...prev, ewmaSpan: clamped }));
	}, []);

	/** 更新 Regime 阈值 */
	const setRegimeThresholds = useCallback((thresholds: RegimeThresholds) => {
		setInput((prev) => ({ ...prev, regimeThresholds: thresholds }));
	}, []);

	/** 从收盘价序列设置日收益率 */
	const setClosesData = useCallback((closes: number[]) => {
		if (closes.length < 2) {
			setDailyReturns([]);
			return;
		}
		const returns: number[] = [];
		for (let i = 1; i < closes.length; i++) {
			const r = Math.log(closes[i] / closes[i - 1]);
			if (Number.isFinite(r)) {
				returns.push(r);
			}
		}
		setDailyReturns(returns);
	}, []);

	return useMemo(
		() => ({
			input,
			preset,
			result,
			dailyReturns,
			applyPreset,
			updateInput,
			setClosesData,
			setEwmaSpan,
			setRegimeThresholds,
		}),
		[
			input,
			preset,
			result,
			dailyReturns,
			applyPreset,
			updateInput,
			setClosesData,
			setEwmaSpan,
			setRegimeThresholds,
		],
	);
}
