import { describe, expect, it } from "vitest";
import {
	buildXTicks,
	clampViewport,
	getInitialViewport,
	panViewport,
	zoomViewport,
} from "./volatilityViewport";

describe("volatilityViewport", () => {
	describe("getInitialViewport", () => {
		it("uses last 30 points on mobile", () => {
			expect(getInitialViewport(365, true)).toEqual({ start: 335, end: 364 });
			expect(getInitialViewport(5, true)).toEqual({ start: 0, end: 4 });
		});

		it("uses all points on desktop", () => {
			expect(getInitialViewport(30, false)).toEqual({ start: 0, end: 29 });
		});
	});

	describe("clamp / pan / zoom", () => {
		it("clamps viewport span and boundaries", () => {
			expect(clampViewport({ start: -10, end: 99 }, 40, 5, 30)).toEqual({
				start: 0,
				end: 29,
			});
		});

		it("pans with boundary clamp", () => {
			expect(panViewport({ start: 10, end: 19 }, -50, 40, 5)).toEqual({
				start: 0,
				end: 9,
			});
			expect(panViewport({ start: 10, end: 19 }, 50, 40, 5)).toEqual({
				start: 30,
				end: 39,
			});
		});

		it("zooms around anchor and honors min/max span", () => {
			expect(zoomViewport({ start: 10, end: 29 }, 20, 2, 40, 5, 40)).toEqual({
				start: 15,
				end: 24,
			});
			expect(zoomViewport({ start: 10, end: 29 }, 20, 0.2, 40, 5, 40)).toEqual({
				start: 0,
				end: 39,
			});
		});
	});

	describe("buildXTicks", () => {
		it("keeps end tick and avoids crowding on adaptive mobile width", () => {
			const ticks = buildXTicks({ start: 0, end: 360 }, 320, true, "adaptive");
			expect(ticks[ticks.length - 1]?.index).toBe(360);
			expect(ticks.length).toBeLessThanOrEqual(4);
			expect(ticks[ticks.length - 1]?.anchor).toBe("end");
		});

		it("uses relative labels for short spans in adaptive mode", () => {
			const ticks = buildXTicks({ start: 20, end: 26 }, 260, true, "adaptive");
			expect(ticks.some((tick) => tick.label === "T")).toBe(true);
			expect(ticks.some((tick) => tick.label.startsWith("T-"))).toBe(true);
			expect(ticks.every((tick) => tick.row === 0)).toBe(true);
		});

		it("renders every day tick for 7D dense mobile mode", () => {
			const ticks = buildXTicks({ start: 23, end: 29 }, 300, true, "dense-mobile");
			expect(ticks).toHaveLength(7);
			expect(ticks[0]).toMatchObject({ label: "T-6", row: 0, anchor: "start" });
			expect(ticks[6]).toMatchObject({ label: "T", row: 0, anchor: "end" });
			expect(ticks[1]?.row).toBe(1);
			expect(ticks[2]?.row).toBe(0);
		});

		it("renders every day tick for 14D dense mobile mode", () => {
			const ticks = buildXTicks({ start: 350, end: 363 }, 300, true, "dense-mobile");
			expect(ticks).toHaveLength(14);
			expect(ticks[0]?.label).toBe("T-13");
			expect(ticks[13]?.label).toBe("T");
		});

		it("renders full 1..30 labels for 30D dense mobile mode", () => {
			const ticks = buildXTicks({ start: 334, end: 363 }, 300, true, "dense-mobile");
			expect(ticks).toHaveLength(30);
			expect(ticks[0]).toMatchObject({ label: "1", anchor: "start" });
			expect(ticks[29]).toMatchObject({ label: "30", anchor: "end" });
			expect(new Set(ticks.map((tick) => tick.row))).toEqual(new Set([0, 1]));
		});
	});
});
