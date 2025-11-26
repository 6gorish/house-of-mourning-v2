# Stage 2 Handoff: Core Spring Physics Implementation
**Date:** November 25, 2025  
**Feature Branch:** `feature/connection-line-spring-physics`  
**For:** Claude Code  
**Status:** Ready to implement  

---

## OVERVIEW

Implement the foundational spring physics system for connection lines. At the end of this stage, lines will oscillate naturally around their straight-line paths, with shorter lines being stiffer and longer lines being more flexible. NO external forces yet—just internal spring/damping physics.

**Reference:** See `/docs/spring-physics-implementation-plan.md` for complete architecture

---

## APPROVED CONFIGURATION VALUES

All default values have been approved by James. Use these exactly as specified:

```typescript
base: {
  springConstant: 1.2,
  damping: 0.25,
  mass: 1.0
}

lengthScaling: {
  springExponent: 1.5,
  massExponent: 0.7,
  deviationFactor: 0.15,
  flowInfluenceExponent: 0.5
}

parametric: {
  enabled: true,
  minT: 0.15,
  maxT: 0.85,
  longitudinalScale: 0.35,
  bounceRestitution: 0.3
}

coupling: {
  enabled: true,
  strength: 0.2,
  delay: 2
}
```

---

## IMPLEMENTATION TASKS

### Task 1: Create Type Definitions
**File:** `/lib/types/spring-physics.ts` (new file)

Create complete type definitions for the physics system:

```typescript
export interface Vector2D {
  x: number
  y: number
}

export interface ControlPoint {
  // === PARAMETRIC POSITION (slides along line) ===
  t: number                    // Current position [0.0, 1.0]
  tHome: number                // Resting position (0.33 or 0.67)
  tVelocity: number            // Velocity of sliding
  tMass: number                // Inertia for longitudinal motion
  
  // === PERPENDICULAR DEVIATION (billows sideways) ===
  perpOffset: number           // Distance from straight line
  perpVelocity: number         // Velocity of lateral motion
  perpMass: number             // Inertia for lateral motion
  
  // === PHYSICS PROPERTIES (length-scaled) ===
  springConstant: number       // k = baseK / length^exponent
  damping: number              // Energy dissipation
  maxPerpDeviation: number     // length * deviationFactor
  flowFieldInfluence: number   // Sensitivity to external forces (for future use)
  
  // === FORCE ACCUMULATORS ===
  parallelForce: number        // Forces along line direction
  perpendicularForce: number   // Forces lateral to line
  
  // === COMPUTED RENDERING POSITION ===
  x: number                    // Final screen position
  y: number                    // Final screen position
}

export interface ConnectionLinePhysics {
  controlPoint1: ControlPoint
  controlPoint2: ControlPoint
  
  // === LINE PROPERTIES ===
  length: number               // Euclidean distance between particles
  direction: Vector2D          // Normalized direction vector
  perpDirection: Vector2D      // 90° rotation for lateral forces
  
  // === COUPLING ===
  couplingStrength: number     // How much cp1 influences cp2 [0, 1]
  
  // === FLOW FIELD SAMPLING (for future use) ===
  flowFieldSamplePoints: Vector2D[]
  lastFlowFieldUpdate: number
}
```

---

### Task 2: Create Configuration File
**File:** `/lib/config/spring-physics-config.ts` (new file)

Create the complete configuration structure with all approved default values:

