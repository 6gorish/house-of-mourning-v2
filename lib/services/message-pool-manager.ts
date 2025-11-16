/**
 * Message Pool Manager
 *
 * Implements dual-cursor pagination algorithm for efficient message pool management.
 * Maintains two independent cursors:
 * 1. Historical Cursor - Works backwards through existing messages
 * 2. New Message Watermark - Tracks incoming submissions
 *
 * IMPORTANT: Pure business logic - NO visualization concepts.
 */

import type { GriefMessage, MessagePoolConfig, PoolStats } from '@/types/grief-messages'
import type { DatabaseService } from './database-service'
import { getMemoryUsage } from '@/lib/config/message-pool-config'

/**
 * Batch Result
 * 
 * Return type for getNextBatch() that includes both messages
 * and tracking information about which came from priority sources.
 */
export interface BatchResult {
  messages: GriefMessage[]
  priorityIds: string[]  // IDs that came from priority queue or new watermark
}

/**
 * Message Pool Manager Class
 *
 * Manages the pool of messages available for traversal.
 * Handles allocation between historical and new messages.
 */
export class MessagePoolManager {
  private databaseService: DatabaseService
  private config: MessagePoolConfig

  // Dual-cursor state
  private historicalCursor: number | null = null
  private newMessageWatermark: number = 0

  // Priority queue for new messages
  private priorityQueue: GriefMessage[] = []

  // Polling state
  private pollingTimer: NodeJS.Timeout | null = null

  // Surge mode removed - using simplified allocation strategy

  constructor(databaseService: DatabaseService, config: MessagePoolConfig) {
    this.databaseService = databaseService
    this.config = config

    console.log('[POOL_MANAGER] Initialized with config:', {
      workingSetSize: config.workingSetSize,
      clusterSize: config.clusterSize,
      pollingInterval: config.pollingInterval
    })
  }

  /**
   * Initialize
   *
   * Sets up dual cursors and starts polling for new messages.
   * MUST be called before using getNextBatch.
   *
   * @throws {Error} If unable to determine max message ID
   */
  async initialize(): Promise<void> {
    console.log('[POOL_MANAGER] Initializing...')

    try {
      // Get max ID to initialize both cursors
      const maxId = await this.databaseService.getMaxMessageId()

      if (maxId === 0) {
        console.log('[POOL_MANAGER] Database is empty')
        this.historicalCursor = null
        this.newMessageWatermark = 0
        return
      }

      // Initialize both cursors to max ID
      this.historicalCursor = maxId
      this.newMessageWatermark = maxId

      console.log('[POOL_MANAGER] Cursors initialized:', {
        historicalCursor: this.historicalCursor,
        newMessageWatermark: this.newMessageWatermark
      })

      // Start polling for new messages
      this.startPolling()

      console.log('[POOL_MANAGER] Initialization complete')
    } catch (error) {
      console.error('[POOL_MANAGER] Initialization failed:', error)
      throw new Error(`Failed to initialize pool manager: ${error}`)
    }
  }

