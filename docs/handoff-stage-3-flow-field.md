# Stage 3 Handoff: Flow Field Integration
**Date:** November 25, 2025  
**Feature Branch:** `feature/connection-line-spring-physics`  
**For:** Claude Code  
**Status:** Ready to implement  
**Prerequisites:** Stage 2 complete and tested ✅

---

## OVERVIEW

Connect the spring physics system to the cosmic shader background. Control points will sample the flow field at their positions and respond to the velocity data, creating organic environmental responsiveness. The shader becomes the "wind" that moves the gossamer spider web.

**Reference:** See `/docs/spring-physics-implementation-plan.md` Section on Flow Field Integration

---

## WHAT'S CHANGING

### Current State (Stage 2)
- Lines have internal physics (springs, damping)
- Random initial perturbations create motion
- Global breathing forces create system coherence
- **No environmental awareness** - lines don't know about shader flow

### Target State (Stage 3)
- Lines **sample shader flow field** at control point positions
- Flow field provides **continuous external forces**
- Forces decomposed into **parallel (sliding) and perpendicular (billowing)** components
- **Smoothing** prevents jitter from noisy flow field
- Random initial perturbations can be **reduced or removed** (flow field provides continuous stimulus)

---

## TECHNICAL CHALLENGE

**Problem:** The cosmic shader renders to a WebGL graphics buffer. We need to:
1. **Sample pixel data** from shader at specific (x, y) positions
2. **Interpret pixel colors** as velocity vectors (flow direction + magnitude)
3. **Apply as forces** to control points

**Current shader info:**
- Background shader: `cosmicFragmentShader` renders to `backgroundLayer` (p5.Graphics WEBGL)
- Outputs RGB color values (0-255 range)
- Animated noise patterns create visual flow

**Critical architectural concern:**
- Desktop has TWO shaders (background + foreground fog)
- Mobile has ONE shader (background only)
- Shader brightness/opacity may be tuned for visual reasons
- **We must NOT couple physics behavior to visual tuning**
- Solution: Use gradient-based sampling (measures rate of change, not absolute values)

---

## IMPLEMENTATION TASKS

### Task 1: Create Flow Field Sampling Utilities
**File:** `/lib/physics/flow-field-sampling.ts` (new file)

