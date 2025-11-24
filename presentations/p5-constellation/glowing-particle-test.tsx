'use client'

/**
 * PHASE 1B: GLOWING PARTICLE TECHNIQUES TEST
 * 
 * Testing 3 different approaches to create soft votive candle glow:
 * - Technique A: Radial gradient overlay (inspired by debug box effect)
 * - Technique B: Multiple semi-transparent layers
 * - Technique C: Blend modes (SCREEN/ADD)
 * 
 * CRITICAL: Particles are STATIONARY (no movement) - votive candles in space
 * 
 * Success criteria:
 * - Soft, hazy edges (not hard concentric circles)
 * - Golden luminosity
 * - Looks like votive candles in a cathedral
 * - 60fps performance
 */

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

// Simple background shader for context
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

function GlowingParticleTest() {
  const containerRef = useRef<HTMLDivElement>(null)
  const p5InstanceRef = useRef<any>()
  const [debugInfo, setDebugInfo] = useState({ fps: 0, renderTime: 0, technique: 'A' })

  useEffect(() => {
    import('p5').then((p5Module) => {
      const p5 = p5Module.default

      if (!containerRef.current) return

      const sketch = (p: any) => {
        let backgroundLayer: any
        let particleLayerA: any
        let particleLayerB: any
        let particleLayerC: any
        
        let cosmicShader: any
        let shaderTime = 0
        let frameCounter = 0
        
        // STATIONARY particles (no movement!)
        const particles = [
          // Top row - Technique A (radial gradient overlay)
          { x: 200, y: 150, size: 20 },
          { x: 400, y: 150, size: 15 },
          { x: 600, y: 150, size: 25 },
          
          // Middle row - Technique B (multiple semi-transparent layers)
          { x: 200, y: 400, size: 20 },
          { x: 400, y: 400, size: 15 },
          { x: 600, y: 400, size: 25 },
          
          // Bottom row - Technique C (blend modes)
          { x: 200, y: 650, size: 20 },
          { x: 400, y: 650, size: 15 },
          { x: 600, y: 650, size: 25 },
        ]

        p.setup = () => {
          const canvas = p.createCanvas(p.windowWidth, p.windowHeight)
          canvas.parent(containerRef.current!)
          
          // Background layer
          backgroundLayer = p.createGraphics(p.width, p.height, p.WEBGL)
          cosmicShader = backgroundLayer.createShader(vertexShader, cosmicFragmentShader)
          
          // Particle layers for each technique
          particleLayerA = p.createGraphics(p.width, p.height)
          particleLayerB = p.createGraphics(p.width, p.height)
          particleLayerC = p.createGraphics(p.width, p.height)
          
          console.log('[PHASE 1B] Testing 3 glow techniques with STATIONARY particles')
        }

        p.draw = () => {
          const drawStart = performance.now()
          shaderTime += 0.016
          frameCounter++
          
          p.background(10, 5, 20)
          
          // === BACKGROUND SHADER ===
          backgroundLayer.clear()
          backgroundLayer.background(10, 5, 20)
          backgroundLayer.shader(cosmicShader)
          cosmicShader.setUniform('u_time', shaderTime)
          cosmicShader.setUniform('u_resolution', [backgroundLayer.width, backgroundLayer.height])
          backgroundLayer.noStroke()
          backgroundLayer.rect(-backgroundLayer.width/2, -backgroundLayer.height/2, backgroundLayer.width, backgroundLayer.height)
          backgroundLayer.resetShader()
          
          p.image(backgroundLayer, 0, 0)
          
          // === TECHNIQUE A: RADIAL GRADIENT OVERLAY (debug box effect) ===
          particleLayerA.clear()
          
          for (let i = 0; i < 3; i++) {
            const particle = particles[i]
            
            // Create radial gradient using DrawingContext
            const ctx = particleLayerA.drawingContext
            const gradient = ctx.createRadialGradient(
              particle.x, particle.y, 0,  // Inner circle
              particle.x, particle.y, particle.size * 4  // Outer circle
            )
            
            // Golden core → transparent edge
            gradient.addColorStop(0, 'rgba(255, 220, 140, 1.0)')
            gradient.addColorStop(0.3, 'rgba(255, 200, 120, 0.8)')
            gradient.addColorStop(0.6, 'rgba(255, 200, 120, 0.3)')
            gradient.addColorStop(1, 'rgba(255, 200, 120, 0)')
            
            ctx.fillStyle = gradient
            ctx.beginPath()
            ctx.arc(particle.x, particle.y, particle.size * 4, 0, Math.PI * 2)
            ctx.fill()
          }
          
          p.image(particleLayerA, 0, 0)
          
          // === TECHNIQUE B: MULTIPLE SEMI-TRANSPARENT LAYERS ===
          particleLayerB.clear()
          
          for (let i = 3; i < 6; i++) {
            const particle = particles[i]
            
            // Layer 1: Large halo (very transparent)
            particleLayerB.noStroke()
            particleLayerB.fill(255, 200, 120, 20)
            particleLayerB.circle(particle.x, particle.y, particle.size * 8)
            
            // Layer 2: Medium glow
            particleLayerB.fill(255, 200, 120, 50)
            particleLayerB.circle(particle.x, particle.y, particle.size * 4)
            
            // Layer 3: Inner glow
            particleLayerB.fill(255, 210, 130, 120)
            particleLayerB.circle(particle.x, particle.y, particle.size * 2)
            
            // Layer 4: Core
            particleLayerB.fill(255, 220, 140, 220)
            particleLayerB.circle(particle.x, particle.y, particle.size)
          }
          
          p.image(particleLayerB, 0, 0)
          
          // === TECHNIQUE C: BLEND MODES ===
          particleLayerC.clear()
          particleLayerC.blendMode(p.ADD)  // Additive blending (use p.ADD not particleLayerC.ADD)
          
          for (let i = 6; i < 9; i++) {
            const particle = particles[i]
            
            // Soft outer glow
            for (let r = particle.size * 3; r > 0; r -= 2) {
              const alpha = p.map(r, 0, particle.size * 3, 200, 0)
              particleLayerC.noStroke()
              particleLayerC.fill(255, 200, 120, alpha * 0.1)
              particleLayerC.circle(particle.x, particle.y, r * 2)
            }
            
            // Bright core
            particleLayerC.fill(255, 220, 140, 255)
            particleLayerC.circle(particle.x, particle.y, particle.size)
          }
          
          particleLayerC.blendMode(p.BLEND)  // Reset blend mode (use p.BLEND)
          p.image(particleLayerC, 0, 0)
          
          // Labels
          p.fill(255, 255, 255, 200)
          p.noStroke()
          p.textSize(14)
          p.textAlign(p.LEFT, p.CENTER)
          p.text('TECHNIQUE A: Radial Gradient (debug box effect)', 20, 150)
          p.text('TECHNIQUE B: Multiple Layers', 20, 400)
          p.text('TECHNIQUE C: Blend Modes (ADD)', 20, 650)
          
          // Performance
          const drawEnd = performance.now()
          const renderTime = drawEnd - drawStart
          
          if (frameCounter % 30 === 0) {
            setDebugInfo({
              fps: Math.round(p.frameRate()),
              renderTime: Math.round(renderTime * 100) / 100,
              technique: 'Comparing A vs B vs C'
            })
          }
        }

        p.windowResized = () => {
          p.resizeCanvas(p.windowWidth, p.windowHeight)
          backgroundLayer = p.createGraphics(p.width, p.height, p.WEBGL)
          cosmicShader = backgroundLayer.createShader(vertexShader, cosmicFragmentShader)
          particleLayerA = p.createGraphics(p.width, p.height)
          particleLayerB = p.createGraphics(p.width, p.height)
          particleLayerC = p.createGraphics(p.width, p.height)
        }
      }

      const p5Instance = new p5(sketch)
      p5InstanceRef.current = p5Instance
    })

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove()
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 w-full h-full bg-black" style={{ zIndex: 0 }}>
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* Status overlay */}
      <div className="fixed top-6 right-6 font-mono text-sm text-white bg-black/80 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/20 pointer-events-none z-50">
        <div className="space-y-1">
          <div className="text-xl font-bold text-yellow-400 mb-2">PHASE 1B: GLOW TEST</div>
          <div>FPS: <span className={debugInfo.fps >= 55 ? 'text-green-400' : 'text-yellow-400'}>{debugInfo.fps}</span></div>
          <div>Render: <span className={debugInfo.renderTime < 16 ? 'text-green-400' : 'text-yellow-400'}>{debugInfo.renderTime}ms</span></div>
          <div className="mt-3 pt-2 border-t border-white/20 text-xs">
            <div className="text-gray-400">Compare techniques:</div>
            <div className="text-green-400">Which looks most like</div>
            <div className="text-green-400">votive candles?</div>
          </div>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="fixed bottom-6 left-6 font-mono text-xs text-white/60 pointer-events-none z-50 max-w-md bg-black/80 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/20">
        <div className="space-y-2">
          <p className="text-white font-bold">🕯️ STATIONARY PARTICLES (no movement)</p>
          <p>Top row: Radial gradient (inspired by debug box)</p>
          <p>Middle row: Multiple semi-transparent layers</p>
          <p>Bottom row: Additive blend modes</p>
          <p className="text-yellow-400 mt-2">Which technique creates the softest, most candle-like glow?</p>
        </div>
      </div>
    </div>
  )
}

export default dynamic(() => Promise.resolve(GlowingParticleTest), {
  ssr: false,
})
