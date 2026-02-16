/**
 * Black-Scholes Option Pricing Engine
 * 
 * Formulas:
 * Call = S * N(d1) - K * exp(-r * T) * N(d2)
 * Put = K * exp(-r * T) * N(-d2) - S * N(-d1)
 * 
 * d1 = [ln(S/K) + (r + sigma^2 / 2) * T] / (sigma * sqrt(T))
 * d2 = d1 - sigma * sqrt(T)
 */

export type OptionType = "call" | "put";

export interface BSResult {
	price: number;
	delta: number;
	gamma: number;
	vega: number;
	theta: number;
	rho: number;
}

/**
 * Cumulative Standard Normal Distribution (N(x))
 * Using Abramowitz and Stegun approximation (error < 7.5e-8)
 */
export function cnd(x: number): number {
	const a1 = 0.31938153;
	const a2 = -0.356563782;
	const a3 = 1.781477937;
	const a4 = -1.821255978;
	const a5 = 1.330274429;
	const L = Math.abs(x);
	const K = 1.0 / (1.0 + 0.2316419 * L);
	let result = 1.0 - (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-L * L / 2.0) * (a1 * K + a2 * K * K + a3 * Math.pow(K, 3) + a4 * Math.pow(K, 4) + a5 * Math.pow(K, 5));

	return x >= 0 ? result : 1.0 - result;
}

/**
 * Standard Normal Probability Density Function (N'(x))
 */
export function ndf(x: number): number {
	return (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

/**
 * Calculate Black-Scholes Price and Greeks
 * 
 * @param s Spot price of the underlying asset
 * @param k Strike price
 * @param t Time to maturity (in years)
 * @param v Volatility (annualized, e.g., 0.3 for 30%)
 * @param r Risk-free interest rate (annualized, e.g., 0.02 for 2%)
 * @param type 'call' or 'put'
 */
export function calculateBS(
	s: number,
	k: number,
	t: number,
	v: number,
	r: number,
	type: OptionType
): BSResult {
	// Guard against edge cases
	if (t <= 0) {
		const intrinsicValue = type === "call" ? Math.max(0, s - k) : Math.max(0, k - s);
		return { price: intrinsicValue, delta: 0, gamma: 0, vega: 0, theta: 0, rho: 0 };
	}
	if (v <= 0) {
		v = 0.0001; // Avoid division by zero
	}

	const sqrtT = Math.sqrt(t);
	const d1 = (Math.log(s / k) + (r + (v * v) / 2) * t) / (v * sqrtT);
	const d2 = d1 - v * sqrtT;

	const nD1 = cnd(d1);
	const nD2 = cnd(d2);
	const nP1 = ndf(d1);
	const expRT = Math.exp(-r * t);

	let price: number;
	let delta: number;
	let theta: number;
	let rho: number;

	if (type === "call") {
		price = s * nD1 - k * expRT * nD2;
		delta = nD1;
		theta = -(s * nP1 * v) / (2 * sqrtT) - r * k * expRT * nD2;
		rho = k * t * expRT * nD2;
	} else {
		price = k * expRT * cnd(-d2) - s * cnd(-d1);
		delta = nD1 - 1;
		theta = -(s * nP1 * v) / (2 * sqrtT) + r * k * expRT * cnd(-d2);
		rho = -k * t * expRT * cnd(-d2);
	}

	const gamma = nP1 / (s * v * sqrtT);
	const vega = s * sqrtT * nP1;

	return {
		price: Math.max(0, price),
		delta,
		gamma,
		vega: vega / 100, // Normalized to 1% vol move
		theta: theta / 365, // Normalized to 1 day
		rho: rho / 100, // Normalized to 1% rate move
	};
}
