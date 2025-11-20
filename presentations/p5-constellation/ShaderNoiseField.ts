/**
 * Shader Noise Field
 * 
 * Extracted from ShaderBackground.tsx fragment shader.
 * Creates 3D velocity field matching the visual swirling smoke.
 * 
 * This allows connection lines to billow in response to the same forces
 * visible in the background, creating visual and physical coherence.
 */

import type { Vector3D } from '../types'

/**
 * Configuration matching ShaderBackground.tsx uniforms
 */
const SHADER_CONFIG = {
  noiseSpeed: 0.05,
  timeScale: 1.0,
  scale: 3.0,
  numOctaves: 6,
  rotationAngle: 0.5, // From mat2 rotation in shader
  shift: 100.0,
  
  // Force scaling for physics
  forceMultiplier: 0.1, // How strongly the noise affects spring points
}

/**
 * 2D random function matching shader
 */
function random(x: number, y: number): number {
  const value = Math.sin(x * 13.9898 + y * 78.233) * 43758.5453123
  return value - Math.floor(value) // fract equivalent
}

/**
 * 2D noise function matching shader
 */
function noise2D(x: number, y: number): number {
  // Integer and fractional parts
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  
  // Four corners
  const a = random(ix, iy)
  const b = random(ix + 1, iy)
  const c = random(ix, iy + 1)
  const d = random(ix + 1, iy + 1)
  
  // Smoothstep interpolation (3x^2 - 2x^3)
  const ux = fx * fx * (3.0 - 2.0 * fx)
  const uy = fy * fy * (3.0 - 2.0 * fy)
  
  // Bilinear interpolation
  return a * (1 - ux) * (1 - uy) +
         b * ux * (1 - uy) +
         c * (1 - ux) * uy +
         d * ux * uy
}

/**
 * Rotate 2D vector
 */
function rotate2D(x: number, y: number, angle: number): { x: number; y: number } {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return {
    x: x * c - y * s,
    y: x * s + y * c,
  }
}

/**
 * Fractional Brownian Motion matching shader
 */
function fbm(x: number, y: number, time: number): number {
  let value = 0.0
  let amplitude = 0.5
  let px = x
  let py = y
  
  for (let i = 0; i < SHADER_CONFIG.numOctaves; i++) {
    // Alternating direction based on octave (from shader)
    const direction = i % 2 === 0 ? -1.0 : 1.0
    
    // Sample noise with time offset
    const timeOffset = SHADER_CONFIG.noiseSpeed * direction * time * SHADER_CONFIG.timeScale
    value += amplitude * noise2D(px - timeOffset, py - timeOffset)
    
    // Rotate and scale for next octave
    const rotated = rotate2D(px, py, SHADER_CONFIG.rotationAngle)
    px = rotated.x * 2.0 + SHADER_CONFIG.shift
    py = rotated.y * 2.0 + SHADER_CONFIG.shift
    
    // Reduce amplitude for next octave
    amplitude *= 0.5
  }
  
  return value
}

/**
 * Domain warping matching shader
 * Returns q and r vectors used to create swirling patterns
 */
function domainWarp(
  x: number,
  y: number,
  time: number
): { qx: number; qy: number; rx: number; ry: number } {
  // First layer: q
  const qx = fbm(x, y, time)
  const qy = fbm(x + 1.0, y + 1.0, time)
  
  // Second layer: r (influenced by q)
  const time2 = time * SHADER_CONFIG.timeScale
  const rx = fbm(x + qx + 1.7 + 0.15 * time2, y + qx + 1.2 + 0.15 * time2, time)
  const ry = fbm(x + qy + 8.3 + 0.126 * time2, y + qy + 2.8 + 0.126 * time2, time)
  
  return { qx, qy, rx, ry }
}

/**
 * Sample velocity field at 3D position
 * 
 * Projects 3D position to 2D plane, samples noise, returns 3D velocity vector.
 * The Z component is derived from curl of the 2D field for more interesting 3D motion.
 */
export function sampleVelocityField(
  position: Vector3D,
  time: number
): Vector3D {
  // Project 3D position to 2D for noise sampling
  // Use XY plane as primary, with Z influencing the sampling offset
  const px = position.x * SHADER_CONFIG.scale * 0.01 + position.z * 0.01
  const py = position.y * SHADER_CONFIG.scale * 0.01 + position.z * 0.005
  
  // Sample domain warping
  const { qx, qy, rx, ry } = domainWarp(px, py, time)
  
  // Final noise value
  const f = fbm(px + rx, py + ry, time)
  
  // Convert noise derivatives to velocity
  // Sample nearby points to get gradient (direction of flow)
  const epsilon = 0.01
  const fx = fbm(px + epsilon + rx, py + ry, time)
  const fy = fbm(px + rx, py + epsilon + ry, time)
  
  // Gradient gives direction of strongest change
  const gradX = (fx - f) / epsilon
  const gradY = (fy - f) / epsilon
  
  // For Z velocity, use curl of the 2D field (perpendicular flow)
  // This creates more interesting 3D swirling
  const curlZ = (ry - qy) * 0.5
  
  // Return velocity vector scaled by force multiplier
  return {
    x: gradX * SHADER_CONFIG.forceMultiplier,
    y: gradY * SHADER_CONFIG.forceMultiplier,
    z: curlZ * SHADER_CONFIG.forceMultiplier * 0.5, // Weaker Z for stability
  }
}

/**
 * Get noise value at position (for debugging/visualization)
 */
export function getNoiseValue(position: Vector3D, time: number): number {
  const px = position.x * SHADER_CONFIG.scale * 0.01
  const py = position.y * SHADER_CONFIG.scale * 0.01
  
  const { rx, ry } = domainWarp(px, py, time)
  return fbm(px + rx, py + ry, time)
}

/**
 * Configuration accessors (for tuning)
 */
export function getShaderConfig() {
  return { ...SHADER_CONFIG }
}

export function setForceMultiplier(value: number) {
  SHADER_CONFIG.forceMultiplier = value
}

export function setNoiseSpeed(value: number) {
  SHADER_CONFIG.noiseSpeed = value
}

/**
 * ShaderNoiseField class for integration with ParticleSystem
 */
export class ShaderNoiseField {
  private time: number = 0
  private timeIncrement: number = 0.008 // Matches desktop animation speed
  
  constructor() {
    // Initialize
  }
  
  /**
   * Update time (call once per frame)
   */
  update(): void {
    this.time += this.timeIncrement
  }
  
  /**
   * Get velocity at position
   */
  getForceAt(position: Vector3D): Vector3D {
    return sampleVelocityField(position, this.time)
  }
  
  /**
   * Set animation speed (desktop: 0.008, mobile: 0.0135)
   */
  setTimeIncrement(value: number): void {
    this.timeIncrement = value
  }
  
  /**
   * Get current time value
   */
  getTime(): number {
    return this.time
  }
  
  /**
   * Reset time
   */
  reset(): void {
    this.time = 0
  }
}