```typescript
export interface SpringPhysicsConfig {
  // === GLOBAL ENABLE/DISABLE ===
  enabled: boolean
  
  // === BASE PHYSICS VALUES ===
  base: {
    springConstant: number
    damping: number
    mass: number
  }
  
  // === LENGTH SCALING ===
  lengthScaling: {
    springExponent: number
    massExponent: number
    deviationFactor: number
    flowInfluenceExponent: number
  }
  
  // === PARAMETRIC POSITION ===
  parametric: {
    enabled: boolean
    minT: number
    maxT: number
    longitudinalScale: number
    bounceRestitution: number
  }
  
  // === CONTROL POINT COUPLING ===
  coupling: {
    enabled: boolean
    strength: number
    delay: number
  }
  
  // === FLOW FIELD INTEGRATION (for future use) ===
  flowField: {
    enabled: boolean
    sampleRate: number
    influenceStrength: number
    smoothingFrames: number
  }
  
  // === EVENT PERTURBATIONS (for future use) ===
  perturbations: {
    enabled: boolean
    
    messageAppearance: {
      strength: number
      radius: number
      falloffExponent: number
    }
    
    focusTransition: {
      strength: number
      radius: number
      directional: boolean
    }
    
    relatedCascade: {
      strength: number
      radius: number
      sequential: boolean
    }
  }
  
  // === PERFORMANCE ===
  performance: {
    updateFrequency: number
    distantSimplification: boolean
    simplificationDistance: number
  }
  
  // === DEVICE-SPECIFIC OVERRIDES ===
  deviceOverrides: {
    mobile: Partial<SpringPhysicsConfig>
    tablet: Partial<SpringPhysicsConfig>
  }
}

export const DEFAULT_SPRING_PHYSICS_CONFIG: SpringPhysicsConfig = {
  enabled: true,
  
  base: {
    springConstant: 1.2,
    damping: 0.25,
    mass: 1.0
  },
  
  lengthScaling: {
    springExponent: 1.5,
    massExponent: 0.7,
    deviationFactor: 0.15,
    flowInfluenceExponent: 0.5
  },
  
  parametric: {
    enabled: true,
    minT: 0.15,
    maxT: 0.85,
    longitudinalScale: 0.35,
    bounceRestitution: 0.3
  },
  
  coupling: {
    enabled: true,
    strength: 0.2,
    delay: 2
  },
  
  flowField: {
    enabled: false,  // Will enable in Stage 3
    sampleRate: 45,
    influenceStrength: 1.2,
    smoothingFrames: 3
  },
  
  perturbations: {
    enabled: false,  // Will enable in Stage 4
    
    messageAppearance: {
      strength: 12.0,
      radius: 200,
      falloffExponent: 2.0
    },
    
    focusTransition: {
      strength: 25.0,
      radius: 300,
      directional: true
    },
    
    relatedCascade: {
      strength: 5.0,
      radius: 100,
      sequential: true
    }
  },
  
  performance: {
    updateFrequency: 60,
    distantSimplification: false,  // Will enable in Stage 7
    simplificationDistance: 1000
  },
  
  deviceOverrides: {
    mobile: {
      base: { springConstant: 1.0, damping: 0.3 },
      performance: { updateFrequency: 30 }
    },
    tablet: {
      performance: { updateFrequency: 45 }
    }
  }
}
```

---

### Task 3: Create Physics Utility Functions
**File:** `/lib/physics/spring-physics-utils.ts` (new file)

Helper functions for physics calculations:

