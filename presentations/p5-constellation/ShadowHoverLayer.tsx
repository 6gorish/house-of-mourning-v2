/**
 * ShadowHoverLayer - Invisible DOM layer for efficient hover detection
 * 
 * Creates invisible divs positioned over stationary 3D particles.
 * Uses native browser mouseenter/mouseleave instead of frame-based detection.
 * Only updates when working set changes or window resizes.
 */

import { useEffect, useRef } from 'react'
import type { GriefMessage } from '@/types/grief-messages'

interface ParticlePosition {
  messageId: string
  screenX: number
  screenY: number
  screenRadius: number
  message: GriefMessage
}

interface ShadowHoverLayerProps {
  particles: ParticlePosition[]
  onHoverStart: (message: GriefMessage, mouseX: number, mouseY: number) => void
  onHoverEnd: () => void
}

export function ShadowHoverLayer({ 
  particles, 
  onHoverStart, 
  onHoverEnd
}: ShadowHoverLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const shadowDivsRef = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const existingDivs = shadowDivsRef.current
    const currentIds = new Set(particles.map(p => p.messageId))
    
    console.log('[ShadowHoverLayer] Update triggered:', {
      particleCount: particles.length,
      firstParticle: particles.length > 0 ? {
        id: particles[0].messageId.substring(0, 8),
        pos: `(${particles[0].screenX.toFixed(0)}, ${particles[0].screenY.toFixed(0)})`,
        radius: particles[0].screenRadius
      } : 'none'
    })
    
    // Remove divs for particles no longer in working set
    for (const [id, div] of existingDivs) {
      if (!currentIds.has(id)) {
        div.remove()
        existingDivs.delete(id)
      }
    }

    // Add or update divs for current particles
    particles.forEach(({ messageId, screenX, screenY, screenRadius, message }) => {
      let div = existingDivs.get(messageId)
      
      // Add padding to make hover area slightly larger than visible particle
      const paddedRadius = screenRadius * 1.2
      
      if (!div) {
        // Create new shadow div
        div = document.createElement('div')
        div.style.position = 'absolute'
        div.style.pointerEvents = 'auto'
        div.style.cursor = 'pointer'
        // DEBUG: Visible black dots to check alignment
        div.style.backgroundColor = 'black'
        div.style.borderRadius = '50%'
        div.style.opacity = '0.8'
        div.style.border = '1px solid rgba(255,255,255,0.3)'
        
        console.log('[ShadowHoverLayer] Creating new div for particle:', messageId.substring(0, 8))
        
        // Attach hover handlers
        div.addEventListener('mouseenter', (e) => {
          onHoverStart(message, e.clientX, e.clientY)
        })
        
        div.addEventListener('mouseleave', () => {
          onHoverEnd()
        })
        
        container.appendChild(div)
        existingDivs.set(messageId, div)
      }
      
      // Update size and position for each particle (they may have different sizes)
      div.style.width = `${paddedRadius * 2}px`
      div.style.height = `${paddedRadius * 2}px`
      div.style.left = `${screenX - paddedRadius}px`
      div.style.top = `${screenY - paddedRadius}px`
      
      console.log('[ShadowHoverLayer] Positioned div:', {
        id: messageId.substring(0, 8),
        left: div.style.left,
        top: div.style.top,
        size: `${div.style.width} x ${div.style.height}`
      })
    })
  }, [particles, onHoverStart, onHoverEnd])

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    >
      {/* Shadow divs are created/managed in useEffect */}
    </div>
  )
}
