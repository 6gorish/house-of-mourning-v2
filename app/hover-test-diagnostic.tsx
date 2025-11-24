'use client'

/**
 * DIAGNOSTIC VERSION - Find the root cause
 * 
 * This will show us if the bug is in:
 * 1. Orchestrator (returning messages not in working set)
 * 2. Sync (particles map not matching working set)
 * 3. Timing (callbacks firing in wrong order)
 */

import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { Orchestrator } from '@/presentations/p5-constellation/lib/Orchestrator'
import type { FocusState } from '@/presentations/p5-constellation/lib/Orchestrator'

function DiagnosticTest() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const runDiagnostics = async () => {
      console.log('=== DIAGNOSTICS START ===')
      
      const supabase = createClient()
      const orchestrator = new Orchestrator(supabase, {
        workingSetSize: 300,
        clusterSize: 20,
        clusterDuration: 8000,
        autoCycle: true
      })

      // Track particle map locally
      const particleMap = new Map<string, any>()

      orchestrator.onWorkingSetChange((added, removed) => {
        console.log('\n[WORKING SET CHANGE]')
        console.log('  Added:', added.length, 'Removed:', removed.length)
        
        removed.forEach(msg => particleMap.delete(String(msg.id)))
        added.forEach(msg => particleMap.set(String(msg.id), msg))
        
        console.log('  Particle map now has:', particleMap.size)
        console.log('  Orchestrator working set has:', orchestrator.getWorkingSet().length)
      })

      orchestrator.onFocusChange((focus: FocusState | null) => {
        if (!focus) return

        console.log('\n[FOCUS CHANGE]')
        const focusId = String(focus.focus.id)
        console.log('  Focus ID:', focusId.substring(0, 8))
        console.log('  Related count:', focus.related.length)
        
        // Check working set
        const workingSet = orchestrator.getWorkingSet()
        console.log('  Orchestrator working set:', workingSet.length)
        console.log('  Particle map size:', particleMap.size)
        
        // Check if focus is in working set
        const focusInWorkingSet = workingSet.some(m => String(m.id) === focusId)
        const focusInParticleMap = particleMap.has(focusId)
        console.log('  Focus in working set?', focusInWorkingSet)
        console.log('  Focus in particle map?', focusInParticleMap)
        
        // Check related messages
        let relatedInWorkingSet = 0
        let relatedInParticleMap = 0
        
        focus.related.forEach(msg => {
          const id = String(msg.id)
          if (workingSet.some(m => String(m.id) === id)) relatedInWorkingSet++
          if (particleMap.has(id)) relatedInParticleMap++
        })
        
        console.log('  Related in working set:', relatedInWorkingSet, '/', focus.related.length)
        console.log('  Related in particle map:', relatedInParticleMap, '/', focus.related.length)
        
        // Sample first 3
        console.log('  First 3 related:')
        focus.related.slice(0, 3).forEach((msg, i) => {
          const id = String(msg.id)
          const inWS = workingSet.some(m => String(m.id) === id)
          const inPM = particleMap.has(id)
          console.log(`    ${i}: ${id.substring(0, 8)} - WS:${inWS} PM:${inPM}`)
        })
      })

      try {
        await orchestrator.initialize()
        console.log('\n[INITIALIZED]')
        console.log('Waiting for focus changes...')
      } catch (error) {
        console.error('[ERROR]', error)
      }
    }

    runDiagnostics()
  }, [])

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="text-white text-center">
        <h1 className="text-2xl mb-4">Diagnostic Mode</h1>
        <p>Check console for detailed logging</p>
      </div>
    </div>
  )
}

export default dynamic(() => Promise.resolve(DiagnosticTest), { ssr: false })
