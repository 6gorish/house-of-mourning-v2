/**
 * Installation Route
 * 
 * Full-screen presentation layer for the grief message constellation.
 * Currently using P5 Constellation (Tier 1: Foundation).
 * 
 * Route: /installation
 */

import P5Constellation from '@/presentations/p5-constellation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Installation | The House of Mourning',
  description: 'An immersive constellation of grief, witnessed collectively.',
}

export default function InstallationPage() {
  return <P5Constellation />
}
