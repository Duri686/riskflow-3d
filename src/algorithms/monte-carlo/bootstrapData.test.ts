import { describe, expect, it, vi } from "vitest";

import {
	parseBinanceKlineRows,
	resolveMonteCarloBootstrapData,
} from "./bootstrapData";

describe("parseBinanceKlineRows", () => {
	it("extracts close prices and latest close timestamp", () => {
		const parsed = parseBinanceKlineRows([
			[1, "100", "120", "90", "110", "0", 1710000000000],
			[2, "110", "130", "100", "123", "0", 1710086400000],
		]);

		expect(parsed.closes).toEqual([110, 123]);
		expect(parsed.latestCloseTime).toBe(1710086400000);
	});

	it("skips invalid rows and falls back to open time when close time missing", () => {
		const parsed = parseBinanceKlineRows([
			null,
			[1, "100", "120", "90", "0", "0", 1710000000000],
			[2, "110", "130", "100", "120"],
			[1710172800000, "111", "131", "101", "122", "0", "bad"],
		]);

		expect(parsed.closes).toEqual([120, 122]);
		expect(parsed.latestCloseTime).toBe(1710172800000);
	});
});

describe("resolveMonteCarloBootstrapData", () => {
	it("uses Binance data when primary fetch succeeds", async () => {
		const fetchPrimary = vi.fn(async () => ({
			closes: [100, 102, 105],
			currentPrice: 105,
			latestCloseTime: 1710172800000,
		}));
		const fetchFallbackJson = vi.fn(async () => []);

		const result = await resolveMonteCarloBootstrapData("BTCUSDT", 365, {
			fetchPrimary,
			fetchFallbackJson,
		});

		expect(fetchPrimary).toHaveBeenCalledTimes(1);
		expect(fetchFallbackJson).not.toHaveBeenCalled();
		expect(result.source).toBe("binance");
		expect(result.symbol).toBe("BTCUSDT");
		expect(result.closes).toEqual([100, 102, 105]);
		expect(result.latestDataDate).toBe("2024-03-11");
	});

	it("falls back to local BTC JSON when Binance fetch fails", async () => {
		const fetchPrimary = vi.fn(async () => {
			throw new Error("451");
		});
		const fallbackRows = Array.from({ length: 370 }, (_, index) => [
			1710000000000 + index * 86400000,
			"0",
			"0",
			"0",
			String(30000 + index),
			"0",
			1710000000000 + index * 86400000 + 86399999,
		]);
		const fetchFallbackJson = vi.fn(async () => fallbackRows);

		const result = await resolveMonteCarloBootstrapData("ETHUSDT", 365, {
			fetchPrimary,
			fetchFallbackJson,
		});

		expect(fetchPrimary).toHaveBeenCalledTimes(1);
		expect(fetchFallbackJson).toHaveBeenCalledTimes(1);
		expect(result.source).toBe("fallback");
		expect(result.symbol).toBe("BTCUSDT");
		expect(result.lookbackDays).toBe(365);
		expect(result.closes.length).toBe(365);
		expect(result.latestDataDate).toBeTruthy();
	});

	it("throws when both Binance and fallback data are unavailable", async () => {
		const fetchPrimary = vi.fn(async () => {
			throw new Error("binance down");
		});
		const fetchFallbackJson = vi.fn(async () => [[1, "0", "0", "0", "0"]]);

		await expect(
			resolveMonteCarloBootstrapData("BTCUSDT", 365, {
				fetchPrimary,
				fetchFallbackJson,
			}),
		).rejects.toThrow(/初始化失败/);
	});
});
