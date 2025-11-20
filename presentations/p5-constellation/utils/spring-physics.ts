/**
 * Spring Physics Utilities
 * 
 * Simple spring-based physics for organic, billowing movement.
 * Used primarily for constellation network connection lines.
 */

import type { Vector3D } from '../types'
import * as vec from './vector-math'

/**
 * Apply spring force toward target position
 * 
 * @param position - Current position
 * @param velocity - Current velocity
 * @param equilibrium - Target/rest position
 * @param springConstant - Strength of spring pull (0.0-1.0, typically 0.01-0.1)
 * @param damping - Velocity damping (0.0-1.0, typically 0.8-0.95)
 * @returns Updated position and velocity
 */
export function applySpringForce(
  position: Vector3D,
  velocity: Vector3D,
  equilibrium: Vector3D,
  springConstant: number,
  damping: number
): { position: Vector3D; velocity: Vector3D } {
  // Calculate displacement from equilibrium
  const displacement = vec.subtract(equilibrium, position)
  
  // Spring force: F = k * displacement
  const force = vec.multiply(displacement, springConstant)
  
  // Apply force to velocity
  const newVelocity = vec.add(velocity, force)
  
  // Apply damping
  const dampedVelocity = vec.multiply(newVelocity, damping)
  
  // Update position
  const newPosition = vec.add(position, dampedVelocity)
  
  return {
    position: newPosition,
    velocity: dampedVelocity,
  }
}

/**
 * Create a series of spring points between two positions
 * 
 * Used for creating billowing lines with organic movement.
 * 
 * @param from - Start position
 * @param to - End position
 * @param count - Number of spring points (including start/end)
 * @returns Array of spring points with initial positions
 */
export function createSpringChain(
  from: Vector3D,
  to: Vector3D,
  count: number
): Array<{ position: Vector3D; velocity: Vector3D; equilibrium: Vector3D }> {
  const points: Array<{ position: Vector3D; velocity: Vector3D; equilibrium: Vector3D }> = []
  
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const equilibrium = vec.lerp(from, to, t)
    
    points.push({
      position: vec.clone(equilibrium),
      velocity: vec.createVector(0, 0, 0),
      equilibrium,
    })
  }
  
  return points
}

/**
 * Update spring chain with new endpoints
 * 
 * @param springs - Existing spring points
 * @param from - New start position
 * @param to - New end position
 * @param springConstant - Spring strength
 * @param damping - Velocity damping
 */
export function updateSpringChain(
  springs: Array<{ position: Vector3D; velocity: Vector3D; equilibrium: Vector3D }>,
  from: Vector3D,
  to: Vector3D,
  springConstant: number,
  damping: number
): void {
  const count = springs.length
  
  for (let i = 0; i < count; i++) {
    const spring = springs[i]
    const t = i / (count - 1)
    
    // Update equilibrium position
    spring.equilibrium = vec.lerp(from, to, t)
    
    // Apply spring physics
    const updated = applySpringForce(
      spring.position,
      spring.velocity,
      spring.equilibrium,
      springConstant,
      damping
    )
    
    spring.position = updated.position
    spring.velocity = updated.velocity
  }
}

/**
 * Add noise-based perturbation to spring points for organic movement
 * 
 * @param springs - Spring points to perturb
 * @param noiseScale - Scale of noise sampling (smaller = smoother)
 * @param noiseAmount - Magnitude of displacement
 * @param time - Time value for noise evolution
 */
export function addNoiseToSprings(
  springs: Array<{ position: Vector3D; velocity: Vector3D; equilibrium: Vector3D }>,
  noiseScale: number,
  noiseAmount: number,
  time: number,
  noiseFn: (x: number, y: number, z?: number) => number
): void {
  for (let i = 0; i < springs.length; i++) {
    const spring = springs[i]
    
    // Sample 3D noise based on position and time
    const noiseX = noiseFn(
      spring.position.x * noiseScale,
      spring.position.y * noiseScale,
      time
    )
    const noiseY = noiseFn(
      spring.position.y * noiseScale,
      spring.position.z * noiseScale,
      time + 100
    )
    const noiseZ = noiseFn(
      spring.position.z * noiseScale,
      spring.position.x * noiseScale,
      time + 200
    )
    
    // Apply noise as displacement from equilibrium
    spring.position.x += (noiseX - 0.5) * noiseAmount
    spring.position.y += (noiseY - 0.5) * noiseAmount
    spring.position.z += (noiseZ - 0.5) * noiseAmount
  }
}

/**
 * Apply velocity damping to slow movement over time
 * 
 * @param velocity - Current velocity
 * @param damping - Damping factor (0.0-1.0)
 * @returns Damped velocity
 */
export function applyDamping(velocity: Vector3D, damping: number): Vector3D {
  return vec.multiply(velocity, damping)
}

/**
 * Calculate total kinetic energy of spring system (for debugging/monitoring)
 * 
 * @param springs - Spring points with velocities
 * @returns Total kinetic energy
 */
export function calculateKineticEnergy(
  springs: Array<{ velocity: Vector3D }>
): number {
  let totalEnergy = 0
  
  for (const spring of springs) {
    const speed = vec.magnitude(spring.velocity)
    totalEnergy += 0.5 * speed * speed // KE = 0.5 * m * v^2 (assume unit mass)
  }
  
  return totalEnergy
}

/**
 * Check if spring system has settled (velocities below threshold)
 * 
 * @param springs - Spring points to check
 * @param threshold - Velocity magnitude threshold
 * @returns True if all springs are below threshold
 */
export function hasSettled(
  springs: Array<{ velocity: Vector3D }>,
  threshold: number = 0.01
): boolean {
  for (const spring of springs) {
    if (vec.magnitude(spring.velocity) > threshold) {
      return false
    }
  }
  return true
}

/**
 * Reset spring velocities to zero (useful for sudden changes)
 * 
 * @param springs - Spring points to reset
 */
export function resetVelocities(
  springs: Array<{ velocity: Vector3D }>
): void {
  for (const spring of springs) {
    spring.velocity = vec.createVector(0, 0, 0)
  }
}

/**
 * Calculate average position of spring chain (center of mass)
 * 
 * @param springs - Spring points
 * @returns Average position
 */
export function calculateCenterOfMass(
  springs: Array<{ position: Vector3D }>
): Vector3D {
  if (springs.length === 0) return vec.createVector()
  
  let sum = vec.createVector()
  for (const spring of springs) {
    sum = vec.add(sum, spring.position)
  }
  
  return vec.divide(sum, springs.length)
}
