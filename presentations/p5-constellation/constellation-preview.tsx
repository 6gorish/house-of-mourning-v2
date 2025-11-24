'use client'

/**
 * CONSTELLATION PREVIEW - Radial Gradient Technique
 * 
 * Full preview of how the installation will look using Technique A (radial gradient).
 * This shows the complete aesthetic: many stationary particles with soft votive glow
 * over cosmic background with atmospheric fog.
 * 
 * STATIONARY PARTICLES - No movement, contemplative stillness
 */

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

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

    // Dark background - match glow-test exactly
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

function ConstellationPreview() {
  const containerRef = useRef<HTMLDivElement>(null)
  const p5InstanceRef = useRef<any>()
  const [debugInfo, setDebugInfo] = useState({ fps: 0, renderTime: 0, particles: 0 })

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
        
        // Create constellation of STATIONARY particles
        let particles: Array<{x: number, y: number, size: number}> = []

        p.setup = () => {
          const canvas = p.createCanvas(p.windowWidth, p.windowHeight)
          canvas.parent(containerRef.current!)
          
          // Create layers
          backgroundLayer = p.createGraphics(p.width, p.height, p.WEBGL)
          cosmicShader = backgroundLayer.createShader(vertexShader, cosmicFragmentShader)
          
          particleLayer = p.createGraphics(p.width, p.height)
          
          foregroundLayer = p.createGraphics(p.width, p.height, p.WEBGL)
          fogShader = foregroundLayer.createShader(vertexShader, fogFragmentShader)
          
          // Generate random STATIONARY particle positions
          for (let i = 0; i < 300; i++) {
            particles.push({
              x: Math.random() * p.width,
              y: Math.random() * p.height,
              size: 2 + Math.random() * 4  // Smaller cores: 2-6px
            })
          }
          
          console.log('[CONSTELLATION] Created', particles.length, 'stationary particles with radial gradient glow')
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
          
          // === LAYER 2: PARTICLES (SUBTLE RADIAL GRADIENT) ===
          particleLayer.clear()
          
          const ctx = particleLayer.drawingContext
          
          // Draw each STATIONARY particle with SMALL radial gradient (debug box effect)
          particles.forEach(particle => {
            // Size-based brightness: larger particles = brighter, smaller = dimmer
            // Size range is 2-6px, map to brightness 0.4-1.0 (so smallest are visible but dim)
            const brightness = 0.4 + ((particle.size - 2) / 4) * 0.6
            
            const gradient = ctx.createRadialGradient(
              particle.x, particle.y, 0,
              particle.x, particle.y, particle.size * 2.5  // SMALL halo - just 2.5x core size
            )
            
            // Subtle soft edge - fewer stops, tighter falloff, brightness scaled by size
            gradient.addColorStop(0, `rgba(255, 220, 140, ${1.0 * brightness})`)      // Bright core
            gradient.addColorStop(0.4, `rgba(255, 200, 120, ${0.6 * brightness})`)    // Mid glow
            gradient.addColorStop(0.7, `rgba(255, 200, 120, ${0.2 * brightness})`)    // Soft edge
            gradient.addColorStop(1, 'rgba(255, 200, 120, 0)')                         // Transparent
            
            ctx.fillStyle = gradient
            ctx.beginPath()
            ctx.arc(particle.x, particle.y, particle.size * 2.5, 0, Math.PI * 2)
            ctx.fill()
          })
          
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
          
          if (frameCounter % 30 === 0) {
            setDebugInfo({
              fps: Math.round(p.frameRate()),
              renderTime: Math.round(renderTime * 100) / 100,
              particles: particles.length
            })
          }
        }

        p.windowResized = () => {
          p.resizeCanvas(p.windowWidth, p.windowHeight)
          
          backgroundLayer = p.createGraphics(p.width, p.height, p.WEBGL)
          cosmicShader = backgroundLayer.createShader(vertexShader, cosmicFragmentShader)
          
          particleLayer = p.createGraphics(p.width, p.height)
          
          foregroundLayer = p.createGraphics(p.width, p.height, p.WEBGL)
          fogShader = foregroundLayer.createShader(vertexShader, fogFragmentShader)
          
          // Regenerate particles at new canvas size
          particles = []
          for (let i = 0; i < 300; i++) {
            particles.push({
              x: Math.random() * p.width,
              y: Math.random() * p.height,
              size: 2 + Math.random() * 4
            })
          }
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
    <div className="fixed inset-0 w-full h-full bg-black">
      <div ref={containerRef} className="absolute inset-0" />
      
      {/* Minimal status overlay */}
      <div className="fixed top-6 right-6 font-mono text-sm text-white bg-black/80 backdrop-blur-sm px-4 py-3 rounded-lg border border-white/20 pointer-events-none z-50">
        <div className="space-y-1">
          <div className="text-lg font-bold text-purple-400">DARK SHADER</div>
          <div className="text-xs text-gray-400">Particles pop dramatically</div>
          <div className="mt-2 pt-2 border-t border-white/20">
            <div>Particles: {debugInfo.particles}</div>
            <div>FPS: <span className={debugInfo.fps >= 55 ? 'text-green-400' : 'text-yellow-400'}>{debugInfo.fps}</span></div>
            <div>Render: <span className={debugInfo.renderTime < 16 ? 'text-green-400' : 'text-yellow-400'}>{debugInfo.renderTime}ms</span></div>
          </div>
        </div>
      </div>
      
      {/* Context */}
      <div className="fixed bottom-6 left-6 font-mono text-xs text-white/60 pointer-events-none z-50 max-w-md bg-black/60 backdrop-blur-sm px-3 py-2 rounded">
        <p>🕯️ Votive candles in cosmic space. Stationary particles with soft radial glow.</p>
      </div>
    </div>
  )
}

export default dynamic(() => Promise.resolve(ConstellationPreview), {
  ssr: false,
})
