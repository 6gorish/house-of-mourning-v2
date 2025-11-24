'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Orchestrator } from '@/presentations/p5-constellation/lib/Orchestrator'
import type { FocusState } from '@/presentations/p5-constellation/lib/Orchestrator'
import type { GriefMessage } from '@/lib/database/schema'
import { VISUALIZATION_CONFIG, getAnimationTimeline } from '@/lib/config/visualization-config'

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
    vec2 p = (gl_FragCoord.xy * 3.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    p -= vec2(-12.0, 0.0);
    
    vec2 q = vec2(0.0);
    q.x = fbm(p + 0.00 * u_time * 2.0);
    q.y = fbm(p + vec2(1.0));

    vec2 r = vec2(0.0);
    r.x = fbm(p + 1.0 * q + vec2(1.7, 1.2) + 0.15 * u_time * 2.0);
    r.y = fbm(p + 1.0 * q + vec2(8.3, 2.8) + 0.126 * u_time * 2.0);

    float f = fbm(p + r);

    vec3 baseCol = mix(vec3(0.0), vec3(1.0), clamp((f * f) * 5.5, 0.0, 1.0));
    baseCol = mix(baseCol, vec3(1.0), clamp(length(q), 0.0, 1.0));
    baseCol = mix(baseCol, vec3(0.3, 0.2, 1.0), clamp(r.x, 0.0, 1.0));

    vec3 finalColor = (f * f * f * 1.0 + 0.9 * f) * baseCol;
    vec3 mapped = (finalColor * 2.5) / (1.0 + finalColor * 2.5);

    gl_FragColor = vec4(mapped * 0.3, 1.0);
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

function ConnectionsTest() {
  const containerRef = useRef<HTMLDivElement>(null)
  const p5InstanceRef = useRef<any>()
  const orchestratorRef = useRef<Orchestrator>()
  const initialized = useRef(false)
  
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null)
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
        let particleLayer: any
        let cosmicShader: any
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

        p.setup = async () => {
          const canvas = p.createCanvas(p.windowWidth, p.windowHeight)
          canvas.parent(containerRef.current!)
          
          backgroundLayer = p.createGraphics(p.width, p.height, p.WEBGL)
          cosmicShader = backgroundLayer.createShader(vertexShader, cosmicFragmentShader)
          
          particleLayer = p.createGraphics(p.width, p.height)
          
          const supabase = createClient()
          orchestrator = new Orchestrator(supabase, {
            workingSetSize: 300,
            clusterSize: 12,
            clusterDuration: VISUALIZATION_CONFIG.cycleDuration,
            autoCycle: true
          })
          orchestratorRef.current = orchestrator
          
          clusterDuration = VISUALIZATION_CONFIG.cycleDuration
          
          // STEP 1: API DATA
          orchestrator.onWorkingSetChange((added, removed) => {
            console.log('='.repeat(60))
            console.log('STEP 1: API SENDS DATA')
            console.log('='.repeat(60))
            console.log('Removed IDs from API:', removed)
            console.log('Removed count from API:', removed.length)
            console.log('Added message IDs from API:', added.map(m => m.id))
            console.log('Added count from API:', added.length)
            console.log('')
            console.log('EXPECTED: ~18 removed, ~18 added')
            console.log('ACTUAL FROM API:', removed.length, 'removed,', added.length, 'added')
            console.log('='.repeat(60))
            
            // STEP 2: PARTICLE MAP OPERATIONS
            console.log('STEP 2: PARTICLE MAP BEFORE')
            console.log('Map size BEFORE:', particles.size)
            console.log('Particle IDs BEFORE:', Array.from(particles.keys()))
            
            let addedCount = 0
            let skippedCount = 0
            
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
                addedCount++
                console.log('  ✓ Added particle:', msg.id)
              } else {
                skippedCount++
                console.log('  ⊘ Skipped (already exists):', msg.id)
              }
            })
            
            console.log('Added to Map:', addedCount, 'Skipped (duplicates):', skippedCount)
            
            let markedCount = 0
            let notFoundCount = 0
            
            // ONLY mark particles for removal if Orchestrator says so
            removed.forEach(id => {
              const particle = particles.get(id)
              if (particle) {
                particle.shouldRemove = true
                markedCount++
                console.log('  ✓ Marked for removal:', id)
              } else {
                notFoundCount++
                console.log('  ✗ NOT FOUND in Map:', id)
              }
            })
            
            console.log('Marked for removal:', markedCount, 'Not found:', notFoundCount)
            console.log('Map size AFTER:', particles.size)
            console.log('Expected Map size:', 300)
            console.log('='.repeat(60))
          })
          
          orchestrator.onFocusChange((focus: FocusState | null) => {
            // Store previous focus for tracking old focus-next line
            previousFocusId = currentFocusId
            
            // Clear existing connections
            connections.length = 0
            
            // Reset cluster timer
            clusterStartTime = Date.now()
            
            if (focus) {
              console.log('[CLUSTER] Focus:', focus.focus.id, 'Next:', focus.next?.id || 'none', 'Related:', focus.related.length)
              
              currentFocusId = focus.focus.id
              currentNextId = focus.next?.id || null
              
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
            }
          })
          
          await orchestrator.initialize()
          clusterStartTime = Date.now()
          console.log('[READY] Orchestrator initialized, particles:', particles.size)
        }

        p.draw = () => {
          const drawStart = performance.now()
          shaderTime += 0.016
          p.background(10, 5, 20)
          
          // Calculate cluster age in seconds
          const clusterAge = (Date.now() - clusterStartTime) / 1000
          const cycleSeconds = VISUALIZATION_CONFIG.cycleDuration / 1000
          
          // Get animation timeline from config
          const timeline = getAnimationTimeline()
          
          // Background
          backgroundLayer.clear()
          backgroundLayer.background(10, 5, 20)
          backgroundLayer.shader(cosmicShader)
          cosmicShader.setUniform('u_time', shaderTime)
          cosmicShader.setUniform('u_resolution', [backgroundLayer.width, backgroundLayer.height])
          backgroundLayer.noStroke()
          backgroundLayer.rect(-backgroundLayer.width/2, -backgroundLayer.height/2, backgroundLayer.width, backgroundLayer.height)
          backgroundLayer.resetShader()
          
          p.image(backgroundLayer, 0, 0)
          
          particleLayer.clear()
          const ctx = particleLayer.drawingContext
          
          // Update connection opacity based on timeline
          connections.forEach(conn => {
            const isFocusNext = (conn.fromId === currentFocusId && conn.toId === currentNextId)
            
            if (conn.isOldFocusNext) {
              // Old focus-next line (incoming red line): fades from red to purple
              if (clusterAge <= timeline.incomingFocusNextStaysRedUntil) {
                // Stay red for connectionFocusDuration
                conn.opacity = 1.0
              } else if (clusterAge >= timeline.incomingFocusNextFadesBackStart && clusterAge < timeline.incomingFocusNextFadesBackEnd) {
                // Fade from red to purple over animateOut duration
                const fadeProgress = (clusterAge - timeline.incomingFocusNextFadesBackStart) / (VISUALIZATION_CONFIG.animateOut / 1000)
                conn.opacity = Math.max(0, 1 - fadeProgress)
              } else if (clusterAge >= timeline.incomingFocusNextFadesBackEnd) {
                // Fully faded (will be removed)
                conn.opacity = 0
              }
            } else if (isFocusNext) {
              // Current focus-next: stays purple, then fades to red near end of cycle
              if (clusterAge < timeline.focusNextTurnsRedStart) {
                // Full opacity purple
                conn.opacity = 1.0
              } else if (clusterAge >= timeline.focusNextTurnsRedStart && clusterAge < timeline.focusNextTurnsRedEnd) {
                // Animating purple → red (opacity stays 1.0, color changes in draw)
                conn.opacity = 1.0
              } else {
                // Fully red
                conn.opacity = 1.0
              }
            } else {
              // Related connections: animate in (0 to animateIn), animate out (N-animateOutCushion to N-animateOutCushion+animateOut)
              if (clusterAge <= timeline.connectionFadeInEnd) {
                // Animate IN over first 3 seconds
                conn.opacity = Math.min(1, clusterAge / (VISUALIZATION_CONFIG.animateIn / 1000))
              } else if (clusterAge >= timeline.connectionFadeOutStart && clusterAge < timeline.connectionFadeOutEnd) {
                // Animate OUT starting at N-4, lasting 3 seconds
                const fadeProgress = (clusterAge - timeline.connectionFadeOutStart) / (VISUALIZATION_CONFIG.animateOut / 1000)
                conn.opacity = Math.max(0, 1 - fadeProgress)
              } else if (clusterAge >= timeline.connectionFadeOutEnd) {
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
            if (connections[i].isOldFocusNext && clusterAge >= timeline.incomingFocusNextFadesBackEnd) {
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
            
            // Determine color and style
            let r, g, b, opacity, lineWidth
            
            if (conn.isOldFocusNext) {
              // Old focus-next line: interpolate from red back to purple
              if (clusterAge <= timeline.incomingFocusNextStaysRedUntil) {
                // Stay red
                r = 255; g = 120; b = 100
                opacity = VISUALIZATION_CONFIG.focusConnectionOpacity
                lineWidth = VISUALIZATION_CONFIG.focusConnectionWidth
              } else if (clusterAge < timeline.incomingFocusNextFadesBackEnd) {
                // Interpolate red → purple
                const progress = (clusterAge - timeline.incomingFocusNextStaysRedUntil) / (VISUALIZATION_CONFIG.animateOut / 1000)
                r = 255 + (200 - 255) * progress
                g = 120 + (180 - 120) * progress
                b = 100 + (255 - 100) * progress
                opacity = VISUALIZATION_CONFIG.focusConnectionOpacity + (VISUALIZATION_CONFIG.defaultConnectionOpacity - VISUALIZATION_CONFIG.focusConnectionOpacity) * progress
                lineWidth = VISUALIZATION_CONFIG.focusConnectionWidth + (VISUALIZATION_CONFIG.defaultConnectionWidth - VISUALIZATION_CONFIG.focusConnectionWidth) * progress
              } else {
                // Purple (shouldn't reach here as it's removed)
                r = 200; g = 180; b = 255
                opacity = VISUALIZATION_CONFIG.defaultConnectionOpacity
                lineWidth = VISUALIZATION_CONFIG.defaultConnectionWidth
              }
            } else if (isFocusNext) {
              // Current focus-next: interpolate from purple to red near end
              if (clusterAge < timeline.focusNextTurnsRedStart) {
                // Purple
                r = 200; g = 180; b = 255
                opacity = VISUALIZATION_CONFIG.defaultConnectionOpacity
                lineWidth = VISUALIZATION_CONFIG.defaultConnectionWidth
              } else if (clusterAge < timeline.focusNextTurnsRedEnd) {
                // Interpolate purple → red
                const progress = (clusterAge - timeline.focusNextTurnsRedStart) / (VISUALIZATION_CONFIG.animateIn / 1000)
                r = 200 + (255 - 200) * progress
                g = 180 + (120 - 180) * progress
                b = 255 + (100 - 255) * progress
                opacity = VISUALIZATION_CONFIG.defaultConnectionOpacity + (VISUALIZATION_CONFIG.focusConnectionOpacity - VISUALIZATION_CONFIG.defaultConnectionOpacity) * progress
                lineWidth = VISUALIZATION_CONFIG.defaultConnectionWidth + (VISUALIZATION_CONFIG.focusConnectionWidth - VISUALIZATION_CONFIG.defaultConnectionWidth) * progress
              } else {
                // Red
                r = 255; g = 120; b = 100
                opacity = VISUALIZATION_CONFIG.focusConnectionOpacity
                lineWidth = VISUALIZATION_CONFIG.focusConnectionWidth
              }
            } else {
              // Normal connection: always purple
              r = 200; g = 180; b = 255
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
            const isNextTurningRed = isNext && clusterAge >= timeline.focusNextTurnsRedStart
            
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
            
            // Determine color
            const isSpecial = isFocus || isNextTurningRed
            
            const sizeBrightness = 0.4 + ((particle.size - 2) / 4) * 0.6
            const totalBrightness = particle.alpha * sizeBrightness
            
            const gradient = ctx.createRadialGradient(
              particle.x, particle.y, 0,
              particle.x, particle.y, particle.size * 2.5
            )
            
            if (isSpecial) {
              // RED
              gradient.addColorStop(0, `rgba(255, 100, 80, ${1.0 * totalBrightness})`)
              gradient.addColorStop(0.4, `rgba(255, 90, 70, ${0.6 * totalBrightness})`)
              gradient.addColorStop(0.7, `rgba(255, 90, 70, ${0.2 * totalBrightness})`)
              gradient.addColorStop(1, 'rgba(255, 90, 70, 0)')
            } else {
              // YELLOW
              gradient.addColorStop(0, `rgba(255, 220, 140, ${1.0 * totalBrightness})`)
              gradient.addColorStop(0.4, `rgba(255, 200, 120, ${0.6 * totalBrightness})`)
              gradient.addColorStop(0.7, `rgba(255, 200, 120, ${0.2 * totalBrightness})`)
              gradient.addColorStop(1, 'rgba(255, 200, 120, 0)')
            }
            
            ctx.fillStyle = gradient
            ctx.beginPath()
            ctx.arc(particle.x, particle.y, particle.size * 2.5, 0, Math.PI * 2)
            ctx.fill()
          })
          
          p.image(particleLayer, 0, 0)
          
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
            setHoveredMessage(foundParticle ? foundParticle.message.content : null)
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
          
          backgroundLayer = p.createGraphics(p.width, p.height, p.WEBGL)
          cosmicShader = backgroundLayer.createShader(vertexShader, cosmicFragmentShader)
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

      {hoveredMessage && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-lg pointer-events-none z-50">
          <div className="bg-black/90 backdrop-blur-md px-6 py-4 rounded-lg border border-white/30 shadow-2xl">
            <p className="text-white text-lg leading-relaxed italic">"{hoveredMessage}"</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default dynamic(() => Promise.resolve(ConnectionsTest), { ssr: false })
