# Catenary Curves in Connection Lines

## What is Catenary?

A **catenary** is the natural curve formed by a flexible chain or cable hanging under its own weight between two fixed points. It's the shape you see in:
- Suspension bridge cables
- Power lines between poles  
- Spider silk strands in a web
- Any flexible material responding to gravity

The catenary is nature's solution to tension and weight. Unlike a parabola (which it resembles), the catenary curve has specific mathematical properties that make it uniquely stable and organic-looking.

---

## Why Catenary Matters for House of Mourning

### The Aesthetic Goal

Connection lines must feel like **gossamer spider silk** - delicate, organic, living threads that:
- **Never appear straight or rigid** (no engineered constraints)
- **Have natural slack and looseness** (like hanging fabric or web strands)
- **Move with gentle, coordinated breathing** (like wind through a web)
- **Exhibit gradual, elegant curvature** (no sharp angles or "joints")

The user's precise phrasing: *"Lines should feel like gossamer, like a delicate spider web."*

### The Technical Challenge

Creating realistic catenary curves in a 2D physics simulation requires:
1. **Inherent curvature** - Lines must rest in curved positions, not straight
2. **Natural slack** - Longer lines should be "looser" than shorter lines
3. **Smooth motion** - No jerky parametric sliding that creates visible joints
4. **Organic variation** - Each line should have unique character

---

## Implementation: `perpHomeOffset`

### Core Concept

Instead of control points resting on the **straight line** between particles, they rest at a **naturally curved position** perpendicular to the line. This is the `perpHomeOffset` value.

```typescript
// From spring-physics-utils.ts

// Calculate natural slack based on line length
const slackFactor = 0.15 + (normalizedLength * 0.35)
const baseSlack = maxPerpDeviation * slackFactor

// Each control point gets a perpendicular "home" position that's CURVED
const slackDirection = Math.random() < 0.5 ? -1 : 1
const slackVariation = 0.8 + Math.random() * 0.4
const perpHomeOffset = baseSlack * slackDirection * slackVariation
```

### What This Achieves

**Without `perpHomeOffset`** (spring to straight line):
```
Particle A ──────────── Control Point ──────────── Particle B
             ↑ springs pull toward this straight line
```
Result: Lines look straight, only deviate when forces applied, snap back to rigid line.

**With `perpHomeOffset`** (spring to naturally curved position):
```
Particle A ─────┐              ┌───── Particle B
                 ╲            ╱
                  ● ← perpHomeOffset (curved rest position)
```
Result: Lines are **always curved**, even at rest. Motion is gentle drift around curved equilibrium.

### Length-Dependent Slack

Short lines (50-100px):
- `slackFactor ≈ 0.15-0.20` (15-20% of max deviation)
- Taut, minimal droop
- Higher "spring tension" feel

Long lines (400-600px):  
- `slackFactor ≈ 0.50` (50% of max deviation)
- Loose, significant natural curve
- Lower "spring tension" feel

**Physical analogy:** Short spider silk under high tension vs long silk sagging under its own weight.

---

## Spring Physics Integration

### The Physics System

Each control point has **dual-axis physics**:

**Parametric Axis** (slides along line length):
- Home position: `tHome` (0.33 or 0.67)
- Current position: `t` (0 to 1)
- Spring force pulls toward `tHome`
- **CRITICAL: Very weak forces** - parametric sliding must be minimal

**Perpendicular Axis** (billows sideways from line):
- Home position: `perpHomeOffset` (the catenary curve!)
- Current position: `perpOffset`
- Spring force pulls toward `perpHomeOffset`
- **Stronger forces** - this creates the primary visible motion

### Force Balance

```typescript
// In spring-physics-update.ts

// Spring force toward CURVED home position (catenary)
const springForce = cp.springConstant * (cp.perpHomeOffset - cp.perpOffset)

// Damping proportional to velocity
const dampingForce = -cp.damping * cp.perpVelocity

// External forces (global breathing, flow field)
const totalForce = springForce + dampingForce + cp.perpendicularForce
```

The control point oscillates around `perpHomeOffset`, not around zero. This creates the **permanent catenary curve**.

---

## The Parametric Problem

### Why Parametric Motion is Dangerous

