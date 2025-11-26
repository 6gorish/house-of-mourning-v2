# Spring Physics Implementation Plan
## Connection Line System for House of Mourning
**Feature Branch:** `feature/connection-line-spring-physics`  
**Goal:** Museum-quality organic line behavior with deep emotional resonance  
**Standard:** teamLab/Nonotak-level polish and sophistication

---

## DESIGN PHILOSOPHY

**Core Principle:** Connection lines are **living threads** that respond to the cosmic flow field and the appearance of grief messages. They must feel:
- **Inevitable** - like they emerged from natural forces, not algorithms
- **Responsive** - attuned to their environment without being hyperactive
- **Contemplative** - gentle, measured movements that support reflection
- **Interconnected** - individual lines form a breathing system

**Visual Reference Points:**
- teamLab's "Universe of Water Particles" - organic flow and connection
- Nonotak's "Shiro" - geometric precision meeting organic movement
- Deep sea bioluminescence - gentle pulsing and swaying
- Gothic cathedral light through stained glass - reverent, measured, luminous

**Key Physical Insights:**
1. **Length-scaled stiffness** - Shorter lines have more flexural strength
2. **Parametric sliding** - Forces along line direction cause control points to translate, not just displace laterally
3. **Dual degrees of freedom** - Control points can both slide along the line and deviate perpendicular to it
4. **Proportional response** - Longer lines catch more "wind" from flow fields

---

## ARCHITECTURE OVERVIEW

### Data Structure Design

```typescript
// /lib/types/spring-physics.ts

interface ControlPoint {
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
  flowFieldInfluence: number   // Sensitivity to external forces
  
  // === FORCE ACCUMULATORS ===
  parallelForce: number        // Forces along line direction
  perpendicularForce: number   // Forces lateral to line
  
  // === COMPUTED RENDERING POSITION ===
  x: number                    // Final screen position
  y: number
}

interface ConnectionLinePhysics {
  controlPoint1: ControlPoint
  controlPoint2: ControlPoint
  
  // === LINE PROPERTIES ===
  length: number               // Euclidean distance between particles
  direction: Vector2D          // Normalized direction vector
  perpDirection: Vector2D      // 90° rotation for lateral forces
  
  // === COUPLING ===
  couplingStrength: number     // How much cp1 influences cp2 [0, 1]
  
  // === FLOW FIELD SAMPLING ===
  flowFieldSamplePoints: Vector2D[]  // Where to sample shader noise
  lastFlowFieldUpdate: number        // Throttle sampling
}
```

### Configuration Parameters

