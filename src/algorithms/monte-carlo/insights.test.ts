import { describe, expect, it } from "vitest";

import {
	buildConclusionStats,
	buildMiniHistogram,
	formatConclusionValue,
	getConclusionState,
} from "./insights";

describe("buildConclusionStats", () => {
	it("builds win-rate/p50/cvar/p95/upDown metrics from final risk metrics", () => {
		const stats = buildConclusionStats({
			lossProbability: 0.43,
			medianReturn: 0.053,
			expectedShortfall95: -0.358,
			p95Return: 0.509,
			upDownRatio: 1.42,
		});

		expect(stats.winRate).toBeCloseTo(57, 10);
		expect(stats.p50).toBeCloseTo(5.3, 10);
		expect(stats.cvar).toBeCloseTo(-35.8, 10);
		expect(stats.p95).toBeCloseTo(50.9, 10);
		expect(stats.upDownRatio).toBeCloseTo(1.42, 10);
	});

	it("formats values for customer-facing display", () => {
		expect(formatConclusionValue("winRate", 57)).toBe("57%");
		expect(formatConclusionValue("p50", 5.3)).toBe("+5.3%");
		expect(formatConclusionValue("cvar", -35.8)).toBe("-35.8%");
		expect(formatConclusionValue("p95", 50.9)).toBe("+50.9%");
		expect(formatConclusionValue("upDownRatio", 1.42)).toBe("1.42");
	});
});

describe("buildMiniHistogram", () => {
	it("builds binned terminal-return distribution with total count preserved", () => {
		const histogram = buildMiniHistogram([80, 90, 100, 120, 140], 100, 5);

		expect(histogram.bins).toHaveLength(5);
		expect(histogram.totalCount).toBe(5);
		expect(histogram.maxCount).toBeGreaterThan(0);
		expect(histogram.bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(5);
	});

	it("returns empty-safe histogram when no prices are provided", () => {
		const histogram = buildMiniHistogram([], 100, 6);

		expect(histogram.bins).toHaveLength(6);
		expect(histogram.maxCount).toBe(0);
		expect(histogram.totalCount).toBe(0);
	});
});

describe("getConclusionState", () => {
	it("returns bearish when downside signals dominate", () => {
		const state = getConclusionState({
			winRate: 18,
			p50: -34,
			cvar: -76.3,
			p95: 40.4,
			upDownRatio: 0.53,
		});

		expect(state.tone).toBe("bearish");
	});

	it("returns bullish when upside signals dominate and cvar is controlled", () => {
		const state = getConclusionState({
			winRate: 61,
			p50: 9.2,
			cvar: -28,
			p95: 46,
			upDownRatio: 1.45,
		});

		expect(state.tone).toBe("bullish");
	});

	it("returns neutral for mixed signals", () => {
		const state = getConclusionState({
			winRate: 50,
			p50: -1.2,
			cvar: -34,
			p95: 31,
			upDownRatio: 1.02,
		});

		expect(state.tone).toBe("neutral");
	});
});
