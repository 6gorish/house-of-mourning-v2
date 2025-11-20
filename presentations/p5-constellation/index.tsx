/**
 * P5 Constellation - v7.1: Strong Ambient Light
 * 
 * Use ambient light only - illuminates all surfaces equally, no shading
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { GriefMessage } from '@/types/database'

class MockOrchestrator {
  private mockMessages: GriefMessage[] = []

  start() {
    this.mockMessages = this.generateMockMessages(120) // Increased for better distribution
  }

  stop() {}

  getWorkingSet(): GriefMessage[] {
    return this.mockMessages
  }

  getCurrentClusters(): Map<string, GriefMessage[]> {
    return new Map()
  }

  private generateMockMessages(count: number): GriefMessage[] {
    const messages: GriefMessage[] = []
    const sampleTexts = [
      'My mother. Every day I reach for the phone.',
      'The silence where your laughter used to be.',
      'I still set the table for two.',
      'Your empty chair at Thanksgiving.',
      'The dog still waits by the door.',
      'Your handwriting in the margins of my books.',
      'The future we planned that will never arrive.',
      "I've forgotten the sound of your voice.",
      'Three years and it still hurts.',
      'The weight of what I never said.',
    ]

    for (let i = 0; i < count; i++) {
      messages.push(this.createMockMessage(sampleTexts[i % sampleTexts.length]))
    }

    return messages
  }

  private createMockMessage(content?: string): GriefMessage {
    return {
      id: Date.now() + Math.random(),
      content: content || 'Loss that shapes who we become.',
      created_at: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      approved: true,
      deleted_at: null,
      source: 'web',
      ip_hash: null,
      session_id: null,
      semantic_data: {
        embedding: Array.from({ length: 10 }, () => Math.random() * 2 - 1),
      },
    }
  }
}

function P5ConstellationInner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const orchestratorRef = useRef<MockOrchestrator>()
  const p5InstanceRef = useRef<any>()
  
  const [debugInfo, setDebugInfo] = useState({ particles: 0, fps: 0 })

  useEffect(() => {
    import('p5').then((p5Module) => {
      const p5 = p5Module.default

      import('./ParticleSystem').then((ParticleSystemModule) => {
        const { ParticleSystem } = ParticleSystemModule

        if (!containerRef.current) return

        const sketch = (p: any) => {
          let orchestrator: MockOrchestrator
          let particles: any
          let frameCounter = 0

          p.setup = () => {
            const canvas = p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL)
            canvas.parent(containerRef.current!)

            // Use RGB color mode for emissive materials
            p.colorMode(p.RGB, 255)

            // Camera further back to reduce distortion
            p.camera(0, 0, 1000, 0, 0, 0, 0, 1, 0)

            // VERY narrow FOV to minimize distortion (30°)
            p.perspective(p.PI / 6, p.width / p.height, 10, 5000)

            // NO LIGHTS - using emissive materials for self-luminous particles
            // Emissive materials bypass lighting system = perfect uniform color

            orchestrator = new MockOrchestrator()
            orchestratorRef.current = orchestrator

            particles = new ParticleSystem(p)

            orchestrator.start()
          }

          p.draw = () => {
            p.background(0, 0, 0) // Pure black

            const workingSet = orchestrator.getWorkingSet()
            particles.syncWithWorkingSet(workingSet)

            particles.update()
            particles.render()

            frameCounter++
            if (frameCounter % 10 === 0) {
              setDebugInfo({
                particles: particles.getParticleCount(),
                fps: Math.round(p.frameRate()),
              })
            }
          }

          p.windowResized = () => {
            p.resizeCanvas(p.windowWidth, p.windowHeight)
            p.perspective(p.PI / 6, p.width / p.height, 10, 5000)
          }
        }

        const p5Instance = new p5(sketch)
        p5InstanceRef.current = p5Instance
      })
    })

    return () => {
      orchestratorRef.current?.stop()
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove()
      }
    }
  }, [])

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      <div className="absolute top-4 left-4 font-mono text-sm text-white/80 bg-black/60 px-3 py-2 rounded pointer-events-none z-10">
        <div>Particles: {debugInfo.particles}</div>
        <div>FPS: {debugInfo.fps}</div>
      </div>
    </div>
  )
}

export default dynamic(() => Promise.resolve(P5ConstellationInner), {
  ssr: false,
})