```typescript
// /lib/config/spring-physics-config.ts

export interface SpringPhysicsConfig {
  // === GLOBAL ENABLE/DISABLE ===
  enabled: boolean
  
  // === BASE PHYSICS VALUES ===
  base: {
    springConstant: number      // Starting point: 0.5 - 2.0
    damping: number             // Energy loss: 0.1 - 0.5
    mass: number                // Inertia: 0.8 - 1.5
  }
  
  // === LENGTH SCALING ===
  lengthScaling: {
    springExponent: number      // k ∝ 1/length^n (suggest 1.0 - 2.0)
    massExponent: number        // mass ∝ length^n (suggest 0.5 - 1.0)
    deviationFactor: number     // maxDev = length * factor (suggest 0.10 - 0.20)
    flowInfluenceExponent: number  // influence ∝ length^n (suggest 0.3 - 0.7)
  }
  
  // === PARAMETRIC POSITION ===
  parametric: {
    enabled: boolean            // Toggle longitudinal sliding
    minT: number                // Prevent bunching at start (0.1)
    maxT: number                // Prevent bunching at end (0.9)
    longitudinalScale: number   // Dampen sliding vs billowing (0.2 - 0.5)
    bounceRestitution: number   // Energy loss at t limits (0.2 - 0.4)
  }
  
  // === CONTROL POINT COUPLING ===
  coupling: {
    enabled: boolean
    strength: number            // 0 = independent, 1 = move together (0.0 - 0.3)
    delay: number               // Frames before cp1 influences cp2 (1 - 3)
  }
  
  // === FLOW FIELD INTEGRATION ===
  flowField: {
    enabled: boolean
    sampleRate: number          // Hz (30 - 60)
    influenceStrength: number   // Force multiplier (0.5 - 2.0)
    smoothingFrames: number     // Average over N frames (2 - 5)
  }
  
  // === EVENT PERTURBATIONS ===
  perturbations: {
    enabled: boolean
    
    messageAppearance: {
      strength: number          // Force magnitude (5.0 - 20.0)
      radius: number            // Influence distance (100 - 300)
      falloffExponent: number   // Distance attenuation (1.5 - 2.5)
    }
    
    focusTransition: {
      strength: number          // Larger than appearance (10.0 - 40.0)
      radius: number            // Wider influence (150 - 400)
      directional: boolean      // Push away from old focus?
    }
    
    relatedCascade: {
      strength: number          // Gentle (2.0 - 8.0)
      radius: number            // Localized (50 - 150)
      sequential: boolean       // Propagate through cascade?
    }
  }
  
  // === PERFORMANCE ===
  performance: {
    updateFrequency: number     // Physics Hz (30 - 60)
    distantSimplification: boolean  // Use sine waves for distant lines?
    simplificationDistance: number  // Threshold (800 - 1200)
  }
  
  // === DEVICE-SPECIFIC OVERRIDES ===
  deviceOverrides: {
    mobile: Partial<SpringPhysicsConfig>
    tablet: Partial<SpringPhysicsConfig>
  }
}
```

### Default Configuration Values

```typescript
export const DEFAULT_SPRING_PHYSICS_CONFIG: SpringPhysicsConfig = {
  enabled: true,
  
  base: {
    springConstant: 1.2,
    damping: 0.25,
    mass: 1.0
  },
  
  lengthScaling: {
    springExponent: 1.5,        // Quadratic-ish: shorter = much stiffer
    massExponent: 0.7,          // Slightly sublinear: longer = heavier but not proportionally
    deviationFactor: 0.15,      // Allow 15% of line length as max deviation
    flowInfluenceExponent: 0.5  // Square root: longer lines catch more flow
  },
  
  parametric: {
    enabled: true,
    minT: 0.15,
    maxT: 0.85,
    longitudinalScale: 0.35,    // Sliding is gentler than billowing
    bounceRestitution: 0.3
  },
  
  coupling: {
    enabled: true,
    strength: 0.2,              // Subtle influence between control points
    delay: 2
  },
  
  flowField: {
    enabled: true,
    sampleRate: 45,             // Sample at 45Hz
    influenceStrength: 1.2,
    smoothingFrames: 3
  },
  
  perturbations: {
    enabled: true,
    
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
    distantSimplification: true,
    simplificationDistance: 1000
  },
  
  deviceOverrides: {
    mobile: {
      base: { springConstant: 1.0, damping: 0.3 },
      performance: { updateFrequency: 30 },
      flowField: { sampleRate: 30, smoothingFrames: 4 }
    },
    tablet: {
      performance: { updateFrequency: 45 },
      flowField: { sampleRate: 40 }
    }
  }
}
```

---

## IMPLEMENTATION STAGES

### STAGE 1: Architecture & Design Decisions
**Who:** We decide together  
**Outcome:** Complete technical specification for Claude Code

**Key Decisions:**
1. Config parameter starting values
2. Control point coupling strength
3. Flow field sampling strategy
4. Perturbation strength ranges
5. Longitudinal vs. lateral scaling

### STAGE 2: Core Spring Physics Implementation
**Who:** Claude Code implements  
**Duration:** 1-2 hours  
**Outcome:** Working physics simulation without external forces

**Tasks:**
1. Create type definitions (`/lib/types/spring-physics.ts`)
2. Create configuration file (`/lib/config/spring-physics-config.ts`)
3. Initialize physics system for each connection
4. Implement physics update loop
5. Integrate with draw loop

