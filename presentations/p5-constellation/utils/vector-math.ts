/**
 * 3D Vector Math Utilities
 * 
 * Basic vector operations for 3D space calculations.
 * Used throughout the particle system, physics, and camera controls.
 */

import type { Vector3D } from '../types'

/**
 * Create a new vector
 */
export function createVector(x: number = 0, y: number = 0, z: number = 0): Vector3D {
  return { x, y, z }
}

/**
 * Add two vectors
 */
export function add(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  }
}

/**
 * Subtract vector b from vector a
 */
export function subtract(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  }
}

/**
 * Multiply vector by scalar
 */
export function multiply(v: Vector3D, scalar: number): Vector3D {
  return {
    x: v.x * scalar,
    y: v.y * scalar,
    z: v.z * scalar,
  }
}

/**
 * Divide vector by scalar
 */
export function divide(v: Vector3D, scalar: number): Vector3D {
  if (scalar === 0) return createVector()
  return multiply(v, 1 / scalar)
}

/**
 * Calculate magnitude (length) of vector
 */
export function magnitude(v: Vector3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}

/**
 * Normalize vector to unit length
 */
export function normalize(v: Vector3D): Vector3D {
  const mag = magnitude(v)
  if (mag === 0) return createVector()
  return divide(v, mag)
}

/**
 * Set magnitude of vector
 */
export function setMagnitude(v: Vector3D, mag: number): Vector3D {
  return multiply(normalize(v), mag)
}

/**
 * Limit magnitude to maximum value
 */
export function limit(v: Vector3D, max: number): Vector3D {
  const mag = magnitude(v)
  if (mag > max) {
    return setMagnitude(v, max)
  }
  return v
}

/**
 * Calculate distance between two points
 */
export function distance(a: Vector3D, b: Vector3D): number {
  return magnitude(subtract(a, b))
}

/**
 * Calculate dot product
 */
export function dot(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

/**
 * Calculate cross product
 */
export function cross(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

/**
 * Linear interpolation between two vectors
 */
export function lerp(a: Vector3D, b: Vector3D, t: number): Vector3D {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  }
}

/**
 * Clone a vector
 */
export function clone(v: Vector3D): Vector3D {
  return { x: v.x, y: v.y, z: v.z }
}

/**
 * Check if two vectors are equal (with optional tolerance)
 */
export function equals(a: Vector3D, b: Vector3D, tolerance: number = 0.0001): boolean {
  return (
    Math.abs(a.x - b.x) < tolerance &&
    Math.abs(a.y - b.y) < tolerance &&
    Math.abs(a.z - b.z) < tolerance
  )
}

/**
 * Get angle between two vectors (in radians)
 */
export function angleBetween(a: Vector3D, b: Vector3D): number {
  const dotProduct = dot(a, b)
  const magProduct = magnitude(a) * magnitude(b)
  if (magProduct === 0) return 0
  return Math.acos(dotProduct / magProduct)
}

/**
 * Rotate vector around X axis
 */
export function rotateX(v: Vector3D, angle: number): Vector3D {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: v.x,
    y: v.y * cos - v.z * sin,
    z: v.y * sin + v.z * cos,
  }
}

/**
 * Rotate vector around Y axis
 */
export function rotateY(v: Vector3D, angle: number): Vector3D {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: v.x * cos + v.z * sin,
    y: v.y,
    z: -v.x * sin + v.z * cos,
  }
}

/**
 * Rotate vector around Z axis
 */
export function rotateZ(v: Vector3D, angle: number): Vector3D {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
    z: v.z,
  }
}

/**
 * Create random vector within bounds
 */
export function random(
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  zMin: number,
  zMax: number
): Vector3D {
  return {
    x: Math.random() * (xMax - xMin) + xMin,
    y: Math.random() * (yMax - yMin) + yMin,
    z: Math.random() * (zMax - zMin) + zMin,
  }
}

/**
 * Create random unit vector (on surface of unit sphere)
 */
export function randomUnit(): Vector3D {
  // Use spherical coordinates
  const theta = Math.random() * Math.PI * 2 // 0 to 2π
  const phi = Math.acos(2 * Math.random() - 1) // 0 to π
  
  return {
    x: Math.sin(phi) * Math.cos(theta),
    y: Math.sin(phi) * Math.sin(theta),
    z: Math.cos(phi),
  }
}

/**
 * Convert vector to string for debugging
 */
export function toString(v: Vector3D, precision: number = 2): string {
  return `(${v.x.toFixed(precision)}, ${v.y.toFixed(precision)}, ${v.z.toFixed(precision)})`
}
