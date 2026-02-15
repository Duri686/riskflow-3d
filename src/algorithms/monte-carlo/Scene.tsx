import { Grid, OrbitControls, Text, Line } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useMemo } from 'react'
import type { BufferGeometry } from 'three'
import type { MonteCarloRenderLayer } from './engine'

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
      <pointsMaterial size={0.1} sizeAttenuation vertexColors transparent opacity={0.9} />
    </points>
  )
}

function AxisLabels() {
  const timeLabels = useMemo(() => ['T=0', '25%', '50%', '75%', '100%'], [])
  const priceLabels = useMemo(() => ['+50%', '+25%', 'S0', '-25%', '-50%'], [])

  return (
    <group>
      {/* 时间轴标签 (X轴) */}
      {timeLabels.map((label, i) => (
        <Text
          key={`time-${i}`}
          position={[-13 + i * 6.5, -8, 9]}
          fontSize={0.6}
          color="#6B7280"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      ))}
      <Text position={[0, -8.5, 12]} fontSize={0.7} color="#9CA3AF" anchorX="center">
        TIME
      </Text>

      {/* 价格轴标签 (Y轴) */}
      {priceLabels.map((label, i) => (
        <Text
          key={`price-${i}`}
          position={[-15, 7 - i * 3.5, 0]}
          fontSize={0.5}
          color={i < 2 ? '#22D3EE' : i === 2 ? '#FFFFFF' : '#A855F7'}
          anchorX="right"
          anchorY="middle"
        >
          {label}
        </Text>
      ))}
      <Text position={[-15, 9, 0]} fontSize={0.7} color="#9CA3AF" anchorX="right">
        RETURN
      </Text>

      {/* 基准线 (Y=0) */}
      <Line
        points={[[-13, 0, -8], [13, 0, -8], [13, 0, 8], [-13, 0, 8], [-13, 0, -8]]}
        color="#FFFFFF"
        lineWidth={1}
        opacity={0.3}
        transparent
      />

      {/* 涨跌区域标注 */}
      <Text position={[14, 5, 0]} fontSize={0.8} color="#22D3EE" anchorX="left">
        GAIN
      </Text>
      <Text position={[14, -5, 0]} fontSize={0.8} color="#A855F7" anchorX="left">
        LOSS
      </Text>
    </group>
  )
}

export function MonteCarloScene({ layer }: PathCloudSceneProps) {
  return (
    <Canvas camera={{ position: [22, 10, 22], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={['#02050f']} />
      <fog attach="fog" args={['#02050f', 20, 55]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 12, 5]} intensity={1.2} color="#d8f0ff" />
      <directionalLight position={[-8, 6, -10]} intensity={0.5} color="#7ba2d3" />

      {/* 底部网格 */}
      <Grid
        position={[0, -7.5, 0]}
        args={[30, 18]}
        cellColor="#1a2a3d"
        sectionColor="#2d4a6d"
        fadeDistance={45}
        fadeStrength={1.2}
        cellThickness={0.3}
        sectionThickness={0.7}
        infiniteGrid={false}
      />

      {/* 坐标轴和标签 */}
      <AxisLabels />

      {/* 点云数据 */}
      <PathCloudPoints layer={layer} />

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        maxDistance={60}
        minDistance={12}
        maxPolarAngle={Math.PI / 2.2}
      />
    </Canvas>
  )
}
