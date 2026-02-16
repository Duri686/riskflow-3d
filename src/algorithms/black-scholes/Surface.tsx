import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { Text, Html } from "@react-three/drei";
import type { useBSSession } from "@/algorithms/black-scholes/useSession";

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
			// Three.js PlaneGeometry positions are: (x, y, 0) in 2D, mapped to (z, x, y) in 3D after rotation
			// But here we set (x, y, z) and then rotate the mesh
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
					<div className="pointer-events-none select-none px-2 py-1 bg-rf-surface-solid/90 border border-white/10 rounded font-mono text-[10px] text-white whitespace-nowrap shadow-xl backdrop-blur-sm">
						{activeMetric.toUpperCase()}: {currentResult[activeMetric as keyof typeof currentResult].toFixed(4)}
					</div>
				</Html>
			</group>
		</group>
	);
}
