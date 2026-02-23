import { Canvas } from "@react-three/fiber";
import {
	Billboard,
	Grid,
	Line,
	OrbitControls,
	PerspectiveCamera,
	Text,
} from "@react-three/drei";
import type { MarkowitzRenderLayer } from "@/algorithms/markowitz/engine";
import { useCSSVar } from "@/hooks/useCSSVar";

interface SceneProps {
	layer: MarkowitzRenderLayer;
}

function FacingText({
	position,
	color,
	children,
	fontSize = 0.32,
	anchorX = "center",
	anchorY = "middle",
}: {
	position: [number, number, number];
	color: string;
	children: string;
	fontSize?: number;
	anchorX?: "left" | "center" | "right";
	anchorY?: "top" | "middle" | "bottom";
}) {
	return (
		<Billboard follow position={position}>
			<Text fontSize={fontSize} color={color} anchorX={anchorX} anchorY={anchorY}>
				{children}
			</Text>
		</Billboard>
	);
}

function PortfolioCloud({ layer }: { layer: MarkowitzRenderLayer }) {
	return (
		<points frustumCulled={false}>
			<bufferGeometry>
				<bufferAttribute attach="attributes-position" args={[layer.positions, 3]} />
				<bufferAttribute attach="attributes-color" args={[layer.colors, 3]} />
			</bufferGeometry>
			<pointsMaterial
				size={0.11}
				sizeAttenuation
				vertexColors
				transparent
				opacity={0.82}
			/>
		</points>
	);
}

function PointMarker({
	position,
	color,
	label,
}: {
	position: [number, number, number];
	color: string;
	label: string;
}) {
	return (
		<group position={position}>
			<mesh>
				<sphereGeometry args={[0.22, 24, 24]} />
				<meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
			</mesh>
			<FacingText position={[0, 0.55, 0]} fontSize={0.28} color={color}>
				{label}
			</FacingText>
		</group>
	);
}

function AxisGuide({ axisColor }: { axisColor: string }) {
	return (
		<group>
			<Line points={[[-9, -2.5, -8], [9, -2.5, -8]]} color={axisColor} lineWidth={1} />
			<Line points={[[-9, -2.5, -8], [-9, 6.5, -8]]} color={axisColor} lineWidth={1} />
			<Line points={[[-9, -2.5, -8], [-9, -2.5, 8]]} color={axisColor} lineWidth={1} />

			<FacingText position={[9.4, -2.5, -8]} fontSize={0.32} color={axisColor} anchorX="left">
				波动率
			</FacingText>
			<FacingText
				position={[-9, 6.95, -8]}
				fontSize={0.32}
				color={axisColor}
				anchorY="bottom"
			>
				夏普比率
			</FacingText>
			<FacingText position={[-9, -2.5, 8.6]} fontSize={0.32} color={axisColor}>
				预期收益率
			</FacingText>
		</group>
	);
}

export function Scene({ layer }: SceneProps) {
	const backgroundColor = useCSSVar("--color-bt-background", "#0a0a0a");
	const accentColor = useCSSVar("--color-bt-accent", "#ff3d00");
	const borderColor = useCSSVar("--color-bt-border", "#262626");
	const axisColor = useCSSVar("--color-bt-muted-foreground", "#737373");
	const successColor = useCSSVar("--color-bt-success", "#00d4aa");
	const warningColor = useCSSVar("--color-bt-warning", "#ffb74d");
	const foregroundColor = useCSSVar("--color-bt-foreground", "#fafafa");

	return (
		<div className="absolute inset-0 z-0">
			<Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
				<color attach="background" args={[backgroundColor]} />
				<fog attach="fog" args={[backgroundColor, 10, 36]} />
				<PerspectiveCamera makeDefault position={[14, 12, 14]} fov={42} />
				<OrbitControls
					makeDefault
					enablePan={false}
					minDistance={9}
					maxDistance={32}
					maxPolarAngle={Math.PI / 2.05}
				/>

				<ambientLight intensity={0.62} />
				<pointLight position={[12, 14, 8]} intensity={1.1} color={foregroundColor} />
				<pointLight position={[-10, 7, -8]} intensity={0.4} color={accentColor} />

				<AxisGuide axisColor={axisColor} />
				<PortfolioCloud layer={layer} />

				{layer.frontierLine.length > 1 ? (
					<Line
						points={layer.frontierLine}
						color={accentColor}
						lineWidth={2.4}
						transparent
						opacity={0.95}
					/>
				) : null}

				<PointMarker position={layer.minVariancePoint} color={successColor} label="最小方差" />
				<PointMarker position={layer.maxSharpePoint} color={warningColor} label="最大夏普" />
				<PointMarker position={layer.currentPoint} color={foregroundColor} label="当前组合" />

				<Grid
					position={[0, -2.8, 0]}
					args={[22, 22]}
					sectionColor={accentColor}
					sectionThickness={1}
					cellColor={borderColor}
					cellThickness={0.45}
					fadeDistance={28}
					infiniteGrid
				/>
			</Canvas>
		</div>
	);
}
