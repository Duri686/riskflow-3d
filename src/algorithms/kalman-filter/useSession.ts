import { useCallback, useEffect, useMemo, useState } from "react";
import {
	defaultKalmanInput,
	KALMAN_PRESETS,
	type KalmanFilterInput,
	type KalmanFilterResult,
	type KalmanPreset,
	type RegimeThresholds,
	runKalmanFilter,
} from "./engine";
import type { AssetMeta } from "./snapshot";
import { resolveKalmanBootstrapData } from "./bootstrapData";

export function useKalmanSession() {
	const [input, setInput] = useState<KalmanFilterInput>(defaultKalmanInput);
	const [preset, setPreset] = useState<KalmanPreset>("balanced");
	const [dailyReturns, setDailyReturns] = useState<number[]>([]);
	const [bootstrapAttempted, setBootstrapAttempted] = useState(false);
	const [assetMeta, setAssetMeta] = useState<AssetMeta>({
		symbol: "BTCUSDT",
		lookbackDays: 365,
	});
	const isBootstrapping = dailyReturns.length < 2 && !bootstrapAttempted;

	/** 滤波结果（输入或参数变化时自动重算） */
	const result = useMemo<KalmanFilterResult>(() => {
		if (dailyReturns.length < 2) {
			const emptyMomentum = {
					kalmanDelta: 0,
					convergenceRatio: 1,
					phase: "stable" as const,
					phaseLabel: "结构稳定",
				};
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
				momentum: emptyMomentum,
				riskGate: {
					regime: "low" as const,
					suggestedLeverage: 3,
					suggestedStopWidth: 0,
					allowTrend: true,
					allowMeanRevert: false,
					forceNeutral: false,
					momentum: emptyMomentum,
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

	/** 从收盘价序列设置日收益率 + 资产元数据 */
	const setClosesData = useCallback(
		(closes: number[], meta?: { symbol: string; lookbackDays: number }) => {
			setBootstrapAttempted(true);
			if (meta) {
				setAssetMeta(meta);
			}
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
		},
		[],
	);

	/** 初始化：进入 Kalman 模块后主动拉取币安 1 年日线，失败时回退本地 BTC JSON */
	useEffect(() => {
		if (dailyReturns.length >= 2 || bootstrapAttempted) {
			return;
		}

		let cancelled = false;

		void resolveKalmanBootstrapData(assetMeta.symbol, assetMeta.lookbackDays)
			.then((bootstrapped) => {
				if (cancelled) {
					return;
				}
				setClosesData(bootstrapped.closes, {
					symbol: bootstrapped.symbol,
					lookbackDays: bootstrapped.lookbackDays,
				});
			})
			.catch((error) => {
				console.warn(
					"[Kalman] bootstrap data load failed:",
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
		dailyReturns.length,
		setClosesData,
		assetMeta.symbol,
		assetMeta.lookbackDays,
	]);

	return useMemo(
		() => ({
			input,
			preset,
			result,
			dailyReturns,
			isBootstrapping,
			assetMeta,
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
			isBootstrapping,
			assetMeta,
			applyPreset,
			updateInput,
			setClosesData,
			setEwmaSpan,
			setRegimeThresholds,
		],
	);
}
