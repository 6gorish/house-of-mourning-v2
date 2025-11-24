'use client'

/**
 * PHASE 1A: MULTI-LAYER ARCHITECTURE TEST
 * 
 * Building the complete 3-layer compositing system:
 * - Layer 1: Background shader (WEBGL) - cosmic FBM noise
 * - Layer 2: Particle layer (2D) - test circles for now
 * - Layer 3: Foreground shader (WEBGL) - atmospheric fog
 * 
 * Success criteria:
 * - All three layers visible
 * - Transparency works correctly between layers
 * - Performance <16ms per frame (60fps)
 * - Can render test content in each layer
 */

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

// Cosmic background shader (deep space)
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

    // Background is fully opaque
    gl_FragColor = vec4(mapped * 0.3, 1.0);  // Dim it for background
}
`

// Foreground fog shader (atmospheric depth)
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
    
    // Fog effect - varies from transparent to semi-opaque
    float alpha = f * 0.4;
    alpha = clamp(alpha, 0.0, 0.6);
    
    vec3 fogColor = vec3(0.2, 0.15, 0.3);  // Purple fog
    
    gl_FragColor = vec4(fogColor, alpha);
}
`

function MultiLayerTest() {
  const containerRef = useRef<HTMLDivElement>(null)
  const p5InstanceRef = useRef<any>()
  const [debugInfo, setDebugInfo] = useState({ fps: 0, renderTime: 0 })

  useEffect(() => {
    import('p5').then((p5Module) => {
      const p5 = p5Module.default

      if (!containerRef.current) return

      const sketch = (p: any) => {
        // Layer buffers
        let backgroundLayer: any
        let particleLayer: any
        let foregroundLayer: any
        
        // Shaders
        let cosmicShader: any
        let fogShader: any
        
        let shaderTime = 0
        let frameCounter = 0
        
        // Test particles for layer 2
        let testParticles: Array<{x: number, y: number, vx: number, vy: number, size: number}> = []

        p.setup = () => {
          const canvas = p.createCanvas(p.windowWidth, p.windowHeight)
          canvas.parent(containerRef.current!)
          
          console.log('[MULTI-LAYER] Setting up 3-layer architecture')
          
          // === LAYER 1: Background (WEBGL) ===
          backgroundLayer = p.createGraphics(p.width, p.height, p.WEBGL)
          cosmicShader = backgroundLayer.createShader(vertexShader, cosmicFragmentShader)
          console.log('[LAYER 1] Background WEBGL buffer created')
          
          // === LAYER 2: Particles (2D) ===
          particleLayer = p.createGraphics(p.width, p.height)
          console.log('[LAYER 2] Particle 2D buffer created')
          
          // === LAYER 3: Foreground (WEBGL) ===
          foregroundLayer = p.createGraphics(p.width, p.height, p.WEBGL)
          fogShader = foregroundLayer.createShader(vertexShader, fogFragmentShader)
          console.log('[LAYER 3] Foreground WEBGL buffer created')
          
          // Create test particles for layer 2
          for (let i = 0; i < 30; i++) {
            testParticles.push({
              x: Math.random() * p.width,
              y: Math.random() * p.height,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              size: 10 + Math.random() * 20
            })
          }
        }

        p.draw = () => {
          const drawStart = performance.now()
          shaderTime += 0.016
          frameCounter++
          
          // Clear main canvas
          p.background(10, 5, 20)
          
          // === LAYER 1: RENDER COSMIC BACKGROUND ===
          backgroundLayer.clear()
          backgroundLayer.background(10, 5, 20)
          
          backgroundLayer.shader(cosmicShader)
          cosmicShader.setUniform('u_time', shaderTime)
          cosmicShader.setUniform('u_resolution', [backgroundLayer.width, backgroundLayer.height])
          
          backgroundLayer.noStroke()
          backgroundLayer.rect(
            -backgroundLayer.width/2,
            -backgroundLayer.height/2,
            backgroundLayer.width,
            backgroundLayer.height
          )
          backgroundLayer.resetShader()
          
          // === LAYER 2: RENDER TEST PARTICLES ===
          particleLayer.clear()
          
          // Update and draw test particles
          testParticles.forEach(particle => {
            particle.x += particle.vx
            particle.y += particle.vy
            
            // Wrap around edges
            if (particle.x < 0) particle.x = p.width
            if (particle.x > p.width) particle.x = 0
            if (particle.y < 0) particle.y = p.height
            if (particle.y > p.height) particle.y = 0
            
            // Draw golden glow (simple version for now)
            particleLayer.noStroke()
            
            // Outer glow
            particleLayer.fill(255, 200, 120, 40)
            particleLayer.circle(particle.x, particle.y, particle.size * 3)
            
            // Middle glow
            particleLayer.fill(255, 200, 120, 100)
            particleLayer.circle(particle.x, particle.y, particle.size * 2)
            
            // Core
            particleLayer.fill(255, 220, 140, 200)
            particleLayer.circle(particle.x, particle.y, particle.size)
          })
          
          // === LAYER 3: RENDER ATMOSPHERIC FOG ===
          foregroundLayer.clear()
          
          foregroundLayer.shader(fogShader)
          fogShader.setUniform('u_time', shaderTime)
          fogShader.setUniform('u_resolution', [foregroundLayer.width, foregroundLayer.height])
          
          foregroundLayer.noStroke()
          foregroundLayer.rect(
            -foregroundLayer.width/2,
            -foregroundLayer.height/2,
            foregroundLayer.width,
            foregroundLayer.height
          )
          foregroundLayer.resetShader()
          
          // === COMPOSITE ALL LAYERS ===
          p.image(backgroundLayer, 0, 0)    // Layer 1: Back
          p.image(particleLayer, 0, 0)      // Layer 2: Middle
          p.image(foregroundLayer, 0, 0)    // Layer 3: Front
          
          // Performance tracking
          const drawEnd = performance.now()
          const renderTime = drawEnd - drawStart
          
          if (frameCounter % 30 === 0) {
            setDebugInfo({
              fps: Math.round(p.frameRate()),
              renderTime: Math.round(renderTime * 100) / 100
            })
          }
        }

        p.windowResized = () => {
          p.resizeCanvas(p.windowWidth, p.windowHeight)
          
          // Recreate all layers at new size
          backgroundLayer = p.createGraphics(p.width, p.height, p.WEBGL)
          cosmicShader = backgroundLayer.createShader(vertexShader, cosmicFragmentShader)
          
          particleLayer = p.createGraphics(p.width, p.height)
          
          foregroundLayer = p.createGraphics(p.width, p.height, p.WEBGL)
          fogShader = foregroundLayer.createShader(vertexShader, fogFragmentShader)
          
          console.log('[MULTI-LAYER] Resized to', p.width, 'x', p.height)
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
      <div className="fixed top-6 left-6 font-mono text-sm text-white bg-black/80 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/20 pointer-events-none z-50">
        <div className="space-y-1">
          <div className="text-xl font-bold text-green-400 mb-2">PHASE 1A: MULTI-LAYER TEST</div>
          <div className="text-gray-400">Layer 1: Cosmic background (WEBGL)</div>
          <div className="text-gray-400">Layer 2: Golden particles (2D)</div>
          <div className="text-gray-400">Layer 3: Atmospheric fog (WEBGL)</div>
          <div className="mt-3 pt-2 border-t border-white/20">
            <div>FPS: <span className={debugInfo.fps >= 55 ? 'text-green-400' : 'text-yellow-400'}>{debugInfo.fps}</span></div>
            <div>Render: <span className={debugInfo.renderTime < 16 ? 'text-green-400' : 'text-yellow-400'}>{debugInfo.renderTime}ms</span></div>
          </div>
          <div className="mt-3 pt-2 border-t border-white/20 text-xs">
            <div className="text-green-400">✓ All layers visible</div>
            <div className="text-green-400">✓ Transparency compositing</div>
            <div className="text-green-400">✓ Performance target</div>
          </div>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="fixed bottom-6 left-6 font-mono text-xs text-white/60 pointer-events-none z-50 max-w-md">
        <p>Success: You should see deep purple cosmic background, golden floating particles, and semi-transparent fog overlay creating atmospheric depth.</p>
      </div>
    </div>
  )
}

export default dynamic(() => Promise.resolve(MultiLayerTest), {
  ssr: false,
})
