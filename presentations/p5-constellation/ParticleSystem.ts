/**
 * ParticleSystem - v6 RADICAL SIMPLIFICATION
 * 
 * Strip everything back to basics:
 * - Single layer spheres
 * - Simple fill() color
 * - No additive blending
 * - No complex materials
 * - Just get ONE orange sphere working
 */

import type p5 from 'p5'
import type { GriefMessage } from '@/types/database'
import type { Particle, Vector3D, Color } from './types'
import { CONFIG } from './types'
import * as vec from './utils/vector-math'

export class ParticleSystem {
  private particles: Map<string, Particle> = new Map()
  private p5: p5
  private frame: number = 0
  private focusId: string | null = null
  private nextId: string | null = null

  constructor(p5Instance: p5) {
    this.p5 = p5Instance
  }

  syncWithWorkingSet(workingSet: GriefMessage[]): void {
    const workingSetIds = new Set(workingSet.map((m) => m.id.toString()))

    for (const [id, particle] of this.particles) {
      if (!workingSetIds.has(id)) {
        particle.fadeOut = true
      }
    }

    for (const message of workingSet) {
      const id = message.id.toString()
      if (!this.particles.has(id)) {
        this.createParticle(message)
      }
    }
  }

  /**
   * Set Focus State
   * 
   * Update which particles should be visually marked as focus/next.
   */
  setFocusState(focusId: string | null, nextId: string | null): void {
    this.focusId = focusId
    this.nextId = nextId
  }

  private createParticle(message: GriefMessage): void {
    const id = message.id.toString()

    const position = vec.random(
      CONFIG.SPACE_X_MIN,
      CONFIG.SPACE_X_MAX,
      CONFIG.SPACE_Y_MIN,
      CONFIG.SPACE_Y_MAX,
      CONFIG.SPACE_Z_MIN,
      CONFIG.SPACE_Z_MAX
    )

    const velocity: Vector3D = {
      x: this.p5.random(-CONFIG.PARTICLE_VELOCITY_MAX, CONFIG.PARTICLE_VELOCITY_MAX),
      y: this.p5.random(-CONFIG.PARTICLE_VELOCITY_MAX, CONFIG.PARTICLE_VELOCITY_MAX),
      z: this.p5.random(-CONFIG.PARTICLE_VELOCITY_MAX * 0.5, CONFIG.PARTICLE_VELOCITY_MAX * 0.5),
    }

    const particle: Particle = {
      id,
      message,
      position: { ...position },
      originalPosition: { ...position },
      velocity,
      size: this.calculateSize(message),
      brightness: 0.3, // Start at 30% to avoid color artifacts during fade-in
      color: this.determineColor(message),
      age: 0,
      fadeOut: false,
    }

    this.particles.set(id, particle)
  }

  private calculateSize(message: GriefMessage): number {
    const now = Date.now()
    const createdAt = new Date(message.created_at).getTime()
    const age = now - createdAt

    const isNew = age < CONFIG.NEW_MESSAGE_HIGHLIGHT_DURATION
    return isNew ? CONFIG.PARTICLE_NEW_SIZE : CONFIG.PARTICLE_BASE_SIZE
  }

  private determineColor(message: GriefMessage): Color {
    // Direct RGB for emissive materials (HSL conversion doesn't work correctly)
    // Soft votive candle glow: RGB(255, 200, 120) - warm golden yellow
    return {
      h: 255, // Use h/s/l fields to store RGB values
      s: 200,
      l: 120,
    }
  }

  update(): void {
    this.frame++

    for (const [id, particle] of Array.from(this.particles.entries())) {
      if (particle.fadeOut) {
        particle.brightness -= CONFIG.PARTICLE_FADE_OUT_SPEED
        if (particle.brightness <= 0) {
          this.particles.delete(id)
          continue
        }
      }

      particle.age++

      if (particle.brightness < 1.0 && !particle.fadeOut) {
        particle.brightness = Math.min(1.0, particle.brightness + CONFIG.PARTICLE_FADE_IN_SPEED)
      }

      if (particle.size > CONFIG.PARTICLE_BASE_SIZE) {
        particle.size = Math.max(CONFIG.PARTICLE_BASE_SIZE, particle.size - CONFIG.PARTICLE_SIZE_DECAY)
      }

      // PARTICLES ARE STATIONARY - position stays at originalPosition
      // NO MOVEMENT
    }
  }

  render(): void {
    this.p5.push()

    // Normal blend mode - additive causes shading artifacts
    this.p5.blendMode(this.p5.BLEND)

    const sorted = Array.from(this.particles.values()).sort((a, b) => a.position.z - b.position.z)

    for (const particle of sorted) {
      this.renderParticle(particle)
    }

    this.p5.pop()
  }

  /**
   * EMISSIVE RENDERING - Simple and clean
   * No sampling complexity yet - add that later for connection physics
   */
  private renderParticle(particle: Particle): void {
    this.p5.push()

    this.p5.translate(particle.position.x, particle.position.y, particle.position.z)

    // Distance-based scaling for depth
    const cameraZ = 800
    const distFromCamera = cameraZ - particle.position.z
    const scaleFactor = this.p5.map(distFromCamera, 650, 950, 1.3, 0.7)
    let renderSize = particle.size * scaleFactor

    // Very aggressive distance-based dimming for strong depth
    const distanceDim = this.p5.map(distFromCamera, 650, 950, 1.0, 0.25)
    
    // Use color values directly as RGB (not HSL)
    let r = particle.color.h  // Actually RGB values stored in h/s/l fields
    let g = particle.color.s
    let b = particle.color.l

    // Visual markers for focus and next particles
    const isFocus = this.focusId === particle.id
    const isNext = this.nextId === particle.id

    if (isFocus) {
      // Focus particle: 2x size, bright white
      renderSize *= 2.0
      r = 255
      g = 255
      b = 255
    } else if (isNext) {
      // Next particle: 1.5x size, bright blue
      renderSize *= 1.5
      r = 100
      g = 150
      b = 255
    }

    // For emissive materials, boost to visible range
    const boost = 1.5
    const finalBrightness = particle.brightness * distanceDim * boost

    this.p5.noStroke()
    this.p5.emissiveMaterial(
      r * finalBrightness,
      g * finalBrightness,
      b * finalBrightness
    )

    // Single sphere - keeps brightness consistent
    this.p5.sphere(renderSize, 24, 18)

    this.p5.pop()
  }

  getParticles(): Map<string, Particle> {
    return this.particles
  }

  getParticle(id: string): Particle | undefined {
    return this.particles.get(id)
  }

  getParticleCount(): number {
    return this.particles.size
  }

  applyForce(forceFn: (position: Vector3D) => Vector3D): void {
    for (const particle of this.particles.values()) {
      const force = forceFn(particle.position)
      particle.velocity.x += force.x
      particle.velocity.y += force.y
      particle.velocity.z += force.z

      const speed = vec.magnitude(particle.velocity)
      if (speed > CONFIG.PARTICLE_VELOCITY_MAX) {
        particle.velocity = vec.setMagnitude(particle.velocity, CONFIG.PARTICLE_VELOCITY_MAX)
      }
    }
  }

  getFrame(): number {
    return this.frame
  }

  reset(): void {
    this.particles.clear()
    this.frame = 0
  }
}
