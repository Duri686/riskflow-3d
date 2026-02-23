import { useRef, useMemo, useEffect, useCallback } from "react";
import * as THREE from "three";
import { Text, Html, Line } from "@react-three/drei";
import type { useBSSession } from "@/algorithms/black-scholes/useSession";
import { calculateBS } from "@/algorithms/black-scholes/engine";
import { useCSSVar } from "@/hooks/useCSSVar";

interface SurfaceProps {
	session: ReturnType<typeof useBSSession>;
}

const METRIC_SCALE: Record<string, number> = {
	price: 0.05,
	delta: 5,
	gamma: 50,
	vega: 0.2,
	theta: 5,
	rho: 2,
};

export function Surface({ session }: SurfaceProps) {
	const { surfaceData, params, activeMetric, currentResult, S_RANGE, T_RANGE } = session;
	const geometryRef = useRef<THREE.PlaneGeometry>(null);

	const textMutedColor = useCSSVar("--color-bt-muted-foreground", "#737373");
	const accentColor = useCSSVar("--color-bt-accent", "#ff3d00");
	const warningColor = useCSSVar("--color-bt-warning", "#ffb74d");
	const successColor = useCSSVar("--color-bt-success", "#00d4aa");
	const dangerColor = useCSSVar("--color-bt-danger", "#ff4757");
	const foregroundColor = useCSSVar("--color-bt-foreground", "#fafafa");
	const borderColor = useCSSVar("--color-bt-border", "#262626");

	const width = S_RANGE.steps;
	const height = T_RANGE.steps;

	const scaleX = useCallback(
		(value: number) => ((value - S_RANGE.min) / (S_RANGE.max - S_RANGE.min) - 0.5) * 10,
		[S_RANGE],
	);
	const scaleZ = useCallback(
		(value: number) => ((value - T_RANGE.min) / (T_RANGE.max - T_RANGE.min) - 0.5) * 10,
		[T_RANGE],
	);
	const yScale = METRIC_SCALE[activeMetric] ?? METRIC_SCALE.price;

	useEffect(() => {
		if (!geometryRef.current) return;
		const positionAttr = geometryRef.current.attributes.position;
		for (let index = 0; index < surfaceData.length; index += 1) {
			positionAttr.setZ(index, surfaceData[index].z * yScale);
		}
		positionAttr.needsUpdate = true;
		geometryRef.current.computeVertexNormals();
	}, [surfaceData, yScale]);

	const markerPos = useMemo(
		() =>
			new THREE.Vector3(
				scaleX(params.spot),
				currentResult[activeMetric as keyof typeof currentResult] * yScale + 0.08,
				scaleZ(params.time),
			),
		[params.spot, params.time, currentResult, activeMetric, yScale, scaleX, scaleZ],
	);

	const createLinePoints = useCallback(
		(
			length: number,
			builder: (index: number) => { s: number; t: number; value: number },
		): THREE.Vector3[] => {
			const points: THREE.Vector3[] = [];
			for (let index = 0; index < length; index += 1) {
				const { s, t, value } = builder(index);
				points.push(new THREE.Vector3(scaleX(s), value * yScale + 0.08, scaleZ(t)));
			}
			return points;
		},
		[scaleX, scaleZ, yScale],
	);

	const atmLinePoints = useMemo(() => {
		const step = (T_RANGE.max - T_RANGE.min) / (T_RANGE.steps - 1);
		return createLinePoints(T_RANGE.steps, (index) => {
			const time = T_RANGE.min + index * step;
			const res = calculateBS(
				params.strike,
				params.strike,
				time,
				params.volatility,
				params.rate,
				params.type,
			);
			return { s: params.strike, t: time, value: res[activeMetric as keyof typeof res] as number };
		});
	}, [T_RANGE, createLinePoints, params, activeMetric]);

	const spotLinePoints = useMemo(() => {
		const step = (T_RANGE.max - T_RANGE.min) / (T_RANGE.steps - 1);
		return createLinePoints(T_RANGE.steps, (index) => {
			const time = T_RANGE.min + index * step;
			const res = calculateBS(
				params.spot,
				params.strike,
				time,
				params.volatility,
				params.rate,
				params.type,
			);
			return { s: params.spot, t: time, value: res[activeMetric as keyof typeof res] as number };
		});
	}, [T_RANGE, createLinePoints, params, activeMetric]);

	const timeLinePoints = useMemo(() => {
		const step = (S_RANGE.max - S_RANGE.min) / (S_RANGE.steps - 1);
		return createLinePoints(S_RANGE.steps, (index) => {
			const spot = S_RANGE.min + index * step;
			const res = calculateBS(
				spot,
				params.strike,
				params.time,
				params.volatility,
				params.rate,
				params.type,
			);
			return { s: spot, t: params.time, value: res[activeMetric as keyof typeof res] as number };
		});
	}, [S_RANGE, createLinePoints, params, activeMetric]);

	return (
		<group>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
				<planeGeometry ref={geometryRef} args={[10, 10, width - 1, height - 1]} />
				<meshStandardMaterial
					color={accentColor}
					emissive={accentColor}
					emissiveIntensity={0.12}
					transparent
					opacity={0.9}
					side={THREE.DoubleSide}
					metalness={0.35}
					roughness={0.7}
				/>
			</mesh>

			<group position={[0, -2, 0]}>
				<SideWalls
					surfaceData={surfaceData}
					width={width}
					height={height}
					scaleX={scaleX}
					scaleZ={scaleZ}
					yScale={yScale}
				/>
			</group>

			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.99, 0]}>
				<planeGeometry args={[10, 10, width - 1, height - 1]} />
				<meshBasicMaterial color={foregroundColor} wireframe transparent opacity={0.05} />
			</mesh>

			<group position={[0, -2, 0]}>
				<Line points={atmLinePoints} color={warningColor} lineWidth={2} transparent opacity={0.6} dashed dashScale={2} gapSize={1} />
				<Line points={spotLinePoints} color={successColor} lineWidth={3} transparent opacity={0.82} />
				<Line points={timeLinePoints} color={dangerColor} lineWidth={3} transparent opacity={0.82} />
			</group>

			<Text position={[6, -2, 0]} fontSize={0.3} color={textMutedColor}>
				Spot Price (S)
			</Text>
			<Text position={[0, -2, 6]} rotation={[0, Math.PI / 2, 0]} fontSize={0.3} color={textMutedColor}>
				Time (T)
			</Text>

			<group position={[0, -2, 0]}>
				<mesh position={markerPos}>
					<sphereGeometry args={[0.2, 24, 24]} />
					<meshStandardMaterial color={foregroundColor} emissive={foregroundColor} emissiveIntensity={0.4} />
				</mesh>
				<mesh position={markerPos}>
					<sphereGeometry args={[0.35, 24, 24]} />
					<meshBasicMaterial color={foregroundColor} transparent opacity={0.18} depthWrite={false} />
				</mesh>

				<line>
					<bufferGeometry attach="geometry">
						<float32BufferAttribute
							attach="attributes-position"
							count={2}
							array={new Float32Array([
								markerPos.x,
								markerPos.y,
								markerPos.z,
								markerPos.x,
								0,
								markerPos.z,
							])}
							itemSize={3}
							args={[
								new Float32Array([
									markerPos.x,
									markerPos.y,
									markerPos.z,
									markerPos.x,
									0,
									markerPos.z,
								]),
								3,
							]}
						/>
					</bufferGeometry>
					<lineDashedMaterial attach="material" color={foregroundColor} transparent opacity={0.3} dashSize={0.2} gapSize={0.1} />
				</line>

				<Html position={[markerPos.x, markerPos.y + 0.5, markerPos.z]} center zIndexRange={[100, 0]}>
					<div
						className="pointer-events-none select-none border px-3 py-1.5 font-bt-mono text-xs text-[var(--color-bt-foreground)]"
						style={{ background: "var(--color-bt-overlay)", borderColor }}
					>
						<span className="font-semibold text-[var(--color-bt-accent)]">{activeMetric.toUpperCase()}</span>: {" "}
						<span>{currentResult[activeMetric as keyof typeof currentResult].toFixed(4)}</span>
					</div>
				</Html>
			</group>
		</group>
	);
}

