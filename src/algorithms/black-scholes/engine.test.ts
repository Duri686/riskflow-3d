import { describe, expect, it } from 'vitest';
import { calculateBS, cnd } from './engine';

describe('Black-Scholes Engine Correctness', () => {
	// Benchmarks from standard BS calculators
	// Case 1: S=100, K=100, T=0.5, r=0.02, v=0.3
	it('Case 1: ATM Option (S=100, K=100, T=0.5, r=0.02, v=0.3)', () => {
		const call = calculateBS(100, 100, 0.5, 0.3, 0.02, 'call');
		const put = calculateBS(100, 100, 0.5, 0.3, 0.02, 'put');

		expect(call.price).toBeCloseTo(8.91, 2);
		expect(put.price).toBeCloseTo(7.92, 2);
		
		// Delta: Call ~0.56, Put ~-0.44
		expect(call.delta).toBeCloseTo(0.56, 2);
		expect(put.delta).toBeCloseTo(-0.44, 2);
		
		// Greeks Consistency
		expect(call.gamma).toBe(put.gamma);
		expect(call.vega).toBe(put.vega);
	});

	// Case 2: Deep ITM Call (S=120, K=100)
	it('Case 2: Deep ITM Call (S=120, K=100, T=0.5, r=0.02, v=0.3)', () => {
		const call = calculateBS(120, 100, 0.5, 0.3, 0.02, 'call');
		expect(call.price).toBeGreaterThan(20); // Intrinsic value is 20
		expect(call.delta).toBeGreaterThan(0.8);
	});

	// Case 3: Deep OTM Call (S=80, K=100)
	it('Case 3: Deep OTM Call (S=80, K=100, T=0.5, r=0.02, v=0.3)', () => {
		const call = calculateBS(80, 100, 0.5, 0.3, 0.02, 'call');
		expect(call.price).toBeLessThan(2);
		expect(call.delta).toBeLessThan(0.2);
	});

	it('Put-Call Parity Verification', () => {
		const s = 100;
		const k = 100;
		const t = 0.5;
		const r = 0.02;
		const v = 0.3;
		
		const call = calculateBS(s, k, t, v, r, 'call');
		const put = calculateBS(s, k, t, v, r, 'put');
		
		// C - P = S - K * exp(-rt)
		const left = call.price - put.price;
		const right = s - k * Math.exp(-r * t);
		
		expect(left).toBeCloseTo(right, 5);
	});

	it('Boundary Conditions: T=0', () => {
		const call = calculateBS(100, 90, 0, 0.3, 0.02, 'call');
		expect(call.price).toBe(10); // Intrinsic
		
		const put = calculateBS(100, 110, 0, 0.3, 0.02, 'put');
		expect(put.price).toBe(10); // Intrinsic
	});

	it('Boundary Conditions: Vol near 0', () => {
		const call = calculateBS(100, 100, 0.5, 0.0001, 0.02, 'call');
		// With 0 vol, Call = S - K*exp(-rt) if S > K*exp(-rt)
		const expected = Math.max(0, 100 - 100 * Math.exp(-0.02 * 0.5));
		expect(call.price).toBeCloseTo(expected, 4);
	});
});

describe('CND Function Accuracy', () => {
	it('cnd(0) should be 0.5', () => {
		expect(cnd(0)).toBeCloseTo(0.5, 8);
	});
	it('cnd(infinity) should be 1', () => {
		expect(cnd(10)).toBeCloseTo(1, 5);
	});
	it('cnd(-infinity) should be 0', () => {
		expect(cnd(-10)).toBeCloseTo(0, 5);
	});
});
