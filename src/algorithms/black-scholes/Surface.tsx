import { useRef, useMemo, useEffect, useCallback } from "react";
import * as THREE from "three";
import { Text, Html, Line } from "@react-three/drei";
import type { useBSSession } from "@/algorithms/black-scholes/useSession";
import { calculateBS } from "@/algorithms/black-scholes/engine";
import { useCSSVar } from "@/hooks/useCSSVar";

interface SurfaceProps {
	session: ReturnType<typeof useBSSession>;
}

export function Surface({ session }: SurfaceProps) {
	const { surfaceData, params, activeMetric, currentResult, S_RANGE, T_RANGE } = session;
	const meshRef = useRef<THREE.Mesh>(null);
	const geometryRef = useRef<THREE.PlaneGeometry>(null);

    // Resolve CSS variables for 3D scene
	const textMutedColor = useCSSVar('--color-bt-muted-foreground', '#737373');
	const primaryColor = useCSSVar('--color-bt-accent', '#ff3d00');
	const wipColor = useCSSVar('--color-bt-warning', '#ffb74d');
	const chart2Color = useCSSVar('--color-bt-success', '#00d4aa');
	const chart3Color = useCSSVar('--color-bt-danger', '#ff4757');
	const foregroundColor = useCSSVar('--color-bt-foreground', '#fafafa');
	const borderColor = useCSSVar('--color-bt-border', '#262626');

	// Grid setup
	const width = S_RANGE.steps;
	const height = T_RANGE.steps;

	// Scale and Normalization Helpers
	const scaleX = useCallback((val: number) => ((val - S_RANGE.min) / (S_RANGE.max - S_RANGE.min) - 0.5) * 10, [S_RANGE]);
	const scaleZ = useCallback((val: number) => ((val - T_RANGE.min) / (T_RANGE.max - T_RANGE.min) - 0.5) * 10, [T_RANGE]);
	
	// Y scale depends on metric
	const getYScale = (metric: string) => {
		switch (metric) {
			case "gamma": return 50;
			case "vega": return 0.2;
			case "theta": return 5;
			case "rho": return 2;
			case "delta": return 5;
			default: return 0.05; // Price
		}
	};
	
	const yScale = getYScale(activeMetric);

	// Update geometry positions when surfaceData changes
	useEffect(() => {
		if (!geometryRef.current) return;
		const posAttr = geometryRef.current.attributes.position;
		
		for (let i = 0; i < surfaceData.length; i++) {
			const pt = surfaceData[i];
			posAttr.setZ(i, pt.z * yScale);
		}
		posAttr.needsUpdate = true;
		geometryRef.current.computeVertexNormals();
	}, [surfaceData, yScale]);

	// Marker Position with slight lift
	const markerPos = useMemo(() => {
		return new THREE.Vector3(
			scaleX(params.spot),
			currentResult[activeMetric as keyof typeof currentResult] * yScale + 0.1, // Lift marker slightly more
			scaleZ(params.time)
		);
	}, [params.spot, params.time, currentResult, activeMetric, yScale, scaleX, scaleZ]);

	// ─── Reference Lines Calculation ───
	
	// 1. ATM Line (S = K, across all T)
	const atmLinePoints = useMemo(() => {
		const points: THREE.Vector3[] = [];
		const tStep = (T_RANGE.max - T_RANGE.min) / (T_RANGE.steps - 1);
		for (let i = 0; i < T_RANGE.steps; i++) {
			const t = T_RANGE.min + i * tStep;
			const res = calculateBS(params.strike, params.strike, t, params.volatility, params.rate, params.type); // S=K
			const zVal = res[activeMetric as keyof typeof res] as number;
			points.push(new THREE.Vector3(scaleX(params.strike), zVal * yScale + 0.08, scaleZ(t))); // Distinct lift
		}
		return points;
	}, [params.strike, T_RANGE, params.volatility, params.rate, params.type, activeMetric, yScale, scaleX, scaleZ]);

	// 2. Current Spot Profile (Fixed Spot, across all T) - Time Decay
	const spotLinePoints = useMemo(() => {
		const points: THREE.Vector3[] = [];
		const tStep = (T_RANGE.max - T_RANGE.min) / (T_RANGE.steps - 1);
		for (let i = 0; i < T_RANGE.steps; i++) {
			const t = T_RANGE.min + i * tStep;
			const res = calculateBS(params.spot, params.strike, t, params.volatility, params.rate, params.type);
			const zVal = res[activeMetric as keyof typeof res] as number;
			points.push(new THREE.Vector3(scaleX(params.spot), zVal * yScale + 0.08, scaleZ(t)));
		}
		return points;
	}, [params.spot, params.strike, T_RANGE, params.volatility, params.rate, params.type, activeMetric, yScale, scaleX, scaleZ]);

	// 3. Current Time Profile (Fixed Time, across all S) - Payoff Curve
	const timeLinePoints = useMemo(() => {
		const points: THREE.Vector3[] = [];
		const sStep = (S_RANGE.max - S_RANGE.min) / (S_RANGE.steps - 1);
		for (let i = 0; i < S_RANGE.steps; i++) {
			const s = S_RANGE.min + i * sStep;
			const res = calculateBS(s, params.strike, params.time, params.volatility, params.rate, params.type);
			const zVal = res[activeMetric as keyof typeof res] as number;
			points.push(new THREE.Vector3(scaleX(s), zVal * yScale + 0.08, scaleZ(params.time)));
		}
		return points;
	}, [params.time, params.strike, S_RANGE, params.volatility, params.rate, params.type, activeMetric, yScale, scaleX, scaleZ]);


	return (
		<group>
			{/* The Surface Mesh */}
			<mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
				<planeGeometry 
					ref={geometryRef} 
					args={[10, 10, width - 1, height - 1]} 
				/>
				<meshStandardMaterial
					color={primaryColor}
					emissive={primaryColor}
					emissiveIntensity={0.2}
					wireframe={false}
					transparent
					opacity={0.9}
					side={THREE.DoubleSide}
					metalness={0.6}
					roughness={0.4}
				/>
			</mesh>

			{/* Side Walls (Curtains) to create solid block effect */}
			<group position={[0, -2, 0]} rotation={[0, 0, 0]}>
				<SideWalls 
					surfaceData={surfaceData} 
					width={width} 
					height={height} 
					scaleX={scaleX} 
					scaleZ={scaleZ} 
					yScale={yScale} 
				/>
			</group>

			{/* Wireframe Overlay - Subtle */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.99, 0]}>
				<planeGeometry args={[10, 10, width - 1, height - 1]} />
				<meshBasicMaterial color={foregroundColor} wireframe transparent opacity={0.05} />
			</mesh>

			{/* Reference Lines Rendering */}
			<group position={[0, -2, 0]} rotation={[0, 0, 0]}> 
				{/* ATM Line - Gold/Yellow */}
				<Line points={atmLinePoints} color={wipColor} lineWidth={2} transparent opacity={0.6} dashed={true} dashScale={2} gapSize={1} />
				
				{/* Spot Profile Lines (Time Decay) - Cyan */}
				<Line points={spotLinePoints} color={chart2Color} lineWidth={3} transparent opacity={0.8} />

				{/* Time Profile Lines (Payoff) - Magenta */}
				<Line points={timeLinePoints} color={chart3Color} lineWidth={3} transparent opacity={0.8} />
			</group>

			{/* Axes Labels */}
			<Text position={[6, -2, 0]} rotation={[0, 0, 0]} fontSize={0.3} color={textMutedColor}>
				Spot Price (S)
			</Text>
			<Text position={[0, -2, 6]} rotation={[0, Math.PI / 2, 0]} fontSize={0.3} color={textMutedColor}>
				Time (T)
			</Text>

			{/* Current State Marker */}
			<group position={[0, -2, 0]}>
				{/* The Ball - Lifted logic applied in markerPos */}
				<mesh position={markerPos}>
					<sphereGeometry args={[0.2, 32, 32]} />
					<meshStandardMaterial color={foregroundColor} emissive={foregroundColor} emissiveIntensity={0.5} />
				</mesh>

				{/* Pulsing Aura */}
				<mesh position={markerPos}>
					<sphereGeometry args={[0.35, 32, 32]} />
					<meshBasicMaterial color={foregroundColor} transparent opacity={0.2} depthWrite={false} />
				</mesh>

				{/* Projection Lines - Dropping to floor (-2 relative to world 0, but marker is relative to group at -2)
					Wait, Group is at [0, -2, 0].
					markerPos.y is calculated as value * yScale.
					If surface is at 0 (local), marker is at 0.
					We want projection line to go to local 0 (which is base of visualization).
					Currently code says: vector(x, y, z) to vector(x, 0, z).
					This is correct if 0 is the floor of the local group.
				*/}
				<line>
					<bufferGeometry attach="geometry">
						<float32BufferAttribute
							attach="attributes-position"
							count={2}
							array={new Float32Array([
								markerPos.x, markerPos.y, markerPos.z,
								markerPos.x, 0, markerPos.z
							])}
							itemSize={3}
							args={[new Float32Array([
								markerPos.x, markerPos.y, markerPos.z,
								markerPos.x, 0, markerPos.z
							]), 3]}
						/>
					</bufferGeometry>
					<lineDashedMaterial attach="material" color={foregroundColor} transparent opacity={0.3} dashSize={0.2} gapSize={0.1} />
				</line>
				
				{/* Tooltip on the marker - Simplified */}
				<Html position={[markerPos.x, markerPos.y + 0.5, markerPos.z]} center zIndexRange={[100, 0]}>
					<div className="pointer-events-none select-none border px-3 py-1.5 font-bt-mono text-xs text-[var(--color-bt-foreground)] shadow-xl backdrop-blur-md" style={{ background: "var(--color-bt-overlay)", borderColor }}>
						<span className="font-semibold text-[var(--color-bt-accent)]">{activeMetric.toUpperCase()}</span>: <span>{currentResult[activeMetric as keyof typeof currentResult].toFixed(4)}</span>
					</div>
				</Html>
			</group>
		</group>
	);
}

