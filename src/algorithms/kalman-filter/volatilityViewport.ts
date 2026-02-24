export interface ChartViewport {
	start: number;
	end: number;
}

export type RangePreset = 7 | 14 | 30 | "all" | "custom";

export type TickAnchor = "start" | "middle" | "end";
export type XTickMode = "dense-mobile" | "adaptive";

export interface XTickLabel {
	index: number;
	label: string;
	anchor: TickAnchor;
	row: 0 | 1;
}

const clampNumber = (value: number, min: number, max: number): number => {
	return Math.max(min, Math.min(max, value));
};

export const getViewportSpan = (viewport: ChartViewport): number => {
	return Math.max(1, viewport.end - viewport.start + 1);
};

export const isSameViewport = (left: ChartViewport, right: ChartViewport): boolean => {
	return left.start === right.start && left.end === right.end;
};

export const getInitialViewport = (total: number, isMobile: boolean): ChartViewport => {
	if (total <= 0) {
		return { start: 0, end: 0 };
	}

	const span = isMobile ? Math.min(30, total) : total;
	return { start: total - span, end: total - 1 };
};

export const clampViewport = (
	viewport: ChartViewport,
	total: number,
	minSpan: number,
	maxSpan: number,
): ChartViewport => {
	if (total <= 0) {
		return { start: 0, end: 0 };
	}

	const boundedMinSpan = clampNumber(Math.round(minSpan), 1, total);
	const boundedMaxSpan = clampNumber(Math.round(maxSpan), boundedMinSpan, total);
	const span = clampNumber(getViewportSpan(viewport), boundedMinSpan, boundedMaxSpan);
	const maxStart = total - span;
	const start = clampNumber(Math.round(viewport.start), 0, maxStart);

	return {
		start,
		end: start + span - 1,
	};
};

export const panViewport = (
	viewport: ChartViewport,
	deltaPoints: number,
	total: number,
	minSpan: number,
): ChartViewport => {
	if (total <= 0) {
		return { start: 0, end: 0 };
	}

	const current = clampViewport(viewport, total, minSpan, total);
	const span = getViewportSpan(current);
	const nextStart = clampNumber(current.start + deltaPoints, 0, total - span);

	return {
		start: nextStart,
		end: nextStart + span - 1,
	};
};

export const zoomViewport = (
	viewport: ChartViewport,
	anchorIndex: number,
	zoomFactor: number,
	total: number,
	minSpan: number,
	maxSpan: number,
): ChartViewport => {
	if (total <= 0) {
		return { start: 0, end: 0 };
	}

	const boundedMinSpan = clampNumber(Math.round(minSpan), 1, total);
	const boundedMaxSpan = clampNumber(Math.round(maxSpan), boundedMinSpan, total);
	const current = clampViewport(viewport, total, boundedMinSpan, boundedMaxSpan);
	const currentSpan = getViewportSpan(current);
	const boundedFactor = clampNumber(zoomFactor, 0.25, 4);
	const nextSpan = clampNumber(
		Math.round(currentSpan / boundedFactor),
		boundedMinSpan,
		boundedMaxSpan,
	);

	if (nextSpan === currentSpan) {
		return current;
	}

	const safeAnchor = clampNumber(Math.round(anchorIndex), current.start, current.end);
	const anchorRatio =
		currentSpan <= 1 ? 0.5 : (safeAnchor - current.start) / (currentSpan - 1);
	let nextStart = Math.round(safeAnchor - anchorRatio * (nextSpan - 1));
	nextStart = clampNumber(nextStart, 0, total - nextSpan);

	return {
		start: nextStart,
		end: nextStart + nextSpan - 1,
	};
};

const formatAdaptiveTickLabel = (index: number, end: number, span: number): string => {
	if (span <= 30) {
		const delta = end - index;
		return delta === 0 ? "T" : `T-${delta}`;
	}

	return `${index + 1}天`;
};

const formatDenseTickLabel = (
	index: number,
	start: number,
	end: number,
	span: number,
): string => {
	if (span <= 14) {
		const delta = end - index;
		return delta === 0 ? "T" : `T-${delta}`;
	}

	return `${index - start + 1}`;
};

export const buildXTicks = (
	viewport: ChartViewport,
	plotWidth: number,
	isMobile: boolean,
	mode: XTickMode = "adaptive",
): XTickLabel[] => {
	const span = getViewportSpan(viewport);
	const { start, end } = viewport;
	if (span <= 1) {
		return [
			{
				index: start,
				label:
					mode === "dense-mobile"
						? formatDenseTickLabel(start, start, end, span)
						: formatAdaptiveTickLabel(start, end, span),
				anchor: "middle",
				row: 0,
			},
		];
	}

	if (mode === "dense-mobile") {
		const ticks: XTickLabel[] = [];
		for (let value = start; value <= end; value += 1) {
			const position = value - start;
			const anchor: TickAnchor =
				value === start ? "start" : value === end ? "end" : "middle";
			ticks.push({
				index: value,
				label: formatDenseTickLabel(value, start, end, span),
				anchor,
				row: (position % 2) as 0 | 1,
			});
		}
		return ticks;
	}

	const minGapPx = isMobile ? (span <= 14 ? 42 : span <= 30 ? 52 : 64) : 84;
	const targetCount = isMobile
		? span <= 7
			? 7
			: span <= 14
				? 7
				: span <= 30
					? 6
					: 4
		: span <= 7
			? 7
			: span <= 14
				? 8
				: span <= 30
					? 8
					: 7;
	const maxCountByWidth = Math.max(2, Math.floor(plotWidth / minGapPx) + 1);
	const tickCount = clampNumber(targetCount, 2, Math.min(span, maxCountByWidth));
	const step = (span - 1) / (tickCount - 1);
	const candidates: number[] = [start];

	for (let index = 1; index < tickCount - 1; index += 1) {
		candidates.push(start + Math.round(index * step));
	}
	candidates.push(end);

	const deduped = [...new Set(candidates)].sort((left, right) => left - right);
	const filtered: number[] = [deduped[0]];

	for (let index = 1; index < deduped.length - 1; index += 1) {
		const value = deduped[index];
		const prev = filtered[filtered.length - 1];
		const gapToPrevPx = ((value - prev) / (span - 1)) * plotWidth;
		const gapToEndPx = ((end - value) / (span - 1)) * plotWidth;
		if (gapToPrevPx >= minGapPx && gapToEndPx >= minGapPx * 0.75) {
			filtered.push(value);
		}
	}

	if (filtered[filtered.length - 1] !== end) {
		filtered.push(end);
	}

	if (filtered.length > 2) {
		const last = filtered[filtered.length - 1];
		const prev = filtered[filtered.length - 2];
		const gapPx = ((last - prev) / (span - 1)) * plotWidth;
		if (gapPx < minGapPx * 0.8) {
			filtered.splice(filtered.length - 2, 1);
		}
	}

	return filtered.map((value, index) => {
		const anchor: TickAnchor =
			index === 0 ? "start" : index === filtered.length - 1 ? "end" : "middle";

		return {
			index: value,
			label: formatAdaptiveTickLabel(value, end, span),
			anchor,
			row: 0,
		};
	});
};
