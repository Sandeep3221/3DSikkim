import * as THREE from 'three'

/**
 * Shared lighting state written once per frame by Lighting and read by any
 * shader that needs the sun direction (e.g. the atmosphere rim).
 */
export const lightingState = {
  /** Normalised sun direction in world space. */
  sunDirWorld: new THREE.Vector3(-1, 0.3, 0.5).normalize(),
}