**Testing Criteria:**
- Lines oscillate gently around straight paths
- Shorter lines oscillate faster (higher k)
- Longer lines oscillate more slowly (lower k, higher mass)
- All control points eventually settle to rest

### STAGE 3: Flow Field Integration
**Who:** Claude Code implements  
**Duration:** 1-2 hours  
**Outcome:** Lines respond to shader background

**Tasks:**
1. Implement flow field sampling at control point positions
2. Decompose flow vectors into parallel/perpendicular components
3. Apply forces with length-scaled influence
4. Add force smoothing to prevent jitter

**Testing Criteria:**
- Lines respond to shader flow patterns
- Longer lines show more dramatic response
- Motion is smooth, not jittery
- No unstable feedback loops

### STAGE 4: Event-Driven Perturbations
**Who:** Claude Code implements  
**Duration:** 2-3 hours  
**Outcome:** Lines respond to message appearances and transitions

**Tasks:**
1. Implement radial perturbation system
2. Add event hooks for message appearances
3. Add event hooks for focus transitions
4. Implement cascade propagation (if sequential)

**Testing Criteria:**
- Lines react when nearby messages appear
- Perturbations fade naturally with distance
- Focus transitions create visible ripples
- Related cascade creates sequential wave

### STAGE 5: Control Point Coupling
**Who:** Claude Code implements  
**Duration:** 30 minutes  
**Outcome:** Control points influence each other for wave-like behavior

**Tasks:**
1. Implement coupling forces between cp1 and cp2
2. Test with different coupling strengths
3. Add optional delay for wave propagation

**Testing Criteria:**
- Lines show coordinated motion when coupling enabled
- Wave-like behavior for higher coupling values
- Independent behavior when coupling disabled

### STAGE 6: Rendering Integration
**Who:** Claude Code implements  
**Duration:** 30 minutes  
**Outcome:** Bezier curves use physics-driven control points

**Tasks:**
1. Modify connection rendering to use physics positions
2. Ensure smooth Bezier curves
3. Verify no visual artifacts or kinks

**Testing Criteria:**
- Bezier curves render smoothly
- No kinks or discontinuities
- Physics positions integrate seamlessly

### STAGE 7: Performance Optimization
**Who:** We do together, Claude Code implements  
**Duration:** 1-2 hours  
**Outcome:** 60 FPS on desktop, 30+ on mobile

**Tasks:**
1. Implement distance-based simplification
2. Add fixed timestep with accumulator
3. Apply device-specific configurations
4. Profile and optimize hot paths

**Testing Criteria:**
- 60 FPS on desktop consistently
- 30+ FPS on mobile
- No memory leaks
- Smooth cluster transitions

### STAGE 8: Tuning & Refinement
**Who:** We do together (iterative)  
**Duration:** 3-5 hours of experimentation  
**Outcome:** Museum-quality feel, strong affective resonance

**Process:**
1. Adjust parameters systematically
2. Compare against reference materials
3. Test emotional/aesthetic impact
4. Document what feels right
5. Iterate until museum-quality achieved

**Testing Protocol:**
- Visual quality checklist
- Physical plausibility verification
- Emotional resonance assessment
- Performance validation

### STAGE 9: Audio Integration Prep (Future)
**Who:** We design together, Claude Code implements  
**Duration:** TBD (after sonification system exists)  
**Outcome:** Hooks ready for audio-reactive forces

**Planned Features:**
- Low frequencies → global slow waves
- Mid frequencies → localized perturbations
- High frequencies → subtle sparkle
- Integration with existing force system

---

## PHYSICS IMPLEMENTATION DETAILS

### Force Decomposition

When external forces (flow field, audio, events) act on control points, they must be decomposed into line's coordinate system:

```typescript
function decomposeForce(
  force: Vector2D,
  lineDirection: Vector2D
): { parallel: number, perpendicular: number } {
  // Parallel component (dot product)
  const parallel = force.x * lineDirection.x + force.y * lineDirection.y
  
  // Perpendicular component (cross product in 2D)
  const perpendicular = force.x * lineDirection.y - force.y * lineDirection.x
  
  return { parallel, perpendicular }
}
```

