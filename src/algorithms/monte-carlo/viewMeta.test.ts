import { describe, expect, it } from "vitest";

import {
	buildMonteCarloDataBadge,
	formatMonteCarloDataSource,
} from "./viewMeta";

describe("formatMonteCarloDataSource", () => {
	it("maps all known source keys to customer-facing Chinese labels", () => {
		expect(formatMonteCarloDataSource("binance")).toBe("数据来源: Binance 日线");
		expect(formatMonteCarloDataSource("fallback")).toBe("数据来源: 本地 BTC 历史");
		expect(formatMonteCarloDataSource("manual")).toBe("数据来源: 手动输入");
		expect(formatMonteCarloDataSource("default")).toBe("数据来源: 默认参数");
	});
});

describe("buildMonteCarloDataBadge", () => {
	it("builds latest-data badge text when latest date exists", () => {
		const badge = buildMonteCarloDataBadge({
			source: "fallback",
			latestDataDate: "2026-02-21",
		});

		expect(badge.sourceText).toBe("数据来源: 本地 BTC 历史");
		expect(badge.dateText).toBe("最新数据日期: 2026-02-21");
	});

	it("omits date text when latest date is unavailable", () => {
		const badge = buildMonteCarloDataBadge({
			source: "manual",
			latestDataDate: null,
		});

		expect(badge.sourceText).toBe("数据来源: 手动输入");
		expect(badge.dateText).toBeNull();
	});
});
