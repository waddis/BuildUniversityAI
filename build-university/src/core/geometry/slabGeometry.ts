import * as THREE from 'three'
import type { Slab, Level } from '../schema/types'

/** Derive 3D geometry from a parametric slab */
export function generateSlabGeometry(slab: Slab, level: Level): THREE.BufferGeometry {
  if (slab.outline.length < 3) {
    return new THREE.BoxGeometry(1, slab.thickness, 1)
  }

  // Create 2D shape from outline (XZ coordinates)
  const shape = new THREE.Shape()
  shape.moveTo(slab.outline[0].x, slab.outline[0].z)
  for (let i = 1; i < slab.outline.length; i++) {
    shape.lineTo(slab.outline[i].x, slab.outline[i].z)
  }
  shape.closePath()

  // Extrude along local Z axis (which becomes thickness)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: slab.thickness,
    bevelEnabled: false,
  })

  // The shape was drawn in XY (with X=world X, Y=world Z)
  // ExtrudeGeometry extrudes along local +Z
  // We need: X stays X, local Y becomes world Z, extrusion becomes world Y (up)
  // So rotate -90° around X to flip Y/Z, making the slab horizontal
  const matrix = new THREE.Matrix4()
  matrix.makeRotationX(-Math.PI / 2)

  // Then translate to correct elevation
  const translateMatrix = new THREE.Matrix4()
  translateMatrix.makeTranslation(0, level.elevation + slab.offsetY + slab.thickness, 0)
  matrix.premultiply(translateMatrix)

  geo.applyMatrix4(matrix)
  return geo
}
