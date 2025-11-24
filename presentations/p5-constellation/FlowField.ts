/**
 * Flow Field - 3D Perlin Noise Vector Field
 * 
 * Generates organic flow vectors that connections can sample.
 * Creates billowing, underwater-like movement.
 */

import type p5 from 'p5'
import type { Vector3D } from './types'

export class FlowField {
  private p5: p5
  private scale: number = 0.002  // Noise scale - even larger swirls
  private timeScale: number = 0.001  // Slightly faster evolution
  private magnitude: number = 3.5  // Much stronger forces for visible effect
  private time: number = 0

  constructor(p5Instance: p5) {
    this.p5 = p5Instance
  }

  /**
   * Update Time
   * 
   * Evolves the flow field over time.
   */
  update(): void {
    this.time += this.timeScale
  }

  /**
   * Get Flow Vector
   * 
   * Samples 3D Perlin noise at position to get flow direction.
   * Returns normalized vector scaled by magnitude.
   */
  getFlowAt(position: Vector3D): Vector3D {
    // Sample 3D noise at position + time offset
    // Use different offsets for x, y, z to avoid correlation
    const noiseX = this.p5.noise(
      position.x * this.scale,
      position.y * this.scale,
      position.z * this.scale + this.time
    )
    
    const noiseY = this.p5.noise(
      position.x * this.scale + 1000,
      position.y * this.scale + 1000,
      position.z * this.scale + this.time
    )
    
    const noiseZ = this.p5.noise(
      position.x * this.scale + 2000,
      position.y * this.scale + 2000,
      position.z * this.scale + this.time
    )

    // Convert from [0,1] to [-1,1] range
    const vx = (noiseX - 0.5) * 2
    const vy = (noiseY - 0.5) * 2
    const vz = (noiseZ - 0.5) * 2

    // Scale by magnitude
    return {
      x: vx * this.magnitude,
      y: vy * this.magnitude,
      z: vz * this.magnitude
    }
  }

  /**
   * Get Curl Noise
   * 
   * More organic flow using curl of noise field.
   * Creates swirling, vortex-like patterns.
   */
  getCurlAt(position: Vector3D): Vector3D {
    const eps = 0.01

    // Sample noise at offset positions
    const n1 = this.p5.noise(
      position.x * this.scale,
      (position.y + eps) * this.scale,
      position.z * this.scale + this.time
    )
    
    const n2 = this.p5.noise(
      position.x * this.scale,
      (position.y - eps) * this.scale,
      position.z * this.scale + this.time
    )
    
    const n3 = this.p5.noise(
      (position.x + eps) * this.scale,
      position.y * this.scale,
      position.z * this.scale + this.time
    )
    
    const n4 = this.p5.noise(
      (position.x - eps) * this.scale,
      position.y * this.scale,
      position.z * this.scale + this.time
    )
    
    const n5 = this.p5.noise(
      position.x * this.scale,
      position.y * this.scale,
      (position.z + eps) * this.scale + this.time
    )
    
    const n6 = this.p5.noise(
      position.x * this.scale,
      position.y * this.scale,
      (position.z - eps) * this.scale + this.time
    )

    // Compute curl
    const vx = (n1 - n2) - (n5 - n6)
    const vy = (n5 - n6) - (n3 - n4)
    const vz = (n3 - n4) - (n1 - n2)

    return {
      x: vx * this.magnitude * 10,
      y: vy * this.magnitude * 10,
      z: vz * this.magnitude * 10
    }
  }
}