  /**
   * Get Next Batch
   *
   * Fetches a batch of messages using simplified three-stage allocation.
   * Drains priority queue completely before fetching historical messages.
   *
   * @param count - Number of messages to fetch
   * @returns Batch result with messages and priority IDs
   *
   * @example
   * const { messages, priorityIds } = await poolManager.getNextBatch(18)
   */
  async getNextBatch(count: number): Promise<BatchResult> {
    console.log(`[POOL_MANAGER] Getting next batch of ${count} messages`)

    const messages: GriefMessage[] = []
    const priorityIds: string[] = []

    // STAGE 1: Drain in-memory priority queue
    if (this.priorityQueue.length > 0) {
      const fromQueue = this.priorityQueue.splice(0, count)
      messages.push(...fromQueue)
      priorityIds.push(...fromQueue.map(m => m.id))
      
      console.log(`[POOL_MANAGER] Stage 1: Took ${fromQueue.length} from priority queue`)
    }

    if (messages.length >= count) {
      console.log(`[POOL_MANAGER] Batch complete: ${messages.length} messages (all from queue)`)
      return { messages, priorityIds }
    }

    // STAGE 2: Check database for NEW messages above watermark
    const needed = count - messages.length
    
    try {
      const newMessages = await this.databaseService.fetchNewMessagesAboveWatermark(
        this.newMessageWatermark
      )
      
      if (newMessages.length > 0) {
        const fromNew = newMessages.slice(0, needed)
        messages.push(...fromNew)
        priorityIds.push(...fromNew.map(m => m.id))
        
        // Update watermark
        const maxId = Math.max(...newMessages.map(m => parseInt(m.id, 10)))
        this.newMessageWatermark = maxId
        
        console.log(`[POOL_MANAGER] Stage 2: Took ${fromNew.length} new messages (watermark: ${this.newMessageWatermark})`)
      }
    } catch (error) {
      console.error('[POOL_MANAGER] Stage 2 failed:', error)
      // Continue to stage 3
    }

    if (messages.length >= count) {
      console.log(`[POOL_MANAGER] Batch complete: ${messages.length} messages (${priorityIds.length} priority)`)
      return { messages, priorityIds }
    }

    // STAGE 3: Fill remainder from historical cursor
    const stillNeeded = count - messages.length
    const historical = await this.fetchHistoricalBatch(stillNeeded)
    messages.push(...historical)
    
    console.log(`[POOL_MANAGER] Stage 3: Took ${historical.length} from historical cursor`)
    console.log(`[POOL_MANAGER] Batch complete: ${messages.length} total (${priorityIds.length} priority, ${historical.length} historical)`)

    return { messages, priorityIds }
  }

  /**
   * Add New User Message
   *
   * Adds a message to the priority queue for quick visibility.
   * Handles queue overflow by dropping oldest messages.
   *
   * @param message - Newly submitted message
   */
  async addNewMessage(message: GriefMessage): Promise<void> {
    console.log(`[POOL_MANAGER] Adding new message ${message.id} to priority queue`)

    // Add to end of queue (FIFO)
    this.priorityQueue.push(message)

    // Update watermark
    const messageId = parseInt(message.id, 10)
    if (messageId > this.newMessageWatermark) {
      this.newMessageWatermark = messageId
      console.log(`[POOL_MANAGER] Watermark updated to ${this.newMessageWatermark}`)
    }

    // Check for overflow
    const maxSize = this.calculateAdaptiveQueueSize()
    if (this.priorityQueue.length > maxSize) {
      // Drop oldest messages (from front)
      const dropped = this.priorityQueue.splice(0, this.priorityQueue.length - maxSize)
      console.warn(`[POOL_MANAGER] Queue overflow: dropped ${dropped.length} oldest messages`)
    }
  }

  /**
   * Get Statistics
   *
   * Returns current pool state for monitoring.
   *
   * @returns Pool statistics
   */
  getStats(): PoolStats {
    const queueWaitTime = this.estimateQueueWaitTime()
    const memoryUsage = getMemoryUsage()

    return {
      historicalCursor: this.historicalCursor,
      newMessageWatermark: this.newMessageWatermark,
      priorityQueueSize: this.priorityQueue.length,
      surgeMode: false,  // Always false (surge mode removed)
      queueWaitTime,
      memoryUsage
    }
  }

  /**
   * Cleanup
   *
   * Stops polling and releases resources.
   */
  cleanup(): void {
    console.log('[POOL_MANAGER] Cleaning up...')

    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = null
    }

    this.priorityQueue = []

