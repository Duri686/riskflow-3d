import { describe, expect, it } from "vitest";

import { PERIOD_OPTIONS } from "./fetchKlines";

describe("PERIOD_OPTIONS", () => {
	it("contains 1Y,2Y,3Y,4Y,5Y lookback options", () => {
		const values = PERIOD_OPTIONS.map((option) => option.value);
		expect(values).toEqual([90, 180, 365, 730, 1095, 1460, 1825]);
	});

	it("shows customer-facing Chinese labels for extended years", () => {
		const labels = PERIOD_OPTIONS.map((option) => option.label);
		expect(labels).toContain("3 年");
		expect(labels).toContain("4 年");
		expect(labels).toContain("5 年");
	});
});
