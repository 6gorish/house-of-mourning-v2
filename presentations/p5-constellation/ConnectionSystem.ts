/**
 * Connection System - Spring Physics for Billowing Lines
 * 
 * Creates organic, flowing connection lines using spring physics.
 * Lines are composed of spring points that respond to forces.
 */

import type p5 from 'p5'
import type { Vector3D, SpringPoint, Connection } from './types'
import type { FocusState } from './lib/Orchestrator'

export class ConnectionSystem {
  private p5: p5
  private connections: Map<string, Connection> = new Map()
  private springPointsPerLine: number = 12  // More points = smoother curves
  private restSpringConstant: number = 0.05  // Stronger pull toward straight line
  private neighborSpringConstant: number = 0.2  // More aggressive smoothing
  private damping: number = 0.92  // Slightly less damping = more motion
  private flowFieldStrength: number = 1.2  // Much stronger flow for visible billowing

  constructor(p5Instance: p5) {
    this.p5 = p5Instance
  }

  /**
   * Update Endpoints Only
   * 
   * Updates just the first and last spring equilibrium positions.
   * Interior springs maintain their billowing motion.
   */
  updateEndpoints(getParticlePosition: (messageId: string) => Vector3D | null): void {
    for (const connection of this.connections.values()) {
      const fromPos = getParticlePosition(connection.from)
      const toPos = getParticlePosition(connection.to)
      
      if (fromPos && toPos) {
        const springs = connection.springs
        const n = springs.length - 1
        
        // Only update first and last equilibrium
        springs[0].equilibrium = { ...fromPos }
        springs[n].equilibrium = { ...toPos }
      }
    }
  }

  /**
   * Update Connections
   * 
   * Creates/updates connection springs based on current focus state.
   * Called when focus changes or every frame.
   */
  updateConnections(
    focusState: FocusState | null,
    getParticlePosition: (messageId: string) => Vector3D | null
  ): void {
    if (!focusState) {
      this.connections.clear()
      return
    }

    const focusId = focusState.focus.id.toString()
    const focusPos = getParticlePosition(focusId)
    if (!focusPos) return

    // Track which connections should exist
    const activeConnectionIds = new Set<string>()

    // Create/update connections for each related message
    for (const related of focusState.related) {
      const relatedId = related.message.id.toString()
      const relatedPos = getParticlePosition(relatedId)
      if (!relatedPos) continue

      const connectionId = `${focusId}-${relatedId}`
      activeConnectionIds.add(connectionId)

      let connection = this.connections.get(connectionId)
      
      if (!connection) {
        // Create new connection with spring points
        connection = this.createConnection(
          focusId,
          relatedId,
          focusPos,
          relatedPos,
          related.similarity
        )
        this.connections.set(connectionId, connection)
      } else {
        // Update existing connection endpoints
        this.updateConnectionEndpoints(connection, focusPos, relatedPos)
      }
    }

    // Remove connections that no longer exist
    for (const [id, connection] of this.connections.entries()) {
      if (!activeConnectionIds.has(id)) {
        this.connections.delete(id)
      }
    }
  }

  /**
   * Create Connection
   * 
   * Builds a new connection with spring points along the line.
   */
  private createConnection(
    fromId: string,
    toId: string,
    fromPos: Vector3D,
    toPos: Vector3D,
    strength: number
  ): Connection {
    const springs: SpringPoint[] = []

    // Create spring points along the line
    for (let i = 0; i <= this.springPointsPerLine; i++) {
      const t = i / this.springPointsPerLine
      const position: Vector3D = {
        x: this.p5.lerp(fromPos.x, toPos.x, t),
        y: this.p5.lerp(fromPos.y, toPos.y, t),
        z: this.p5.lerp(fromPos.z, toPos.z, t)
      }

      springs.push({
        position: { ...position },
        velocity: { x: 0, y: 0, z: 0 },
        equilibrium: { ...position }
      })
    }

    return {
      from: fromId,
      to: toId,
      strength,
      springs,
      opacity: 1.0
    }
  }

  /**
   * Update Connection Endpoints
   * 
   * Smoothly moves endpoints when particles move.
   * Interior spring points maintain their relative positions.
   */
  private updateConnectionEndpoints(
    connection: Connection,
    fromPos: Vector3D,
    toPos: Vector3D
  ): void {
    const springs = connection.springs
    const n = springs.length - 1

    // Update first and last equilibrium positions
    springs[0].equilibrium = { ...fromPos }
    springs[n].equilibrium = { ...toPos }

    // Update interior equilibrium positions proportionally
    for (let i = 1; i < n; i++) {
      const t = i / n
      springs[i].equilibrium = {
        x: this.p5.lerp(fromPos.x, toPos.x, t),
        y: this.p5.lerp(fromPos.y, toPos.y, t),
        z: this.p5.lerp(fromPos.z, toPos.z, t)
      }
    }
  }

