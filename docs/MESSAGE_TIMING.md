# Message Display Timing System

## Overview

The House of Mourning visualization displays grief messages in **clusters**. Each cluster consists of:
- **1 Focus message**: The primary message, displayed prominently throughout the cycle
- **~10 Related messages**: Semantically similar messages that cascade in pairs
- **1 Next message**: Appears near the end, becoming the focus of the next cluster

The timing system creates a contemplative rhythm: the focus message anchors attention while related messages flow in and out like breathing, building toward a transition to the next focus.

---

## Cluster Cycle Duration

**Total cycle: 26 seconds**

```
0s ─────────────────────────────────────────────────────── 26s
│                                                           │
│  Focus visible ─────────────────────────────────────│fade │
│                                                           │
│  Related pairs cascade ─────────────────────────│fade     │
│                                                           │
│                                              │Next│────── │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## The MESSAGE_TIMING Configuration

Located in `/app/installation/page.tsx`:

```typescript
const MESSAGE_TIMING = {
  // Per-message timing (applies to each related message)
  fadeInDuration: 1.5,       // Seconds to fade in
  holdDuration: 1.0,         // Seconds at full opacity
  fadeOutDuration: 1.5,      // Seconds to fade out
  // Total per message: 4 seconds (1.5 + 1.0 + 1.5)
  
  pairInternalOffset: 1.5,   // Second message in pair starts 1.5s after first
  messageDuration: 4.0,      // Total visibility time per message
  
  // Special message timing
  nextAppearsAt: 23,         // Next message appears at 23s
  focusFadesAt: 24,          // Focus starts fading at 24s
  cycleDuration: 26,         // Total cycle duration
  outgoingFocusFadeStart: 2, // Old focus fades 2s into new cluster
  
  // Connection line timing
  connectionFadeIn: 2,       // Connections fade in over first 2s
  connectionFadeOutStart: 22,// Connections start fading at 22s
  connectionFadeOutDuration: 2, // Connections fade over 2s
  focusNextTurnsRed: 23,     // Focus-next line turns red at 23s
  incomingRedDuration: 4,    // Incoming red line stays red for 4s after transition
}
```

---

## Message Types & Their Lifecycles

### 1. Focus Message

The focus message is the anchor of each cluster. It remains visible throughout most of the cycle.

**Lifecycle:**
```
Time:     0s                                           24s    25.5s  26s
          │                                             │       │     │
Opacity:  │──fade in──│────── full opacity ─────────────│─fade──│     │
          0    →    1                                   1  →   0      transition
          (1.5s)                                        (1.5s)
```

**Special case - "wasNext" focus:**
If the focus message was the previous cluster's "next" message, it's already visible at transition and skips the fade-in. It just maintains full opacity until fade-out.

### 2. Related Messages (Paired Cascade)

Related messages appear in pairs, creating a gentle cascading rhythm. This pattern allows visitors to see connections forming between messages without overwhelming them.

**Pair Timing Formula:**
```
startTime = messageDuration × floor(index / 2) + (isSecondInPair ? pairInternalOffset : 0)
```

**With default values (messageDuration=4, pairInternalOffset=1.5):**

| Index | Pair | Position | Start Time | End Time |
|-------|------|----------|------------|----------|
| 0     | 1    | First    | 0.0s       | 4.0s     |
| 1     | 1    | Second   | 1.5s       | 5.5s     |
| 2     | 2    | First    | 4.0s       | 8.0s     |
| 3     | 2    | Second   | 5.5s       | 9.5s     |
| 4     | 3    | First    | 8.0s       | 12.0s    |
| 5     | 3    | Second   | 9.5s       | 13.5s    |
| 6     | 4    | First    | 12.0s      | 16.0s    |
| 7     | 4    | Second   | 13.5s      | 17.5s    |
| 8     | 5    | First    | 16.0s      | 20.0s    |
| 9     | 5    | Second   | 17.5s      | 21.5s    |
| 10    | 6    | First    | 20.0s      | 24.0s    |

**Each related message opacity curve:**
```
      │   hold
      │  ┌────┐
   1.0├──┤    ├──┐
      │ /      \  \
      │/        \  \
   0.0├──────────────
      0  1.5  2.5  4.0 (seconds into animation)
         fade  hold fade
         in         out
```

### 3. Next Message

The "next" message appears near the end of the cycle, signaling the upcoming transition. It will become the focus of the next cluster.

**Lifecycle:**
```
Time:     0s                    23s                26s
          │                      │                  │
Opacity:  │     (invisible)      │──fade in──│full  │ → becomes focus
                                 0    →    1  1     
                                 (1.5s)
```

---

## Connection Lines

Connection lines connect the focus particle to related particles, visualizing semantic relationships.

### Standard Connection Lines
```
Time:     0s        2s                    22s   24s  26s
          │         │                      │     │    │
Opacity:  │──fade──│────── full ──────────│fade─│    │
          0  →   1                         1 → 0
          (2s)                             (2s)
```

### Focus-Next Connection Line
This special line connects focus to next. It starts purple and turns red when the next message appears.

```
Time:     0s              23s                    24.5s   26s
          │                │                      │       │