```typescript
import { Vector2D, ControlPoint, ConnectionLinePhysics } from '@/lib/types/spring-physics'
import { SpringPhysicsConfig } from '@/lib/config/spring-physics-config'

/**
 * Initialize physics properties for a connection line
 */
export function initializeConnectionPhysics(
  fromParticle: { x: number; y: number },
  toParticle: { x: number; y: number },
  config: SpringPhysicsConfig
): ConnectionLinePhysics {
  // Calculate line geometry
  const dx = toParticle.x - fromParticle.x
  const dy = toParticle.y - fromParticle.y
  const length = Math.sqrt(dx * dx + dy * dy)
  
  // Normalized direction vector
  const direction: Vector2D = {
    x: dx / length,
    y: dy / length
  }
  
  // Perpendicular direction (90° rotation)
  const perpDirection: Vector2D = {
    x: -direction.y,
    y: direction.x
  }
  
  // Calculate length-scaled properties
  const referenceLength = 300  // Baseline for normalization
  const normalizedLength = length / referenceLength
  
  const springConstant = config.base.springConstant / 
    Math.pow(normalizedLength, config.lengthScaling.springExponent)
  
  const mass = config.base.mass * 
    Math.pow(normalizedLength, config.lengthScaling.massExponent)
  
  const maxPerpDeviation = length * config.lengthScaling.deviationFactor
  
  const flowFieldInfluence = 
    Math.pow(normalizedLength, config.lengthScaling.flowInfluenceExponent)
  
  // Create control points
  const createControlPoint = (tHome: number): ControlPoint => ({
    t: tHome,
    tHome,
    tVelocity: 0,
    tMass: mass,
    
    perpOffset: 0,
    perpVelocity: 0,
    perpMass: mass,
    
    springConstant,
    damping: config.base.damping,
    maxPerpDeviation,
    flowFieldInfluence,
    
    parallelForce: 0,
    perpendicularForce: 0,
    
    x: 0,  // Will be calculated
    y: 0
  })
  
  return {
    controlPoint1: createControlPoint(0.33),
    controlPoint2: createControlPoint(0.67),
    length,
    direction,
    perpDirection,
    couplingStrength: config.coupling.strength,
    flowFieldSamplePoints: [],
    lastFlowFieldUpdate: 0
  }
}

/**
 * Update line geometry (call if particles move, though they shouldn't)
 */
export function updateLineGeometry(
  physics: ConnectionLinePhysics,
  fromParticle: { x: number; y: number },
  toParticle: { x: number; y: number }
): void {
  const dx = toParticle.x - fromParticle.x
  const dy = toParticle.y - fromParticle.y
  const length = Math.sqrt(dx * dx + dy * dy)
  
  physics.length = length
  physics.direction = { x: dx / length, y: dy / length }
  physics.perpDirection = { x: -physics.direction.y, y: physics.direction.x }
}

/**
 * Calculate final rendering position for a control point
 */
export function calculateControlPointPosition(
  cp: ControlPoint,
  fromParticle: { x: number; y: number },
  linePhysics: ConnectionLinePhysics
): void {
  // Point along straight line at parameter t
  const linePointX = fromParticle.x + linePhysics.direction.x * linePhysics.length * cp.t
  const linePointY = fromParticle.y + linePhysics.direction.y * linePhysics.length * cp.t
  
  // Add perpendicular offset
  cp.x = linePointX + linePhysics.perpDirection.x * cp.perpOffset
  cp.y = linePointY + linePhysics.perpDirection.y * cp.perpOffset
}

/**
 * Apply coupling forces between control points
 */
export function applyCoupling(
  linePhysics: ConnectionLinePhysics,
  config: SpringPhysicsConfig
): void {
  if (!config.coupling.enabled || config.coupling.strength === 0) return
  
  const cp1 = linePhysics.controlPoint1
  const cp2 = linePhysics.controlPoint2
  const strength = config.coupling.strength
  
  // Couple parametric positions
  const avgTVelocity = (cp1.tVelocity + cp2.tVelocity) / 2
  const tCouplingForce1 = (avgTVelocity - cp1.tVelocity) * strength
  const tCouplingForce2 = (avgTVelocity - cp2.tVelocity) * strength
  
  cp1.parallelForce += tCouplingForce1 * cp1.tMass
  cp2.parallelForce += tCouplingForce2 * cp2.tMass
  
  // Couple perpendicular offsets
  const avgPerpVelocity = (cp1.perpVelocity + cp2.perpVelocity) / 2
  const perpCouplingForce1 = (avgPerpVelocity - cp1.perpVelocity) * strength
  const perpCouplingForce2 = (avgPerpVelocity - cp2.perpVelocity) * strength
  
  cp1.perpendicularForce += perpCouplingForce1 * cp1.perpMass
  cp2.perpendicularForce += perpCouplingForce2 * cp2.perpMass
}
```

---

### Task 4: Create Physics Update Function
**File:** `/lib/physics/spring-physics-update.ts` (new file)

Core physics simulation loop:

