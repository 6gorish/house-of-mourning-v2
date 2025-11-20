/**
 * Installation Page
 * 
 * The particle visualization with shader background.
 * This is the presentation layer for the grief message constellation.
 */

import P5Constellation from '@/presentations/p5-constellation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Installation | The House of Mourning',
  description: 'An interactive constellation of grief messages, visualized as luminous particles in cosmic space.',
}

export default function InstallationPage() {
  return <P5Constellation />
}
