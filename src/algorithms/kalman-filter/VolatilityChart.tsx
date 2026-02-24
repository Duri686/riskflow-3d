import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KalmanFilterResult, VolRegime } from "@/algorithms/kalman-filter/engine";
import {
	buildXTicks,
	clampViewport,
	getInitialViewport,
	getViewportSpan,
	isSameViewport,
	panViewport,
	zoomViewport,
	type ChartViewport,
	type RangePreset,
} from "@/algorithms/kalman-filter/volatilityViewport";
import { TRADING_DAYS_PER_YEAR } from "@/algorithms/shared/constants";

interface VolatilityChartProps {
	result: KalmanFilterResult;
	dailyReturns: number[];
	isBootstrapping?: boolean;
}

const MOBILE_BREAKPOINT = 768;
const MIN_SPAN = 5;

const DESKTOP_MARGIN = { top: 44, right: 30, bottom: 50, left: 60 };
const MOBILE_MARGIN = { top: 32, right: 14, bottom: 36, left: 42 };

const REGIME_COLORS: Record<VolRegime, { bg: string }> = {
	low: { bg: "var(--color-bt-success-soft)" },
	medium: { bg: "var(--color-bt-warning-soft)" },
	high: { bg: "var(--color-bt-danger-soft)" },
};

const PHASE_COLORS: Record<string, string> = {
	rising: "var(--color-bt-danger)",
	falling: "var(--color-bt-success)",
	shock: "var(--color-bt-warning)",
	stable: "var(--color-bt-muted-foreground)",
};

const CHART_COLORS = {
	grid: "var(--color-bt-border)",
	axis: "var(--color-bt-muted-foreground)",
	observed: "var(--color-bt-muted-foreground)",
	kalman: "var(--color-bt-success)",
	ewma: "var(--color-bt-warning)",
	thresholdMid: "var(--color-bt-warning)",
	thresholdHigh: "var(--color-bt-danger)",
	band: "var(--color-bt-success)",
};

const clampNumber = (value: number, min: number, max: number): number => {
	return Math.max(min, Math.min(max, value));
};

const buildNiceYTicks = (maxValue: number): number[] => {
	const safeMax = Math.max(maxValue, 0.2);
	const roughStep = safeMax / 5;
	const exponent = Math.floor(Math.log10(roughStep));
	const fraction = roughStep / 10 ** exponent;

	let niceFraction = 1;
	if (fraction >= 7) niceFraction = 10;
	else if (fraction >= 3) niceFraction = 5;
	else if (fraction >= 1.5) niceFraction = 2;

	const step = niceFraction * 10 ** exponent;
	const ticks: number[] = [];
	for (let value = 0; value <= safeMax + step * 0.1; value += step) {
		ticks.push(Number(value.toFixed(8)));
	}
	return ticks;
};