  /**
   * Apply Flow Field Forces
   * 
   * Samples flow field at spring positions and applies forces.
   * This is what makes the lines billow.
   */
  applyFlowField(getFlowVector: (pos: Vector3D) => Vector3D): void {
    for (const connection of this.connections.values()) {
      for (let i = 1; i < connection.springs.length - 1; i++) {
        const spring = connection.springs[i]
        
        // Sample flow field
        const flow = getFlowVector(spring.position)
        
        // Apply flow as force
        spring.velocity.x += flow.x * this.flowFieldStrength
        spring.velocity.y += flow.y * this.flowFieldStrength
        spring.velocity.z += flow.z * this.flowFieldStrength
      }
    }
  }

  /**
   * Update Physics
   * 
   * Applies spring forces and integrates positions.
   * Called every frame.
   */
  update(): void {
    for (const connection of this.connections.values()) {
      const springs = connection.springs
      const n = springs.length
      
      for (let i = 0; i < n; i++) {
        const spring = springs[i]
        
        // Endpoints are locked to particle positions
        if (i === 0 || i === n - 1) {
          spring.position = { ...spring.equilibrium }
          spring.velocity = { x: 0, y: 0, z: 0 }
          continue
        }

        // Interior points: Gentle forces create subtle billowing
        const prev = springs[i - 1]
        const next = springs[i + 1]
        
        // Force 1: Gentle pull toward rest position (straight line)
        const toRest = {
          x: (spring.equilibrium.x - spring.position.x) * this.restSpringConstant,
          y: (spring.equilibrium.y - spring.position.y) * this.restSpringConstant,
          z: (spring.equilibrium.z - spring.position.z) * this.restSpringConstant
        }
        
        // Force 2: Neighbor smoothing
        const toNeighbors = {
          x: ((prev.position.x + next.position.x) / 2 - spring.position.x) * this.neighborSpringConstant,
          y: ((prev.position.y + next.position.y) / 2 - spring.position.y) * this.neighborSpringConstant,
          z: ((prev.position.z + next.position.z) / 2 - spring.position.z) * this.neighborSpringConstant
        }
        
        // Apply forces
        spring.velocity.x += toRest.x + toNeighbors.x
        spring.velocity.y += toRest.y + toNeighbors.y
        spring.velocity.z += toRest.z + toNeighbors.z

        // Damping (very gentle)
        spring.velocity.x *= this.damping
        spring.velocity.y *= this.damping
        spring.velocity.z *= this.damping

        // Integrate position
        spring.position.x += spring.velocity.x
        spring.position.y += spring.velocity.y
        spring.position.z += spring.velocity.z
      }
    }
  }

  /**
   * Render Connections
   * 
   * Draws lines with depth-based visual properties.
   * Lines receding into distance are thinner and more transparent.
   */
  render(nextMessageId: string | null, cameraZ: number): void {
    this.p5.push()

    for (const connection of this.connections.values()) {
      const springs = connection.springs
      
      // Determine if this is the traversal path
      const isTraversalPath = nextMessageId && connection.to === nextMessageId

      this.p5.noFill()
      
      // Draw line segments with depth-based properties
      for (let i = 0; i < springs.length - 1; i++) {
        const p1 = springs[i].position
        const p2 = springs[i + 1].position
        
        // Calculate depth (distance from camera)
        const avgZ = (p1.z + p2.z) / 2
        const distFromCamera = cameraZ - avgZ
        
        // Map distance to visual properties
        // Closer = thicker & more opaque, Further = thinner & more transparent
        const depthFactor = this.p5.map(distFromCamera, 600, 1000, 1.0, 0.2)
        const clampedDepth = this.p5.constrain(depthFactor, 0.2, 1.0)
        
        if (isTraversalPath) {
          // Traversal path: BRIGHT cyan, THICK, OPAQUE
          const weight = this.p5.map(clampedDepth, 0.2, 1.0, 4, 10)
          const alpha = this.p5.map(clampedDepth, 0.2, 1.0, 180, 255)
          this.p5.strokeWeight(weight)
          this.p5.stroke(0, 255, 255, alpha)
        } else {
          // Regular connections: MUCH MORE VISIBLE
          const baseAlpha = connection.strength * 255  // Max out alpha range
          const alpha = Math.max(80, baseAlpha * clampedDepth)  // Never go below 80
          const weight = this.p5.map(clampedDepth, 0.2, 1.0, 2, 5)  // Thicker lines
          this.p5.strokeWeight(weight)
          this.p5.stroke(255, 255, 255, alpha)
        }
        
        this.p5.line(
          p1.x, p1.y, p1.z,
          p2.x, p2.y, p2.z
        )
      }
    }

    this.p5.pop()
  }

  /**
   * Get Connection Count
   */
  getConnectionCount(): number {
    return this.connections.size
  }

  /**
   * Clear All Connections
   */
  clear(): void {
    this.connections.clear()
  }
}
