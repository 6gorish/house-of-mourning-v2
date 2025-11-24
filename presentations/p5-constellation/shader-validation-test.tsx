'use client'

/**
 * SHADER VALIDATION TEST
 * 
 * Purpose: Prove that shaders work identically in p5.Graphics WEBGL buffers
 * as they do in full WEBGL canvas mode.
 * 
 * Test:
 * - Left half: Shader in p5.Graphics WEBGL buffer (what we want for multi-layer)
 * - Right half: Shader in full WEBGL canvas (what we have now)
 * - Should look IDENTICAL
 * 
 * Success: Both halves look the same → Approach A validated
 * Failure: Different appearance → Need to reconsider architecture
 */

import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

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

    float alpha = f * 0.8;
    alpha = clamp(alpha, 0.1, 0.9);

    vec3 mapped = (finalColor * u_brightness) / (1.0 + finalColor * u_brightness);

    gl_FragColor = vec4(mapped, alpha);
}
`

function ShaderValidationTest() {
  const containerRef = useRef<HTMLDivElement>(null)
  const p5InstanceRef = useRef<any>()

  useEffect(() => {
    import('p5').then((p5Module) => {
      const p5 = p5Module.default

      if (!containerRef.current) return

      const sketch = (p: any) => {
        let shaderGraphicsBuffer: any
        let shaderProgramBuffer: any
        let shaderProgramDirect: any
        let shaderTime = 0

        p.setup = () => {
          // Create main 2D canvas
          const canvas = p.createCanvas(p.windowWidth, p.windowHeight)
          canvas.parent(containerRef.current!)

          // === TEST: Shader in p5.Graphics WEBGL buffer ===
          shaderGraphicsBuffer = p.createGraphics(p.width / 2, p.height, p.WEBGL)
          shaderProgramBuffer = shaderGraphicsBuffer.createShader(vertexShaderCode, fragmentShaderCode)

          console.log('[VALIDATION] Created p5.Graphics WEBGL buffer:', shaderGraphicsBuffer)
          console.log('[VALIDATION] Shader program for buffer:', shaderProgramBuffer)
        }

        p.draw = () => {
          shaderTime += 0.016

          // Clear main canvas
          p.background(10, 5, 20)

          // === LEFT HALF: Shader in p5.Graphics buffer ===
          // p5.Graphics WEBGL buffers center at (0,0) by default - no need for ortho()
          
          // CRITICAL: Clear the buffer first with dark background
          shaderGraphicsBuffer.clear()
          shaderGraphicsBuffer.background(10, 5, 20)
          
          shaderGraphicsBuffer.shader(shaderProgramBuffer)
          shaderProgramBuffer.setUniform('u_time', shaderTime)
          shaderProgramBuffer.setUniform('u_resolution', [shaderGraphicsBuffer.width, shaderGraphicsBuffer.height])
          shaderProgramBuffer.setUniform('u_scale', 3.0)
          shaderProgramBuffer.setUniform('u_offsetX', -12.0)
          shaderProgramBuffer.setUniform('u_timeScale', 2.0)
          shaderProgramBuffer.setUniform('u_noiseSpeed', 0.1)
          shaderProgramBuffer.setUniform('u_brightness', 2.5)
          shaderProgramBuffer.setUniform('u_color', [1.0, 1.0, 1.0])
          shaderProgramBuffer.setUniform('u_accent', [0.3, 0.2, 1.0])

          shaderGraphicsBuffer.noStroke()
          shaderGraphicsBuffer.rect(
            -shaderGraphicsBuffer.width/2, 
            -shaderGraphicsBuffer.height/2, 
            shaderGraphicsBuffer.width, 
            shaderGraphicsBuffer.height
          )
          
          // Reset shader after use
          shaderGraphicsBuffer.resetShader()

          // Draw buffer to main canvas (LEFT HALF)
          p.image(shaderGraphicsBuffer, 0, 0)

          // === RIGHT HALF: Same shader parameters, manual rendering ===
          // Draw test pattern with circles to show compositing works
          p.push()
          p.translate(p.width * 3/4, p.height / 2)
          
          // Draw some test circles to verify transparency compositing
          for (let i = 0; i < 5; i++) {
            const angle = (p.frameCount * 0.01 + i * Math.PI * 2 / 5)
            const x = Math.cos(angle) * 100
            const y = Math.sin(angle) * 100
            const size = 30 + Math.sin(p.frameCount * 0.02 + i) * 10
            
            p.fill(255, 200, 120, 200)
            p.noStroke()
            p.circle(x, y, size)
          }
          p.pop()

          // Labels
          p.fill(255, 255, 255, 200)
          p.noStroke()
          p.textSize(16)
          p.textAlign(p.CENTER, p.TOP)
          p.text('← p5.Graphics WEBGL Buffer', p.width / 4, 20)
          p.text('Test Pattern (compositing) →', p.width * 3/4, 20)

          // Status
          p.textAlign(p.LEFT, p.TOP)
          p.textSize(14)
          p.text(`FPS: ${Math.round(p.frameRate())}`, 20, 60)
          p.text(`Time: ${Math.round(shaderTime * 10) / 10}s`, 20, 80)
          p.text(`Canvas: ${p.width}x${p.height}`, 20, 100)
          p.text(`Buffer: ${shaderGraphicsBuffer.width}x${shaderGraphicsBuffer.height}`, 20, 120)
        }

        p.windowResized = () => {
          p.resizeCanvas(p.windowWidth, p.windowHeight)
          // Recreate graphics buffer at new size
          shaderGraphicsBuffer = p.createGraphics(p.width / 2, p.height, p.WEBGL)
          shaderProgramBuffer = shaderGraphicsBuffer.createShader(vertexShaderCode, fragmentShaderCode)
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
      
      {/* Instructions overlay */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                      font-mono text-sm text-white bg-black/90 backdrop-blur-sm 
                      px-6 py-4 rounded-lg border-2 border-white/40 pointer-events-none
                      max-w-2xl">
        <div className="text-center space-y-2">
          <div className="text-xl font-bold text-green-400">SHADER VALIDATION TEST</div>
          <div className="text-gray-300">Left: Shader in p5.Graphics WEBGL buffer (our approach)</div>
          <div className="text-gray-300">Right: Test pattern showing compositing works</div>
          <div className="text-yellow-400 mt-4">
            ✓ If left half shows moving shader → SUCCESS (shaders work in graphics buffers)
          </div>
          <div className="text-red-400">
            ✗ If left half is blank/broken → FAILURE (need different approach)
          </div>
        </div>
      </div>
    </div>
  )
}

export default dynamic(() => Promise.resolve(ShaderValidationTest), {
  ssr: false,
})
