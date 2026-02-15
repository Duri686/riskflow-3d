import { Grid, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { BufferGeometry } from 'three'
import type { MonteCarloRenderLayer } from '../algorithms/monteCarlo'

interface PathCloudSceneProps {
  layer: MonteCarloRenderLayer
}

function PathCloudPoints({ layer }: PathCloudSceneProps) {
  const geometryRef = useRef<BufferGeometry | null>(null)

  useEffect(() => {
    geometryRef.current?.setDrawRange(0, layer.visiblePoints)
  }, [layer.visiblePoints])

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[layer.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[layer.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.08} sizeAttenuation vertexColors transparent opacity={0.95} />
    </points>
  )
}

export function PathCloudScene({ layer }: PathCloudSceneProps) {
  return (
    <Canvas camera={{ position: [18, 12, 18], fov: 50 }} dpr={[1, 2]}>
      <color attach="background" args={['#02050f']} />
      <fog attach="fog" args={['#02050f', 16, 48]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 12, 5]} intensity={1.1} color="#d8f0ff" />
      <directionalLight position={[-8, 6, -10]} intensity={0.5} color="#7ba2d3" />

      <Grid
        position={[0, -7.5, 0]}
        args={[30, 18]}
        cellColor="#22384d"
        sectionColor="#3d6d8f"
        fadeDistance={40}
        fadeStrength={1.4}
        cellThickness={0.4}
        sectionThickness={0.9}
        infiniteGrid={false}
      />

      <PathCloudPoints layer={layer} />
      <OrbitControls enablePan enableZoom enableRotate maxDistance={60} minDistance={8} />
    </Canvas>
  )
}
