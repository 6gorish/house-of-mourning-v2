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

  // Surge mode tracking
  private surgeMode: boolean = false

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
   * Fetches a batch of messages using allocation strategy.
   * Balances between historical messages and priority queue.
   *
   * @param count - Number of messages to fetch
   * @returns Array of grief messages
   *
   * @example
   * const batch = await poolManager.getNextBatch(20)
   */
  async getNextBatch(count: number): Promise<GriefMessage[]> {
    console.log(`[POOL_MANAGER] Getting next batch of ${count} messages`)

    // Calculate allocation
    const allocation = this.calculateAllocation(count)

    console.log('[POOL_MANAGER] Allocation:', allocation)

    const batch: GriefMessage[] = []

    // Get messages from priority queue (FIFO)
    if (allocation.prioritySlots > 0) {
      const queueMessages = this.priorityQueue.splice(0, allocation.prioritySlots)
      batch.push(...queueMessages)

      console.log(`[POOL_MANAGER] Dequeued ${queueMessages.length} from priority queue`)
    }

    // Get historical messages
    if (allocation.historicalSlots > 0) {
      const historicalMessages = await this.fetchHistoricalBatch(allocation.historicalSlots)
      batch.push(...historicalMessages)

      console.log(`[POOL_MANAGER] Fetched ${historicalMessages.length} historical messages`)
    }

    // Update surge mode
    this.updateSurgeMode()

    console.log(`[POOL_MANAGER] Batch complete: ${batch.length} messages (queue: ${this.priorityQueue.length})`)

    return batch
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

    // Update surge mode
    this.updateSurgeMode()
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
      surgeMode: this.surgeMode,
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
   * @returns True if currently in surge mode
   */
  isSurgeMode(): boolean {
    return this.surgeMode
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

      console.log(`[POOL_MANAGER] Recycling cursor to ${maxId}`)
      this.historicalCursor = maxId
    }

    // Fetch in DESC order (backwards in time)
    const messages = await this.databaseService.fetchBatchWithCursor(
      this.historicalCursor,
      count,
      'DESC',
      this.newMessageWatermark // Don't overlap with new messages
    )

    if (messages.length === 0) {
      // Reached oldest message - recycle
      console.log('[POOL_MANAGER] Historical cursor exhausted, recycling...')
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

  /**
   * Calculate Allocation
   *
   * Determines how many messages to take from queue vs historical.
   * Implements normal mode and surge mode logic.
   *
   * @param count - Total messages needed
   * @returns Allocation breakdown
   */
  private calculateAllocation(count: number): {
    prioritySlots: number
    historicalSlots: number
  } {
    const queueSize = this.priorityQueue.length

    let prioritySlots = 0
    let historicalSlots = 0

    if (this.surgeMode) {
      // Surge mode: Prioritize new messages
      prioritySlots = Math.min(
        queueSize,
        Math.floor(count * this.config.surgeMode.newMessageRatio)
      )

      // Guarantee minimum historical representation
      const minHistorical = Math.floor(count * this.config.surgeMode.minHistoricalRatio)
      historicalSlots = Math.max(count - prioritySlots, minHistorical)

      // Adjust if we allocated too many historical
      if (prioritySlots + historicalSlots > count) {
        historicalSlots = count - prioritySlots
      }
    } else {
      // Normal mode: Limited new messages
      prioritySlots = Math.min(queueSize, this.config.priorityQueue.normalSlots)
      historicalSlots = count - prioritySlots
    }

    return { prioritySlots, historicalSlots }
  }

  /**
   * Update Surge Mode
   *
   * Checks queue size against threshold.
   * Activates/deactivates surge mode as needed.
   */
  private updateSurgeMode(): void {
    const queueSize = this.priorityQueue.length
    const threshold = this.config.surgeMode.threshold

    const shouldBeSurge = queueSize >= threshold

    if (shouldBeSurge && !this.surgeMode) {
      console.warn(`[POOL_MANAGER] SURGE MODE ACTIVATED (queue: ${queueSize})`)
      this.surgeMode = true
    } else if (!shouldBeSurge && this.surgeMode) {
      console.log(`[POOL_MANAGER] Surge mode deactivated (queue: ${queueSize})`)
      this.surgeMode = false
    }
  }

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
    const slotsPerCycle = this.surgeMode
      ? Math.floor(this.config.clusterSize * this.config.surgeMode.newMessageRatio)
      : this.config.priorityQueue.normalSlots

    // Calculate cycles needed to drain queue
    const cyclesNeeded = Math.ceil(queueSize / slotsPerCycle)

    // Calculate wait time
    const cycleTime = this.config.clusterDuration / 1000 // Convert to seconds
    const waitTime = cyclesNeeded * cycleTime

    return waitTime
  }
}
