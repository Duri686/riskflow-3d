import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment, Grid } from "@react-three/drei";
import { Surface } from "@/algorithms/black-scholes/Surface";
import type { useBSSession } from "@/algorithms/black-scholes/useSession";

interface SceneProps {
	session: ReturnType<typeof useBSSession>;
	isBootstrapping?: boolean;
}

export function Scene({ session, isBootstrapping = false }: SceneProps) {
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
			{isBootstrapping ? (
				<div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[var(--color-bt-background)]/18">
					<div className="flex flex-col items-center gap-3">
						<div className="relative h-8 w-8">
							<div className="absolute inset-0 rounded-full border border-[var(--color-bt-accent)]/30" />
							<div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-r-[var(--color-bt-accent)] border-t-[var(--color-bt-accent)]" />
						</div>
						<p className="font-bt-mono text-xs text-[var(--color-bt-muted-foreground)]">
							正在计算期权曲面...
						</p>
					</div>
				</div>
			) : null}
		</div>
	);
}