```typescript
/**
 * Flow field sampling for spring physics
 * Stage 3: Extract velocity data from shader output
 * 
 * CRITICAL: Uses gradient-based sampling to decouple physics from visual tuning
 * Brightness/opacity adjustments don't affect physics behavior
 */

import { Vector2D, ConnectionLinePhysics } from '@/lib/types/spring-physics'
import { SpringPhysicsConfig } from '@/lib/config/spring-physics-config'

/**
 * Sample flow field velocity using GRADIENTS (robust method)
 * Measures rate of change in brightness, not absolute values
 * Immune to shader brightness/opacity tuning
 */
export function sampleFlowField(
  shaderGraphics: any, // p5.Graphics with shader output
  x: number,
  y: number
): Vector2D {
  const offset = 3  // Pixels to sample for gradient calculation
  
  // Clamp sampling positions to stay in bounds
  const width = shaderGraphics.width
  const height = shaderGraphics.height
  const clampX = (val: number) => Math.max(0, Math.min(width - 1, val))
  const clampY = (val: number) => Math.max(0, Math.min(height - 1, val))
  
  // Sample 5 points: center + cardinal directions
  const center = shaderGraphics.get(clampX(x), clampY(y))
  const right = shaderGraphics.get(clampX(x + offset), clampY(y))
  const left = shaderGraphics.get(clampX(x - offset), clampY(y))
  const down = shaderGraphics.get(clampX(x), clampY(y + offset))
  const up = shaderGraphics.get(clampX(x), clampY(y - offset))
  
  // Use brightness (average of RGB) for gradient
  const getBrightness = (pixel: number[]) => (pixel[0] + pixel[1] + pixel[2]) / 3
  
  const centerBright = getBrightness(center)
  const rightBright = getBrightness(right)
  const leftBright = getBrightness(left)
  const downBright = getBrightness(down)
  const upBright = getBrightness(up)
  
  // Calculate gradients (central difference)
  // Positive gradX = flow to the right, negative = flow to left
  // Positive gradY = flow downward, negative = flow upward
  const gradX = (rightBright - leftBright) / (2 * offset)
  const gradY = (downBright - upBright) / (2 * offset)
  
  // Scale to reasonable velocity magnitude
  // Tuning: Increase velocityScale for stronger response
  const velocityScale = 0.8  // Start conservative, can increase
  
  return {
    x: gradX * velocityScale,
    y: gradY * velocityScale
  }
}

/**
 * Alternative: Direct color sampling (legacy, less robust)
 * Only use if gradient method has issues
 * CAUTION: Coupled to shader brightness value
 */
export function sampleFlowFieldDirect(
  shaderGraphics: any,
  x: number,
  y: number
): Vector2D {
  const pixel = shaderGraphics.get(x, y)
  
  const vx = (pixel[0] / 255) * 2 - 1
  const vy = (pixel[1] / 255) * 2 - 1
  
  const velocityScale = 2.0
  
  return {
    x: vx * velocityScale,
    y: vy * velocityScale
  }
}

/**
 * Decompose a force vector into parallel and perpendicular components
 * relative to a line's direction
 */
export function decomposeForce(
  force: Vector2D,
  lineDirection: Vector2D
): { parallel: number, perpendicular: number } {
  // Parallel component (dot product)
  const parallel = force.x * lineDirection.x + force.y * lineDirection.y
  
  // Perpendicular component (cross product in 2D)
  const perpendicular = force.x * lineDirection.y - force.y * lineDirection.x
  
  return { parallel, perpendicular }
}

/**
 * Sample flow field for a connection line's control points
 * Applies throttling and force decomposition
 */
export function sampleFlowFieldForConnection(
  connection: { physics: ConnectionLinePhysics },
  shaderGraphics: any,
  particles: Map<string, any>,
  config: SpringPhysicsConfig,
  fromId: string,
  toId: string
): void {
  if (!config.flowField.enabled || !connection.physics) return
  
  // Throttle sampling based on config sample rate
  const now = Date.now()
  if (now - connection.physics.lastFlowFieldUpdate < 1000 / config.flowField.sampleRate) {
    return
  }
  connection.physics.lastFlowFieldUpdate = now
  
  const fromParticle = particles.get(fromId)
  const toParticle = particles.get(toId)
  if (!fromParticle || !toParticle) return
  
  // Sample at parametric positions along the line
  const cp1 = connection.physics.controlPoint1
  const cp2 = connection.physics.controlPoint2
  
  // Calculate actual positions for sampling
  // Use the straight line positions (not the curved positions)
  const samplePos1 = {
    x: fromParticle.x + (toParticle.x - fromParticle.x) * cp1.t,
    y: fromParticle.y + (toParticle.y - fromParticle.y) * cp1.t
  }
  
  const samplePos2 = {
    x: fromParticle.x + (toParticle.x - fromParticle.x) * cp2.t,
    y: fromParticle.y + (toParticle.y - fromParticle.y) * cp2.t
  }
  
  // Sample flow field at both positions
  const flow1 = sampleFlowField(shaderGraphics, samplePos1.x, samplePos1.y)
  const flow2 = sampleFlowField(shaderGraphics, samplePos2.x, samplePos2.y)
  
  // Decompose into line's coordinate system
  const decomposed1 = decomposeForce(flow1, connection.physics.direction)
  const decomposed2 = decomposeForce(flow2, connection.physics.direction)
  
  // Apply with length-scaled influence and config strength
  const strength = config.flowField.influenceStrength
  
  // Control point 1
  const force1Parallel = decomposed1.parallel * strength * cp1.flowFieldInfluence
  const force1Perp = decomposed1.perpendicular * strength * cp1.flowFieldInfluence
  
  // Control point 2
  const force2Parallel = decomposed2.parallel * strength * cp2.flowFieldInfluence
  const force2Perp = decomposed2.perpendicular * strength * cp2.flowFieldInfluence
  
  // Add to force accumulators (will be applied in physics update)
  cp1.parallelForce += force1Parallel
  cp1.perpendicularForce += force1Perp
  
  cp2.parallelForce += force2Parallel
  cp2.perpendicularForce += force2Perp
}
```

---

