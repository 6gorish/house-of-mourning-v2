'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Orchestrator } from '@/presentations/p5-constellation/lib/Orchestrator'
import type { FocusState } from '@/presentations/p5-constellation/lib/Orchestrator'
import type { GriefMessage } from '@/types/grief-messages'
import { VISUALIZATION_CONFIG } from '@/lib/config/visualization-config'
import { positionMessages, type ParticleInfo, type ConnectionInfo, type MessageToPlace, type PlacedMessage } from '@/lib/message-positioning'

const vertexShader = `
attribute vec3 aPosition;
attribute vec2 aTexCoord;
varying vec2 vTexCoord;

void main() {
  vTexCoord = aTexCoord;
  vec4 positionVec4 = vec4(aPosition, 1.0);
  positionVec4.xy = positionVec4.xy * 2.0 - 1.0;
  gl_Position = positionVec4;
}
`

const cosmicFragmentShader = `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

// Configurable uniforms from visualization-config.ts
uniform float u_brightness;      // Overall output brightness (0.0-1.0)
uniform vec3 u_tintColor;        // Purple/blue tint RGB (0-1 range)
uniform float u_animSpeedX;      // Animation speed X
uniform float u_animSpeedY;      // Animation speed Y
uniform float u_noiseScale;      // Noise scale (lower = larger clouds)
uniform float u_contrast;        // Contrast multiplier
uniform float u_toneMapping;     // Tone mapping intensity

varying vec2 vTexCoord;

#define NUM_OCTAVES 4

float random(vec2 pos) {
    return fract(sin(dot(pos.xy, vec2(13.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 pos) {
    vec2 i = floor(pos);
    vec2 f = fract(pos);
    float a = random(i + vec2(0.0, 0.0));
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 pos) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < NUM_OCTAVES; i++) {
        float dir = mod(float(i), 2.0) > 0.5 ? 1.0 : -1.0;
        v += a * noise(pos - 0.1 * dir * u_time * 2.0);
        pos = rot * pos * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 p = (gl_FragCoord.xy * u_noiseScale - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    p -= vec2(-12.0, 0.0);
    
    vec2 q = vec2(0.0);
    q.x = fbm(p + 0.00 * u_time * 2.0);
    q.y = fbm(p + vec2(1.0));

    vec2 r = vec2(0.0);
    r.x = fbm(p + 1.0 * q + vec2(1.7, 1.2) + u_animSpeedX * u_time * 2.0);
    r.y = fbm(p + 1.0 * q + vec2(8.3, 2.8) + u_animSpeedY * u_time * 2.0);

    float f = fbm(p + r);

    vec3 baseCol = mix(vec3(0.0), vec3(1.0), clamp((f * f) * u_contrast, 0.0, 1.0));
    baseCol = mix(baseCol, vec3(1.0), clamp(length(q), 0.0, 1.0));
    baseCol = mix(baseCol, u_tintColor, clamp(r.x, 0.0, 1.0));

    vec3 finalColor = (f * f * f * 1.0 + 0.9 * f) * baseCol;
    vec3 mapped = (finalColor * u_toneMapping) / (1.0 + finalColor * u_toneMapping);

    gl_FragColor = vec4(mapped * u_brightness, 1.0);
}
`

// Foreground shader - same FBM but outputs alpha based on fog density
// Foggy areas are visible, void areas are transparent (particles show through)
const foregroundFragmentShader = `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

uniform float u_brightness;
uniform vec3 u_tintColor;
uniform float u_animSpeedX;
uniform float u_animSpeedY;
uniform float u_noiseScale;
uniform float u_contrast;
uniform float u_toneMapping;

varying vec2 vTexCoord;

#define NUM_OCTAVES 4

float random(vec2 pos) {
    return fract(sin(dot(pos.xy, vec2(13.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 pos) {
    vec2 i = floor(pos);
    vec2 f = fract(pos);
    float a = random(i + vec2(0.0, 0.0));
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 pos) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < NUM_OCTAVES; i++) {
        float dir = mod(float(i), 2.0) > 0.5 ? 1.0 : -1.0;
        v += a * noise(pos - 0.1 * dir * u_time * 2.0);
        pos = rot * pos * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void main() {
    // Offset position slightly for visual separation from background
    vec2 p = (gl_FragCoord.xy * u_noiseScale - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    p -= vec2(-8.0, 2.0);  // Different offset than background
    
    vec2 q = vec2(0.0);
    q.x = fbm(p + 0.00 * u_time * 2.0);
    q.y = fbm(p + vec2(1.0));

    vec2 r = vec2(0.0);
    r.x = fbm(p + 1.0 * q + vec2(1.7, 1.2) + u_animSpeedX * u_time * 2.0);
    r.y = fbm(p + 1.0 * q + vec2(8.3, 2.8) + u_animSpeedY * u_time * 2.0);

    float f = fbm(p + r);

    vec3 baseCol = mix(vec3(0.0), vec3(1.0), clamp((f * f) * u_contrast, 0.0, 1.0));
    baseCol = mix(baseCol, vec3(1.0), clamp(length(q), 0.0, 1.0));
    baseCol = mix(baseCol, u_tintColor, clamp(r.x, 0.0, 1.0));

    vec3 finalColor = (f * f * f * 1.0 + 0.9 * f) * baseCol;
    vec3 mapped = (finalColor * u_toneMapping) / (1.0 + finalColor * u_toneMapping);
    
    // Alpha based on fog density - brighter areas = more fog = more opaque
    float fogDensity = length(mapped);
    float alpha = fogDensity * u_brightness;

    gl_FragColor = vec4(mapped * u_brightness, alpha);
}
`

