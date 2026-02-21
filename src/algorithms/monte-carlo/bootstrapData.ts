import { fetchBinanceKlines } from "../shared/fetchKlines";

const DEFAULT_BOOTSTRAP_SYMBOL = "BTCUSDT";
const DEFAULT_BOOTSTRAP_LOOKBACK_DAYS = 365;

const FALLBACK_BTC_KLINES_URL = new URL(
	"../../data/btc.json",
	import.meta.url,
).href;

export type MonteCarloBootstrapSource = "binance" | "fallback";

export interface MonteCarloBootstrapData {
	closes: number[];
	symbol: string;
	lookbackDays: number;
	source: MonteCarloBootstrapSource;
	latestDataDate: string | null;
}

export interface ParsedBinanceRows {
	closes: number[];
	latestCloseTime: number | null;
}

interface ResolveBootstrapDeps {
	fetchPrimary?: (
		symbol: string,
		interval: string,
		limit: number,
	) => Promise<{
		closes: number[];
		currentPrice: number;
		latestCloseTime?: number | null;
	}>;
	fetchFallbackJson?: () => Promise<unknown>;
}

const clampLookbackDays = (lookbackDays: number): number => {
	if (!Number.isFinite(lookbackDays)) {
		return DEFAULT_BOOTSTRAP_LOOKBACK_DAYS;
	}

	return Math.max(2, Math.floor(lookbackDays));
};

const toIsoDate = (timestamp: number | null): string | null => {
	if (!Number.isFinite(timestamp) || timestamp === null) {
		return null;
	}

	return new Date(timestamp).toISOString().slice(0, 10);
};

export function parseBinanceKlineRows(raw: unknown): ParsedBinanceRows {
	if (!Array.isArray(raw)) {
		return { closes: [], latestCloseTime: null };
	}

	const closes: number[] = [];
	let latestCloseTime: number | null = null;

	for (const row of raw) {
		if (!Array.isArray(row) || row.length < 5) {
			continue;
		}

		const close = Number(row[4]);
		if (!Number.isFinite(close) || close <= 0) {
			continue;
		}

		closes.push(close);

		const closeTimeCandidate = Number(row[6]);
		const openTimeCandidate = Number(row[0]);
		const timestamp = Number.isFinite(closeTimeCandidate)
			? closeTimeCandidate
			: Number.isFinite(openTimeCandidate)
				? openTimeCandidate
				: null;

		if (timestamp !== null && timestamp > 0) {
			latestCloseTime = timestamp;
		}
	}

	return {
		closes,
		latestCloseTime,
	};
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

export async function resolveMonteCarloBootstrapData(
	symbol = DEFAULT_BOOTSTRAP_SYMBOL,
	lookbackDays = DEFAULT_BOOTSTRAP_LOOKBACK_DAYS,
	deps: ResolveBootstrapDeps = {},
): Promise<MonteCarloBootstrapData> {
	const safeLookback = clampLookbackDays(lookbackDays);
	const fetchPrimary = deps.fetchPrimary ?? fetchBinanceKlines;
	const fetchFallbackJson = deps.fetchFallbackJson ?? defaultFetchFallbackJson;

	try {
		const primary = await fetchPrimary(symbol, "1d", safeLookback);
		const primaryCloses = normalizeTailCloses(primary.closes, safeLookback);
		const latestCloseTime =
			"latestCloseTime" in primary
				? Number(primary.latestCloseTime ?? NaN)
				: NaN;

		if (primaryCloses.length >= 2) {
			return {
				closes: primaryCloses,
				symbol,
				lookbackDays: safeLookback,
				source: "binance",
				latestDataDate: toIsoDate(
					Number.isFinite(latestCloseTime) ? latestCloseTime : null,
				),
			};
		}

		throw new Error("币安返回的日线数据不足 2 条");
	} catch (primaryError) {
		const fallbackRaw = await fetchFallbackJson();
		const parsed = parseBinanceKlineRows(fallbackRaw);
		const fallbackCloses = normalizeTailCloses(parsed.closes, safeLookback);

		if (fallbackCloses.length >= 2) {
			return {
				closes: fallbackCloses,
				symbol: DEFAULT_BOOTSTRAP_SYMBOL,
				lookbackDays: safeLookback,
				source: "fallback",
				latestDataDate: toIsoDate(parsed.latestCloseTime),
			};
		}

		const reason =
			primaryError instanceof Error
				? primaryError.message
				: "unknown error";
		throw new Error(
			`Monte Carlo 初始化失败：币安和本地 fallback 都不可用（${reason}）`,
		);
	}
}
