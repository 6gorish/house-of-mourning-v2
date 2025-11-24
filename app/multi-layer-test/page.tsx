/**
 * Multi-Layer Architecture Test Route
 * 
 * Tests the complete 3-layer compositing system:
 * - Background shader (WEBGL)
 * - Particle layer (2D)
 * - Foreground fog shader (WEBGL)
 * 
 * Navigate to: http://localhost:3001/multi-layer-test
 */

import MultiLayerTest from '@/presentations/p5-constellation/multi-layer-test'

export default function MultiLayerTestPage() {
  return <MultiLayerTest />
}