```typescript
import { ControlPoint, ConnectionLinePhysics } from '@/lib/types/spring-physics'
import { SpringPhysicsConfig } from '@/lib/config/spring-physics-config'

/**
 * Update control point physics for one timestep
 */
export function updateControlPointPhysics(
  cp: ControlPoint,
  linePhysics: ConnectionLinePhysics,
  config: SpringPhysicsConfig,
  dt: number
): void {
  // === LONGITUDINAL (PARAMETRIC) PHYSICS ===
  
  // Spring force: pull t back to home position
  const tSpringForce = -cp.springConstant * (cp.t - cp.tHome)
  
  // Damping force: resist velocity
  const tDampingForce = -cp.damping * cp.tVelocity
  
  // Total longitudinal force
  // Note: parallelForce will be zero for now (no external forces yet)
  const tTotalForce = (
    cp.parallelForce * config.parametric.longitudinalScale +
    tSpringForce +
    tDampingForce
  )
  
  // Update parametric position
  const tAccel = tTotalForce / cp.tMass
  cp.tVelocity += tAccel * dt
  cp.t += cp.tVelocity * dt
  
  // Constrain t with bounce
  if (cp.t < config.parametric.minT) {
    cp.t = config.parametric.minT
    cp.tVelocity *= -config.parametric.bounceRestitution
  } else if (cp.t > config.parametric.maxT) {
    cp.t = config.parametric.maxT
    cp.tVelocity *= -config.parametric.bounceRestitution
  }
  
  // === PERPENDICULAR (LATERAL) PHYSICS ===
  
  // Spring force: pull perpOffset back to zero
  const perpSpringForce = -cp.springConstant * cp.perpOffset
  
  // Damping force
  const perpDampingForce = -cp.damping * cp.perpVelocity
  
  // Total perpendicular force
  // Note: perpendicularForce will be zero for now (no external forces yet)
  const perpTotalForce = (
    cp.perpendicularForce +
    perpSpringForce +
    perpDampingForce
  )
  
  // Update perpendicular deviation
  const perpAccel = perpTotalForce / cp.perpMass
  cp.perpVelocity += perpAccel * dt
  cp.perpOffset += cp.perpVelocity * dt
  
  // Constrain perpendicular with bounce
  if (Math.abs(cp.perpOffset) > cp.maxPerpDeviation) {
    cp.perpOffset = Math.sign(cp.perpOffset) * cp.maxPerpDeviation
    cp.perpVelocity *= -config.parametric.bounceRestitution
  }
  
  // Reset force accumulators for next frame
  cp.parallelForce = 0
  cp.perpendicularForce = 0
}
```

---

### Task 5: Integrate with Installation Page
**File:** `/app/installation/page.tsx` (modify existing)

Add physics initialization and update to the draw loop:

**Step 5a: Add imports at top of file**
```typescript
import { ConnectionLinePhysics } from '@/lib/types/spring-physics'
import { DEFAULT_SPRING_PHYSICS_CONFIG } from '@/lib/config/spring-physics-config'
import {
  initializeConnectionPhysics,
  updateLineGeometry,
  calculateControlPointPosition,
  applyCoupling
} from '@/lib/physics/spring-physics-utils'
import { updateControlPointPhysics } from '@/lib/physics/spring-physics-update'
```

**Step 5b: Add physics property to Connection interface**

Find the Connection interface (or wherever connections are typed) and add:
```typescript
interface Connection {
  // ... existing properties
  physics?: ConnectionLinePhysics  // Add this
}
```

**Step 5c: Initialize physics in draw loop**

In the draw loop, BEFORE rendering connections, add physics updates:

```typescript
// Inside draw() function, before connection rendering

const FIXED_DT = 1 / 60  // Fixed timestep for stability
const config = DEFAULT_SPRING_PHYSICS_CONFIG

connections.forEach(conn => {
  const fromParticle = particles.get(conn.fromId)
  const toParticle = particles.get(conn.toId)
  
  if (!fromParticle || !toParticle) return
  
  // Initialize physics if not already done
  if (!conn.physics) {
    conn.physics = initializeConnectionPhysics(fromParticle, toParticle, config)
  }
  
  // Update line geometry (in case particles moved, though they shouldn't)
  updateLineGeometry(conn.physics, fromParticle, toParticle)
  
  // Update physics for both control points
  updateControlPointPhysics(conn.physics.controlPoint1, conn.physics, config, FIXED_DT)
  updateControlPointPhysics(conn.physics.controlPoint2, conn.physics, config, FIXED_DT)
  
  // Apply coupling if enabled
  if (config.coupling.enabled) {
    applyCoupling(conn.physics, config)
  }
  
  // Calculate final rendering positions
  calculateControlPointPosition(conn.physics.controlPoint1, fromParticle, conn.physics)
  calculateControlPointPosition(conn.physics.controlPoint2, fromParticle, conn.physics)
})
```

**Step 5d: Modify connection rendering to use physics positions**