Color:    │─── purple ─────│── interpolate ───────│─ red ─│
          │                │    (1.5s)            │       │
          │                │                      │       │
          │                │                      │       │
          ▼ next appears   ▼ turns red            ▼       ▼ transition
```

### Incoming Red Line (Previous Focus → Current Focus)
After transition, a red line briefly connects the previous focus to the new focus, creating visual continuity.

```
Time:     0s (transition)        4s        6s
          │                      │         │
Opacity:  │────── red (1.0) ─────│─ fade ──│ (removed)
                                 (2s)
```

---

## Outgoing Focus Handling

When a cluster transitions, the old focus message needs special handling to prevent visual glitches.

### The Problem
The outgoing focus often appears in the new cluster's "related" messages (due to semantic similarity). Without filtering, it would:
1. Fade out as the outgoing focus
2. Immediately animate back on as a related message
3. Cause visual flickering/stuttering

### The Solution
1. **Filter at cluster build time**: When building `currentClusterIds`, filter out the `outgoingFocusId` from related messages
2. **Filter at render time**: Use `filterIdsRef` (a Set) to prevent rendering in React
3. **Auto-cleanup**: After fade completes (~4s), remove from filter set so it can appear in future clusters

```typescript
// In onFocusChange callback:
if (previousFocusId && focus && focus.focus.id !== previousFocusId) {
  outgoingFocusId = previousFocusId
  filterIdsRef.current.add(previousFocusId)
  
  // Auto-remove after fade completes
  const fadeTime = (MESSAGE_TIMING.outgoingFocusFadeStart + MESSAGE_TIMING.fadeOutDuration) * 1000 + 500
  setTimeout(() => {
    filterIdsRef.current.delete(previousFocusId!)
  }, fadeTime)
}
```

---

## Position Caching

To prevent messages from jumping around, positions are cached permanently using `positionCacheRef`:

```typescript
positionCacheRef = useRef<Map<string, PlacedMessage>>(new Map())

// In draw loop:
positionedMessages = positionedMessages.map(msg => {
  const cached = positionCacheRef.current.get(msg.id)
  if (cached) {
    // Use cached position, update only opacity
    return { ...cached, opacity: msg.opacity }
  } else {
    // First time - cache this position
    positionCacheRef.current.set(msg.id, { ...msg })
    return msg
  }
})
```

---

## Modifying Timing

### To change the overall cycle duration:
1. Update `MESSAGE_TIMING.cycleDuration`
2. Adjust `nextAppearsAt` and `focusFadesAt` proportionally
3. Update `connectionFadeOutStart` to maintain buffer before cycle end
4. Update Orchestrator's `clusterDuration` config

### To change message visibility duration:
1. Adjust `fadeInDuration`, `holdDuration`, `fadeOutDuration`
2. Update `messageDuration` to match their sum
3. Related messages cascade based on `messageDuration`, so all timing adjusts automatically

### To change the paired cascade rhythm:
1. Adjust `pairInternalOffset` (delay between first and second in pair)
2. Smaller value = more overlap, faster rhythm
3. Larger value = more separation, slower rhythm

### To change when "next" appears:
1. Adjust `nextAppearsAt`
2. Should be at least `fadeInDuration` before `cycleDuration` to fully fade in
3. Also adjust `focusNextTurnsRed` if you want the red line to coincide

---

## Particle "Burning Brightly" Effect

Particles with visible messages glow brighter (warm white) based on message opacity:

```typescript
if (hasVisibleMessage) {
  const intensity = messageOpacity
  center = {
    r: default.r + (255 - default.r) * intensity * 0.6,
    g: default.g + (250 - default.g) * intensity * 0.5,
    b: default.b + (230 - default.b) * intensity * 0.3,
  }
  // Similar for mid color
}
```

This creates a visual link between the particle and its message, helping visitors understand the spatial relationship.

---

## Debugging Tips

### Enable timing logs:
Add to draw loop:
```typescript
if (p.frameCount % 60 === 0) { // Every second
  console.log(`Cluster age: ${clusterAge.toFixed(1)}s`)
  console.log(`Visible messages: ${visibleMessageOpacities.size}`)
}
```

### Check filter state:
```typescript
console.log(`Filter set: ${Array.from(filterIdsRef.current).join(', ')}`)
```

### Verify message lifecycle:
```typescript
currentClusterIds.forEach(msg => {
  const opacity = visibleMessageOpacities.get(msg.id) || 0
  if (opacity > 0) {
    console.log(`${msg.isFocus ? 'FOCUS' : msg.isNext ? 'NEXT' : `R${msg.messageIndex}`}: ${opacity.toFixed(2)}`)
  }
})
```

---

## Future Considerations

- **Audio integration**: Timing could sync with soundscape beats/phrases
- **SMS submissions**: New messages might trigger special timing events
- **Adaptive pacing**: Cycle duration could adjust based on visitor engagement
- **Connection line physics**: Bezier control points will animate with FBM noise, independent of message timing