export function VolatilityChart({
	result,
	dailyReturns,
	isBootstrapping = false,
}: VolatilityChartProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const plotAreaRef = useRef<SVGRectElement>(null);

	const [size, setSize] = useState({ width: 800, height: 420 });
	const [viewState, setViewState] = useState<{
		key: string;
		viewport: ChartViewport;
		rangePreset: RangePreset;
		showDetails: boolean;
	}>({
		key: "bootstrap",
		viewport: { start: 0, end: 0 },
		rangePreset: "all",
		showDetails: true,
	});

	const viewportRef = useRef<ChartViewport>({ start: 0, end: 0 });
	const dragRef = useRef<{ startX: number; startViewport: ChartViewport } | null>(
		null,
	);
	const pinchRef = useRef<{ startDistance: number; startViewport: ChartViewport } | null>(
		null,
	);
	const pointersRef = useRef<Map<number, number>>(new Map());

	useEffect(() => {
		const element = containerRef.current;
		if (!element) return;

		const observer = new ResizeObserver(([entry]) => {
			const { width, height } = entry.contentRect;
			if (width <= 0 || height <= 0) return;
			setSize({
				width: Math.floor(width),
				height: Math.floor(height),
			});
		});

		observer.observe(element);
		return () => observer.disconnect();
	}, [result.steps.length]);

	const { steps, regimeHistory, ewma } = result;
	const totalPoints = steps.length;
	const hasData = totalPoints >= 2;
	const isMobile = size.width < MOBILE_BREAKPOINT;
	const minSpan = Math.min(MIN_SPAN, Math.max(1, totalPoints));
	const viewKey = `${totalPoints}-${isMobile ? "mobile" : "desktop"}`;
	const defaultViewport = getInitialViewport(totalPoints, isMobile);
	const defaultRangePreset: RangePreset = isMobile ? 30 : "all";
	const defaultShowDetails = !isMobile;
	const phaseColor =
		PHASE_COLORS[result.momentum.phase] ?? "var(--color-bt-muted-foreground)";

	const resolvedViewState = useMemo(() => {
		if (!hasData) {
			return {
				key: viewKey,
				viewport: defaultViewport,
				rangePreset: defaultRangePreset,
				showDetails: defaultShowDetails,
			};
		}

		if (viewState.key !== viewKey) {
			return {
				key: viewKey,
				viewport: defaultViewport,
				rangePreset: defaultRangePreset,
				showDetails: defaultShowDetails,
			};
		}

		return {
			...viewState,
			viewport: clampViewport(viewState.viewport, totalPoints, minSpan, totalPoints),
		};
	}, [
		defaultRangePreset,
		defaultShowDetails,
		defaultViewport,
		hasData,
		minSpan,
		totalPoints,
		viewKey,
		viewState,
	]);

	const isDenseMobilePreset =
		isMobile &&
		resolvedViewState.rangePreset === 30;
	const margin = useMemo(() => {
		if (!isMobile) {
			return DESKTOP_MARGIN;
		}
		if (!isDenseMobilePreset) {
			return MOBILE_MARGIN;
		}
		return {
			...MOBILE_MARGIN,
			bottom: 56,
		};
	}, [isDenseMobilePreset, isMobile]);

	useEffect(() => {
		viewportRef.current = resolvedViewState.viewport;
	}, [resolvedViewState.viewport]);

	const applyPreset = useCallback(
		(preset: Exclude<RangePreset, "custom">) => {
			if (!hasData) return;
			const desiredSpan = preset === "all" ? totalPoints : Math.min(preset, totalPoints);
			const nextViewport: ChartViewport = {
				start: totalPoints - desiredSpan,
				end: totalPoints - 1,
			};
			setViewState({
				key: viewKey,
				viewport: nextViewport,
				rangePreset:
					preset === "all" || desiredSpan === totalPoints ? "all" : preset,
				showDetails: resolvedViewState.showDetails,
			});
		},
		[hasData, resolvedViewState.showDetails, totalPoints, viewKey],
	);

	const resetViewport = useCallback(() => {
		if (!hasData) return;
		setViewState({
			key: viewKey,
			viewport: defaultViewport,
			rangePreset: defaultRangePreset,
			showDetails: resolvedViewState.showDetails,
		});
	}, [
		defaultRangePreset,
		defaultViewport,
		hasData,
		resolvedViewState.showDetails,
		viewKey,
	]);

	const updateCustomViewport = useCallback(
		(nextViewport: ChartViewport) => {
			if (!hasData) return;
			const safeViewport = clampViewport(nextViewport, totalPoints, minSpan, totalPoints);
			setViewState((previous) => {
				const baseline =
					previous.key === viewKey
						? previous
						: {
								key: viewKey,
								viewport: defaultViewport,
								rangePreset: defaultRangePreset,
								showDetails: defaultShowDetails,
							};
				if (isSameViewport(baseline.viewport, safeViewport)) {
					return previous;
				}
				return {
					...baseline,
					viewport: safeViewport,
					rangePreset: "custom",
				};
			});
		},
		[
			defaultRangePreset,
			defaultShowDetails,
			defaultViewport,
			hasData,
			minSpan,
			totalPoints,
			viewKey,
		],
	);

	const chart = useMemo(() => {
		if (!hasData) return null;

		const safeViewport = resolvedViewState.viewport;
		const visibleStart = safeViewport.start;
		const visibleEnd = safeViewport.end;
		const visibleSpan = getViewportSpan(safeViewport);

		const plotWidth = size.width - margin.left - margin.right;
		const plotHeight = size.height - margin.top - margin.bottom;
		if (plotWidth <= 0 || plotHeight <= 0) return null;

		const observedVols = steps.map((step, index) => {
			const returnValue = dailyReturns[index];
			if (Number.isFinite(returnValue)) {
				return Math.abs(returnValue) * Math.sqrt(TRADING_DAYS_PER_YEAR);
			}
			return Math.sqrt(Math.max(0, step.observed) * TRADING_DAYS_PER_YEAR);
		});
		const estimatedVols = steps.map((step) => step.annualizedVol);
		const ewmaVols = ewma.values;
		const upperBand = steps.map((step) =>
			Math.sqrt(
				Math.max(0, step.estimated + Math.sqrt(step.errorCovariance)) *
					TRADING_DAYS_PER_YEAR,
			),
		);
		const lowerBand = steps.map((step) =>
			Math.sqrt(
				Math.max(0, step.estimated - Math.sqrt(step.errorCovariance)) *
					TRADING_DAYS_PER_YEAR,
			),
		);

		const observedVisible = observedVols.slice(visibleStart, visibleEnd + 1);
		const estimatedVisible = estimatedVols.slice(visibleStart, visibleEnd + 1);
		const ewmaVisible = ewmaVols.slice(visibleStart, visibleEnd + 1);
		const upperVisible = upperBand.slice(visibleStart, visibleEnd + 1);
		const lowerVisible = lowerBand.slice(visibleStart, visibleEnd + 1);

		const referenceThresholds = [0.4, 0.8];
		const allValues = [
			...observedVisible,
			...estimatedVisible,
			...ewmaVisible,
			...upperVisible,
			...referenceThresholds,
		];
		const maxVisibleValue = allValues.reduce((max, value) => {
			return Number.isFinite(value) ? Math.max(max, value) : max;
		}, 0);
		const yMax = Math.max(0.2, maxVisibleValue * 1.1, 0.85);

		const yScale = (value: number) => {
			return margin.top + plotHeight - (value / yMax) * plotHeight;
		};

		const xScaleFromLocal = (localIndex: number) => {
			if (visibleSpan <= 1) {
				return margin.left + plotWidth / 2;
			}
			return margin.left + (localIndex / (visibleSpan - 1)) * plotWidth;
		};

		const xScale = (globalIndex: number) => {
			return xScaleFromLocal(globalIndex - visibleStart);
		};

		const buildPath = (values: number[]) => {
			if (values.length === 0) return "";
			return values
				.map((value, index) => {
					const command = index === 0 ? "M" : "L";
					return `${command}${xScaleFromLocal(index).toFixed(1)},${yScale(value).toFixed(1)}`;
				})
				.join(" ");
		};

		const observedPath = buildPath(observedVisible);
		const estimatedPath = buildPath(estimatedVisible);
		const ewmaPath = buildPath(ewmaVisible);

		let bandPath = "";
		if (upperVisible.length >= 2 && lowerVisible.length >= 2) {
			const upperPath = upperVisible.map((value, index) => {
				return `${index === 0 ? "M" : "L"}${xScaleFromLocal(index).toFixed(1)},${yScale(value).toFixed(1)}`;
			});
			const lowerPath: string[] = [];
			for (let index = lowerVisible.length - 1; index >= 0; index -= 1) {
				lowerPath.push(
					`L${xScaleFromLocal(index).toFixed(1)},${yScale(lowerVisible[index]).toFixed(1)}`,
				);
			}
			bandPath = [...upperPath, ...lowerPath, "Z"].join(" ");
		}

		const regimeBands: Array<{ start: number; end: number; regime: VolRegime }> = [];
		if (regimeHistory.length > 0) {
			let currentRegime = regimeHistory[visibleStart];
			let segmentStart = visibleStart;
			for (let index = visibleStart + 1; index <= visibleEnd; index += 1) {
				if (regimeHistory[index] !== currentRegime) {
					regimeBands.push({
						start: segmentStart,
						end: index - 1,
						regime: currentRegime,
					});
					currentRegime = regimeHistory[index];
					segmentStart = index;
				}
			}
			regimeBands.push({
				start: segmentStart,
				end: visibleEnd,
				regime: currentRegime,
			});
		}

		const thresholds = [
			{ value: 0.4, label: "40% 低↔中", color: CHART_COLORS.thresholdMid },
			{ value: 0.8, label: "80% 中↔高", color: CHART_COLORS.thresholdHigh },
		].filter((threshold) => threshold.value <= yMax);

		return {
			margin,
			plotWidth,
			plotHeight,
			visibleStart,
			visibleEnd,
			visibleSpan,
			yMax,
			yTicks: buildNiceYTicks(yMax),
			xTicks: buildXTicks(
				safeViewport,
				plotWidth,
				isMobile,
				isDenseMobilePreset ? "dense-mobile" : "adaptive",
			),
			xScale,
			yScale,
			observedPath,
			estimatedPath,
			ewmaPath,
			bandPath,
			regimeBands,
			thresholds,
		};
	}, [
		dailyReturns,
		ewma.values,
		hasData,
		isDenseMobilePreset,
		isMobile,
		margin,
		regimeHistory,
		resolvedViewState.viewport,
		size,
		steps,
	]);

	const resolveIndexFromClientX = useCallback(
		(clientX: number) => {
			if (!chart || !plotAreaRef.current) return viewportRef.current.start;
			const rect = plotAreaRef.current.getBoundingClientRect();
			const normalized = clampNumber(clientX - rect.left, 0, rect.width);
			const ratio = rect.width > 0 ? normalized / rect.width : 0.5;
			const indexOffset =
				chart.visibleSpan <= 1 ? 0 : Math.round(ratio * (chart.visibleSpan - 1));
			return chart.visibleStart + indexOffset;
		},
		[chart],
	);

	const handlePointerDown = useCallback(
		(event: React.PointerEvent<SVGRectElement>) => {
			if (!chart || !hasData) return;

			event.currentTarget.setPointerCapture(event.pointerId);
			pointersRef.current.set(event.pointerId, event.clientX);

			if (pointersRef.current.size === 1) {
				dragRef.current = {
					startX: event.clientX,
					startViewport: viewportRef.current,
				};
				pinchRef.current = null;
				return;
			}

			if (pointersRef.current.size === 2) {
				const [firstX, secondX] = [...pointersRef.current.values()];
				pinchRef.current = {
					startDistance: Math.abs(firstX - secondX),
					startViewport: viewportRef.current,
				};
				dragRef.current = null;
			}
		},
		[chart, hasData],
	);

	const handlePointerMove = useCallback(
		(event: React.PointerEvent<SVGRectElement>) => {
			if (!chart || !hasData) return;
			if (!pointersRef.current.has(event.pointerId)) return;

			pointersRef.current.set(event.pointerId, event.clientX);

			if (pointersRef.current.size === 2 && pinchRef.current) {
				const [firstX, secondX] = [...pointersRef.current.values()];
				const currentDistance = Math.abs(firstX - secondX);
				if (currentDistance < 4 || pinchRef.current.startDistance < 4) return;

				const midpointX = (firstX + secondX) / 2;
				const anchor = resolveIndexFromClientX(midpointX);
				const zoomFactor = currentDistance / pinchRef.current.startDistance;
				const nextViewport = zoomViewport(
					pinchRef.current.startViewport,
					anchor,
					zoomFactor,
					totalPoints,
					minSpan,
					totalPoints,
				);
				updateCustomViewport(nextViewport);
				return;
			}

			if (pointersRef.current.size === 1 && dragRef.current && chart.plotWidth > 0) {
				const deltaX = event.clientX - dragRef.current.startX;
				const pointsPerPixel =
					chart.visibleSpan <= 1 ? 0 : (chart.visibleSpan - 1) / chart.plotWidth;
				const deltaPoints = Math.round(-deltaX * pointsPerPixel);
				const nextViewport = panViewport(
					dragRef.current.startViewport,
					deltaPoints,
					totalPoints,
					minSpan,
				);
				updateCustomViewport(nextViewport);
			}
		},
		[chart, hasData, minSpan, resolveIndexFromClientX, totalPoints, updateCustomViewport],
	);

	const finalizePointerState = useCallback(() => {
		if (pointersRef.current.size === 1) {
			const remainingX = [...pointersRef.current.values()][0];
			dragRef.current = {
				startX: remainingX,
				startViewport: viewportRef.current,
			};
			pinchRef.current = null;
			return;
		}

		dragRef.current = null;
		pinchRef.current = null;
	}, []);

	const handlePointerUp = useCallback(
		(event: React.PointerEvent<SVGRectElement>) => {
			if (event.currentTarget.hasPointerCapture(event.pointerId)) {
				event.currentTarget.releasePointerCapture(event.pointerId);
			}

			pointersRef.current.delete(event.pointerId);
			finalizePointerState();
		},
		[finalizePointerState],
	);

	const handlePointerCancel = useCallback(
		(event: React.PointerEvent<SVGRectElement>) => {
			if (event.currentTarget.hasPointerCapture(event.pointerId)) {
				event.currentTarget.releasePointerCapture(event.pointerId);
			}

			pointersRef.current.delete(event.pointerId);
			finalizePointerState();
		},
		[finalizePointerState],
	);

	const handleWheel = useCallback(
		(event: React.WheelEvent<SVGRectElement>) => {
			if (!chart || !hasData) return;

			const anchor = resolveIndexFromClientX(event.clientX);
			const zoomFactor = event.deltaY < 0 ? 1.12 : 0.88;
			const nextViewport = zoomViewport(
				viewportRef.current,
				anchor,
				zoomFactor,
				totalPoints,
				minSpan,
				totalPoints,
			);
			updateCustomViewport(nextViewport);
		},
		[chart, hasData, minSpan, resolveIndexFromClientX, totalPoints, updateCustomViewport],
	);

	if (!hasData) {
		return (
			<div
				ref={containerRef}
				className="flex h-full w-full items-center justify-center"
			>
				{isBootstrapping ? (
					<div className="flex flex-col items-center gap-3">
						<div className="relative h-8 w-8">
							<div className="absolute inset-0 border border-[var(--color-bt-accent)]/30" />
							<div className="absolute inset-0 animate-spin border-2 border-transparent border-r-[var(--color-bt-accent)] border-t-[var(--color-bt-accent)]" />
						</div>
						<p className="font-bt-mono text-xs text-[var(--color-bt-muted-foreground)]">
							正在拉取日线数据并初始化滤波器...
						</p>
					</div>
				) : (
					<p className="font-bt-mono text-sm text-[var(--color-bt-muted-foreground)]">
						获取数据后显示波动率估计
					</p>
				)}
			</div>
		);
	}

	if (!chart) {
		return <div ref={containerRef} className="h-full w-full" />;
	}

	const showObserved = !isMobile || resolvedViewState.showDetails;
	const showRegimeBands = !isMobile || resolvedViewState.showDetails;
	const detailLabel = resolvedViewState.showDetails ? "细节开" : "细节关";
	const isCustomViewport = resolvedViewState.rangePreset === "custom";
	const showRecentThirtyHint =
		isDenseMobilePreset && resolvedViewState.rangePreset === 30;
	const denseTickFontSize = chart.visibleSpan > 14 ? 6.5 : 7;

	return (
		<div className="relative flex h-full w-full min-h-0 flex-col">
			<div className="border-b border-[var(--color-bt-border)] px-2 py-2">
				<div className="grid w-full grid-cols-4 border border-[var(--color-bt-border)] bg-[var(--color-bt-overlay)]">
					{([30, "all"] as const).map((preset) => {
						const isActive = resolvedViewState.rangePreset === preset;
						const label = preset === "all" ? "ALL" : `${preset}D`;
						return (
							<button
								key={preset}
								type="button"
								onClick={() => applyPreset(preset)}
								className={`relative h-10 border-r border-[var(--color-bt-border)] px-2 font-bt-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-150 ease-[var(--ease-bt)] last:border-r-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bt-ring)] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-[var(--color-bt-accent)] after:transition-transform after:duration-150 after:ease-[var(--ease-bt)] ${
									isActive
										? "text-[var(--color-bt-accent)] after:scale-x-100"
										: "text-[var(--color-bt-muted-foreground)] hover:text-[var(--color-bt-foreground)] after:scale-x-0"
								}`}
							>
								{label}
							</button>
						);
					})}

					<button
						type="button"
						aria-pressed={resolvedViewState.showDetails}
						onClick={() =>
							setViewState({
								key: viewKey,
								viewport: resolvedViewState.viewport,
								rangePreset: resolvedViewState.rangePreset,
								showDetails: !resolvedViewState.showDetails,
							})
						}
						className={`h-10 border-r border-[var(--color-bt-border)] px-2 font-bt-mono text-[10px] tracking-[0.14em] transition-colors duration-150 ease-[var(--ease-bt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bt-ring)] ${
							resolvedViewState.showDetails
								? "text-[var(--color-bt-foreground)]"
								: "text-[var(--color-bt-muted-foreground)] hover:text-[var(--color-bt-foreground)]"
						}`}
					>
						{detailLabel}
					</button>

					<button
						type="button"
						onClick={resetViewport}
						className={`h-10 px-2 font-bt-mono text-[10px] tracking-[0.14em] transition-colors duration-150 ease-[var(--ease-bt)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-bt-ring)] ${
							isCustomViewport
								? "text-[var(--color-bt-accent)]"
								: "text-[var(--color-bt-muted-foreground)] hover:text-[var(--color-bt-foreground)]"
						}`}
					>
						重置
					</button>
				</div>
			</div>

			<div ref={containerRef} className="relative min-h-0 flex-1">
				<svg
					width={size.width}
					height={size.height}
					className="block h-full w-full select-none"
					role="img"
					aria-label="Kalman volatility chart"
				>
				{showRegimeBands
					? chart.regimeBands.map((band) => {
							const startX = chart.xScale(band.start);
							const endX = chart.xScale(band.end);
							const width = Math.max(1, endX - startX);
							return (
								<rect
									key={`${band.regime}-${band.start}-${band.end}`}
									x={startX}
									y={margin.top}
									width={width}
									height={chart.plotHeight}
									fill={REGIME_COLORS[band.regime].bg}
								/>
							);
						})
					: null}

				{chart.yTicks.map((tick) => (
					<line
						key={tick}
						x1={margin.left}
						y1={chart.yScale(tick)}
						x2={margin.left + chart.plotWidth}
						y2={chart.yScale(tick)}
						stroke={CHART_COLORS.grid}
						strokeDasharray="2,4"
					/>
				))}

				{chart.thresholds.map((threshold) => (
					<g key={threshold.value}>
						<line
							x1={margin.left}
							y1={chart.yScale(threshold.value)}
							x2={margin.left + chart.plotWidth}
							y2={chart.yScale(threshold.value)}
							stroke={threshold.color}
							strokeWidth={1}
							strokeDasharray="6,4"
							strokeOpacity={0.5}
						/>
						{isMobile ? null : (
							<text
								x={margin.left + chart.plotWidth - 4}
								y={chart.yScale(threshold.value) - 4}
								fill={threshold.color}
								fontSize={8}
								fontFamily="var(--font-bt-mono)"
								textAnchor="end"
								opacity={0.72}
							>
								{threshold.label}
							</text>
						)}
					</g>
				))}

				{chart.bandPath ? (
					<path d={chart.bandPath} fill={CHART_COLORS.band} fillOpacity={0.09} />
				) : null}

				{showObserved ? (
					<path
						d={chart.observedPath}
						fill="none"
						stroke={CHART_COLORS.observed}
						strokeWidth={0.8}
						strokeOpacity={0.35}
					/>
				) : null}

				<path
					d={chart.ewmaPath}
					fill="none"
					stroke={CHART_COLORS.ewma}
					strokeWidth={1.4}
					strokeDasharray="4,3"
					strokeOpacity={0.9}
				/>

				<path
					d={chart.estimatedPath}
					fill="none"
					stroke={CHART_COLORS.kalman}
					strokeWidth={2}
				/>

				<line
					x1={margin.left}
					y1={margin.top}
					x2={margin.left}
					y2={margin.top + chart.plotHeight}
					stroke={CHART_COLORS.grid}
				/>
				{chart.yTicks.map((tick) => (
					<text
						key={`y-${tick}`}
						x={margin.left - 7}
						y={chart.yScale(tick) + 3}
						fill={CHART_COLORS.axis}
						fontSize={isMobile ? 8 : 9}
						textAnchor="end"
						fontFamily="var(--font-bt-mono)"
					>
						{(tick * 100).toFixed(0)}%
					</text>
				))}

				<line
					x1={margin.left}
					y1={margin.top + chart.plotHeight}
					x2={margin.left + chart.plotWidth}
					y2={margin.top + chart.plotHeight}
					stroke={CHART_COLORS.grid}
				/>
				{isDenseMobilePreset
					? Array.from({ length: chart.visibleSpan }, (_, offset) => {
							const index = chart.visibleStart + offset;
							const tickX = chart.xScale(index);
							return (
								<line
									key={`minor-${index}`}
									x1={tickX}
									y1={margin.top + chart.plotHeight}
									x2={tickX}
									y2={margin.top + chart.plotHeight + 5}
									stroke={CHART_COLORS.grid}
									strokeOpacity={0.75}
								/>
							);
						})
					: null}
				{chart.xTicks.map((tick) => (
					<text
						key={`x-${tick.index}-${tick.row}`}
						x={chart.xScale(tick.index)}
						y={
							margin.top +
							chart.plotHeight +
							(isDenseMobilePreset
								? tick.row === 0
									? 15
									: 29
								: isMobile
									? 14
									: 18)
						}
						fill={CHART_COLORS.axis}
						fontSize={
							isDenseMobilePreset ? denseTickFontSize : isMobile ? 8 : 9
						}
						textAnchor={tick.anchor}
						fontFamily="var(--font-bt-mono)"
					>
						{tick.label}
					</text>
				))}
				{showRecentThirtyHint ? (
					<text
						x={margin.left + chart.plotWidth}
						y={margin.top + chart.plotHeight + 44}
						fill={CHART_COLORS.axis}
						fontSize={7}
						textAnchor="end"
						fontFamily="var(--font-bt-mono)"
						opacity={0.72}
					>
						最近30天（右侧最新）
					</text>
				) : null}

				{isMobile ? null : (
					<>
						<text
							x={margin.left + chart.plotWidth / 2}
							y={size.height - 8}
							fill={CHART_COLORS.axis}
							fontSize={11}
							textAnchor="middle"
						>
							交易日
						</text>
						<text
							x={14}
							y={margin.top + chart.plotHeight / 2}
							fill={CHART_COLORS.axis}
							fontSize={11}
							textAnchor="middle"
							transform={`rotate(-90, 14, ${margin.top + chart.plotHeight / 2})`}
						>
							年化波动率
						</text>
					</>
				)}

				<g transform={`translate(${margin.left + 10}, ${margin.top + 6})`}>
					<line
						x1={0}
						y1={0}
						x2={18}
						y2={0}
						stroke={CHART_COLORS.kalman}
						strokeWidth={2}
					/>
					<text x={22} y={3} fill={CHART_COLORS.kalman} fontSize={isMobile ? 8 : 9}>
						Kalman σ̂
					</text>

					<line
						x1={0}
						y1={14}
						x2={18}
						y2={14}
						stroke={CHART_COLORS.ewma}
						strokeWidth={1.4}
						strokeDasharray="4,3"
					/>
					<text x={22} y={17} fill={CHART_COLORS.ewma} fontSize={isMobile ? 8 : 9}>
						EWMA
					</text>

					{showObserved ? (
						<>
							<line
								x1={0}
								y1={28}
								x2={18}
								y2={28}
								stroke={CHART_COLORS.observed}
								strokeWidth={1}
								strokeOpacity={0.5}
							/>
							<text x={22} y={31} fill={CHART_COLORS.axis} fontSize={isMobile ? 8 : 9}>
								|r_t|
							</text>
						</>
					) : null}
				</g>

				<g transform={`translate(${margin.left + chart.plotWidth - 84}, ${margin.top + 6})`}>
					<rect
						x={0}
						y={0}
						width={78}
						height={16}
						fill={phaseColor}
						fillOpacity={0.14}
						stroke={phaseColor}
						strokeOpacity={0.35}
						strokeWidth={0.6}
					/>
					<text
						x={6}
						y={11}
						fill={phaseColor}
						fontSize={isMobile ? 7 : 8}
						fontFamily="var(--font-bt-mono)"
					>
						{result.momentum.phaseLabel}
					</text>
				</g>

				<rect
					ref={plotAreaRef}
					x={margin.left}
					y={margin.top}
					width={chart.plotWidth}
					height={chart.plotHeight}
					fill="transparent"
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onPointerCancel={handlePointerCancel}
					onWheel={handleWheel}
					style={{ touchAction: "none", cursor: "grab" }}
				/>
				</svg>
			</div>
		</div>
	);
}
