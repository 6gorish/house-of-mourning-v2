'use client'

/**
 * CONSTELLATION API INTEGRATION - Proper Implementation
 * 
 * - No nav bar (added to exclusion list)
 * - Efficient mouse handling: only update state on particle change
 */

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Orchestrator } from './lib/Orchestrator'
import type { FocusState } from './lib/Orchestrator'
import { ParticleSystem2D } from './ParticleSystem2D'

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

const fogFragmentShader = `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
varying vec2 vTexCoord;

#define NUM_OCTAVES 3

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
        v += a * noise(pos - 0.05 * dir * u_time * 1.5);
        pos = rot * pos * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 p = (gl_FragCoord.xy * 4.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    
    float f = fbm(p + u_time * 0.3);
    
    float alpha = f * 0.4;
    alpha = clamp(alpha, 0.0, 0.6);
    
    vec3 fogColor = vec3(0.2, 0.15, 0.3);
    
    gl_FragColor = vec4(fogColor, alpha);
}
`

function ConstellationAPIIntegration() {
  const containerRef = useRef<HTMLDivElement>(null)
  const p5InstanceRef = useRef<any>()
  const particleSystemRef = useRef<ParticleSystem2D>()
  const orchestratorRef = useRef<Orchestrator>()
  const currentHoveredIdRef = useRef<string | null>(null)
  
  const [debugInfo, setDebugInfo] = useState({ 
    fps: 0, 
    renderTime: 0, 
    particles: 0,
    workingSet: 0,
    focusId: '',
    initialized: false
  })
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null)

  // Efficient mouse handler - only updates state when particle CHANGES
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!particleSystemRef.current || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const particle = particleSystemRef.current.findParticleAtPosition(x, y)
    const newId = particle ? particle.id : null
    
    // Only update if particle changed (enter/leave/swap)
    if (newId !== currentHoveredIdRef.current) {
      currentHoveredIdRef.current = newId
      
      if (particle) {
        console.log('[HOVER] Enter:', particle.message.content.substring(0, 50))
        setHoveredMessage(particle.message.content)
      } else {
        console.log('[HOVER] Leave')
        setHoveredMessage(null)
      }
    }
  }

  useEffect(() => {
    import('p5').then((p5Module) => {
      const p5 = p5Module.default

      if (!containerRef.current) return

      const sketch = (p: any) => {
        let backgroundLayer: any
        let particleLayer: any
        let foregroundLayer: any
        
        let cosmicShader: any
        let fogShader: any
        
        let shaderTime = 0
        let frameCounter = 0
        
        let particleSystem: ParticleSystem2D
        let orchestrator: Orchestrator
        let initStarted = false

        p.setup = async () => {
          const canvas = p.createCanvas(p.windowWidth, p.windowHeight)
          canvas.parent(containerRef.current!)
          
          console.log('[API] Setup starting...')
          
          // === LAYER 1: Background (WEBGL) ===
          backgroundLayer = p.createGraphics(p.width, p.height, p.WEBGL)
          cosmicShader = backgroundLayer.createShader(vertexShader, cosmicFragmentShader)
          
          // === LAYER 2: Particles (2D) ===
          particleLayer = p.createGraphics(p.width, p.height)
          particleSystem = new ParticleSystem2D(p, p.width, p.height)
          particleSystemRef.current = particleSystem
          
          // === LAYER 3: Foreground (WEBGL) ===
          foregroundLayer = p.createGraphics(p.width, p.height, p.WEBGL)
          fogShader = foregroundLayer.createShader(vertexShader, fogFragmentShader)
          
          // === INITIALIZE ORCHESTRATOR ===
          if (!initStarted) {
            initStarted = true
            
            const supabase = createClient()
            orchestrator = new Orchestrator(supabase, {
              workingSetSize: 300,
              clusterSize: 20,
              clusterDuration: 12000,
              autoCycle: true
            })
            orchestratorRef.current = orchestrator
            
            orchestrator.onWorkingSetChange((added, removed) => {
              console.log('[API] Working set:', added.length, 'added,', removed.length, 'removed')
              particleSystem.syncWithWorkingSet(orchestrator.getWorkingSet())
            })
            
            orchestrator.onFocusChange((focus: FocusState | null) => {
              if (focus) {
                console.log('[API] Focus:', focus.focus.id)
              }
            })
            
            try {
              console.log('[API] Initializing orchestrator...')
              await orchestrator.initialize()
              console.log('[API] Initialized successfully')
            } catch (error) {
              console.error('[API] Init failed:', error)
            }
          }
        }

        p.draw = () => {
          const drawStart = performance.now()
          shaderTime += 0.016
          frameCounter++
          
          p.background(10, 5, 20)
          
          // === LAYER 1: COSMIC BACKGROUND ===
          backgroundLayer.clear()
          backgroundLayer.background(10, 5, 20)
          backgroundLayer.shader(cosmicShader)
          cosmicShader.setUniform('u_time', shaderTime)
          cosmicShader.setUniform('u_resolution', [backgroundLayer.width, backgroundLayer.height])
          backgroundLayer.noStroke()
          backgroundLayer.rect(-backgroundLayer.width/2, -backgroundLayer.height/2, backgroundLayer.width, backgroundLayer.height)
          backgroundLayer.resetShader()
          
          p.image(backgroundLayer, 0, 0)
          
          // === LAYER 2: PARTICLES FROM API ===
          if (particleSystem) {
            particleSystem.update()
            const ctx = particleLayer.drawingContext
            particleSystem.render(ctx)
          }
          
          p.image(particleLayer, 0, 0)
          
          // === LAYER 3: ATMOSPHERIC FOG ===
          foregroundLayer.clear()
          foregroundLayer.shader(fogShader)
          fogShader.setUniform('u_time', shaderTime)
          fogShader.setUniform('u_resolution', [foregroundLayer.width, foregroundLayer.height])
          foregroundLayer.noStroke()
          foregroundLayer.rect(-foregroundLayer.width/2, -foregroundLayer.height/2, foregroundLayer.width, foregroundLayer.height)
          foregroundLayer.resetShader()
          
          p.image(foregroundLayer, 0, 0)
          
          // Performance tracking
          const drawEnd = performance.now()
          const renderTime = drawEnd - drawStart
          
          if (frameCounter % 30 === 0 && orchestrator) {
            const stats = orchestrator.getStats()
            setDebugInfo({
              fps: Math.round(p.frameRate()),
              renderTime: Math.round(renderTime * 100) / 100,
              particles: particleSystem ? particleSystem.getParticleCount() : 0,
              workingSet: stats.workingSetSize,
              focusId: stats.currentFocusId ? String(stats.currentFocusId).substring(0, 6) : 'none',
              initialized: stats.initialized
            })
          }
        }

        p.windowResized = () => {
          p.resizeCanvas(p.windowWidth, p.windowHeight)
          
          backgroundLayer = p.createGraphics(p.width, p.height, p.WEBGL)
          cosmicShader = backgroundLayer.createShader(vertexShader, cosmicFragmentShader)
          
          particleLayer = p.createGraphics(p.width, p.height)
          if (particleSystem) {
            particleSystem.updateCanvasSize(p.width, p.height)
          }
          
          foregroundLayer = p.createGraphics(p.width, p.height, p.WEBGL)
          fogShader = foregroundLayer.createShader(vertexShader, fogFragmentShader)
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
      <div 
        ref={containerRef} 
        className="absolute inset-0"
        onMouseMove={handleMouseMove}
      />
      
      {/* Status overlay */}
      <div className="fixed top-6 right-6 font-mono text-sm text-white bg-black/80 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/20 pointer-events-none z-50">
        <div className="space-y-1">
          <div className="text-lg font-bold text-green-400">API INTEGRATION</div>
          <div className="text-xs text-gray-400">Live data from Supabase</div>
          <div className="mt-2 pt-2 border-t border-white/20">
            <div>Status: <span className={debugInfo.initialized ? 'text-green-400' : 'text-yellow-400'}>
              {debugInfo.initialized ? 'Connected' : 'Initializing...'}
            </span></div>
            <div>Particles: {debugInfo.particles} / {debugInfo.workingSet}</div>
            <div>Focus: <span className="text-purple-400">{debugInfo.focusId}</span></div>
            <div className="mt-2 pt-2 border-t border-white/10">
              <div>FPS: <span className={debugInfo.fps >= 55 ? 'text-green-400' : 'text-yellow-400'}>{debugInfo.fps}</span></div>
              <div>Render: <span className={debugInfo.renderTime < 16 ? 'text-green-400' : 'text-yellow-400'}>{debugInfo.renderTime}ms</span></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Context */}
      <div className="fixed bottom-6 left-6 font-mono text-xs text-white/60 pointer-events-none z-50 max-w-md bg-black/60 backdrop-blur-sm px-3 py-2 rounded">
        <p>🕯️ Hover over particles to reveal grief messages</p>
      </div>

      {/* Message Display on Hover */}
      {hoveredMessage && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-lg pointer-events-none z-50">
          <div className="bg-black/90 backdrop-blur-md px-6 py-4 rounded-lg border border-white/30 shadow-2xl">
            <p className="text-white text-lg leading-relaxed italic">
              "{hoveredMessage}"
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default dynamic(() => Promise.resolve(ConstellationAPIIntegration), {
  ssr: false,
})