// ─── Helper Component for Side Walls ───
function SideWalls({ 
	surfaceData, width, height, scaleX, scaleZ, yScale 
}: { 
	surfaceData: { x: number; y: number; z: number }[]; 
	width: number; 
	height: number; 
	scaleX: (v: number) => number; 
	scaleZ: (v: number) => number;
	yScale: number;
}) {
	const geometry = useMemo(() => {
		const geo = new THREE.BufferGeometry();
		const vertices: number[] = [];

		const addQuad = (p1: THREE.Vector3, p2: THREE.Vector3) => {
			// p1, p2 are top points. p3, p4 are bottom points (y=0).
			// We build 2 triangles: (p1, p3, p2) and (p2, p3, p4) wrong order?
			// Counter-clockwise usually.
			// Top-Left: p1, Top-Right: p2, Bottom-Left: p3(p1.x, 0, p1.z), Bottom-Right: p4(p2.x, 0, p2.z)
			
			const p3 = new THREE.Vector3(p1.x, 0, p1.z);
			const p4 = new THREE.Vector3(p2.x, 0, p2.z);

			// Triangle 1: p1 -> p3 -> p2
			vertices.push(p1.x, p1.y, p1.z); // 0
			vertices.push(p3.x, p3.y, p3.z); // 1
			vertices.push(p2.x, p2.y, p2.z); // 2
			
			// Triangle 2: p2 -> p3 -> p4
			vertices.push(p2.x, p2.y, p2.z); // 3 (same as 2)
			vertices.push(p3.x, p3.y, p3.z); // 4 (same as 1)
			vertices.push(p4.x, p4.y, p4.z); // 5

			// No indices if we push vertices directly for separate triangles (easy for flat shading)
			// Efficient way: indexed. But flat list is easier to debug. 
			// Actually let's just push 6 vertices per segment.
		};
		
		// 1. Bottom Edge (Low T, iterate S: 0 -> width-1)
		for (let i = 0; i < width - 1; i++) {
			const pt1 = surfaceData[i];
			const pt2 = surfaceData[i + 1];
			const v1 = new THREE.Vector3(scaleX(pt1.x), pt1.z * yScale, scaleZ(pt1.y));
			const v2 = new THREE.Vector3(scaleX(pt2.x), pt2.z * yScale, scaleZ(pt2.y));
			addQuad(v1, v2);
		}

		// 2. Top Edge (High T, iterate S: (height-1)*width -> end)
		const offset = (height - 1) * width;
		for (let i = 0; i < width - 1; i++) {
			const pt1 = surfaceData[offset + i];
			const pt2 = surfaceData[offset + i + 1];
			// Order: v2 -> v1 to face outward? High T is "back".
			const v1 = new THREE.Vector3(scaleX(pt1.x), pt1.z * yScale, scaleZ(pt1.y));
			const v2 = new THREE.Vector3(scaleX(pt2.x), pt2.z * yScale, scaleZ(pt2.y));
			addQuad(v2, v1); // Reverse for back face? Or rely on DoubleSide
		}

		// 3. Left Edge (Low S, iterate T: 0 -> height-1, stride width)
		for (let j = 0; j < height - 1; j++) {
			const pt1 = surfaceData[j * width];
			const pt2 = surfaceData[(j + 1) * width];
			const v1 = new THREE.Vector3(scaleX(pt1.x), pt1.z * yScale, scaleZ(pt1.y));
			const v2 = new THREE.Vector3(scaleX(pt2.x), pt2.z * yScale, scaleZ(pt2.y));
			addQuad(v2, v1); // Left side facing out?
		}

		// 4. Right Edge (High S, iterate T: width-1 -> stride width)
		for (let j = 0; j < height - 1; j++) {
			const pt1 = surfaceData[j * width + width - 1];
			const pt2 = surfaceData[(j + 1) * width + width - 1];
			const v1 = new THREE.Vector3(scaleX(pt1.x), pt1.z * yScale, scaleZ(pt1.y));
			const v2 = new THREE.Vector3(scaleX(pt2.x), pt2.z * yScale, scaleZ(pt2.y));
			addQuad(v1, v2);
		}
		
		geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
		geo.computeVertexNormals();
		return geo;
	}, [surfaceData, width, height, scaleX, scaleZ, yScale]);

	// Resolve color for side walls
	const accentPurpleColor = useCSSVar('--color-bt-accent', '#ff3d00');

	return (
		<mesh geometry={geometry}>
			<meshStandardMaterial 
				color={accentPurpleColor} 
				transparent 
				opacity={0.4} 
				side={THREE.DoubleSide} 
				flatShading
				roughness={0.8}
			/>
		</mesh>
	);
}
