import { Canvas } from "@react-three/fiber"
import {
  Billboard,
  Grid,
  Line,
  OrbitControls,
  PerspectiveCamera,
  Text,
} from "@react-three/drei"
import type { MarkowitzRenderLayer } from "./engine"

interface SceneProps {
  layer: MarkowitzRenderLayer
}

function FacingText({
  position,
  color,
  children,
  fontSize = 0.32,
  anchorX = "center",
  anchorY = "middle",
}: {
  position: [number, number, number]
  color: string
  children: string
  fontSize?: number
  anchorX?: "left" | "center" | "right"
  anchorY?: "top" | "middle" | "bottom"
}) {
  return (
    <Billboard follow position={position}>
      <Text fontSize={fontSize} color={color} anchorX={anchorX} anchorY={anchorY}>
        {children}
      </Text>
    </Billboard>
  )
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
  )
}

function PointMarker({
  position,
  color,
  label,
}: {
  position: [number, number, number]
  color: string
  label: string
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      <FacingText
        position={[0, 0.55, 0]}
        fontSize={0.28}
        color={color}
      >
        {label}
      </FacingText>
    </group>
  )
}

function AxisGuide() {
  return (
    <group>
      <Line points={[[-9, -2.5, -8], [9, -2.5, -8]]} color="#6b7280" lineWidth={1} />
      <Line points={[[-9, -2.5, -8], [-9, 6.5, -8]]} color="#6b7280" lineWidth={1} />
      <Line points={[[-9, -2.5, -8], [-9, -2.5, 8]]} color="#6b7280" lineWidth={1} />

      <FacingText
        position={[9.4, -2.5, -8]}
        fontSize={0.32}
        color="#9ca3af"
        anchorX="left"
      >
        波动率
      </FacingText>
      <FacingText
        position={[-9, 6.95, -8]}
        fontSize={0.32}
        color="#9ca3af"
        anchorY="bottom"
      >
        夏普比率
      </FacingText>
      <FacingText
        position={[-9, -2.5, 8.6]}
        fontSize={0.32}
        color="#9ca3af"
      >
        预期收益率
      </FacingText>
    </group>
  )
}

export function Scene({ layer }: SceneProps) {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <PerspectiveCamera makeDefault position={[14, 12, 14]} fov={42} />
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={9}
          maxDistance={32}
          maxPolarAngle={Math.PI / 2.05}
        />

        <ambientLight intensity={0.62} />
        <pointLight position={[12, 14, 8]} intensity={1.1} />
        <pointLight position={[-10, 7, -8]} intensity={0.55} color="#00bfa5" />

        <AxisGuide />
        <PortfolioCloud layer={layer} />

        {layer.frontierLine.length > 1 && (
          <Line
            points={layer.frontierLine}
            color="#7c4dff"
            lineWidth={2.5}
            transparent
            opacity={0.95}
          />
        )}

        <PointMarker position={layer.minVariancePoint} color="#00bfa5" label="最小方差" />
        <PointMarker position={layer.maxSharpePoint} color="#ffb224" label="最大夏普" />
        <PointMarker position={layer.currentPoint} color="#ffffff" label="当前组合" />

        <Grid
          position={[0, -2.8, 0]}
          args={[22, 22]}
          sectionColor="#7c4dff"
          sectionThickness={1.1}
          cellColor="#2a2d3a"
          cellThickness={0.5}
          fadeDistance={28}
          infiniteGrid
        />
      </Canvas>
    </div>
  )
}
