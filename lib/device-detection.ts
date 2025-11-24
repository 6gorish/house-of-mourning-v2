/**
 * Device Detection & Performance Configuration
 * 
 * Provides device-aware settings for optimal performance across
 * desktop, tablet, and mobile devices.
 */

export type DeviceType = 'desktop' | 'tablet' | 'mobile'

export interface DeviceConfig {
  type: DeviceType
  
  // Particle system
  workingSetSize: number
  maxParticleSize: number
  minParticleSize: number
  
  // Shaders
  enableForegroundFog: boolean
  shaderQuality: 'high' | 'medium' | 'low'
  
  // Connection lines
  connectionLineWidth: number
  focusConnectionLineWidth: number
  connectionOpacityMultiplier: number
  
  // Performance
  targetFPS: number
  adaptiveQuality: boolean
}

/**
 * Detect device type based on user agent and screen size
 */
export function detectDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop'
  
  const userAgent = navigator.userAgent.toLowerCase()
  const screenWidth = window.innerWidth
  
  // Check user agent for mobile indicators
  const isMobileUA = /iphone|ipod|android.*mobile|windows phone|blackberry/i.test(userAgent)
  const isTabletUA = /ipad|android(?!.*mobile)|tablet/i.test(userAgent)
  
  // Combine with screen size for better accuracy
  if (isMobileUA || screenWidth < 768) {
    return 'mobile'
  }
  
  if (isTabletUA || (screenWidth >= 768 && screenWidth < 1024)) {
    return 'tablet'
  }
  
  return 'desktop'
}

/**
 * Check if current device is mobile
 */
export function isMobile(): boolean {
  return detectDeviceType() === 'mobile'
}

/**
 * Check if current device is tablet
 */
export function isTablet(): boolean {
  return detectDeviceType() === 'tablet'
}

/**
 * Get device-appropriate configuration
 */
export function getDeviceConfig(): DeviceConfig {
  const deviceType = detectDeviceType()
  
  switch (deviceType) {
    case 'mobile':
      return {
        type: 'mobile',
        
        // Significantly reduced particle count
        workingSetSize: 100,
        maxParticleSize: 3,      // Smaller max size
        minParticleSize: 1.5,
        
        // Disable expensive fog shader
        enableForegroundFog: false,
        shaderQuality: 'low',
        
        // Thicker, more visible connection lines
        connectionLineWidth: 2,
        focusConnectionLineWidth: 4,
        connectionOpacityMultiplier: 1.5,  // Boost opacity
        
        // Lower target, enable adaptive
        targetFPS: 30,
        adaptiveQuality: true,
      }
      
    case 'tablet':
      return {
        type: 'tablet',
        
        // Moderate reduction
        workingSetSize: 200,
        maxParticleSize: 4,
        minParticleSize: 1.5,
        
        // Keep fog but at lower quality
        enableForegroundFog: true,
        shaderQuality: 'medium',
        
        // Slightly thicker lines
        connectionLineWidth: 1.5,
        focusConnectionLineWidth: 3.5,
        connectionOpacityMultiplier: 1.2,
        
        targetFPS: 45,
        adaptiveQuality: true,
      }
      
    case 'desktop':
    default:
      return {
        type: 'desktop',
        
        // Full quality
        workingSetSize: 300,
        maxParticleSize: 6,
        minParticleSize: 2,
        
        enableForegroundFog: true,
        shaderQuality: 'high',
        
        connectionLineWidth: 1,
        focusConnectionLineWidth: 3,
        connectionOpacityMultiplier: 1.0,
        
        targetFPS: 60,
        adaptiveQuality: false,
      }
  }
}

/**
 * FPS Monitor for adaptive quality
 * 
 * Tracks frame rate and triggers quality reduction if needed.
 */
export class FPSMonitor {
  private samples: number[] = []
  private maxSamples = 60  // 1 second of samples at 60fps
  private lastTime = 0
  private qualityLevel = 1.0  // 1.0 = full quality, 0.5 = reduced
  private targetFPS: number
  private onQualityChange?: (level: number) => void
  
  constructor(targetFPS: number = 30, onQualityChange?: (level: number) => void) {
    this.targetFPS = targetFPS
    this.onQualityChange = onQualityChange
  }
  
  /**
   * Call this every frame with current timestamp
   */
  tick(currentTime: number): void {
    if (this.lastTime > 0) {
      const delta = currentTime - this.lastTime
      const fps = 1000 / delta
      
      this.samples.push(fps)
      if (this.samples.length > this.maxSamples) {
        this.samples.shift()
      }
      
      // Check every 30 frames
      if (this.samples.length >= 30 && this.samples.length % 30 === 0) {
        this.evaluateQuality()
      }
    }
    this.lastTime = currentTime
  }
  
  /**
   * Get current average FPS
   */
  getAverageFPS(): number {
    if (this.samples.length === 0) return 60
    const sum = this.samples.reduce((a, b) => a + b, 0)
    return sum / this.samples.length
  }
  
  /**
   * Get current quality level (0.0 - 1.0)
   */
  getQualityLevel(): number {
    return this.qualityLevel
  }
  
  private evaluateQuality(): void {
    const avgFPS = this.getAverageFPS()
    const oldLevel = this.qualityLevel
    
    if (avgFPS < this.targetFPS * 0.7) {
      // Significantly below target - reduce quality
      this.qualityLevel = Math.max(0.3, this.qualityLevel - 0.1)
    } else if (avgFPS < this.targetFPS * 0.9) {
      // Slightly below target - minor reduction
      this.qualityLevel = Math.max(0.5, this.qualityLevel - 0.05)
    } else if (avgFPS > this.targetFPS * 1.1 && this.qualityLevel < 1.0) {
      // Above target and not at full quality - increase
      this.qualityLevel = Math.min(1.0, this.qualityLevel + 0.05)
    }
    
    if (oldLevel !== this.qualityLevel && this.onQualityChange) {
      this.onQualityChange(this.qualityLevel)
    }
  }
  
  /**
   * Reset monitor state
   */
  reset(): void {
    this.samples = []
    this.lastTime = 0
    this.qualityLevel = 1.0
  }
}
