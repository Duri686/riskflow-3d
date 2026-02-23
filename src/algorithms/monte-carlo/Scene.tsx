import { Billboard, Grid, OrbitControls, Text, Line } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useRef, useMemo } from 'react'
import type { BufferGeometry } from 'three'
import { useCSSVar } from '@/hooks/useCSSVar'
import type { MonteCarloRenderLayer } from './engine'
import type { QuantileMarker } from './sceneMarkers'

interface PathCloudSceneProps {
  layer: MonteCarloRenderLayer
  markers?: QuantileMarker[]
}

function FacingText({
  position,
  color,
  children,
  fontSize = 0.6,
  anchorX = 'center',
  anchorY = 'middle',
}: {
  position: [number, number, number]
  color: string
  children: string
  fontSize?: number
  anchorX?: 'left' | 'center' | 'right'
  anchorY?: 'top' | 'middle' | 'bottom'
}) {
  return (
    <Billboard follow position={position}>
      <Text fontSize={fontSize} color={color} anchorX={anchorX} anchorY={anchorY}>
        {children}
      </Text>
    </Billboard>
  )
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

function AxisLabels({
  mutedColor,
  foregroundColor,
  gainColor,
  lossColor,
}: {
  mutedColor: string
  foregroundColor: string
  gainColor: string
  lossColor: string
}) {
  const timeLabels = useMemo(() => ['起点', '25%', '50%', '75%', '到期'], [])
  const priceLabels = useMemo(() => ['+50%', '+25%', '基准', '-25%', '-50%'], [])

  return (
    <group>
      {/* 时间轴标签 (X轴) */}
      {timeLabels.map((label, i) => (
        <FacingText
          key={`time-${i}`}
          position={[-13 + i * 6.5, -8, 9]}
          fontSize={0.6}
          color={mutedColor}
        >
          {label}
        </FacingText>
      ))}
      <FacingText position={[0, -8.5, 12]} fontSize={0.7} color={mutedColor} anchorX="center">
        时间维度
      </FacingText>

      {/* 价格轴标签 (Y轴) */}
      {priceLabels.map((label, i) => (
        <FacingText
          key={`price-${i}`}
          position={[-15, 7 - i * 3.5, 0]}
          fontSize={0.5}
          color={i < 2 ? gainColor : i === 2 ? foregroundColor : lossColor}
          anchorX="right"
        >
          {label}
        </FacingText>
      ))}
      <FacingText position={[-15, 9, 0]} fontSize={0.7} color={mutedColor} anchorX="right">
        收益率
      </FacingText>

      {/* 基准线 (Y=0) */}
      <Line
        points={[[-13, 0, -8], [13, 0, -8], [13, 0, 8], [-13, 0, 8], [-13, 0, -8]]}
        color={foregroundColor}
        lineWidth={1}
        opacity={0.3}
        transparent
      />

      {/* 涨跌区域标注 */}
      <FacingText position={[14, 5, 0]} fontSize={0.8} color={gainColor} anchorX="left">
        盈利区
      </FacingText>
      <FacingText position={[14, -5, 0]} fontSize={0.8} color={lossColor} anchorX="left">
        亏损区
      </FacingText>
    </group>
  )
}

function QuantileGuides({ markers = [] }: { markers?: QuantileMarker[] }) {
  return (
    <group>
      {markers.map((marker) => (
        <group key={marker.key}>
          <Line
            points={marker.line}
            color={marker.color}
            lineWidth={2.2}
            transparent
            opacity={0.9}
          />
          <mesh position={[marker.x, marker.y, 0]}>
            <sphereGeometry args={[0.18, 20, 20]} />
            <meshStandardMaterial
              color={marker.color}
              emissive={marker.color}
              emissiveIntensity={0.32}
            />
          </mesh>
          <FacingText
            position={marker.labelPosition}
            color={marker.color}
            fontSize={0.5}
          >
            {marker.label}
          </FacingText>
        </group>
      ))}
    </group>
  )
}

export function MonteCarloScene({ layer, markers = [] }: PathCloudSceneProps) {
  const backgroundColor = useCSSVar('--color-bt-background', '#0a0a0a')
  const mutedColor = useCSSVar('--color-bt-muted-foreground', '#737373')
  const foregroundColor = useCSSVar('--color-bt-foreground', '#fafafa')
  const gainColor = useCSSVar('--color-bt-success', '#00d4aa')
  const lossColor = useCSSVar('--color-bt-danger', '#ff4757')
  const accentColor = useCSSVar('--color-bt-accent', '#ff3d00')
  const gridCellColor = useCSSVar('--color-bt-border', '#262626')
  const gridSectionColor = useCSSVar('--color-bt-muted', '#1a1a1a')

  return (
    <Canvas camera={{ position: [22, 10, 22], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={[backgroundColor]} />
      <fog attach="fog" args={[backgroundColor, 20, 55]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 12, 5]} intensity={1.2} color={foregroundColor} />
      <directionalLight position={[-8, 6, -10]} intensity={0.5} color={accentColor} />

      {/* 底部网格 */}
      <Grid
        position={[0, -7.5, 0]}
        args={[30, 18]}
        cellColor={gridCellColor}
        sectionColor={gridSectionColor}
        fadeDistance={45}
        fadeStrength={1.2}
        cellThickness={0.3}
        sectionThickness={0.7}
        infiniteGrid={false}
      />

      {/* 坐标轴和标签 */}
      <AxisLabels
        mutedColor={mutedColor}
        foregroundColor={foregroundColor}
        gainColor={gainColor}
        lossColor={lossColor}
      />
      <QuantileGuides markers={markers} />

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
