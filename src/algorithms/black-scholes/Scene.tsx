import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Grid } from "@react-three/drei";
import { Surface } from "@/algorithms/black-scholes/Surface";
import { useCSSVar } from "@/hooks/useCSSVar";
import type { useBSSession } from "@/algorithms/black-scholes/useSession";

interface SceneProps {
	session: ReturnType<typeof useBSSession>;
	isBootstrapping?: boolean;
}

export function Scene({ session, isBootstrapping = false }: SceneProps) {
	const backgroundColor = useCSSVar("--color-bt-background", "#0a0a0a");
	const foregroundColor = useCSSVar("--color-bt-foreground", "#fafafa");
	const borderColor = useCSSVar("--color-bt-border", "#262626");
	const accentColor = useCSSVar("--color-bt-accent", "#ff3d00");

	return (
		<div className="absolute inset-0 z-0">
			<Canvas gl={{ antialias: true, alpha: true }}>
				<color attach="background" args={[backgroundColor]} />
				<fog attach="fog" args={[backgroundColor, 8, 36]} />
				<PerspectiveCamera makeDefault position={[12, 10, 12]} fov={40} />
				<OrbitControls
					makeDefault
					enablePan={false}
					minDistance={5}
					maxDistance={30}
					maxPolarAngle={Math.PI / 2.1}
				/>

				<ambientLight intensity={0.55} />
				<pointLight position={[10, 10, 10]} intensity={1.1} color={foregroundColor} />
				<pointLight position={[-8, 6, -8]} intensity={0.4} color={accentColor} />

				<Surface session={session} />

				<Grid
					position={[0, -2, 0]}
					args={[10, 10]}
					sectionColor={accentColor}
					sectionThickness={1}
					cellColor={borderColor}
					cellThickness={0.5}
					fadeDistance={25}
					infiniteGrid
				/>
			</Canvas>
			{isBootstrapping ? (
				<div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[var(--color-bt-background)]/40">
					<div className="flex flex-col items-center gap-3 border border-[var(--color-bt-border)] bg-[var(--color-bt-card)] px-5 py-4">
						<div className="relative h-8 w-8">
							<div className="absolute inset-0 border border-[var(--color-bt-accent)]/30" />
							<div className="absolute inset-0 animate-spin border-2 border-transparent border-r-[var(--color-bt-accent)] border-t-[var(--color-bt-accent)]" />
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