interface Particle {
  id: string
  x: number
  y: number
  size: number
  message: GriefMessage
  alpha: number
  shouldRemove: boolean
}

interface Connection {
  fromId: string
  toId: string
  opacity: number
  isOldFocusNext: boolean
}

// Re-export PlacedMessage for the component state
type ClusterMessageDisplay = PlacedMessage

// Message timing constants - faster paired cascade
// Pattern: pairs with 1.5s internal offset, pairs are sequential
// R1: 0→4, R2: 1.5→5.5, R3: 4→8, R4: 5.5→9.5, etc.
const MESSAGE_TIMING = {
  // Per-message timing
  fadeInDuration: 1.5,       // Seconds to fade in
  holdDuration: 1.0,         // Seconds at full opacity
  fadeOutDuration: 1.5,      // Seconds to fade out
  // Total per message: 4 seconds
  pairInternalOffset: 1.5,   // Second message in pair starts 1.5s after first
  messageDuration: 4.0,      // Total visibility time per message
  
  // Special message timing
  nextAppearsAt: 23,         // Next message appears at this time (26 - 3)
  focusFadesAt: 24,          // Focus starts fading at this time (26 - 2)
  cycleDuration: 26,         // Total cycle duration in seconds
  outgoingFocusFadeStart: 2, // Old focus fades 2s into new cluster
  
  // Connection line timing
  connectionFadeIn: 2,       // Connections fade in over first 2s
  connectionFadeOutStart: 22,// Connections start fading at 22s
  connectionFadeOutDuration: 2, // Connections fade over 2s
  focusNextTurnsRed: 23,     // Focus-next line turns red at 23s (when next appears)
  incomingRedDuration: 4,    // Incoming red line stays red for 4s after transition
}

