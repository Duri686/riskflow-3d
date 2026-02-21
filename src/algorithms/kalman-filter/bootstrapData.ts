import { fetchBinanceKlines } from "../shared/fetchKlines";

const DEFAULT_BOOTSTRAP_SYMBOL = "BTCUSDT";
const DEFAULT_BOOTSTRAP_LOOKBACK_DAYS = 365;

const FALLBACK_BTC_KLINES_URL = new URL(
	"../../data/btc.json",
	import.meta.url,
).href;

export type BootstrapSource = "binance" | "fallback";

export interface KalmanBootstrapData {
	closes: number[];
	symbol: string;
	lookbackDays: number;
	source: BootstrapSource;
}

interface ResolveBootstrapDeps {
	fetchPrimary?: (
		symbol: string,
		interval: string,
		limit: number,
	) => Promise<{ closes: number[]; currentPrice: number }>;
	fetchFallbackJson?: () => Promise<unknown>;
}

const clampLookbackDays = (lookbackDays: number): number => {
	if (!Number.isFinite(lookbackDays)) {
		return DEFAULT_BOOTSTRAP_LOOKBACK_DAYS;
	}
	return Math.max(2, Math.floor(lookbackDays));
};

export function parseBinanceKlineCloses(raw: unknown): number[] {
	if (!Array.isArray(raw)) {
		return [];
	}

	const closes: number[] = [];

	for (const row of raw) {
		if (!Array.isArray(row) || row.length < 5) {
			continue;
		}

		const close = Number(row[4]);
		if (Number.isFinite(close) && close > 0) {
			closes.push(close);
		}
	}

	return closes;
}

const normalizeTailCloses = (closes: number[], lookbackDays: number): number[] => {
	const safeLookback = clampLookbackDays(lookbackDays);
	if (closes.length <= safeLookback) {
		return closes;
	}
	return closes.slice(closes.length - safeLookback);
};

const defaultFetchFallbackJson = async (): Promise<unknown> => {
	const response = await fetch(FALLBACK_BTC_KLINES_URL);
	if (!response.ok) {
		throw new Error(
			`本地 BTC fallback 读取失败: ${response.status} ${response.statusText}`,
		);
	}
	return response.json();
};

export async function resolveKalmanBootstrapData(
	symbol = DEFAULT_BOOTSTRAP_SYMBOL,
	lookbackDays = DEFAULT_BOOTSTRAP_LOOKBACK_DAYS,
	deps: ResolveBootstrapDeps = {},
): Promise<KalmanBootstrapData> {
	const safeLookback = clampLookbackDays(lookbackDays);
	const fetchPrimary = deps.fetchPrimary ?? fetchBinanceKlines;
	const fetchFallbackJson = deps.fetchFallbackJson ?? defaultFetchFallbackJson;

	try {
		const primary = await fetchPrimary(symbol, "1d", safeLookback);
		const primaryCloses = normalizeTailCloses(primary.closes, safeLookback);
		if (primaryCloses.length >= 2) {
			return {
				closes: primaryCloses,
				symbol,
				lookbackDays: safeLookback,
				source: "binance",
			};
		}

		throw new Error("币安返回的日线数据不足 2 条");
	} catch (primaryError) {
		const fallbackRaw = await fetchFallbackJson();
		const fallbackCloses = normalizeTailCloses(
			parseBinanceKlineCloses(fallbackRaw),
			safeLookback,
		);

		if (fallbackCloses.length >= 2) {
			return {
				closes: fallbackCloses,
				symbol: DEFAULT_BOOTSTRAP_SYMBOL,
				lookbackDays: safeLookback,
				source: "fallback",
			};
		}

		const reason =
			primaryError instanceof Error
				? primaryError.message
				: "unknown error";
		throw new Error(`Kalman 初始化失败：币安和本地 fallback 都不可用（${reason}）`);
	}
}
