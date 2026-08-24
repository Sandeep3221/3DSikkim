import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { scrollState } from '../systems/scroll/scrollState'
import { getUiState, selectDestination } from '../systems/ui/uiStore'
import { DESTINATIONS } from '../data/destinations'
import { surfacePointEarthLocal, surfaceFlatQuaternion } from './sikkimWorld'

/**
 * Geographic destination markers, attached to the real terrain surface.
 *
 * Each marker sits above its actual lat/lon at the real DEM elevation and
 * scales/pulses with state (IDLE / HOVER / SELECTED / CAMERA-TRAVELLING /
 * ARRIVED) while fading away with camera distance. Visual language stays
 * minimal and editorial — a thin ring, a short stem, a name tag. The HTML
 * destination list remains the accessible twin (same uiStore).
 */

interface MarkerSpec {
  id: string
  position: THREE.Vector3
  flat: THREE.Quaternion
}

let labelTextureCache = new Map<string, THREE.CanvasTexture>()

function makeLabelTexture(name: string): THREE.CanvasTexture {
  const cached = labelTextureCache.get(name)
  if (cached) return cached
  const s = 256
  const canvas = document.createElement('canvas')
  canvas.width = s
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, s, 64)
  ctx.font = '42px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(0, 0, s, 64)
  ctx.fillStyle = '#e8e6e1'
  ctx.fillText(name.toUpperCase(), s / 2, 36)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  labelTextureCache.set(name, tex)
  return tex
}

export default function MapMarkers() {
  const group = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const ringMats = useRef<Array<THREE.MeshBasicMaterial | null>>([])
  const stemMats = useRef<Array<THREE.MeshBasicMaterial | null>>([])
  const labelSprites = useRef<Array<THREE.Sprite | null>>([])
  const labelMats = useRef<Array<THREE.SpriteMaterial | null>>([])

  const markers = useMemo<MarkerSpec[]>(
    () =>
      DESTINATIONS.map((d) => ({
        id: d.id,
        position: surfacePointEarthLocal(d.coords.lat, d.coords.lon, 140),
        flat: surfaceFlatQuaternion(d.coords.lat, d.coords.lon),
      })),
    [],
  )

  // Cleanup the shared label textures only when the whole cache is ours.
  useEffect(
    () => () => {
      labelTextureCache.forEach((t) => t.dispose())
      labelTextureCache = new Map()
    },
    [],
  )

  useFrame(() => {
    if (!group.current) return
    const p = scrollState.progress
    const active = p > 0.9
    group.current.visible = active
    if (!active) return

    const { selectedId } = getUiState()
    const t = performance.now() / 1000

    markers.forEach((m, i) => {
      const child = group.current!.children[i]
      const dist = child.position.length()
      // Marker presence fades with surface distance (world units from centre).
      const presence = Math.max(0, 1 - (dist - 1.1) / 2.2)

      const pulse = child.userData.pulse as THREE.Mesh | undefined
      if (pulse) {
        const base = m.id === hovered || m.id === selectedId ? 1.45 : 1
        pulse.scale.setScalar(base * (1 + 0.12 * Math.sin(t * 2.2)))
      }
      const ringMat = ringMats.current[i]
      if (ringMat) {
        ringMat.opacity = presence * (m.id === selectedId ? 0.95 : m.id === hovered ? 0.8 : 0.45)
      }
      const stemMat = stemMats.current[i]
      if (stemMat) stemMat.opacity = presence * 0.8
      const labelMat = labelMats.current[i]
      const sprite = labelSprites.current[i]
      if (labelMat && sprite) {
        const shown = m.id === selectedId || m.id === hovered || presence > 0.5
        labelMat.opacity = shown ? presence * 0.95 : presence * 0.35
        sprite.scale.setScalar(Math.max(0.2, presence * 0.55))
      }
    })
  })

  return (
    <group ref={group}>
      {markers.map((m, i) => (
        <group
          key={m.id}
          position={m.position}
          userData={{ destinationId: m.id }}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(m.id)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHovered(null)
            document.body.style.cursor = ''
          }}
          onClick={(e) => {
            e.stopPropagation()
            selectDestination(getUiState().selectedId === m.id ? null : m.id)
          }}
        >
          {/* Ground ring lying flat on the terrain surface */}
          <mesh quaternion={m.flat} userData={{ pulse: true }}>
            <ringGeometry args={[0.018, 0.028, 32]} />
            <meshBasicMaterial
              ref={(mm) => {
                ringMats.current[i] = mm
              }}
              color="#eaf2f8"
              transparent
              opacity={0.5}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          {/* Short stem */}
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.0015, 0.0015, 0.04, 6]} />
            <meshBasicMaterial
              ref={(mm) => {
                stemMats.current[i] = mm
              }}
              color="#dbe7f0"
              transparent
              opacity={0.8}
              depthWrite={false}
            />
          </mesh>
          {/* Name tag */}
          <sprite
            position={[0, 0.06, 0]}
            scale={[0.5, 0.5, 1]}
            ref={(sp) => {
              labelSprites.current[i] = sp
            }}
          >
            <spriteMaterial
              ref={(mm) => {
                labelMats.current[i] = mm
              }}
              map={makeLabelTexture(DESTINATIONS[i].name)}
              transparent
              opacity={0}
              depthWrite={false}
            />
          </sprite>
        </group>
      ))}
    </group>
  )
}