    console.log('[POOL_MANAGER] Cleanup complete')
  }

  /**
   * Is Surge Mode Active
   *
   * @deprecated Surge mode removed in favor of simplified allocation
   * @returns Always false
   */
  isSurgeMode(): boolean {
    return false
  }

  /**
   * Get Cluster Config
   *
   * Returns cluster configuration for coordinator.
   *
   * @returns Object with slots and duration
   */
  getClusterConfig(): { slots: number; duration: number } {
    return {
      slots: this.config.clusterSize,
      duration: this.config.clusterDuration
    }
  }

  // ========== PRIVATE METHODS ==========

  /**
   * Fetch Historical Batch
   *
   * Gets messages using backwards cursor.
   * Automatically recycles when exhausted.
   *
   * @param count - Number of messages to fetch
   * @returns Array of historical messages
   */
  private async fetchHistoricalBatch(count: number): Promise<GriefMessage[]> {
    // Handle empty database
    if (this.historicalCursor === null) {
      // Try to recycle
      const maxId = await this.databaseService.getMaxMessageId()

      if (maxId === 0) {
        console.log('[POOL_MANAGER] Database still empty')
        return []
      }

      console.log(`[POOL_MANAGER] 🔄 RECYCLING: Resetting cursor to ${maxId}`)
      this.historicalCursor = maxId
    }

    // Fetch in DESC order (backwards in time)
    const messages = await this.databaseService.fetchBatchWithCursor(
      this.historicalCursor,
      count,
      'DESC'
    )

    if (messages.length === 0) {
      // Reached oldest message - recycle
      console.log('[POOL_MANAGER] 🔄 RECYCLING: Cursor exhausted, recycling...')
      this.historicalCursor = null
      return this.fetchHistoricalBatch(count) // Retry
    }

    // Move cursor backwards
    const oldestFetched = parseInt(messages[messages.length - 1].id, 10)
    this.historicalCursor = oldestFetched - 1

    return messages
  }

  /**
   * Start Polling
   *
   * Begins periodic polling for new messages.
   */
  private startPolling(): void {
    console.log(`[POOL_MANAGER] Starting polling (interval: ${this.config.pollingInterval}ms)`)

    this.pollingTimer = setInterval(() => {
      this.checkForNewMessages()
    }, this.config.pollingInterval)
  }

  /**
   * Check For New Messages
   *
   * Polls database for messages above watermark.
   * Adds found messages to priority queue.
   */
  private async checkForNewMessages(): Promise<void> {
    try {
      const newMessages = await this.databaseService.fetchNewMessagesAboveWatermark(
        this.newMessageWatermark
      )

      if (newMessages.length > 0) {
        console.log(`[POOL_MANAGER] Found ${newMessages.length} new messages`)

        // Add to priority queue
        for (const message of newMessages) {
          await this.addNewMessage(message)
        }
      }
    } catch (error) {
      console.error('[POOL_MANAGER] New message polling failed:', error)
      // Continue polling despite error
    }
  }

  // calculateAllocation() and updateSurgeMode() removed
  // Simplified allocation now inline in getNextBatch()

  /**
   * Calculate Adaptive Queue Size
   *
   * Adjusts max queue size based on memory pressure.
   * Prevents out-of-memory crashes on low-end devices.
   *
   * @returns Adjusted max queue size
   */
  private calculateAdaptiveQueueSize(): number {
    if (!this.config.priorityQueue.memoryAdaptive) {
      return this.config.priorityQueue.maxSize
    }

    const memoryUsage = getMemoryUsage()
    const baseSize = this.config.priorityQueue.maxSize

    // Reduce queue size under memory pressure
    if (memoryUsage > 85) {
      // Critical: 25% of base size
      return Math.floor(baseSize * 0.25)
    } else if (memoryUsage > 75) {
      // High: 50% of base size
      return Math.floor(baseSize * 0.5)
    } else if (memoryUsage > 65) {
      // Moderate: 75% of base size
      return Math.floor(baseSize * 0.75)
    }

    // Normal: full size
    return baseSize
  }

  /**
   * Estimate Queue Wait Time
   *
   * Calculates how long until a queued message becomes visible.
   *
   * @returns Wait time in seconds
   */
  private estimateQueueWaitTime(): number {
    const queueSize = this.priorityQueue.length

    if (queueSize === 0) {
      return 0
    }

    // Calculate messages processed per cycle
    // With simplified allocation, queue drains at clusterSize per cycle
    const slotsPerCycle = this.config.clusterSize

    // Calculate cycles needed to drain queue
    const cyclesNeeded = Math.ceil(queueSize / slotsPerCycle)

    // Calculate wait time
    const cycleTime = this.config.clusterDuration / 1000 // Convert to seconds
    const waitTime = cyclesNeeded * cycleTime

    return waitTime
  }
}
