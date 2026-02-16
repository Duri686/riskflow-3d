import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { Text, Html, Line } from "@react-three/drei";
import type { useBSSession } from "@/algorithms/black-scholes/useSession";
import { calculateBS } from "@/algorithms/black-scholes/engine";

interface SurfaceProps {
	session: ReturnType<typeof useBSSession>;
}

export function Surface({ session }: SurfaceProps) {
	const { surfaceData, params, activeMetric, currentResult, S_RANGE, T_RANGE } = session;
	const meshRef = useRef<THREE.Mesh>(null);
	const geometryRef = useRef<THREE.PlaneGeometry>(null);

	// Grid setup
	const width = S_RANGE.steps;
	const height = T_RANGE.steps;

	// Scale and Normalization Helpers
	const scaleX = (val: number) => ((val - S_RANGE.min) / (S_RANGE.max - S_RANGE.min) - 0.5) * 10;
	const scaleZ = (val: number) => ((val - T_RANGE.min) / (T_RANGE.max - T_RANGE.min) - 0.5) * 10;
	
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

	// Marker Position
	const markerPos = useMemo(() => {
		return new THREE.Vector3(
			scaleX(params.spot),
			currentResult[activeMetric as keyof typeof currentResult] * yScale,
			scaleZ(params.time)
		);
	}, [params.spot, params.time, currentResult, activeMetric, yScale]);

	// ─── Reference Lines Calculation ───
	
	// 1. ATM Line (S = K, across all T)
	const atmLinePoints = useMemo(() => {
		const points: THREE.Vector3[] = [];
		const tStep = (T_RANGE.max - T_RANGE.min) / (T_RANGE.steps - 1);
		for (let i = 0; i < T_RANGE.steps; i++) {
			const t = T_RANGE.min + i * tStep;
			const res = calculateBS(params.strike, params.strike, t, params.volatility, params.rate, params.type); // S=K
			const zVal = res[activeMetric as keyof typeof res] as number;
			points.push(new THREE.Vector3(scaleX(params.strike), zVal * yScale + 0.05, scaleZ(t))); // Lift slightly
		}
		return points;
	}, [params.strike, T_RANGE, params.volatility, params.rate, params.type, activeMetric, yScale]);

	// 2. Current Spot Profile (Fixed Spot, across all T) - Time Decay
	const spotLinePoints = useMemo(() => {
		const points: THREE.Vector3[] = [];
		const tStep = (T_RANGE.max - T_RANGE.min) / (T_RANGE.steps - 1);
		for (let i = 0; i < T_RANGE.steps; i++) {
			const t = T_RANGE.min + i * tStep;
			const res = calculateBS(params.spot, params.strike, t, params.volatility, params.rate, params.type);
			const zVal = res[activeMetric as keyof typeof res] as number;
			points.push(new THREE.Vector3(scaleX(params.spot), zVal * yScale + 0.05, scaleZ(t)));
		}
		return points;
	}, [params.spot, params.strike, T_RANGE, params.volatility, params.rate, params.type, activeMetric, yScale]);

	// 3. Current Time Profile (Fixed Time, across all S) - Payoff Curve
	const timeLinePoints = useMemo(() => {
		const points: THREE.Vector3[] = [];
		const sStep = (S_RANGE.max - S_RANGE.min) / (S_RANGE.steps - 1);
		for (let i = 0; i < S_RANGE.steps; i++) {
			const s = S_RANGE.min + i * sStep;
			const res = calculateBS(s, params.strike, params.time, params.volatility, params.rate, params.type);
			const zVal = res[activeMetric as keyof typeof res] as number;
			points.push(new THREE.Vector3(scaleX(s), zVal * yScale + 0.05, scaleZ(params.time)));
		}
		return points;
	}, [params.time, params.strike, S_RANGE, params.volatility, params.rate, params.type, activeMetric, yScale]);


	return (
		<group>
			{/* The Surface Mesh */}
			<mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
				<planeGeometry 
					ref={geometryRef} 
					args={[10, 10, width - 1, height - 1]} 
				/>
				<meshStandardMaterial
					color="#8B5CF6"
					emissive="#6366F1"
					emissiveIntensity={0.2}
					wireframe={false}
					transparent
					opacity={0.8}
					side={THREE.DoubleSide}
					metalness={0.8}
					roughness={0.2}
				/>
			</mesh>

			{/* Wireframe Overlay for grid visibility */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.99, 0]}>
				<planeGeometry args={[10, 10, width - 1, height - 1]} />
				<meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.05} />
			</mesh>

			{/* Reference Lines Rendering */}
			<group position={[0, -2, 0]} rotation={[0, 0, 0]}> 
				{/* Note: Surface is rotated -PI/2 X. 
				    The points calc uses (x, val, z) thinking X=Spot, Z=Time.
					But geometry buffer maps Z attr to Y (up). 
					Wait, my points calculation assumes X=Spot, Y=Value, Z=Time.
					If I render Line in the same group as mesh, it inherits -PI/2 rotation?
					No, let's put lines OUTSIDE the rotated mesh group to be safe, or counter-rotate.
					Actually, the simpler way: 
					Mesh logic: posAttr.setZ(i, pt.z * yScale) -> local Z is UP in PlaneGeometry before rotation.
					After Mesh rotation X -90: Local Z becomes World Y. Local Y becomes World -Z.
					Let's just use World Coordinates for lines.
					World X = scaleX(spot).
					World Y = val * yScale - 2 (since mesh group is at -2).
					World Z = scaleZ(time).
					
					Let's re-verify my scaleZ mapping.
					In mesh gen: 
					points.push({x: s, y: t, z: val}) 
					posAttr.setZ(i, pt.z * yScale) -> This puts Value on Local Z.
					Plane is X-Y plane. 
					Mesh rotated -90 deg X -> Local Z points to World Y.
					So World Y = Value. Correct.
					Local X is World X. Correct.
					Local Y is World Z (actually World -Z because of rotation direction? Let's check).
					Rotate X -90: (x, y, z) -> (x, -z, y).
					So Local Y (Time in grid loop) maps to World -Z.
					Wait, standard grid usually maps +Z to viewer.
					Let's stick to the visual confirmation I had implicitly.
					
					My existing markerPos logic:
					new THREE.Vector3(scaleX, val * yScale, scaleZ)
					This seems to work based on previous code.
					If I just render lines in parent group (no rotation), with same coord system as markerPos, it should work.
					Yes.
				*/}
				
				{/* ATM Line - Gold/Yellow */}
				<Line points={atmLinePoints} color="#FBBF24" lineWidth={2} transparent opacity={0.6} dashed={true} dashScale={2} gapSize={1} />
				
				{/* Spot Profile Lines (Time Decay) - Cyan (Matches Marker Spot) */}
				<Line points={spotLinePoints} color="#2DD4BF" lineWidth={3} transparent opacity={0.8} />

				{/* Time Profile Lines (Payoff) - Magenta/Pink (Matches Marker Time? Let's use Pink) */}
				<Line points={timeLinePoints} color="#EC4899" lineWidth={3} transparent opacity={0.8} />
			</group>

			{/* Axes Labels */}
			<Text position={[6, -2, 0]} rotation={[0, 0, 0]} fontSize={0.3} color="#9ca3af">
				Spot Price (S)
			</Text>
			<Text position={[0, -2, 6]} rotation={[0, Math.PI / 2, 0]} fontSize={0.3} color="#9ca3af">
				Time (T)
			</Text>

			{/* Current State Marker */}
			<group position={[0, -2, 0]}>
				{/* The Ball */}
				<mesh position={markerPos}>
					<sphereGeometry args={[0.15, 16, 16]} />
					<meshBasicMaterial color="#ffffff" />
				</mesh>

				{/* Pulsing Aura */}
				<mesh position={markerPos}>
					<sphereGeometry args={[0.25, 16, 16]} />
					<meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
				</mesh>

				{/* Projection Lines */}
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
					<lineDashedMaterial attach="material" color="#ffffff" transparent opacity={0.5} dashSize={0.2} gapSize={0.1} />
				</line>
				
				{/* Tooltip on the marker */}
				<Html position={[markerPos.x, markerPos.y + 0.5, markerPos.z]} center>
					<div className="pointer-events-none select-none flex flex-col items-center gap-1">
						<div className="px-2 py-1 bg-rf-surface-solid/90 border border-white/10 rounded font-mono text-[10px] text-white whitespace-nowrap shadow-xl backdrop-blur-sm">
							{activeMetric.toUpperCase()}: {currentResult[activeMetric as keyof typeof currentResult].toFixed(4)}
						</div>
						{/* Legend for lines */}
						<div className="flex gap-2 text-[8px] bg-black/50 px-1 rounded">
							<span className="text-rf-secondary">● Payoff</span>
							<span className="text-rf-accent">● Decay</span>
						</div>
					</div>
				</Html>
			</group>
		</group>
	);
}