### Task 2: Add Force Smoothing
**File:** `/lib/types/spring-physics.ts` (modify existing)

Add force history tracking to ControlPoint interface:

```typescript
export interface ControlPoint {
  // ... existing properties
  
  // === FORCE SMOOTHING (Stage 3) ===
  forceHistory: {
    parallel: number[]
    perpendicular: number[]
  }
}
```

**File:** `/lib/physics/spring-physics-utils.ts` (modify existing)

Initialize force history in `createControlPoint`:

```typescript
const createControlPoint = (tHome: number): ControlPoint => {
  // ... existing initialization
  
  return {
    // ... existing properties
    
    forceHistory: {
      parallel: [],
      perpendicular: []
    }
  }
}
```

**File:** `/lib/physics/flow-field-sampling.ts` (add to existing)

```typescript
/**
 * Smooth forces using exponential moving average
 * Prevents jitter from noisy flow field
 */
export function smoothForces(
  cp: ControlPoint,
  config: SpringPhysicsConfig
): void {
  const frames = config.flowField.smoothingFrames
  
  // Add current forces to history
  cp.forceHistory.parallel.push(cp.parallelForce)
  cp.forceHistory.perpendicular.push(cp.perpendicularForce)
  
  // Keep only recent history
  if (cp.forceHistory.parallel.length > frames) {
    cp.forceHistory.parallel.shift()
    cp.forceHistory.perpendicular.shift()
  }
  
  // Average over history
  if (cp.forceHistory.parallel.length > 0) {
    cp.parallelForce = cp.forceHistory.parallel.reduce((a, b) => a + b, 0) / cp.forceHistory.parallel.length
    cp.perpendicularForce = cp.forceHistory.perpendicular.reduce((a, b) => a + b, 0) / cp.forceHistory.perpendicular.length
  }
}
```

---

### Task 3: Integrate Flow Field Sampling into Draw Loop
**File:** `/app/installation/page.tsx` (modify existing)

**Step 3a: Import the new utilities**

Add to imports at top:
```typescript
import {
  sampleFlowFieldForConnection,
  smoothForces
} from '@/lib/physics/flow-field-sampling'
```

**Step 3b: Enable flow field in config**

Change this line in the physics update section:
```typescript
const physicsConfig = DEFAULT_SPRING_PHYSICS_CONFIG
```

To:
```typescript
const physicsConfig = {
  ...DEFAULT_SPRING_PHYSICS_CONFIG,
  flowField: {
    ...DEFAULT_SPRING_PHYSICS_CONFIG.flowField,
    enabled: true  // Enable flow field sampling
  }
}
```

**Step 3c: Add flow field sampling before physics update**

In the draw loop, find the physics update section (around line 670). Add flow field sampling:

```typescript
connections.forEach(conn => {
  const fromParticle = particles.get(conn.fromId)
  const toParticle = particles.get(conn.toId)

  if (!fromParticle || !toParticle) return

  // Initialize physics if not already done
  if (!conn.physics) {
    conn.physics = initializeConnectionPhysics(fromParticle, toParticle, physicsConfig)
  }

  // Update line geometry
  updateLineGeometry(conn.physics, fromParticle, toParticle)
  
  // === NEW: SAMPLE FLOW FIELD ===
  // IMPORTANT: Always sample backgroundLayer (present on both mobile and desktop)
  // Do NOT sample foregroundLayer (only exists on desktop, used for fog)
  sampleFlowFieldForConnection(
    { physics: conn.physics },
    backgroundLayer,  // ALWAYS use background - consistent across devices
    particles,
    physicsConfig,
    conn.fromId,
    conn.toId
  )
  
  // === NEW: SMOOTH FORCES ===
  smoothForces(conn.physics.controlPoint1, physicsConfig)
  smoothForces(conn.physics.controlPoint2, physicsConfig)
  
  // === APPLY GLOBAL COHERENT FORCES ===
  // (existing code remains)
  const lineCenterX = (fromParticle.x + toParticle.x) / 2
  // ... rest of global forces code
```

**Step 3d: Reduce initial random perturbations (optional)**

Once flow field is providing continuous forces, we can reduce the dramatic initial perturbations.

In `/lib/physics/spring-physics-utils.ts`, reduce the random perturbation amounts:

