/**
 * ParticleSystem2D
 * 
 * 2D Canvas particle system for the contemplative votive candles aesthetic.
 * Renders stationary particles with size-based brightness for depth illusion.
 * Integrates with Orchestrator for real-time data synchronization.
 */

import type p5 from 'p5'
import type { GriefMessage } from '@/types/database'

interface Particle2D {
  id: string
  message: GriefMessage
  x: number
  y: number
  size: number  // Radius in pixels (2-6px)
  brightness: number  // 0-1 for fade in/out
  fadeOut: boolean
  age: number
}

export class ParticleSystem2D {
  private particles: Map<string, Particle2D> = new Map()
  private p5: p5
  private canvasWidth: number
  private canvasHeight: number
  private frame: number = 0

  // Configuration
  private readonly FADE_IN_SPEED = 0.02  // 50 frames to full brightness
  private readonly FADE_OUT_SPEED = 0.03  // ~33 frames to fade out
  private readonly MIN_SIZE = 2
  private readonly MAX_SIZE = 6
  private readonly HALO_MULTIPLIER = 2.5

  constructor(p5Instance: p5, width: number, height: number) {
    this.p5 = p5Instance
    this.canvasWidth = width
    this.canvasHeight = height
  }

  /**
   * Sync with Working Set
   * 
   * Called by Orchestrator when working set changes.
   * Adds new particles, marks removed ones for fade out.
   */
  syncWithWorkingSet(workingSet: GriefMessage[]): void {
    const workingSetIds = new Set(workingSet.map(m => m.id.toString()))

    // Mark particles not in working set for fade out
    for (const [id, particle] of this.particles) {
      if (!workingSetIds.has(id)) {
        particle.fadeOut = true
      }
    }

    // Create new particles for new messages
    for (const message of workingSet) {
      const id = message.id.toString()
      if (!this.particles.has(id)) {
        this.createParticle(message)
      }
    }

    console.log('[PARTICLE2D] Synced:', this.particles.size, 'particles')
  }

  private createParticle(message: GriefMessage): void {
    const id = message.id.toString()

    // Random position across canvas
    const x = Math.random() * this.canvasWidth
    const y = Math.random() * this.canvasHeight

    // Random size within range
    const size = this.MIN_SIZE + Math.random() * (this.MAX_SIZE - this.MIN_SIZE)

    const particle: Particle2D = {
      id,
      message,
      x,
      y,
      size,
      brightness: 0,  // Start invisible, fade in
      fadeOut: false,
      age: 0
    }

    this.particles.set(id, particle)
  }

  /**
   * Update
   * 
   * Handle fade in/out animations.
   * Particles are STATIONARY - no position updates.
   */
  update(): void {
    this.frame++

    for (const [id, particle] of Array.from(this.particles.entries())) {
      particle.age++

      if (particle.fadeOut) {
        // Fading out
        particle.brightness -= this.FADE_OUT_SPEED
        if (particle.brightness <= 0) {
          this.particles.delete(id)
          continue
        }
      } else if (particle.brightness < 1.0) {
        // Fading in
        particle.brightness = Math.min(1.0, particle.brightness + this.FADE_IN_SPEED)
      }
    }
  }

  /**
   * Render
   * 
   * Draw all particles on 2D canvas buffer using radial gradient technique.
   * Uses size-based brightness for depth illusion.
   */
  render(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)

    for (const particle of this.particles.values()) {
      this.renderParticle(ctx, particle)
    }
  }

  private renderParticle(ctx: CanvasRenderingContext2D, particle: Particle2D): void {
    // Size-based brightness for depth: smaller = dimmer (0.4-1.0)
    const sizeBrightness = 0.4 + ((particle.size - this.MIN_SIZE) / (this.MAX_SIZE - this.MIN_SIZE)) * 0.6
    
    // Combine with fade brightness
    const totalBrightness = particle.brightness * sizeBrightness

    // Create radial gradient for soft votive glow
    const gradient = ctx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, particle.size * this.HALO_MULTIPLIER
    )

    // Golden warm glow with brightness scaling
    gradient.addColorStop(0, `rgba(255, 220, 140, ${1.0 * totalBrightness})`)
    gradient.addColorStop(0.4, `rgba(255, 200, 120, ${0.6 * totalBrightness})`)
    gradient.addColorStop(0.7, `rgba(255, 200, 120, ${0.2 * totalBrightness})`)
    gradient.addColorStop(1, 'rgba(255, 200, 120, 0)')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.size * this.HALO_MULTIPLIER, 0, Math.PI * 2)
    ctx.fill()
  }

  /**
   * Get Particle by ID
   * 
   * Used for hover detection and connection rendering.
   */
  getParticle(id: string): Particle2D | undefined {
    return this.particles.get(id)
  }

  /**
   * Get All Particles
   */
  getParticles(): Map<string, Particle2D> {
    return this.particles
  }

  /**
   * Get Particle Count
   */
  getParticleCount(): number {
    return this.particles.size
  }

  /**
   * Update Canvas Size
   * 
   * Call on window resize. Regenerates particle positions proportionally.
   */
  updateCanvasSize(width: number, height: number): void {
    const xRatio = width / this.canvasWidth
    const yRatio = height / this.canvasHeight

    // Scale existing particle positions
    for (const particle of this.particles.values()) {
      particle.x *= xRatio
      particle.y *= yRatio
    }

    this.canvasWidth = width
    this.canvasHeight = height
  }

  /**
   * Find Particle at Position
   * 
   * Returns particle if mouse is within its halo radius.
   * Used for hover detection.
   */
  findParticleAtPosition(x: number, y: number): Particle2D | null {
    for (const particle of this.particles.values()) {
      const dx = x - particle.x
      const dy = y - particle.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      const haloRadius = particle.size * this.HALO_MULTIPLIER
      
      if (distance <= haloRadius) {
        return particle
      }
    }
    return null
  }

  /**
   * Reset
   * 
   * Clear all particles.
   */
  reset(): void {
    this.particles.clear()
    this.frame = 0
  }
}
