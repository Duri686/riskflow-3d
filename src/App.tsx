import { useEffect, useMemo, useRef, useState } from "react";
import {
	defaultMonteCarloInput,
	type MonteCarloInput,
	type MonteCarloState,
	monteCarloEngine,
} from "./algorithms/monteCarlo";
import { PathCloudScene } from "./components/PathCloudScene";

interface SliderConfig {
	key: keyof MonteCarloInput;
	label: string;
	min: number;
	max: number;
	step: number;
	valueFormatter?: (value: number) => string;
}

const sliderConfigs: SliderConfig[] = [
	{ key: "paths", label: "Path Count", min: 80, max: 600, step: 10 },
	{ key: "steps", label: "Time Steps", min: 30, max: 360, step: 10 },
	{
		key: "drift",
		label: "Drift (mu)",
		min: -0.2,
		max: 0.3,
		step: 0.01,
		valueFormatter: (value) => `${(value * 100).toFixed(1)}%`,
	},
	{
		key: "volatility",
		label: "Volatility (sigma)",
		min: 0.05,
		max: 0.8,
		step: 0.01,
		valueFormatter: (value) => `${(value * 100).toFixed(1)}%`,
	},
	{ key: "years", label: "Horizon (Years)", min: 0.2, max: 3, step: 0.1 },
	{ key: "playbackSpeed", label: "Playback Speed", min: 4, max: 120, step: 1 },
];

const formatPercent = (value: number): string => `${(value * 100).toFixed(2)}%`;

const formatPrice = (value: number): string => `$${value.toFixed(2)}`;

const createInitialState = (input: MonteCarloInput): MonteCarloState =>
	monteCarloEngine.createInitialState(input);

function App() {
	const [input, setInput] = useState<MonteCarloInput>(defaultMonteCarloInput);
	const [state, setState] = useState<MonteCarloState>(() =>
		createInitialState(defaultMonteCarloInput),
	);
	const [isPlaying, setIsPlaying] = useState(true);

	const animationFrameRef = useRef<number | null>(null);
	const lastTimeRef = useRef<number | null>(null);
	const frameRef = useRef(0);

	const resetSimulation = (nextInput: MonteCarloInput) => {
		setInput(nextInput);
		setState(createInitialState(nextInput));
		setIsPlaying(true);
		lastTimeRef.current = null;
		frameRef.current = 0;
	};

	useEffect(() => {
		if (!isPlaying) {
			return undefined;
		}

		const tick = (timestamp: number) => {
			const previous = lastTimeRef.current ?? timestamp;
			const dtSeconds = Math.min(
				0.1,
				Math.max(0.001, (timestamp - previous) / 1000),
			);
			lastTimeRef.current = timestamp;
			frameRef.current += 1;
			let reachedEnd = false;

			setState((previousState) => {
				const next = monteCarloEngine.advance(previousState, input, {
					dtSeconds,
					elapsedSeconds: timestamp / 1000,
					frame: frameRef.current,
				});

				reachedEnd = next.currentStep >= next.cloud.totalSteps;
				return next;
			});

			if (reachedEnd) {
				setIsPlaying(false);
				return;
			}

			animationFrameRef.current = window.requestAnimationFrame(tick);
		};

		animationFrameRef.current = window.requestAnimationFrame(tick);

		return () => {
			if (animationFrameRef.current !== null) {
				window.cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [input, isPlaying]);

	const renderLayer = useMemo(
		() => monteCarloEngine.getRenderLayer(state, input),
		[state, input],
	);
	const metrics = useMemo(
		() => monteCarloEngine.getMetricsPanel(state, input),
		[state, input],
	);

	const handleSlider = (key: keyof MonteCarloInput, value: number) => {
		resetSimulation({
			...input,
			[key]: value,
		});
	};

	return (
		<div className="app-shell">
			<header className="app-header">
				<div>
					<p className="eyebrow">RiskFlow 3D</p>
					<h1>Monte Carlo Path Cloud</h1>
					<p className="subtitle">
						Phase-1 Demo: GBM 路径云 + 参数调节 + 实时风险指标
					</p>
				</div>
				<div className="header-actions">
					<button
						type="button"
						onClick={() => setIsPlaying((previous) => !previous)}
					>
						{isPlaying ? "Pause" : "Resume"}
					</button>
					<button
						type="button"
						onClick={() =>
							resetSimulation({
								...input,
								seed: input.seed + 1,
							})
						}
					>
						Re-Simulate
					</button>
				</div>
			</header>

			<main className="app-grid">
				<section className="panel controls-panel">
					<h2>Parameters</h2>
					<div className="slider-list">
						{sliderConfigs.map((config) => {
							const currentValue = input[config.key];

							return (
								<label key={config.key} className="slider-item">
									<div className="slider-label">
										<span>{config.label}</span>
										<strong>
											{config.valueFormatter
												? config.valueFormatter(currentValue)
												: Number.isInteger(currentValue)
													? currentValue
													: currentValue.toFixed(2)}
										</strong>
									</div>
									<input
										type="range"
										min={config.min}
										max={config.max}
										step={config.step}
										value={currentValue}
										onChange={(event) =>
											handleSlider(config.key, Number(event.target.value))
										}
									/>
								</label>
							);
						})}
					</div>
				</section>

				<section className="panel scene-panel">
					<PathCloudScene layer={renderLayer} />
					<div className="scene-hud">
						<span>
							Step: {renderLayer.currentStep}/{renderLayer.totalSteps}
						</span>
						<span>
							Visible Points: {renderLayer.visiblePoints.toLocaleString()}
						</span>
					</div>
				</section>

				<section className="panel metrics-panel">
					<h2>Risk Metrics</h2>
					<ul>
						<li>
							<span>Current Mean</span>
							<strong>{formatPrice(metrics.current.meanPrice)}</strong>
						</li>
						<li>
							<span>Current P05 / P95</span>
							<strong>
								{formatPrice(metrics.current.p05Price)} /{" "}
								{formatPrice(metrics.current.p95Price)}
							</strong>
						</li>
						<li>
							<span>Expected Return</span>
							<strong>{formatPercent(metrics.final.expectedReturn)}</strong>
						</li>
						<li>
							<span>Volatility</span>
							<strong>{formatPercent(metrics.final.volatility)}</strong>
						</li>
						<li>
							<span>VaR 95%</span>
							<strong>{formatPercent(metrics.final.var95)}</strong>
						</li>
						<li>
							<span>Expected Shortfall 95%</span>
							<strong>
								{formatPercent(metrics.final.expectedShortfall95)}
							</strong>
						</li>
						<li>
							<span>Loss Probability</span>
							<strong>{formatPercent(metrics.final.lossProbability)}</strong>
						</li>
					</ul>

					<div className="progress-block">
						<div>
							<span>Progress</span>
							<strong>{formatPercent(metrics.progress)}</strong>
						</div>
						<div className="progress-track">
							<div
								className="progress-bar"
								style={{ width: `${metrics.progress * 100}%` }}
							/>
						</div>
						<p>Elapsed Model Time: {metrics.elapsedYears.toFixed(2)} years</p>
					</div>
				</section>
			</main>
		</div>
	);
}

export default App;
