import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment, Grid } from "@react-three/drei";
import { Surface } from "@/algorithms/black-scholes/Surface";
import type { useBSSession } from "@/algorithms/black-scholes/useSession";

interface SceneProps {
	session: ReturnType<typeof useBSSession>;
}

export function Scene({ session }: SceneProps) {
	return (
		<div className="absolute inset-0 z-0">
			<Canvas shadows gl={{ antialias: true, alpha: true }}>
				<PerspectiveCamera makeDefault position={[12, 10, 12]} fov={40} />
				<OrbitControls 
					makeDefault 
					enablePan={false}
					minDistance={5}
					maxDistance={30}
					maxPolarAngle={Math.PI / 2.1} 
				/>

				{/* Lighting */}
				<ambientLight intensity={0.5} />
				<pointLight position={[10, 10, 10]} intensity={1.5} castShadow />
				<spotLight position={[-10, 10, -10]} angle={0.15} penumbra={1} intensity={1} />
				
				<Environment preset="city" />

				{/* The Core Visualization */}
				<Surface session={session} />

				{/* Ground Grid for context */}
				<Grid
					position={[0, -2, 0]}
					args={[10, 10]}
					sectionColor="#8B5CF6"
					sectionThickness={1.5}
					cellColor="#6366F1"
					cellThickness={0.5}
					fadeDistance={25}
					infiniteGrid
				/>
			</Canvas>
		</div>
	);
}