function ConnectionsTest() {
  const containerRef = useRef<HTMLDivElement>(null)
  const p5InstanceRef = useRef<any>(null)
  const orchestratorRef = useRef<Orchestrator | null>(null)
  const initialized = useRef(false)
  
  const [hoveredMessage, setHoveredMessage] = useState<{ content: string; x: number; y: number } | null>(null)
  const [clusterMessages, setClusterMessages] = useState<ClusterMessageDisplay[]>([])
  // SET of IDs to filter from clusterMessages (can have multiple during overlapping transitions)
  const filterIdsRef = useRef<Set<string>>(new Set())
  // PERMANENT position cache - once placed, messages NEVER move
  const positionCacheRef = useRef<Map<string, PlacedMessage>>(new Map())
  const [debugInfo, setDebugInfo] = useState({ 
    fps: 0, 
    renderTime: 0,
    particles: 0,
    connections: 0
  })

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    
    import('p5').then((p5Module) => {
      const p5 = p5Module.default

      if (!containerRef.current) return

      const sketch = (p: any) => {
        let backgroundLayer: any
        let foregroundLayer: any
        let particleLayer: any
        let cosmicShader: any
        let foregroundShader: any
        let shaderTime = 0
        
        const particles = new Map<string, Particle>()
        const connections: Connection[] = []
        let currentHoveredId: string | null = null
        let orchestrator: Orchestrator
        
        // Explicit cluster timing
        let clusterDuration = 8000
        let clusterStartTime = 0
        let currentFocusId: string | null = null
        let currentNextId: string | null = null
        let previousFocusId: string | null = null
        let previousNextId: string | null = null  // Track for transition continuity
        
        // Track visible messages for particle highlighting
        const visibleMessageOpacities = new Map<string, number>()
        
        // ID of the outgoing focus - kept for filtering from related messages
        // This persists until the NEXT cluster transition
        let outgoingFocusId: string | null = null
        
        // Position cache for next→focus transition continuity
        // When next becomes focus, it should stay in exact same position
        let cachedNextPosition: PlacedMessage | null = null
        
        // Live tracking of current focus position (updated every frame, used to capture outgoing position)
        let currentFocusLivePosition: PlacedMessage | null = null
        
        // Track current cluster message IDs for display
        // messageIndex: -1 for focus, -2 for next, 0-10 for the 11 related messages
        // wasNext: true if this focus was the previous cluster's next (for continuity)
        let currentClusterIds: { id: string; content: string; isFocus: boolean; isNext: boolean; messageIndex: number; wasNext: boolean }[] = []

        p.setup = async () => {
          const canvas = p.createCanvas(p.windowWidth, p.windowHeight)
          canvas.parent(containerRef.current!)
          
          // Background shader layer
          backgroundLayer = p.createGraphics(p.width, p.height, p.WEBGL)
          cosmicShader = backgroundLayer.createShader(vertexShader, cosmicFragmentShader)
          
          // Foreground shader layer (with alpha for transparency)
          foregroundLayer = p.createGraphics(p.width, p.height, p.WEBGL)
          foregroundShader = foregroundLayer.createShader(vertexShader, foregroundFragmentShader)
          
          // Particle layer (2D canvas for particles and connections)
          particleLayer = p.createGraphics(p.width, p.height)
          
          const supabase = createClient()
          orchestrator = new Orchestrator(supabase, {
            workingSetSize: 300,
            clusterSize: 12,
            clusterDuration: MESSAGE_TIMING.cycleDuration * 1000, // 37 seconds
            autoCycle: true
          })
          orchestratorRef.current = orchestrator
          
          clusterDuration = MESSAGE_TIMING.cycleDuration * 1000
          
          // STEP 1: API DATA
          orchestrator.onWorkingSetChange((added, removed) => {
            // Add new particles (start faded out)
            added.forEach(msg => {
              if (!particles.has(msg.id)) {
                particles.set(msg.id, {
                  id: msg.id,
                  x: (p.width * 0.01) + Math.random() * (p.width * 0.98),
                  y: (p.height * 0.01) + Math.random() * (p.height * 0.98),
                  size: 2 + Math.random() * 4,
                  message: msg,
                  alpha: 0,
                  shouldRemove: false
                })
              }
            })
            
            // Mark particles for removal
            removed.forEach(id => {
              const particle = particles.get(id)
              if (particle) {
                particle.shouldRemove = true
              }
            })
            
            // Minimal logging
            if (added.length > 0 || removed.length > 0) {
              console.log(`[WORKING SET] +${added.length} -${removed.length} = ${particles.size} particles (target: 300)`)
            }
            
            // Warn if particle count is unexpectedly low
            if (particles.size < 200 && particles.size > 0) {
              console.warn(`[WARNING] Particle count (${particles.size}) is below expected 300`)
            }
          })
          
          orchestrator.onFocusChange((focus: FocusState | null) => {
            // Store previous IDs for tracking transitions
            previousFocusId = currentFocusId
            previousNextId = currentNextId
            
            // Clear the PREVIOUS outgoingFocusId (from 2 clusters ago) - this is where we finally let go
            // The previous outgoingFocusId has had its full fade time in the last cluster
            
            // Track outgoing focus for filtering from related messages
            // We DON'T want the old focus to animate back on as a related message
            if (previousFocusId && focus && focus.focus.id !== previousFocusId) {
              outgoingFocusId = previousFocusId
              filterIdsRef.current.add(previousFocusId)
              // Auto-remove from filter set after fade completes
              const fadeTime = (MESSAGE_TIMING.outgoingFocusFadeStart + MESSAGE_TIMING.fadeOutDuration) * 1000 + 500
              setTimeout(() => {
                filterIdsRef.current.delete(previousFocusId!)
              }, fadeTime)
            } else {
              outgoingFocusId = null
            }
            
            // Clear existing connections
            connections.length = 0
            
            // Reset cluster timer
            clusterStartTime = Date.now()
            
            if (focus) {
              currentFocusId = focus.focus.id
              currentNextId = focus.next?.id || null
              
              // Check if this focus was the previous next (for transition continuity)
              const focusWasNext = focus.focus.id === previousNextId
              
              // Build cluster message list for display
              // Focus message
              currentClusterIds = [
                { id: focus.focus.id, content: focus.focus.content, isFocus: true, isNext: false, messageIndex: -1, wasNext: focusWasNext }
              ]
              
              // Related messages - assign message indices for paired cascade timing
              // Filter out focus, next, AND outgoing focus to avoid duplicates
              const relatedFiltered = focus.related.filter(rel => 
                rel.message.id !== focus.focus.id && 
                rel.message.id !== focus.next?.id &&
                rel.message.id !== outgoingFocusId  // CRITICAL: filter out outgoing focus!
              )
              
              relatedFiltered.forEach((rel, index) => {
                currentClusterIds.push({
                  id: rel.message.id,
                  content: rel.message.content,
                  isFocus: false,
                  isNext: false,
                  messageIndex: index,  // 0-10 for the 11 related messages (excluding next)
                  wasNext: false
                })
              })
              
              // Add "next" message with special index
              if (focus.next) {
                currentClusterIds.push({
                  id: focus.next.id,
                  content: focus.next.content,
                  isFocus: false,
                  isNext: true,
                  messageIndex: -2,  // Special index for next
                  wasNext: false
                })
              }
              
              // Collision offsets are now handled by the positioning system
              
              // Add old focus-next connection if it exists (will stay red for 2 seconds)
              if (previousFocusId && currentFocusId && previousFocusId !== currentFocusId) {
                connections.push({
                  fromId: previousFocusId,
                  toId: currentFocusId,
                  opacity: 1.0,
                  isOldFocusNext: true
                })
              }
              
              // Add all new connections (start invisible, will animate in)
              focus.related.forEach(rel => {
                connections.push({
                  fromId: focus.focus.id,
                  toId: rel.message.id,
                  opacity: 0,
                  isOldFocusNext: false
                })
              })
            } else {
              currentFocusId = null
              currentNextId = null
              currentClusterIds = []
            }
          })
          
          await orchestrator.initialize()
          clusterStartTime = Date.now()
        }

        p.draw = () => {
          const drawStart = performance.now()
          shaderTime += 0.016
          const { backgroundColor: bg } = VISUALIZATION_CONFIG
          p.background(bg.r, bg.g, bg.b)
          
          // Calculate cluster age in seconds
          const clusterAge = (Date.now() - clusterStartTime) / 1000
          
          // Background
          const { backgroundColor, cosmicShader: shaderConfig, darkOverlay, foregroundShader: fgConfig } = VISUALIZATION_CONFIG
          backgroundLayer.clear()
          backgroundLayer.background(backgroundColor.r, backgroundColor.g, backgroundColor.b)
          backgroundLayer.shader(cosmicShader)
          
          // Core uniforms
          cosmicShader.setUniform('u_time', shaderTime)
          cosmicShader.setUniform('u_resolution', [backgroundLayer.width, backgroundLayer.height])
          
          // Configurable shader uniforms
          cosmicShader.setUniform('u_brightness', shaderConfig.brightness)
          cosmicShader.setUniform('u_tintColor', [shaderConfig.tintColor.r, shaderConfig.tintColor.g, shaderConfig.tintColor.b])
          cosmicShader.setUniform('u_animSpeedX', shaderConfig.animationSpeedX)
          cosmicShader.setUniform('u_animSpeedY', shaderConfig.animationSpeedY)
          cosmicShader.setUniform('u_noiseScale', shaderConfig.noiseScale)
          cosmicShader.setUniform('u_contrast', shaderConfig.contrast)
          cosmicShader.setUniform('u_toneMapping', shaderConfig.toneMapping)
          
          backgroundLayer.noStroke()
          backgroundLayer.rect(-backgroundLayer.width/2, -backgroundLayer.height/2, backgroundLayer.width, backgroundLayer.height)
          backgroundLayer.resetShader()
          
          // Layer 1: Background shader
          p.image(backgroundLayer, 0, 0)
          
          // Layer 2: Dark overlay (semi-transparent to control overall darkness)
          p.noStroke()
          p.fill(darkOverlay.color.r, darkOverlay.color.g, darkOverlay.color.b, darkOverlay.opacity * 255)
          p.rect(0, 0, p.width, p.height)
          
          particleLayer.clear()
          const ctx = particleLayer.drawingContext
          
          // Calculate message visibility FIRST (before particle rendering)
          // This populates visibleMessageOpacities for particle highlighting
          visibleMessageOpacities.clear()
          
          // First, loop through currentClusterIds to set base opacities
          currentClusterIds.forEach(msg => {
            
            let opacity = 0
            
            if (msg.isFocus) {
              // Focus is always visible, fades at focusFadesAt (35s)
              if (msg.wasNext) {
                // If this focus was the previous next, it's already visible - just fade at end
                if (clusterAge >= MESSAGE_TIMING.focusFadesAt) {
                  const fadeProgress = (clusterAge - MESSAGE_TIMING.focusFadesAt) / MESSAGE_TIMING.fadeOutDuration
                  opacity = Math.max(0, 1 - fadeProgress)
                } else {
                  opacity = 1
                }
              } else {
                // New focus fades in at start, fades out at end
                if (clusterAge <= MESSAGE_TIMING.fadeInDuration) {
                  opacity = Math.min(1, clusterAge / MESSAGE_TIMING.fadeInDuration)
                } else if (clusterAge >= MESSAGE_TIMING.focusFadesAt) {
                  const fadeProgress = (clusterAge - MESSAGE_TIMING.focusFadesAt) / MESSAGE_TIMING.fadeOutDuration
                  opacity = Math.max(0, 1 - fadeProgress)
                } else {
                  opacity = 1
                }
              }
            } else if (msg.isNext) {
              // Next message appears at nextAppearsAt (31s) with fade in
              if (clusterAge >= MESSAGE_TIMING.nextAppearsAt) {
                const timeSinceStart = clusterAge - MESSAGE_TIMING.nextAppearsAt
                opacity = Math.min(1, timeSinceStart / MESSAGE_TIMING.fadeInDuration)
              }
            } else {
              // Related messages use paired cascade formula:
              // startTime = 5.5 * floor(index/2) + (index%2 === 1 ? 2 : 0)
              const pairIndex = Math.floor(msg.messageIndex / 2)
              const isSecondInPair = msg.messageIndex % 2 === 1
              const startTime = MESSAGE_TIMING.messageDuration * pairIndex + (isSecondInPair ? MESSAGE_TIMING.pairInternalOffset : 0)
              const endTime = startTime + MESSAGE_TIMING.messageDuration
              
              if (clusterAge >= startTime && clusterAge < endTime) {
                const timeIntoAnimation = clusterAge - startTime
                
                if (timeIntoAnimation < MESSAGE_TIMING.fadeInDuration) {
                  opacity = timeIntoAnimation / MESSAGE_TIMING.fadeInDuration
                } else if (timeIntoAnimation < MESSAGE_TIMING.fadeInDuration + MESSAGE_TIMING.holdDuration) {
                  opacity = 1
                } else {
                  const fadeOutProgress = (timeIntoAnimation - MESSAGE_TIMING.fadeInDuration - MESSAGE_TIMING.holdDuration) / MESSAGE_TIMING.fadeOutDuration
                  opacity = Math.max(0, 1 - fadeOutProgress)
                }
              }
            }
            
            if (opacity > 0.01) {
              visibleMessageOpacities.set(msg.id, opacity)
            }
          })
          
          // Handle outgoing focus opacity for particle highlighting
          if (outgoingFocusId) {
            if (clusterAge >= MESSAGE_TIMING.outgoingFocusFadeStart) {
              const fadeProgress = (clusterAge - MESSAGE_TIMING.outgoingFocusFadeStart) / MESSAGE_TIMING.fadeOutDuration
              const opacity = Math.max(0, 1 - fadeProgress)
              if (opacity > 0.01) {
                visibleMessageOpacities.set(outgoingFocusId, opacity)
              }
            } else {
              // Before fade starts, fully visible
              visibleMessageOpacities.set(outgoingFocusId, 1)
            }
          }
          
          // Update connection opacity based on MESSAGE_TIMING
          const incomingRedFadeEnd = MESSAGE_TIMING.incomingRedDuration + MESSAGE_TIMING.connectionFadeOutDuration
          const connectionFadeOutEnd = MESSAGE_TIMING.connectionFadeOutStart + MESSAGE_TIMING.connectionFadeOutDuration
          
          connections.forEach(conn => {
            const isFocusNext = (conn.fromId === currentFocusId && conn.toId === currentNextId)
            
            if (conn.isOldFocusNext) {
              // Old focus-next line (incoming red line): stays red, then fades
              if (clusterAge <= MESSAGE_TIMING.incomingRedDuration) {
                // Stay red
                conn.opacity = 1.0
              } else if (clusterAge < incomingRedFadeEnd) {
                // Fade out over connectionFadeOutDuration
                const fadeProgress = (clusterAge - MESSAGE_TIMING.incomingRedDuration) / MESSAGE_TIMING.connectionFadeOutDuration
                conn.opacity = Math.max(0, 1 - fadeProgress)
              } else {
                // Fully faded (will be removed)
                conn.opacity = 0
              }
            } else if (isFocusNext) {
              // Current focus-next: stays purple, turns red when next appears
              // Opacity always 1.0, color changes handled in draw code
              conn.opacity = 1.0
            } else {
              // Related connections: fade in at start, fade out near end
              if (clusterAge <= MESSAGE_TIMING.connectionFadeIn) {
                // Animate IN over first 3 seconds
                conn.opacity = Math.min(1, clusterAge / MESSAGE_TIMING.connectionFadeIn)
              } else if (clusterAge >= MESSAGE_TIMING.connectionFadeOutStart && clusterAge < connectionFadeOutEnd) {
                // Animate OUT starting at 33s
                const fadeProgress = (clusterAge - MESSAGE_TIMING.connectionFadeOutStart) / MESSAGE_TIMING.connectionFadeOutDuration
                conn.opacity = Math.max(0, 1 - fadeProgress)
              } else if (clusterAge >= connectionFadeOutEnd) {
                // Fully faded
                conn.opacity = 0
              } else {
                // Fully visible between animations
                conn.opacity = 1.0
              }
            }
          })
          
          // Remove old focus-next connection after it fades out
          for (let i = connections.length - 1; i >= 0; i--) {
            if (connections[i].isOldFocusNext && clusterAge >= incomingRedFadeEnd) {
              connections.splice(i, 1)
            }
          }
          
          // Draw connections
          connections.forEach(conn => {
            if (conn.opacity <= 0.01) return
            
            const from = particles.get(conn.fromId)
            const to = particles.get(conn.toId)
            
            if (!from || !to || from.alpha <= 0.01 || to.alpha <= 0.01) return
            
            const isFocusNext = (conn.fromId === currentFocusId && conn.toId === currentNextId)
            
            // Determine color and style using config values
            const { connectionColors } = VISUALIZATION_CONFIG
            const defaultCol = connectionColors.default
            const focusCol = connectionColors.focus
            let r, g, b, opacity, lineWidth
            
            if (conn.isOldFocusNext) {
              // Old focus-next line: stays red while visible, then fades
              // Always red color while visible
              r = focusCol.r; g = focusCol.g; b = focusCol.b
              opacity = VISUALIZATION_CONFIG.focusConnectionOpacity
              lineWidth = VISUALIZATION_CONFIG.focusConnectionWidth
            } else if (isFocusNext) {
              // Current focus-next: purple initially, turns red when next message appears
              if (clusterAge < MESSAGE_TIMING.focusNextTurnsRed) {
                // Purple
                r = defaultCol.r; g = defaultCol.g; b = defaultCol.b
                opacity = VISUALIZATION_CONFIG.defaultConnectionOpacity
                lineWidth = VISUALIZATION_CONFIG.defaultConnectionWidth
              } else if (clusterAge < MESSAGE_TIMING.focusNextTurnsRed + MESSAGE_TIMING.fadeInDuration) {
                // Interpolate purple → red over fadeInDuration
                const progress = (clusterAge - MESSAGE_TIMING.focusNextTurnsRed) / MESSAGE_TIMING.fadeInDuration
                r = defaultCol.r + (focusCol.r - defaultCol.r) * progress
                g = defaultCol.g + (focusCol.g - defaultCol.g) * progress
                b = defaultCol.b + (focusCol.b - defaultCol.b) * progress
                opacity = VISUALIZATION_CONFIG.defaultConnectionOpacity + (VISUALIZATION_CONFIG.focusConnectionOpacity - VISUALIZATION_CONFIG.defaultConnectionOpacity) * progress
                lineWidth = VISUALIZATION_CONFIG.defaultConnectionWidth + (VISUALIZATION_CONFIG.focusConnectionWidth - VISUALIZATION_CONFIG.defaultConnectionWidth) * progress
              } else {
                // Red
                r = focusCol.r; g = focusCol.g; b = focusCol.b
                opacity = VISUALIZATION_CONFIG.focusConnectionOpacity
                lineWidth = VISUALIZATION_CONFIG.focusConnectionWidth
              }
            } else {
              // Normal connection: always purple
              r = defaultCol.r; g = defaultCol.g; b = defaultCol.b
              opacity = VISUALIZATION_CONFIG.defaultConnectionOpacity
              lineWidth = VISUALIZATION_CONFIG.defaultConnectionWidth
            }
            
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity * conn.opacity * Math.min(from.alpha, to.alpha)})`
            ctx.lineWidth = lineWidth
            
            ctx.beginPath()
            ctx.moveTo(from.x, from.y)
            ctx.lineTo(to.x, to.y)
            ctx.stroke()
          })
          
          // Update and draw particles
          const alphaChangePerFrame = 1.0 / ((VISUALIZATION_CONFIG.animateIn / 1000) * 60) // 60 FPS assumed
          
          particles.forEach((particle, id) => {
            const isFocus = id === currentFocusId
            const isNext = id === currentNextId
            const isNextTurningRed = isNext && clusterAge >= MESSAGE_TIMING.focusNextTurnsRed
            
            // Check if this particle's message is currently visible
            const messageOpacity = visibleMessageOpacities.get(id) || 0
            const hasVisibleMessage = messageOpacity > 0.01
            
            // Handle alpha - ONLY fade out if marked for removal by Orchestrator
            if (particle.shouldRemove) {
              // Fade out over animateOut duration
              particle.alpha = Math.max(0, particle.alpha - alphaChangePerFrame)
              if (particle.alpha <= 0) {
                particles.delete(id)
                return
              }
            } else {
              // Fade in over animateIn duration (or stay at full)
              particle.alpha = Math.min(1, particle.alpha + alphaChangePerFrame)
            }
            
            if (particle.alpha < 0.01) return
            
            // Determine color using config values
            // Highlighted particles (with visible messages) get a brighter, whiter color
            const { particleColors } = VISUALIZATION_CONFIG
            const isSpecial = isFocus || isNextTurningRed
            
            // Base colors
            let center, mid
            if (isSpecial) {
              center = particleColors.focus.center
              mid = particleColors.focus.mid
            } else if (hasVisibleMessage) {
              // "Burning brightly" - intensified warm white that scales with message opacity
              // Blends from default color toward bright warm white
              const intensity = messageOpacity
              center = {
                r: particleColors.default.center.r + (255 - particleColors.default.center.r) * intensity * 0.6,
                g: particleColors.default.center.g + (250 - particleColors.default.center.g) * intensity * 0.5,
                b: particleColors.default.center.b + (230 - particleColors.default.center.b) * intensity * 0.3,
              }
              mid = {
                r: particleColors.default.mid.r + (255 - particleColors.default.mid.r) * intensity * 0.5,
                g: particleColors.default.mid.g + (245 - particleColors.default.mid.g) * intensity * 0.4,
                b: particleColors.default.mid.b + (220 - particleColors.default.mid.b) * intensity * 0.25,
              }
            } else {
              center = particleColors.default.center
              mid = particleColors.default.mid
            }
            
            const sizeBrightness = 0.4 + ((particle.size - 2) / 4) * 0.6
            // Boost brightness when message is visible
            const messageBrightness = hasVisibleMessage ? 1 + messageOpacity * 0.3 : 1
            const totalBrightness = particle.alpha * sizeBrightness * messageBrightness
            
            const gradient = ctx.createRadialGradient(
              particle.x, particle.y, 0,
              particle.x, particle.y, particle.size * 2.5
            )
            
            gradient.addColorStop(0, `rgba(${center.r}, ${center.g}, ${center.b}, ${1.0 * totalBrightness})`)
            gradient.addColorStop(0.4, `rgba(${mid.r}, ${mid.g}, ${mid.b}, ${0.6 * totalBrightness})`)
            gradient.addColorStop(0.7, `rgba(${mid.r}, ${mid.g}, ${mid.b}, ${0.2 * totalBrightness})`)
            gradient.addColorStop(1, `rgba(${mid.r}, ${mid.g}, ${mid.b}, 0)`)
            
            ctx.fillStyle = gradient
            ctx.beginPath()
            ctx.arc(particle.x, particle.y, particle.size * 2.5, 0, Math.PI * 2)
            ctx.fill()
          })
          
          // Layer 3: Particle layer (connections and particles)
          p.image(particleLayer, 0, 0)
          
          // Update cluster messages for React display using luxury positioning system
          // Build particle info map for positioning
          const particleInfoMap = new Map<string, ParticleInfo>()
          particles.forEach((particle, id) => {
            if (particle.alpha > 0.01) {
              particleInfoMap.set(id, {
                id: particle.id,
                x: particle.x,
                y: particle.y,
                size: particle.size
              })
            }
          })
          
          // Build connection info for positioning (avoid placing text over lines)
          const connectionInfos: ConnectionInfo[] = connections
            .filter(c => c.opacity > 0.1)
            .map(c => ({ fromId: c.fromId, toId: c.toId }))
          
          // Build messages to place with their opacities
          // NOTE: outgoingFocusDisplay is rendered SEPARATELY - don't add it here!
          const messagesToPlace: MessageToPlace[] = []
          
          // Add current cluster messages (outgoing focus is handled separately)
          currentClusterIds.forEach(msg => {
            // Skip if this is the outgoing focus (already added above)
            // Use outgoingFocusId for the check - it persists even after outgoingFocus is cleared
            if (outgoingFocusId && msg.id === outgoingFocusId) return
            
            const opacity = visibleMessageOpacities.get(msg.id) || 0
            if (opacity < 0.01) return
            messagesToPlace.push({
              id: msg.id,
              content: msg.content,
              isFocus: msg.isFocus,
              isNext: msg.isNext,
              opacity
            })
          })
          
          // Use the luxury positioning system with PERMANENT position caching
          // Messages NEVER change position once placed - this eliminates ALL flickering
          let positionedMessages = positionMessages(
            messagesToPlace,
            particleInfoMap,
            connectionInfos,
            p.width,
            p.height
          )
          
          // Apply permanent position cache - if we've seen this message before, use cached position
          positionedMessages = positionedMessages.map(msg => {
            const cached = positionCacheRef.current.get(msg.id)
            if (cached) {
              // Use cached position, but update opacity and particle position
              return {
                ...cached,
                opacity: msg.opacity,
                particleX: msg.particleX,
                particleY: msg.particleY,
                isFocus: msg.isFocus,
                isNext: msg.isNext,
              }
            } else {
              // First time seeing this message - cache its position
              positionCacheRef.current.set(msg.id, { ...msg })
              return msg
            }
          })
          
          // Clean up cache - remove entries for messages no longer in working set
          // (This prevents memory leak but keeps positions stable during cluster lifetime)
          const currentIds = new Set(messagesToPlace.map(m => m.id))
          for (const cachedId of positionCacheRef.current.keys()) {
            if (!particleInfoMap.has(cachedId)) {
              positionCacheRef.current.delete(cachedId)
            }
          }
          
          // Position persistence: if focus was previous next, use cached position
          const focusMsg = currentClusterIds.find(m => m.isFocus)
          if (focusMsg?.wasNext && cachedNextPosition && cachedNextPosition.id === focusMsg.id) {
            // Replace the focus position with the cached next position
            positionedMessages = positionedMessages.map(msg => {
              if (msg.id === focusMsg.id) {
                return {
                  ...msg,
                  messageX: cachedNextPosition!.messageX,
                  messageY: cachedNextPosition!.messageY,
                  anchorX: cachedNextPosition!.anchorX,
                  anchorY: cachedNextPosition!.anchorY,
                  width: cachedNextPosition!.width,
                  height: cachedNextPosition!.height,
                  quadrant: cachedNextPosition!.quadrant,
                  textAlign: cachedNextPosition!.textAlign,
                }
              }
              return msg
            })
          }
          
          // Cache the next message's position for the next transition
          const nextMsg = positionedMessages.find(m => m.isNext)
          if (nextMsg) {
            cachedNextPosition = { ...nextMsg }
          }
          
          // Track current focus position EVERY FRAME (used to capture position when it becomes outgoing)
          const currentFocusMsg = positionedMessages.find(m => m.isFocus && m.id === currentFocusId)
          if (currentFocusMsg) {
            currentFocusLivePosition = { ...currentFocusMsg }
          }
          
          // NOTE: outgoing focus is rendered separately via its own React state
          // Do NOT add it to positionedMessages
          
          // Throttle React state updates to every 3 frames for performance
          if (p.frameCount % 3 === 0) {
            setClusterMessages(positionedMessages)
          }
          
          // Layer 4: Foreground shader (atmospheric fog over particles)
          if (fgConfig.enabled) {
            foregroundLayer.clear()
            foregroundLayer.shader(foregroundShader)
            
            foregroundShader.setUniform('u_time', shaderTime)
            foregroundShader.setUniform('u_resolution', [foregroundLayer.width, foregroundLayer.height])
            foregroundShader.setUniform('u_brightness', fgConfig.brightness)
            foregroundShader.setUniform('u_tintColor', [fgConfig.tintColor.r, fgConfig.tintColor.g, fgConfig.tintColor.b])
            foregroundShader.setUniform('u_animSpeedX', fgConfig.animationSpeedX)
            foregroundShader.setUniform('u_animSpeedY', fgConfig.animationSpeedY)
            foregroundShader.setUniform('u_noiseScale', fgConfig.noiseScale)
            foregroundShader.setUniform('u_contrast', fgConfig.contrast)
            foregroundShader.setUniform('u_toneMapping', fgConfig.toneMapping)
            
            foregroundLayer.noStroke()
            foregroundLayer.rect(-foregroundLayer.width/2, -foregroundLayer.height/2, foregroundLayer.width, foregroundLayer.height)
            foregroundLayer.resetShader()
            
            p.image(foregroundLayer, 0, 0)
          }
          
          const drawEnd = performance.now()
          
          if (p.frameCount % 30 === 0) {
            setDebugInfo({
              fps: Math.round(p.frameRate()),
              renderTime: Math.round((drawEnd - drawStart) * 100) / 100,
              particles: particles.size,
              connections: connections.length
            })
          }
        }

        p.mouseMoved = () => {
          let foundParticle: Particle | null = null
          
          for (const particle of particles.values()) {
            if (particle.alpha <= 0) continue
            
            const dx = p.mouseX - particle.x
            const dy = p.mouseY - particle.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            if (distance <= particle.size * 2.5) {
              foundParticle = particle
              break
            }
          }
          
          const newId = foundParticle ? foundParticle.id : null
          if (newId !== currentHoveredId) {
            currentHoveredId = newId
            setHoveredMessage(foundParticle 
              ? { content: foundParticle.message.content, x: foundParticle.x, y: foundParticle.y }
              : null
            )
          }
          
          return false
        }

        p.windowResized = () => {
          const oldWidth = p.width
          const oldHeight = p.height
          
          p.resizeCanvas(p.windowWidth, p.windowHeight)
          
          particles.forEach(particle => {
            particle.x = (particle.x / oldWidth) * p.width
            particle.y = (particle.y / oldHeight) * p.height
          })
          
          // Recreate all graphics layers at new size
          backgroundLayer = p.createGraphics(p.width, p.height, p.WEBGL)
          cosmicShader = backgroundLayer.createShader(vertexShader, cosmicFragmentShader)
          
          foregroundLayer = p.createGraphics(p.width, p.height, p.WEBGL)
          foregroundShader = foregroundLayer.createShader(vertexShader, foregroundFragmentShader)
          
          particleLayer = p.createGraphics(p.width, p.height)
        }
      }

      const p5Instance = new p5(sketch)
      p5InstanceRef.current = p5Instance
    })

    return () => {
      orchestratorRef.current?.cleanup()
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove()
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 w-full h-full bg-black">
      <div ref={containerRef} className="absolute inset-0" />
      
      <div className="fixed top-6 right-6 font-mono text-sm text-white bg-black/80 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/20 pointer-events-none z-50">
        <div className="space-y-1">
          <div className="text-lg font-bold text-purple-400">CONNECTIONS</div>
          <div className="mt-2 pt-2 border-t border-white/20">
            <div>Particles: {debugInfo.particles}</div>
            <div>Connections: {debugInfo.connections}</div>
            <div className="mt-2 pt-2 border-t border-white/10">
              <div>FPS: <span className={debugInfo.fps >= 55 ? 'text-green-400' : 'text-yellow-400'}>{debugInfo.fps}</span></div>
              <div>Render: <span className={debugInfo.renderTime < 16 ? 'text-green-400' : 'text-yellow-400'}>{debugInfo.renderTime}ms</span></div>
            </div>
          </div>
        </div>
      </div>

      {hoveredMessage && (() => {
        // Smart positioning: avoid going off-screen on right edge
        const hoverWidth = 320  // Approximate max width
        const hoverPadding = 25
        const isRightEdge = hoveredMessage.x + hoverPadding + hoverWidth > window.innerWidth - 40
        const isBottomEdge = hoveredMessage.y + 100 > window.innerHeight - 60
        
        return (
          <div 
            className="fixed pointer-events-none z-30"
            style={{
              // Position based on edge detection
              left: isRightEdge ? undefined : `${hoveredMessage.x + hoverPadding}px`,
              right: isRightEdge ? `${window.innerWidth - hoveredMessage.x + hoverPadding}px` : undefined,
              top: isBottomEdge ? undefined : `${hoveredMessage.y + hoverPadding}px`,
              bottom: isBottomEdge ? `${window.innerHeight - hoveredMessage.y + hoverPadding}px` : undefined,
              maxWidth: `${hoverWidth}px`,
              textAlign: isRightEdge ? 'right' : 'left',
            }}
          >
            <p 
              className="font-display leading-relaxed italic"
              style={{
                color: 'rgba(160, 155, 170, 0.9)',  // Slightly brighter
                fontSize: 'clamp(1.125rem, 1.5vw, 1.375rem)',  // Larger: was text-base (~1rem)
                textShadow: [
                  '0 0 10px rgba(0, 0, 0, 1)',
                  '0 0 25px rgba(0, 0, 0, 0.95)',
                  '0 0 40px rgba(0, 0, 0, 0.8)',
                  '0 2px 5px rgba(0, 0, 0, 0.9)',
                ].join(', '),
              }}
            >
              "{hoveredMessage.content}"
            </p>
          </div>
        )
      })()}
      
      {/* Cluster messages displayed near their particles */}
      {clusterMessages.map((msg) => {
        // Filter out outgoing focuses
        if (filterIdsRef.current.has(msg.id)) {
          return null
        }
        // Gallery-grade typography: no boxes, just floating text with subtle shadow
        const isFocus = msg.isFocus
        const isNext = msg.isNext
        const isFocusOrNext = isFocus || isNext
        
        // Color palette: warm off-whites
        // Focus and Next are same size, only differ in color/style
        const textColor = isFocus 
          ? 'rgba(250, 247, 242, 0.98)'  // warm cream
          : isNext 
            ? 'rgba(235, 230, 245, 0.92)' // cool lavender (distinct from focus)
            : 'rgba(220, 215, 230, 0.85)' // muted lavender-white
        
        // SAME SIZE for Focus and Next - only related messages are smaller
        const fontSize = isFocusOrNext
          ? 'clamp(1.375rem, 2.5vw, 2.25rem)'  // Same size for both
          : 'clamp(1.125rem, 2vw, 1.75rem)'    // Smaller for related
        
        const fontWeight = isFocus ? 500 : 400
        // Focus and Next = upright, Related = italic
        const fontStyle = isFocusOrNext ? 'normal' : 'italic'
        const letterSpacing = isFocusOrNext ? '0.025em' : '0.02em'
        
        // Stronger multi-layer text shadow for projection legibility
        const textShadow = [
          '0 0 8px rgba(0, 0, 0, 1)',
          '0 0 25px rgba(0, 0, 0, 0.95)',
          '0 0 50px rgba(0, 0, 0, 0.8)',
          '0 3px 6px rgba(0, 0, 0, 0.9)',
        ].join(', ')
        
        return (
          <div
            key={msg.id}
            className="fixed pointer-events-none z-40"
            style={{
              left: `${msg.messageX}px`,
              top: `${msg.messageY}px`,
              width: `${msg.width}px`,
              opacity: msg.opacity,
              // NO position transitions - messages should stay fixed
              transition: 'opacity 0.3s ease-out',
              textAlign: msg.textAlign,
            }}
          >
            <p
              className="font-display"
              style={{
                color: textColor,
                fontSize,
                fontWeight,
                fontStyle,
                letterSpacing,
                textShadow,
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              {msg.content}
            </p>
          </div>
        )
      })}
    </div>
  )
}

export default dynamic(() => Promise.resolve(ConnectionsTest), { ssr: false })
