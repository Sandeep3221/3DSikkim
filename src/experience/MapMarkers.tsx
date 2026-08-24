import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { scrollState } from '../systems/scroll/scrollState'
import { getUiState, selectDestination } from '../systems/ui/uiStore'
import { DESTINATIONS } from '../data/destinations'
import { mapPoint } from './sikkimRelief'

/**
 * 3D destination markers on the Sikkim relief map. Pointer events handle
 * mouse/touch selection; the HTML destination list in the overlay provides
 * the fully keyboard-accessible equivalent (both share the same store).
 */

interface MarkerSpec {
  id: string
  name: string
  position: THREE.Vector3
  flat: THREE.Quaternion
}

const UP_Z = new THREE.Vector3(0, 0, 1)

export default function MapMarkers() {
  const group = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const ringMats = useRef<Array<THREE.MeshBasicMaterial | null>>([])
  const pinMats = useRef<Array<THREE.MeshBasicMaterial | null>>([])

  const markers = useMemo<MarkerSpec[]>(
    () =>
      DESTINATIONS.map((d) => {
        const position = mapPoint(d.coords.lat, d.coords.lon, 0.012)
        return {
          id: d.id,
          name: d.name,
          position,
          flat: new THREE.Quaternion().setFromUnitVectors(UP_Z, position.clone().normalize()),
        }
      }),
    [],
  )

  useFrame(({ clock }) => {
    if (!group.current) return
    const p = scrollState.progress
    const active = p > 0.9
    group.current.visible = active
    if (!active) return

    const selectedId = getUiState().selectedId
    const t = clock.elapsedTime

    group.current.children.forEach((child) => {
      const id = child.userData.destinationId as string | undefined
      const pulse = child.userData.pulse as THREE.Mesh | undefined
      if (pulse) {
        const base = id === hovered || id === selectedId ? 1.35 : 1
        pulse.scale.setScalar(base * (1 + 0.12 * Math.sin(t * 2.2)))
      }
    })

    markers.forEach((m, i) => {
      const isSel = m.id === selectedId
      const isHov = m.id === hovered
      const ringMat = ringMats.current[i]
      if (ringMat) ringMat.opacity = isSel ? 0.95 : isHov ? 0.8 : 0.55
      const pinMat = pinMats.current[i]
      if (pinMat) {
        pinMat.color.set(isSel ? '#ffffff' : '#dbe7f0')
        pinMat.opacity = isSel ? 1 : 0.8
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
          {/* Pulse ring lying flat on the local surface */}
          <mesh quaternion={m.flat} userData={{ pulse: true }}>
            <ringGeometry args={[0.028, 0.042, 32]} />
            <meshBasicMaterial
              ref={(self) => {
                ringMats.current[i] = self
              }}
              color="#eaf2f8"
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          {/* Beacon pin */}
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.0025, 0.0025, 0.06, 6]} />
            <meshBasicMaterial
              ref={(self) => {
                pinMats.current[i] = self
              }}
              color="#dbe7f0"
              transparent
              opacity={0.8}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, 0.07, 0]}>
            <sphereGeometry args={[0.009, 12, 12]} />
            <meshBasicMaterial color="#ffffff" depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