**Parallel forces** → control points slide along line (change t)  
**Perpendicular forces** → control points deviate laterally (change perpOffset)

### Length Scaling Formulas

```typescript
// Spring constant: shorter lines are stiffer
const k = baseK / Math.pow(length / referenceLength, springExponent)

// Mass: longer lines have more inertia
const mass = baseMass * Math.pow(length / referenceLength, massExponent)

// Max deviation: proportional to length
const maxDev = length * deviationFactor

// Flow field influence: longer lines catch more "wind"
const influence = Math.pow(length / referenceLength, flowInfluenceExponent)
```

### Physics Update Loop

```typescript
function updateControlPointPhysics(
  cp: ControlPoint,
  linePhysics: ConnectionLinePhysics,
  config: SpringPhysicsConfig,
  dt: number
): void {
  // === LONGITUDINAL (PARAMETRIC) PHYSICS ===
  const tSpringForce = -cp.springConstant * (cp.t - cp.tHome)
  const tDampingForce = -cp.damping * cp.tVelocity
  const tTotalForce = (
    cp.parallelForce * config.parametric.longitudinalScale +
    tSpringForce +
    tDampingForce
  )
  
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
  const perpSpringForce = -cp.springConstant * cp.perpOffset
  const perpDampingForce = -cp.damping * cp.perpVelocity
  const perpTotalForce = cp.perpendicularForce + perpSpringForce + perpDampingForce
  
  const perpAccel = perpTotalForce / cp.perpMass
  cp.perpVelocity += perpAccel * dt
  cp.perpOffset += cp.perpVelocity * dt
  
  // Constrain perpendicular with bounce
  if (Math.abs(cp.perpOffset) > cp.maxPerpDeviation) {
    cp.perpOffset = Math.sign(cp.perpOffset) * cp.maxPerpDeviation
    cp.perpVelocity *= -config.parametric.bounceRestitution
  }
  
  // Reset force accumulators
  cp.parallelForce = 0
  cp.perpendicularForce = 0
}
```

### Position Calculation

```typescript
function calculateControlPointPosition(
  cp: ControlPoint,
  fromParticle: Particle,
  linePhysics: ConnectionLinePhysics
): void {
  // Point along straight line at parameter t
  const linePointX = fromParticle.x + linePhysics.direction.x * linePhysics.length * cp.t
  const linePointY = fromParticle.y + linePhysics.direction.y * linePhysics.length * cp.t
  
  // Add perpendicular offset
  cp.x = linePointX + linePhysics.perpDirection.x * cp.perpOffset
  cp.y = linePointY + linePhysics.perpDirection.y * cp.perpOffset
}
```

### Radial Perturbations

```typescript
function applyRadialPerturbation(
  sourceParticle: Particle,
  connections: Connection[],
  strength: number,
  radius: number,
  falloffExponent: number
): void {
  connections.forEach(conn => {
    if (!conn.physics) return
    
    [conn.physics.controlPoint1, conn.physics.controlPoint2].forEach(cp => {
      // Calculate control point's current world position
      const cpWorldPos = calculateWorldPosition(cp, conn.physics)
      
      // Distance from source
      const dx = cpWorldPos.x - sourceParticle.x
      const dy = cpWorldPos.y - sourceParticle.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > radius) return
      
      // Calculate falloff
      const falloff = Math.pow(1 - (distance / radius), falloffExponent)
      
      // Radial direction (away from source)
      const radialDir = { x: dx / distance, y: dy / distance }
      
      // Decompose radial force into line's coordinate system
      const force = {
        x: radialDir.x * strength * falloff,
        y: radialDir.y * strength * falloff
      }
      
      const decomposed = decomposeForce(force, conn.physics.direction)
      
      // Apply forces
      cp.parallelForce += decomposed.parallel
      cp.perpendicularForce += decomposed.perpendicular
    })
  })
}
```

---

## TUNING GUIDELINES

### For Subtle, Contemplative Motion