```typescript
// BEFORE (Stage 2 testing):
const initialPerpOffset = (Math.random() - 0.5) * maxPerpDeviation * 0.9
const initialPerpVelocity = (Math.random() - 0.5) * 8
const initialTOffset = (Math.random() - 0.5) * 0.15

// AFTER (Stage 3 - flow field provides stimulus):
const initialPerpOffset = (Math.random() - 0.5) * maxPerpDeviation * 0.3  // Reduced from 0.9
const initialPerpVelocity = (Math.random() - 0.5) * 3  // Reduced from 8
const initialTOffset = (Math.random() - 0.5) * 0.05  // Reduced from 0.15
```

This gives a gentler startup since the flow field will provide ongoing motion.

---

## TESTING REQUIREMENTS

### Visual Tests

1. **Lines respond to shader patterns**
   - Watch for correlation between shader flow and line movement
   - Lines in bright shader areas should move more dramatically
   - Lines in dark/calm areas should move gently

2. **Smooth motion (not jittery)**
   - No rapid flickering or stuttering
   - Force smoothing prevents noise artifacts
   - Motion feels continuous and organic

3. **Directional response**
   - Lines should respond directionally to flow patterns
   - Perpendicular forces create billowing
   - Parallel forces create sliding along line length

4. **Length-dependent response**
   - Long lines should respond more to flow (higher flowFieldInfluence)
   - Short lines should be more resistant (lower flowFieldInfluence)
   - Verify this scales correctly

### Physics Tests

1. **Force accumulation works**
   - Flow field forces add to global breathing forces
   - Multiple force sources combine correctly
   - Springs still return lines to rest when forces cease

2. **Sampling rate throttling**
   - Check that sampling only happens at configured rate (45Hz default)
   - Console log to verify throttling works
   - No performance hit from over-sampling

3. **Force smoothing effective**
   - Compare with/without smoothing (set smoothingFrames to 1 vs 3)
   - Smoothing should eliminate jitter without excessive lag
   - 3-frame average is good starting point

### Performance Tests

1. **FPS maintained**
   - Desktop: 60 FPS
   - Mobile: 30+ FPS
   - No drops from flow field sampling

2. **Pixel sampling cost**
   - `shaderGraphics.get()` can be expensive
   - Throttling to 45Hz should keep cost manageable
   - If performance issues, can reduce sample rate further

---

## TUNING PARAMETERS

After implementation, these values may need adjustment:

### In `/lib/physics/flow-field-sampling.ts`:

```typescript
// GRADIENT-BASED SAMPLING (new robust method)
const velocityScale = 0.8  // Try range: 0.5 - 2.0
// Lower starting point because gradients are already scaled by pixel differences
// Increase if response is too subtle

// How strongly flow field affects lines
const strength = config.flowField.influenceStrength  // Default: 1.2
// Try range: 0.5 (subtle) to 3.0 (dramatic)

// IMPORTANT: Gradient method is immune to shader brightness changes
// You can now tune u_brightness for visual appearance without affecting physics
```

### In `/lib/config/spring-physics-config.ts`:

```typescript
flowField: {
  enabled: true,
  sampleRate: 45,              // Try: 30-60 Hz
  influenceStrength: 1.2,      // Try: 0.5-3.0
  smoothingFrames: 3           // Try: 2-5 frames
}
```

### Balancing Forces

If flow field overwhelms other forces or vice versa:

```typescript
// In draw loop, tune relative strengths:
const globalPerpendicularForce = breathe1 + breathe2 + breathe3 + spatialWave1 + spatialWave2 + spatialWave3
// vs
const flowFieldForce = decomposed1.perpendicular * strength * cp1.flowFieldInfluence

// Can add multipliers to balance:
const GLOBAL_FORCE_SCALE = 1.0
const FLOW_FIELD_SCALE = 1.0
```

---

## DEBUGGING TIPS

### If lines don't respond to shader:

**Check 1: Is flow field sampling happening?**
```typescript
// Add temporary logging in sampleFlowFieldForConnection:
console.log('[FLOW] Sampled at', samplePos1, 'velocity:', flow1)
```

**Check 2: Are forces being applied?**
```typescript
// Add temporary logging after decomposition:
console.log('[FLOW] CP1 forces - parallel:', force1Parallel, 'perp:', force1Perp)
```