Find the connection rendering code (the part that draws Bezier curves). Change from:

```typescript
// OLD: Fixed control points
ctx.bezierCurveTo(
  someFixedX1, someFixedY1,
  someFixedX2, someFixedY2,
  to.x, to.y
)
```

To:

```typescript
// NEW: Physics-driven control points
if (conn.physics) {
  const cp1 = conn.physics.controlPoint1
  const cp2 = conn.physics.controlPoint2
  
  ctx.bezierCurveTo(
    cp1.x, cp1.y,
    cp2.x, cp2.y,
    to.x, to.y
  )
} else {
  // Fallback to straight line if physics not initialized
  ctx.lineTo(to.x, to.y)
}
```

---

## TESTING REQUIREMENTS

After implementation, verify these behaviors:

### Visual Tests
1. **Lines oscillate naturally**
   - Lines should gently curve and sway
   - Movement should settle to rest (not infinite oscillation)
   - No jittery or erratic behavior

2. **Length scaling works correctly**
   - Short lines (< 150px) should barely move
   - Long lines (> 500px) should billow more dramatically
   - Medium lines should be in between

3. **Rendering is smooth**
   - No kinks or discontinuities in Bezier curves
   - Control points stay on screen (don't fly off)
   - Lines don't cross particles awkwardly

### Physics Tests
1. **Springs return to rest**
   - Start with some initial perturbation (manually set perpOffset = 50)
   - Verify line oscillates then settles
   - Should take ~2-3 seconds to fully settle

2. **Coupling works**
   - Both control points should move somewhat together
   - Not perfectly synchronized (strength = 0.2)
   - More independent than coordinated

3. **Parametric constraints work**
   - Control points never go below t = 0.15
   - Control points never go above t = 0.85
   - Bounce back if they hit limits

### Performance Tests
1. **Framerate maintained**
   - Should still hit 60 FPS on desktop
   - Debug mode should show stable metrics
   - No memory leaks during long sessions

2. **All connections have physics**
   - Check debug output: all connections initialized?
   - No undefined or null physics objects
   - Physics survives cluster transitions

---

## DEBUGGING TIPS

### If lines don't move at all:
- Check that physics is being initialized (`conn.physics` exists)
- Check that `updateControlPointPhysics` is being called
- Add console.log to verify forces are non-zero
- Verify timestep dt is reasonable (1/60 = 0.0166...)

### If lines move but never settle:
- Check damping value (should be 0.25)
- Verify spring constant is positive
- Check for infinite loops in constraint code
- Add logging to watch velocity decay over time

### If lines explode off screen:
- Check spring constant isn't too high
- Verify mass isn't too low (would cause high acceleration)
- Check constraint code is working (t and perpOffset limits)
- Reduce timestep if needed (try 1/120 instead of 1/60)

### If short lines move as much as long lines:
- Verify length scaling calculations
- Check normalizedLength is being computed correctly
- Log springConstant for different line lengths
- Should see: shorter lines → higher k → less movement

---

## SUCCESS CRITERIA

Stage 2 is complete when:

- [ ] All type definitions created and compile without errors
- [ ] Configuration file created with all approved values
- [ ] Physics utility functions implemented
- [ ] Physics update function implemented
- [ ] Physics integrated into draw loop
- [ ] All connections have initialized physics
- [ ] Lines oscillate gently and settle to rest
- [ ] Short lines are visibly stiffer than long lines
- [ ] Bezier curves render smoothly with physics positions
- [ ] 60 FPS maintained on desktop
- [ ] No console errors or warnings
- [ ] Code compiles and runs without crashes

---

## NEXT STAGE PREVIEW

After Stage 2 is complete and tested, Stage 3 will add:
- Flow field sampling from shader background
- Force decomposition into parallel/perpendicular components
- External force application to control points
- Smoothing to prevent jitter

But for now: focus ONLY on Stage 2. No external forces yet—just springs and damping.

---

## QUESTIONS?

If anything is unclear or you encounter issues:
1. Check the main plan: `/docs/spring-physics-implementation-plan.md`
2. Look at existing connection rendering code for context
3. Add detailed logging to debug physics behavior
4. Test incrementally—add one piece at a time

Ready to implement! 🚀
