/**
 * Load Tests: Performance & Stress Testing
 * 
 * Tests system behavior under realistic and extreme load conditions
 * NOTE: Requires valid .env.local with Supabase credentials
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { MessageLogicService } from '@/lib/services/message-logic-service'
import { loadConfig } from '@/lib/config/message-pool-config'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { GriefMessage } from '@/types/grief-messages'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Skip these tests if Supabase credentials not available
const shouldSkip = !SUPABASE_URL || !SUPABASE_ANON_KEY

/**
 * Helper: Generate realistic test messages
 */
function generateTestMessages(count: number): Partial<GriefMessage>[] {
  const templates = [
    "Missing my {subject} every day",
    "Still can't believe {subject} is gone",
    "The silence where {subject} used to be",
    "Grieving the loss of {subject}",
    "Some days the absence of {subject} is overwhelming",
    "Learning to live without {subject}",
    "The world feels emptier without {subject}",
    "Carrying the memory of {subject}",
  ]
  
  const subjects = [
    "my dog", "my cat", "my father", "my mother", "my friend",
    "my grandmother", "my career", "my home", "my marriage",
    "the person I used to be", "my health", "my dreams",
  ]
  
  const messages: Partial<GriefMessage>[] = []
  
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length]
    const subject = subjects[i % subjects.length]
    const content = template.replace('{subject}', subject)
    
    // Vary the timestamps to simulate messages over time
    const daysAgo = Math.floor(Math.random() * 30)
    const hoursAgo = Math.floor(Math.random() * 24)
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    date.setHours(date.getHours() - hoursAgo)
    
    messages.push({
      content,
      approved: true,
      created_at: date.toISOString(),
      deleted_at: null,
    })
  }
  
  return messages
}

/**
 * Helper: Measure execution time
 */
async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = performance.now()
  const result = await fn()
  const ms = performance.now() - start
  return { result, ms }
}

describe.skipIf(shouldSkip)('Load Test: Cold Start Performance', () => {
  let supabase: ReturnType<typeof createClient<Database>>
  
  beforeAll(() => {
    supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
  })

  test('should initialize with 500+ messages in reasonable time', async () => {
    const config = loadConfig()
    config.workingSetSize = 500
    
    const service = new MessageLogicService(supabase, config)
    
    const { result, ms } = await measureTime(() => service.initialize())
    
    console.log(`✓ Initialized with 500 messages in ${ms.toFixed(0)}ms`)
    
    // Should initialize in under 5 seconds
    expect(ms).toBeLessThan(5000)
    
    const stats = service.getStats()
    expect(stats.pool.workingSetSize).toBeGreaterThan(0)
    
    service.shutdown()
  }, 10000) // 10 second timeout

  test('should generate first cluster quickly', async () => {
    const service = new MessageLogicService(supabase, loadConfig())
    await service.initialize()
    
    const { result: cluster, ms } = await measureTime(() => service.getNextCluster())
    
    console.log(`✓ Generated first cluster in ${ms.toFixed(0)}ms`)
    
    // Should generate cluster in under 100ms
    expect(ms).toBeLessThan(100)
    expect(cluster).toBeDefined()
    
    service.shutdown()
  }, 10000)
})