function SideWalls({
	surfaceData,
	width,
	height,
	scaleX,
	scaleZ,
	yScale,
}: {
	surfaceData: { x: number; y: number; z: number }[];
	width: number;
	height: number;
	scaleX: (value: number) => number;
	scaleZ: (value: number) => number;
	yScale: number;
}) {
	const geometry = useMemo(() => {
		const meshGeometry = new THREE.BufferGeometry();
		const vertices: number[] = [];

		const addQuad = (p1: THREE.Vector3, p2: THREE.Vector3) => {
			const p3 = new THREE.Vector3(p1.x, 0, p1.z);
			const p4 = new THREE.Vector3(p2.x, 0, p2.z);
			vertices.push(
				p1.x,
				p1.y,
				p1.z,
				p3.x,
				p3.y,
				p3.z,
				p2.x,
				p2.y,
				p2.z,
				p2.x,
				p2.y,
				p2.z,
				p3.x,
				p3.y,
				p3.z,
				p4.x,
				p4.y,
				p4.z,
			);
		};

		for (let index = 0; index < width - 1; index += 1) {
			const p1 = surfaceData[index];
			const p2 = surfaceData[index + 1];
			addQuad(
				new THREE.Vector3(scaleX(p1.x), p1.z * yScale, scaleZ(p1.y)),
				new THREE.Vector3(scaleX(p2.x), p2.z * yScale, scaleZ(p2.y)),
			);
		}

		const topOffset = (height - 1) * width;
		for (let index = 0; index < width - 1; index += 1) {
			const p1 = surfaceData[topOffset + index];
			const p2 = surfaceData[topOffset + index + 1];
			addQuad(
				new THREE.Vector3(scaleX(p2.x), p2.z * yScale, scaleZ(p2.y)),
				new THREE.Vector3(scaleX(p1.x), p1.z * yScale, scaleZ(p1.y)),
			);
		}

		for (let index = 0; index < height - 1; index += 1) {
			const p1 = surfaceData[index * width];
			const p2 = surfaceData[(index + 1) * width];
			addQuad(
				new THREE.Vector3(scaleX(p2.x), p2.z * yScale, scaleZ(p2.y)),
				new THREE.Vector3(scaleX(p1.x), p1.z * yScale, scaleZ(p1.y)),
			);
		}

		for (let index = 0; index < height - 1; index += 1) {
			const p1 = surfaceData[index * width + width - 1];
			const p2 = surfaceData[(index + 1) * width + width - 1];
			addQuad(
				new THREE.Vector3(scaleX(p1.x), p1.z * yScale, scaleZ(p1.y)),
				new THREE.Vector3(scaleX(p2.x), p2.z * yScale, scaleZ(p2.y)),
			);
		}

		meshGeometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
		meshGeometry.computeVertexNormals();
		return meshGeometry;
	}, [surfaceData, width, height, scaleX, scaleZ, yScale]);

	const accentColor = useCSSVar("--color-bt-accent", "#ff3d00");

	return (
		<mesh geometry={geometry}>
			<meshStandardMaterial
				color={accentColor}
				transparent
				opacity={0.32}
				side={THREE.DoubleSide}
				flatShading
				roughness={0.85}
			/>
		</mesh>
	);
}
