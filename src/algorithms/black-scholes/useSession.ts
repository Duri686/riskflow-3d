import { useMemo, useState } from "react";
import { calculateBS, type BSResult, type OptionType } from "@/algorithms/black-scholes/engine";

export type MetricType = "price" | "delta" | "gamma" | "vega" | "theta" | "rho";

export interface BSParams {
	spot: number;
	strike: number;
	volatility: number;
	rate: number;
	time: number;
	type: OptionType;
}

export interface SurfacePoint {
	x: number; // Spot
	y: number; // Time
	z: number; // Metric Value
}

export const INITIAL_PARAMS: BSParams = {
	spot: 100,
	strike: 100,
	volatility: 0.3,
	rate: 0.02,
	time: 0.5,
	type: "call",
};

export function useBSSession() {
	const [params, setParams] = useState<BSParams>(INITIAL_PARAMS);
	const [activeMetric, setActiveMetric] = useState<MetricType>("price");

	// Range for surface visualization
	const S_RANGE = { min: 50, max: 150, steps: 50 };
	const T_RANGE = { min: 0.01, max: 1.0, steps: 50 };

	/** 
	 * Calculate current result based on exact slider values 
	 */
	const currentResult = useMemo(() => {
		return calculateBS(
			params.spot,
			params.strike,
			params.time,
			params.volatility,
			params.rate,
			params.type
		);
	}, [params]);

	/** 
	 * Generate 50x50 surface data points 
	 * X = Spot, Y = Time, Z = activeMetric
	 */
	const surfaceData = useMemo(() => {
		const points: SurfacePoint[] = [];
		const sStep = (S_RANGE.max - S_RANGE.min) / (S_RANGE.steps - 1);
		const tStep = (T_RANGE.max - T_RANGE.min) / (T_RANGE.steps - 1);

		for (let i = 0; i < T_RANGE.steps; i++) {
			const t = T_RANGE.min + i * tStep;
			for (let j = 0; j < S_RANGE.steps; j++) {
				const s = S_RANGE.min + j * sStep;
				
				const res = calculateBS(
					s,
					params.strike,
					t,
					params.volatility,
					params.rate,
					params.type
				);

				points.push({
					x: s,
					y: t,
					z: res[activeMetric as keyof BSResult] as number,
				});
			}
		}
		return points;
	}, [params.strike, params.volatility, params.rate, params.type, activeMetric]);

	const updateParams = (newParams: Partial<BSParams>) => {
		setParams((prev) => ({ ...prev, ...newParams }));
	};

	return {
		params,
		activeMetric,
		currentResult,
		surfaceData,
		updateParams,
		setActiveMetric,
		S_RANGE,
		T_RANGE,
	};
}
