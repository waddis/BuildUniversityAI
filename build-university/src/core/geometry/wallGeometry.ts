import * as THREE from 'three'
import type { Wall, Level, SceneGraph } from '../schema/types'

/** Derive 3D mesh geometry from a parametric wall + its parent level */
export function generateWallGeometry(wall: Wall, level: Level): THREE.BufferGeometry {
  const dx = wall.end.x - wall.start.x
  const dz = wall.end.z - wall.start.z
  const length = Math.sqrt(dx * dx + dz * dz)
  const height = wall.heightOverride ?? level.height

  // Create a box along the wall line
  const geo = new THREE.BoxGeometry(length, height, wall.thickness)

  // Position at midpoint, rotated to align with wall direction
  const angle = Math.atan2(dz, dx)
  const midX = (wall.start.x + wall.end.x) / 2
  const midZ = (wall.start.z + wall.end.z) / 2

  // Apply rotation and translation via matrix
  const matrix = new THREE.Matrix4()
  matrix.makeRotationY(-angle)
  const translate = new THREE.Matrix4()
  translate.makeTranslation(midX, level.elevation + height / 2, midZ)
  matrix.premultiply(translate)

  geo.applyMatrix4(matrix)
  return geo
}

/** Get the wall's angle in radians */
export function getWallAngle(wall: Wall): number {
  return Math.atan2(wall.end.z - wall.start.z, wall.end.x - wall.start.x)
}

/** Get wall length */
export function getWallLength(wall: Wall): number {
  const dx = wall.end.x - wall.start.x
  const dz = wall.end.z - wall.start.z
  return Math.sqrt(dx * dx + dz * dz)
}

/** Get wall midpoint in 3D */
export function getWallMidpoint(wall: Wall, level: Level): THREE.Vector3 {
  const height = wall.heightOverride ?? level.height
  return new THREE.Vector3(
    (wall.start.x + wall.end.x) / 2,
    level.elevation + height / 2,
    (wall.start.z + wall.end.z) / 2
  )
}
