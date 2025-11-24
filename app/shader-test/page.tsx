/**
 * Shader Validation Test Route
 * 
 * Tests whether shaders work identically in p5.Graphics WEBGL buffers
 * as they do in full WEBGL canvas mode.
 * 
 * Navigate to: http://localhost:3001/shader-test
 */

import ShaderValidationTest from '@/presentations/p5-constellation/shader-validation-test'

export default function ShaderTestPage() {
  return <ShaderValidationTest />
}