```typescript
lengthScaling: {
  deviationFactor: 0.08,          // Very constrained billowing
  springExponent: 2.0,            // Strong length dependence
  flowInfluenceExponent: 0.3      // Long lines barely more responsive
}

parametric: {
  longitudinalScale: 0.2          // Minimal sliding
}

coupling: {
  strength: 0.3                   // More coordinated, wave-like
}
```

### For More Dramatic, Organic Motion

```typescript
lengthScaling: {
  deviationFactor: 0.20,          // Generous billowing
  springExponent: 1.2,            // Moderate length dependence
  flowInfluenceExponent: 0.7      // Long lines much more responsive
}

parametric: {
  longitudinalScale: 0.5          // Noticeable sliding
}

coupling: {
  strength: 0.1                   // More independent, chaotic
}
```

### Testing Checklist

**Visual Quality:**
- [ ] Short lines (< 150px) barely deviate
- [ ] Long lines (> 500px) billow gracefully
- [ ] Motion feels organic, not mechanical
- [ ] Lines never cross particles awkwardly
- [ ] Bezier curves remain smooth (no kinks)
- [ ] Focus-next transition feels intentional

**Physical Plausibility:**
- [ ] Longer lines respond more slowly (higher mass)
- [ ] Shorter lines are visibly stiffer (higher k)
- [ ] Lines settle to rest naturally (damping)
- [ ] Perturbations propagate realistically
- [ ] No unstable oscillations or explosions

**Emotional Resonance:**
- [ ] Motion supports contemplation (not distracting)
- [ ] Lines feel alive but not hyperactive
- [ ] System breathes as a unified whole
- [ ] Connections feel inevitable, natural
- [ ] Aesthetic aligns with "votive candles" metaphor

**Performance:**
- [ ] 60 FPS on desktop (consistently)
- [ ] 30+ FPS on mobile
- [ ] No memory leaks during long sessions
- [ ] Debug mode shows stable metrics
- [ ] No frame drops during cluster transitions

---

## IMPLEMENTATION ORDER

**Day 1-2: Foundation**
1. Core physics system (Stage 2)
2. Integration with draw loop

**Day 3: External Forces**
3. Flow field integration (Stage 3)
4. Event perturbations (Stage 4)

**Day 4: Polish**
5. Control point coupling (Stage 5)
6. Rendering refinement (Stage 6)
7. Performance optimization (Stage 7)

**Day 5+: Refinement**
8. Iterative tuning (Stage 8)
9. Multiple test sessions
10. Comparative analysis with references

---

## DELEGATION STRATEGY

### You (Strategic Decisions):
- Parameter values in config
- Aesthetic judgment calls
- Tuning session feedback
- Performance vs. quality tradeoffs
- "Does this feel right?" determinations

### Claude Code (Implementation):
- All code writing
- Type definitions
- Physics calculations
- Integration with existing systems
- Performance optimization
- Bug fixes
- Testing and verification

### We Do Together:
- Architecture design
- Force decomposition strategy
- Coupling implementation approach
- Event hook placement
- Tuning parameter adjustments
- Performance profiling analysis

---

## REFERENCE MATERIALS

**Visual References:**
- teamLab "Universe of Water Particles"
- Nonotak "Shiro" installation
- Underwater kelp forest footage
- Gothic cathedral light effects
- Aurora borealis time-lapses
- Deep sea bioluminescence

**Technical References:**
- Spring-mass-damper systems
- Parametric curves and Bezier mathematics
- Force decomposition in 2D
- Distance-based force attenuation
- Fixed timestep physics integration

---

## SUCCESS CRITERIA

The system achieves museum quality when:

1. **Visitors cannot articulate why it works** - the motion feels inevitable
2. **Lines support contemplation** - they don't compete for attention
3. **The system breathes** - individual movements cohere into unified rhythm
4. **Physical intuition is satisfied** - short lines are stiffer, long lines billow
5. **Performance is invisible** - no dropped frames or hitches
6. **Affective resonance** - the motion evokes connection, attunement, integration

This is the standard. Nothing less will suffice for December 19-20, 2025.