Parametric sliding (control points moving along the line's length) can create visible "joints" where the Bezier curve has sharp inflection points:

```
Bad (too much parametric motion):

t=0         t=0.2      t=0.4       t=0.7       t=1.0
Particle ──●─────────●──────────────●─────── Particle
           ↑         ↑              ↑
        Control  Control         Control
        Point 1  Point 1         Point 1
                 moved!          moved again!
                 
Result: Visible discontinuities, "wiggling joints"
```

Good (minimal parametric motion):
```
t=0         t=0.33                  t=0.67      t=1.0
Particle ──────●──────────────────────●────── Particle
               ↑                      ↑
            Control                Control
            Point 1                Point 2
            (stays near 0.33)      (stays near 0.67)
            
Result: Smooth catenary curve, gentle billowing
```

### Current Configuration

```typescript
parametric: {
  longitudinalScale: 0.05,  // VERY WEAK parametric forces
  // Control points resist sliding along line
  // Primary motion is perpendicular billowing
}
```

**User requirement:** "Control point resistance to parametric forces needs to be MUCH, MUCH greater."

**Translation:** `longitudinalScale` should be even smaller, approaching zero. Control points should be nearly **locked** in their parametric positions, only allowed to billow perpendicular to the line.

---

## Global Forces: System Breathing

The catenary curves don't just sit static - they **breathe as a system**:

```typescript
// Temporal breathing (all lines together)
const breathe1 = Math.sin(globalTime * 0.3) * 3
const breathe2 = Math.sin(globalTime * 0.19) * 2
const breathe3 = Math.sin(globalTime * 0.13) * 1.5

// Spatial waves (regional coordination)
const spatialWave1 = Math.sin(lineCenterX * 0.003 + wavePhase) * 2
const spatialWave2 = Math.cos(lineCenterY * 0.004 + wavePhase * 0.7) * 1.5

// Apply to perpendicular axis (creates coordinated billowing)
cp.perpendicularForce += breathe1 + breathe2 + breathe3 + spatialWave1 + spatialWave2
```

The catenary curves **oscillate around their curved rest positions** in slow, coordinated waves. This creates the "spider web responding to gentle wind" effect.

---

## Visual Result

### What You See

**At rest:**
- Lines have gentle, natural curves (the catenary shape)
- No two lines curve exactly the same (random `slackVariation`)
- Longer lines sag more than shorter lines

**In motion:**
- Lines billow perpendicular to their direction
- Curves deepen and shallow in slow waves
- System breathes as coordinated whole
- No visible "joints" or sharp inflection points

### What You Don't See

- Parametric sliding (control points locked near t=0.33 and t=0.67)
- Straight lines (even briefly)
- Mechanical, rigid constraints
- Abrupt changes or discontinuities

---

## Museum-Quality References

The catenary curve aesthetic is inspired by:

**teamLab - "Universe of Water Particles":**
- Flowing particle streams with natural hanging curves
- Organic, non-rigid motion
- Coordinated system behavior

**Nonotak - "Shiro":**
- Geometric precision with organic flexibility
- Light beams that feel alive, not mechanical
- Elegant simplicity of form

**Deep Sea Bioluminescence:**
- Jellyfish tentacles with natural hanging curves
- Coordinated pulsing motion
- Gossamer-like delicate structures

---

## Configuration Summary

### Current Values (Approved)

```typescript
// Natural slack/looseness
slackFactor: 0.15 + (normalizedLength * 0.35)
// Short lines: 15% slack, Long lines: 50% slack

// Parametric resistance
longitudinalScale: 0.05
// Very weak - control points resist sliding

// Perpendicular spring
springConstant: 0.8 (base, then length-scaled)
// Soft springs for gentle motion

// Damping
damping: 0.45
// Moderate damping for smooth settling
```

### Pending Adjustment

**User feedback:** "Control point resistance to parametric forces needs to be MUCH, MUCH greater."

**Proposed:** Reduce `longitudinalScale` from 0.05 to 0.01 or lower.
**Effect:** Control points become nearly locked at t=0.33 and t=0.67, all visible motion is perpendicular billowing around catenary curve.

---

## Technical Notes

### Why Not Real Catenary Math?

True catenary curves require solving hyperbolic cosine equations:
```
y = a * cosh(x/a)
```

For real-time physics simulation, this is:
- Computationally expensive
- Difficult to animate smoothly
- Overkill for the aesthetic goal

**Our approach:** Cubic Bezier curves with physics-driven control points approximates catenary curves while being:
- Fast to compute (GPU-friendly)
- Smooth to animate (spring physics)
- Tunable (slack factors, spring constants)

The result is **perceptually indistinguishable** from true catenary while being much more flexible.

### Why Dual-Axis?

Single-axis perpendicular-only motion would be simpler, but:
- Creates artificial feeling (too constrained)
- Loses subtle sliding/flowing quality
- Harder to integrate flow field forces (which have both parallel and perpendicular components)

Dual-axis with **dominant perpendicular, minimal parallel** achieves:
- Primarily catenary curve motion (what we see)
- Subtle parallel drift (adds realism)
- Clean force decomposition (flow field integration)

---

## Future: Flow Field Integration

When flow field sampling is enabled (Stage 3):

```typescript
// Sample shader gradient → velocity vector
const flow = sampleFlowField(backgroundLayer, cp.x, cp.y)

// Decompose into line's coordinate system
const { parallel, perpendicular } = decomposeForce(flow, lineDirection)

// Apply to control point (mostly perpendicular)
cp.perpendicularForce += perpendicular * strength
cp.parallelForce += parallel * strength  // Much weaker
```

The catenary curves will **follow the cosmic shader patterns** while maintaining their natural hanging curve quality. Bright shader regions create active billowing, dark regions allow gentle settling toward catenary rest position.

---

## Summary

**Catenary curves = the foundation of organic line aesthetics.**

By giving control points a **curved rest position** (`perpHomeOffset`) instead of a straight rest position, connection lines:
- Always exhibit natural hanging curve (like spider silk or cables)
- Have length-dependent slack (physical realism)
- Move via perpendicular billowing (minimizes visible joints)
- Breathe as coordinated system (museum-quality choreography)

The result: **Gossamer spider web that feels alive, not engineered.**
