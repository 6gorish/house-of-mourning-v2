'use client'

/**
 * P5 Constellation - v24: Connection Lines in 3D
 * 
 * Focusing on connection lines to evaluate if WebGL 3D rendering
 * justifies giving up mouseover functionality.
 * - Render semantic connection lines in 3D
 * - Spring physics for organic movement
 * - Sample fog shader for depth illusion
 */

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import type { GriefMessage } from '@/types/grief-messages'
import { Orchestrator } from './lib/Orchestrator'
import type { FocusState } from './lib/Orchestrator'

// GLSL Shaders - exactly as on homepage
const vertexShaderCode = `
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

const fragmentShaderCode = `
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_scale;
uniform float u_offsetX;
uniform float u_timeScale;
uniform float u_noiseSpeed;
uniform float u_brightness;
uniform vec3 u_color;
uniform vec3 u_accent;

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
        v += a * noise(pos - u_noiseSpeed * dir * u_time * u_timeScale);
        pos = rot * pos * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 p = (gl_FragCoord.xy * u_scale - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    p -= vec2(u_offsetX, 0.0);
    float time2 = u_time * u_timeScale;

    vec2 q = vec2(0.0);
    q.x = fbm(p + 0.00 * time2);
    q.y = fbm(p + vec2(1.0));

    vec2 r = vec2(0.0);
    r.x = fbm(p + 1.0 * q + vec2(1.7, 1.2) + 0.15 * time2);
    r.y = fbm(p + 1.0 * q + vec2(8.3, 2.8) + 0.126 * time2);

    float f = fbm(p + r);

    vec3 baseCol = mix(vec3(0.0), u_color, clamp((f * f) * 5.5, 0.0, 1.0));
    baseCol = mix(baseCol, u_color, clamp(length(q), 0.0, 1.0));
    baseCol = mix(baseCol, u_accent, clamp(r.x, 0.0, 1.0));

    vec3 finalColor = (f * f * f * 1.0 + 0.9 * f) * baseCol;

    // Bright areas = opaque fog, dark areas = transparent
    float alpha = f * 0.8;
    alpha = clamp(alpha, 0.1, 0.9);

    // Tone mapping
    vec3 mapped = (finalColor * u_brightness) / (1.0 + finalColor * u_brightness);

    gl_FragColor = vec4(mapped, alpha);
}
`

function P5ConstellationInner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const orchestratorRef = useRef<Orchestrator>()
  const p5InstanceRef = useRef<any>()
  const supabaseRef = useRef<ReturnType<typeof createClient>>()
  const particlesRef = useRef<any>(null)
  
  const [debugInfo, setDebugInfo] = useState({ particles: 0, fps: 0, memory: 0, time: 0, focus: '' })
  const [currentFocus, setCurrentFocus] = useState<FocusState | null>(null)

  useEffect(() => {
    import('p5').then((p5Module) => {
      const p5 = p5Module.default

      import('./ParticleSystem').then((ParticleSystemModule) => {
        const { ParticleSystem } = ParticleSystemModule
        
        import('./ConnectionSystem').then((ConnectionSystemModule) => {
          const { ConnectionSystem } = ConnectionSystemModule
          
          import('./FlowField').then((FlowFieldModule) => {
            const { FlowField } = FlowFieldModule

        if (!containerRef.current) return

        const sketch = (p: any) => {
          let orchestrator: Orchestrator
          let particles: any
          let connections: ConnectionSystem
          let flowField: FlowField
          let frameCounter = 0
          let shaderProgram: any
          let shaderTime = 0
          let initializationStarted = false
          let cameraAngle = 0
          let cameraRadius = 1000
          let cameraHeight = 0

          p.setup = async () => {
            const canvas = p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL)
            canvas.parent(containerRef.current!)

            // Create shader
            shaderProgram = p.createShader(vertexShaderCode, fragmentShaderCode)

            p.colorMode(p.RGB, 255)
            p.perspective(p.PI / 3, p.width / p.height, 10, 5000)

            // Initialize particle system
            particles = new ParticleSystem(p)
            particlesRef.current = particles
            
            // Initialize connection system
            connections = new ConnectionSystem(p)
            
            // Initialize flow field
            flowField = new FlowField(p)

            // Create Supabase client
            if (!supabaseRef.current) {
              supabaseRef.current = createClient()
            }

            // Create orchestrator
            orchestrator = new Orchestrator(supabaseRef.current, {
              workingSetSize: 400,
              clusterSize: 20,
              clusterDuration: 12000, // 12 seconds - contemplative pacing
              autoCycle: true
            })
            orchestratorRef.current = orchestrator

            // Register callbacks
            orchestrator.onWorkingSetChange((added, removed) => {
              particles.syncWithWorkingSet(orchestrator.getWorkingSet())
            })

            orchestrator.onFocusChange((focus) => {
              if (focus) {
                // Update particle system with focus state
                const focusId = focus.focus.id.toString()
                const nextId = focus.next ? focus.next.id.toString() : null
                particles.setFocusState(focusId, nextId)
                
                // Update connection system
                connections.updateConnections(focus, (messageId) => {
                  const particle = particles.getParticle(messageId)
                  return particle ? particle.position : null
                })
                
                setCurrentFocus(focus)
              }
            })

            // Initialize orchestrator (async)
            if (!initializationStarted) {
              initializationStarted = true
              
              orchestrator.initialize()
                .then(() => {
                  const workingSet = orchestrator.getWorkingSet()
                  particles.syncWithWorkingSet(workingSet)
                })
                .catch((error) => {
                  console.error('[P5] Init failed:', error)
                })
            }
          }

          p.draw = () => {
            shaderTime += 0.016
            frameCounter++
            
            // Slow camera orbit
            cameraAngle += 0.001  // Very slow rotation
            cameraHeight = Math.sin(frameCounter * 0.0005) * 50  // Gentle vertical drift
            
            const camX = Math.cos(cameraAngle) * cameraRadius
            const camZ = Math.sin(cameraAngle) * cameraRadius
            
            p.camera(camX, cameraHeight, camZ, 0, 0, 0, 0, 1, 0)
            
            // Dark purple cosmos background
            p.background(10, 5, 20)

            // === LAYER 1: Particles in 3D ===
            particles.update()
            particles.render()

            // === LAYER 1.5: Connection Lines with Spring Physics ===
            const focus = orchestrator ? orchestrator.getCurrentFocus() : null
            if (focus) {
              if (frameCounter % 60 === 0) {
                console.log('[CONNECTIONS]', connections.getConnectionCount(), 'lines,', focus.related.length, 'related messages')
              }
              
              // Update connection endpoints every frame (particles are stationary but good practice)
              connections.updateEndpoints((messageId) => {
                const particle = particles.getParticle(messageId)
                return particle ? particle.position : null
              })
              
              // Apply flow field forces to make lines billow
              connections.applyFlowField((pos) => flowField.getCurlAt(pos))
              
              // Update spring physics
              connections.update()
              
              // Render curved lines with depth-based properties
              const nextId = focus.next ? focus.next.id.toString() : null
              connections.render(nextId, camZ)
            }
            
            // Update flow field time
            flowField.update()

            // === LAYER 2: Shader on top with transparency ===
            p.push()
            
            // Switch to 2D orthographic for fullscreen shader
            p.resetMatrix()
            p.ortho(-p.width/2, p.width/2, -p.height/2, p.height/2, 0, 100)
            
            // Apply shader
            p.shader(shaderProgram)
            shaderProgram.setUniform('u_time', shaderTime)
            shaderProgram.setUniform('u_resolution', [p.width, p.height])
            shaderProgram.setUniform('u_scale', 3.0)
            shaderProgram.setUniform('u_offsetX', -12.0)
            shaderProgram.setUniform('u_timeScale', 2.0)
            shaderProgram.setUniform('u_noiseSpeed', 0.1)
            shaderProgram.setUniform('u_brightness', 2.5)
            shaderProgram.setUniform('u_color', [1.0, 1.0, 1.0])
            shaderProgram.setUniform('u_accent', [0.3, 0.2, 1.0])
            
            // Draw fullscreen quad in ortho space
            p.noStroke()
            p.rect(-p.width/2, -p.height/2, p.width, p.height)
            
            p.pop()

            // Debug info
            if (frameCounter % 30 === 0) {
              const memMB = performance && (performance as any).memory 
                ? Math.round((performance as any).memory.usedJSHeapSize / 1048576)
                : 0
              
              const stats = orchestrator ? orchestrator.getStats() : null
              const focusId = stats?.currentFocusId ? String(stats.currentFocusId).substring(0, 6) : 'none'
              setDebugInfo({
                particles: particles.getParticleCount(),
                fps: Math.round(p.frameRate()),
                memory: memMB,
                time: Math.round(shaderTime * 10) / 10,
                focus: focusId
              })
            }
          }

          p.windowResized = () => {
            p.resizeCanvas(p.windowWidth, p.windowHeight)
            p.perspective(p.PI / 3, p.width / p.height, 10, 5000)
            // Shadow DOM positions will update automatically in draw loop
          }
        }

        const p5Instance = new p5(sketch)
        p5InstanceRef.current = p5Instance
          })
        })
      })
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
      <div ref={containerRef} className="absolute inset-0 z-[1]" />

      {/* Debug overlay */}
      <div className="fixed top-6 left-6 font-mono text-sm text-white bg-black/80 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/20 pointer-events-none z-50">
        <div className="space-y-1">
          <div>Particles: {debugInfo.particles}</div>
          <div>FPS: {debugInfo.fps}</div>
          <div className={debugInfo.memory > 600 ? 'text-red-400' : debugInfo.memory > 400 ? 'text-yellow-400' : 'text-green-400'}>
            Memory: {debugInfo.memory} MB
          </div>
          <div className="text-blue-400">Shader: {debugInfo.time}s</div>
          <div className="text-purple-400">Focus: {debugInfo.focus}</div>
          {currentFocus && (
            <div className="text-green-400">Related: {currentFocus.related.length}</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default dynamic(() => Promise.resolve(P5ConstellationInner), {
  ssr: false,
})
