import { describe, expect, it } from "vitest";

import { buildQuantileMarkers } from "./sceneMarkers";

describe("buildQuantileMarkers", () => {
	it("builds P5/P50/P95 markers with deterministic x mapping", () => {
		const markers = buildQuantileMarkers({
			currentStep: 50,
			totalSteps: 100,
			initialPrice: 100,
			p05Price: 80,
			meanPrice: 100,
			p95Price: 130,
		});

		expect(markers.map((marker) => marker.key)).toEqual(["p5", "p50", "p95"]);
		for (const marker of markers) {
			expect(marker.x).toBeCloseTo(0, 10);
			expect(marker.line[0][2]).toBeLessThan(0);
			expect(marker.line[1][2]).toBeGreaterThan(0);
		}
	});

	it("maps prices into monotonic y order and contains return text", () => {
		const markers = buildQuantileMarkers({
			currentStep: 10,
			totalSteps: 20,
			initialPrice: 100,
			p05Price: 70,
			meanPrice: 100,
			p95Price: 140,
		});

		expect(markers[0].y).toBeLessThan(markers[1].y);
		expect(markers[1].y).toBeLessThan(markers[2].y);
		expect(markers[0].label).toMatch(/P5/);
		expect(markers[1].label).toMatch(/P50/);
		expect(markers[2].label).toMatch(/P95/);
		expect(markers[0].label).toMatch(/%/);
	});
});
