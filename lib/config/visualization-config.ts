/**
 * Visualization Configuration
 *
 * Presentation layer settings for particle animations, connection lines,
 * colors, and timing. These values are independent from business logic
 * but synchronized with cluster duration for smooth transitions.
 */

import { DEFAULT_CONFIG } from './message-pool-config'

/**
 * Visualization Config Type
 */
export interface VisualizationConfig {
  // Timing (all values in milliseconds)
  cycleDuration: number
  animateIn: number
  animateOut: number
  animateOutCushion: number
  
  // Focus-Next Connection Styling
  focusColor: string
  connectionFocusCushion: number
  connectionFocusDuration: number
  
  // Default Connection Styling
  defaultConnectionColor: string
  defaultConnectionOpacity: number
  defaultConnectionWidth: number
  
  // Focus-Next Connection Styling (when red)
  focusConnectionOpacity: number
  focusConnectionWidth: number
  
  // Particle Styling
  defaultParticleColor: string
  focusParticleColor: string
}

/**
 * Default Visualization Settings
 *
 * Optimized for contemplative, cathedral-like aesthetic.
 * Slow, gentle animations that encourage stillness and reflection.
 */
export const VISUALIZATION_CONFIG: VisualizationConfig = {
  // ===== TIMING =====
  // Import cluster duration from business logic (single source of truth)
  cycleDuration: DEFAULT_CONFIG.clusterDuration, // 20000ms = 20 seconds
  
  // Animation durations
  animateIn: 3000,           // 3 seconds fade in for connections and particles
  animateOut: 3000,          // 3 seconds fade out for connections and particles
  animateOutCushion: 4000,   // Start fade out at N-4 seconds for connection lines
  
  // ===== FOCUS-NEXT CONNECTION TIMING =====
  // When the current focus-next line turns red (before cluster transition)
  connectionFocusCushion: 6000,  // Turn red at N-6 seconds (with 3s fade)
  
  // How long the incoming focus-next line stays red (after cluster transition)
  connectionFocusDuration: 6000,  // Stay red for 6 seconds (then 3s fade back)
  
  // ===== COLORS =====
  // Focus particle and focus-next connection line color
  focusColor: 'red',  // RGB: (255, 100, 80) in shader
  
  // Default connection line color
  defaultConnectionColor: 'purple',  // RGB: (200, 180, 255) in shader
  
  // Default particle color
  defaultParticleColor: 'yellow',  // RGB: (255, 220, 140) in shader
  
  // Red variant for focus particles
  focusParticleColor: 'red',  // RGB: (255, 100, 80) in shader
  
  // ===== OPACITY & STROKE =====
  // Default connection line styling
  defaultConnectionOpacity: 0.15,
  defaultConnectionWidth: 1,
  
  // Focus-next connection line styling (when red)
  focusConnectionOpacity: 0.25,
  focusConnectionWidth: 3,
}

/**
 * Get timing values in seconds (for easier readability in logs)
 */
export function getTimingInSeconds() {
  return {
    cycleDuration: VISUALIZATION_CONFIG.cycleDuration / 1000,
    animateIn: VISUALIZATION_CONFIG.animateIn / 1000,
    animateOut: VISUALIZATION_CONFIG.animateOut / 1000,
    animateOutCushion: VISUALIZATION_CONFIG.animateOutCushion / 1000,
    connectionFocusCushion: VISUALIZATION_CONFIG.connectionFocusCushion / 1000,
    connectionFocusDuration: VISUALIZATION_CONFIG.connectionFocusDuration / 1000,
  }
}

/**
 * Calculate derived timing values
 */
export function getAnimationTimeline() {
  const { cycleDuration, animateIn, animateOut, animateOutCushion, connectionFocusCushion, connectionFocusDuration } = VISUALIZATION_CONFIG
  
  const cycleSeconds = cycleDuration / 1000
  
  return {
    // When things happen in the cycle (in seconds)
    particleFadeInEnd: animateIn / 1000,
    connectionFadeInEnd: animateIn / 1000,
    
    connectionFadeOutStart: cycleSeconds - (animateOutCushion / 1000),
    connectionFadeOutEnd: cycleSeconds - (animateOutCushion / 1000) + (animateOut / 1000),
    
    focusNextTurnsRedStart: cycleSeconds - (connectionFocusCushion / 1000),
    focusNextTurnsRedEnd: cycleSeconds - (connectionFocusCushion / 1000) + (animateIn / 1000),
    
    // After cluster transition
    incomingFocusNextStaysRedUntil: connectionFocusDuration / 1000,
    incomingFocusNextFadesBackStart: connectionFocusDuration / 1000,
    incomingFocusNextFadesBackEnd: (connectionFocusDuration / 1000) + (animateOut / 1000),
  }
}