**Check 3: Is shader data accessible?**
```typescript
// Test pixel sampling:
const testPixel = backgroundLayer.get(100, 100)
console.log('[SHADER] Pixel at 100,100:', testPixel)
```

### If motion is too jittery:

- Increase `smoothingFrames` from 3 to 5 or 7
- Reduce `influenceStrength` from 1.2 to 0.8
- Check that smoothing is actually being called

### If motion is too subtle:

- Increase `influenceStrength` from 1.2 to 2.0 or higher
- Increase `velocityScale` from 2.0 to 4.0
- Check that forces are actually non-zero (add logging)

### If performance drops:

- Reduce `sampleRate` from 45 to 30 Hz
- Consider sampling only visible connections
- Profile with browser dev tools to find bottleneck

---

## SUCCESS CRITERIA

Stage 3 is complete when:

- [ ] Flow field sampling utility created and working
- [ ] Force smoothing implemented
- [ ] Flow field sampling integrated into draw loop
- [ ] Lines respond visibly to shader flow patterns
- [ ] Motion is smooth (not jittery)
- [ ] Longer lines respond more dramatically than short lines
- [ ] 60 FPS maintained on desktop
- [ ] Motion feels organic and environmentally aware
- [ ] System still breathes as coherent whole (global forces + flow field)
- [ ] Can tune force balance between global breathing and flow field
  - [ ] **CRITICAL: Adjusting shader brightness does NOT change physics behavior**
  - [ ] Works identically on mobile (one shader) and desktop (two shaders)

---

## NOTES FOR JAMES

### Why Gradient-Based Sampling?

**The Problem We're Avoiding:**
If we sampled absolute pixel brightness:
- Reduce `u_brightness` from 0.15 to 0.08 → sampled values halve → lines barely move
- Increase foreground fog opacity → darker pixels → weaker velocities
- Visual tuning accidentally breaks physics

**The Solution:**
Gradient-based sampling measures **rate of change**:
- Looks at brightness difference between adjacent pixels
- Flow direction = which way brightness increases
- Flow magnitude = how steep the brightness change
- **Completely independent of absolute brightness**

**What This Means:**
- Tune shader brightness for gallery projection (may need very dim)
- Tune fog opacity for atmospheric depth
- Adjust tinting for color palette
- **Physics behavior remains consistent**

**Trade-off:**
- 5x pixel samples per control point (but throttled to 45Hz, so cost is acceptable)
- Slightly more complex calculation
- Worth it for robustness

### Expected Behavior

After Stage 3, you should see:

**Macro level:**
- Lines respond to visible shader patterns
- Bright/active shader areas → more line movement
- Dark/calm shader areas → gentle line movement
- System still breathes as one (global forces remain)

**Micro level:**
- Lines sample their local environment
- Each line responds to its specific position in shader
- Creates spatial variation (some areas active, some calm)
- Length scaling means small lines resist flow, big lines dance with it

### Flow Field Interpretation Strategy

The shader outputs RGB colors, not explicit velocity vectors. We're interpreting color as velocity:
- **Red channel** → X velocity component
- **Green channel** → Y velocity component
- **Intensity** → Magnitude

This is a heuristic—if it doesn't feel right, we can try:
- Different channel mappings
- Gradient-based velocity (sample nearby pixels, calculate direction of change)
- Multiple sampling points per control point

### Next After Stage 3

Once flow field integration is working well:
- **Stage 4**: Event perturbations (message appearances create ripples)
- **Stage 5**: Final tuning and polish
- **Stage 6**: Audio integration prep

---

## HANDOFF CHECKLIST FOR CLAUDE CODE

- [ ] Read this entire document
- [ ] Create `/lib/physics/flow-field-sampling.ts`
- [ ] Modify `/lib/types/spring-physics.ts` (add force history)
- [ ] Modify `/lib/physics/spring-physics-utils.ts` (init force history, reduce perturbations)
- [ ] Modify `/app/installation/page.tsx` (integrate sampling)
- [ ] Test on localhost:3001/installation
- [ ] Verify lines respond to shader
- [ ] Verify motion is smooth
- [ ] Verify performance is good (60 FPS desktop)
- [ ] Report results

Ready to implement! 🌊
