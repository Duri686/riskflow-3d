export interface QuantileMarker {
	key: "p5" | "p50" | "p95";
	label: string;
	color: string;
	x: number;
	y: number;
	line: [[number, number, number], [number, number, number]];
	labelPosition: [number, number, number];
}

interface BuildQuantileMarkersArgs {
	currentStep: number;
	totalSteps: number;
	initialPrice: number;
	p05Price: number;
	meanPrice: number;
	p95Price: number;
	p05Color?: string;
	p50Color?: string;
	p95Color?: string;
}

const SCENE_X_SPAN = 26;
const SCENE_Y_SCALE = 14;
const MARKER_Z_MIN = -8.2;
const MARKER_Z_MAX = 8.2;
const LABEL_Z = 9.0;

const toSceneX = (currentStep: number, totalSteps: number): number => {
	if (totalSteps <= 0) {
		return -SCENE_X_SPAN / 2;
	}
	return (currentStep / totalSteps - 0.5) * SCENE_X_SPAN;
};

const toSceneY = (price: number, initialPrice: number): number => {
	const safePrice = Math.max(price, 1e-8);
	const safeInitial = Math.max(initialPrice, 1e-8);
	return Math.log(safePrice / safeInitial) * SCENE_Y_SCALE;
};

const formatReturnPct = (price: number, initialPrice: number): string => {
	const safeInitial = Math.max(initialPrice, 1e-8);
	const pct = (price / safeInitial - 1) * 100;
	const sign = pct > 0 ? "+" : "";
	return `${sign}${pct.toFixed(1)}%`;
};

export function buildQuantileMarkers(
	args: BuildQuantileMarkersArgs,
): QuantileMarker[] {
	const x = toSceneX(args.currentStep, args.totalSteps);

	const specs: Array<{
		key: QuantileMarker["key"];
		prefix: string;
		price: number;
		color: string;
	}> = [
		{ key: "p5", prefix: "P5", price: args.p05Price, color: args.p05Color ?? "#ff6b6b" },
		{ key: "p50", prefix: "P50", price: args.meanPrice, color: args.p50Color ?? "#ffffff" },
		{ key: "p95", prefix: "P95", price: args.p95Price, color: args.p95Color ?? "#22d3ee" },
	];

	return specs.map((spec) => {
		const y = toSceneY(spec.price, args.initialPrice);
		return {
			key: spec.key,
			label: `${spec.prefix} ${formatReturnPct(spec.price, args.initialPrice)}`,
			color: spec.color,
			x,
			y,
			line: [
				[x, y, MARKER_Z_MIN],
				[x, y, MARKER_Z_MAX],
			],
			labelPosition: [x, y + 0.55, LABEL_Z],
		};
	});
}