describe.skipIf(shouldSkip)('Load Test: Steady State Performance', () => {
  let service: MessageLogicService
  let supabase: ReturnType<typeof createClient<Database>>
  
  beforeAll(async () => {
    supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
    service = new MessageLogicService(supabase, loadConfig())
    await service.initialize()
  })
  
  afterAll(() => {
    service.shutdown()
  })

  test('should handle 100 sequential cluster requests efficiently', async () => {
    const times: number[] = []
    
    for (let i = 0; i < 100; i++) {
      const { result, ms } = await measureTime(() => service.getNextCluster())
      times.push(ms)
      
      expect(result).toBeDefined()
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length
    const maxTime = Math.max(...times)
    const minTime = Math.min(...times)
    
    console.log(`✓ 100 clusters: avg=${avgTime.toFixed(1)}ms, min=${minTime.toFixed(1)}ms, max=${maxTime.toFixed(1)}ms`)
    
    // Average should be under 50ms
    expect(avgTime).toBeLessThan(50)
    
    // Max should be under 200ms (allows for occasional GC)
    expect(maxTime).toBeLessThan(200)
  }, 30000) // 30 second timeout

  test('should maintain consistent performance over time', async () => {
    const batches = 5
    const batchSize = 20
    const batchTimes: number[] = []
    
    for (let batch = 0; batch < batches; batch++) {
      const { ms } = await measureTime(async () => {
        for (let i = 0; i < batchSize; i++) {
          await service.getNextCluster()
        }
      })
      
      batchTimes.push(ms / batchSize)
    }
    
    const avgFirst = batchTimes[0]
    const avgLast = batchTimes[batchTimes.length - 1]
    const degradation = ((avgLast - avgFirst) / avgFirst) * 100
    
    console.log(`✓ Performance degradation over ${batches} batches: ${degradation.toFixed(1)}%`)
    
    // Performance should not degrade more than 50%
    expect(Math.abs(degradation)).toBeLessThan(50)
  }, 30000)
})

describe.skipIf(shouldSkip)('Load Test: Surge Mode Activation', () => {
  let service: MessageLogicService
  let supabase: ReturnType<typeof createClient<Database>>
  
  beforeAll(async () => {
    supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Use smaller working set to trigger surge mode faster
    const config = loadConfig()
    config.workingSetSize = 200
    
    service = new MessageLogicService(supabase, config)
    await service.initialize()
  })
  
  afterAll(() => {
    service.shutdown()
  })

  test('should activate surge mode with 20+ rapid submissions', async () => {
    const initialStats = service.getStats()
    expect(initialStats.pool.surgeMode).toBe(false)
    
    // Submit 25 messages rapidly
    const messages = generateTestMessages(25)
    
    const { ms } = await measureTime(async () => {
      for (const msg of messages) {
        await service.addNewMessage(msg as GriefMessage)
      }
    })
    
    console.log(`✓ Submitted 25 messages in ${ms.toFixed(0)}ms (${(ms/25).toFixed(1)}ms avg)`)
    
    const finalStats = service.getStats()
    
    // Should have activated surge mode
    expect(finalStats.pool.surgeMode).toBe(true)
    expect(finalStats.pool.priorityQueueSize).toBeGreaterThanOrEqual(20)
  }, 30000)

  test('should process surge queue efficiently', async () => {
    // Assume surge mode is active from previous test
    const initialQueue = service.getStats().pool.priorityQueueSize
    
    if (initialQueue === 0) {
      console.warn('⚠️  Skipping surge processing test - queue is empty')
      return
    }
    
    // Process 10 clusters and measure performance
    const times: number[] = []
    
    for (let i = 0; i < 10; i++) {
      const { ms } = await measureTime(() => service.getNextCluster())
      times.push(ms)
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length
    
    console.log(`✓ Processed surge clusters in avg ${avgTime.toFixed(1)}ms each`)
    
    // Should still be fast even during surge
    expect(avgTime).toBeLessThan(100)
  }, 30000)
})

describe.skipIf(shouldSkip)('Load Test: Memory & Resource Usage', () => {
  test('should not leak memory over extended operation', async () => {
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
    const service = new MessageLogicService(supabase, loadConfig())
    await service.initialize()
    
    const initialMemory = process.memoryUsage().heapUsed
    
    // Run for 200 iterations
    for (let i = 0; i < 200; i++) {
      await service.getNextCluster()
      
      // Occasionally trigger GC if available
      if (i % 50 === 0 && global.gc) {
        global.gc()
      }
    }
    
    const finalMemory = process.memoryUsage().heapUsed
    const growth = ((finalMemory - initialMemory) / initialMemory) * 100
    
    console.log(`✓ Memory growth over 200 iterations: ${growth.toFixed(1)}%`)
    
    // Memory should not grow more than 100% (2x)
    expect(growth).toBeLessThan(100)
    
    service.shutdown()
  }, 60000) // 60 second timeout

  test('should handle memory pressure gracefully', async () => {
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Create config with very large working set
    const config = loadConfig()
    config.workingSetSize = 1000
    config.maxPriorityQueueSize = 500
    
    const service = new MessageLogicService(supabase, config)
    
    const { ms } = await measureTime(() => service.initialize())
    
    console.log(`✓ Initialized with large config in ${ms.toFixed(0)}ms`)
    
    const stats = service.getStats()
    expect(stats.pool.workingSetSize).toBeLessThanOrEqual(1000)
    
    service.shutdown()
  }, 30000)
})

describe.skipIf(shouldSkip)('Load Test: Concurrent Operations', () => {
  let service: MessageLogicService
  let supabase: ReturnType<typeof createClient<Database>>
  
  beforeAll(async () => {
    supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
    service = new MessageLogicService(supabase, loadConfig())
    await service.initialize()
  })
  
  afterAll(() => {
    service.shutdown()
  })

  test('should handle concurrent cluster requests', async () => {
    const concurrentRequests = 10
    
    const { result: results, ms } = await measureTime(() => 
      Promise.all(
        Array(concurrentRequests)
          .fill(null)
          .map(() => service.getNextCluster())
      )
    )
    
    console.log(`✓ ${concurrentRequests} concurrent requests in ${ms.toFixed(0)}ms`)
    
    // All should succeed
    results.forEach(cluster => {
      expect(cluster).toBeDefined()
    })
    
    // Should complete in reasonable time
    expect(ms).toBeLessThan(1000)
  }, 10000)

  test('should handle mixed read/write operations', async () => {
    const operations = []
    
    // Mix of reads and writes
    for (let i = 0; i < 20; i++) {
      if (i % 3 === 0) {
        // Write operation
        const msg = generateTestMessages(1)[0]
        operations.push(service.addNewMessage(msg as GriefMessage))
      } else {
        // Read operation
        operations.push(service.getNextCluster())
      }
    }
    
    const { result: results, ms } = await measureTime(() => Promise.all(operations))
    
    console.log(`✓ 20 mixed operations in ${ms.toFixed(0)}ms`)
    
    // All should complete
    expect(results.length).toBe(20)
    
    // Should complete in reasonable time
    expect(ms).toBeLessThan(2000)
  }, 15000)
})
