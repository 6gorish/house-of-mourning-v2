/**
 * Message Logic Service
 *
 * Main coordinator for message traversal system.
 * Orchestrates database, pool manager, and cluster selector.
 *
 * This is the PRIMARY API for the presentation layer.
 * IMPORTANT: Pure business logic - NO visualization concepts.
 */

import type {
  GriefMessage,
  MessageCluster,
  MessagePoolConfig,
  PoolStats
} from '@/types/grief-messages'
import { DatabaseService } from './database-service'
import { MessagePoolManager } from './message-pool-manager'
import { ClusterSelector } from './cluster-selector'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Message Logic Service Class
 *
 * Coordinates all message traversal operations.
 * Manages state, cluster generation, and message submission.
 *
 * Usage:
 * 1. Create instance with Supabase client and config
 * 2. Call initialize() before use
 * 3. Call getNextCluster() to advance traversal
 * 4. Call addNewMessage() when users submit
 * 5. Call cleanup() when done
 */
export class MessageLogicService {
  private databaseService: DatabaseService
  private poolManager: MessagePoolManager
  private clusterSelector: ClusterSelector
  private config: MessagePoolConfig

  // Traversal state
  private currentFocus: GriefMessage | null = null
  private previousFocusId: string | null = null
  private totalClustersShown: number = 0
  private initialized: boolean = false

  constructor(supabaseClient: SupabaseClient<Database>, config: MessagePoolConfig) {
    console.log('[MESSAGE_LOGIC] Initializing service...')

    // Create service instances
    this.databaseService = new DatabaseService(supabaseClient)
    this.poolManager = new MessagePoolManager(this.databaseService, config)
    this.clusterSelector = new ClusterSelector(config)
    this.config = config

    console.log('[MESSAGE_LOGIC] Service created')
  }

  /**
   * Initialize
   *
   * Sets up all subsystems and prepares for traversal.
   * MUST be called before getNextCluster().
   *
   * @throws {Error} If initialization fails
   *
   * @example
   * const service = new MessageLogicService(supabase, config)
   * await service.initialize()
   * const cluster = await service.getNextCluster()
   */
  async initialize(): Promise<void> {
    console.log('[MESSAGE_LOGIC] Initializing...')

    if (this.initialized) {
      console.warn('[MESSAGE_LOGIC] Already initialized')
      return
    }

    try {
      // Test database connection
      const connected = await this.databaseService.testConnection()
      if (!connected) {
        throw new Error('Database connection failed')
      }

      // Initialize pool manager (sets up cursors and polling)
      await this.poolManager.initialize()

      this.initialized = true

      console.log('[MESSAGE_LOGIC] Initialization complete')
    } catch (error) {
      console.error('[MESSAGE_LOGIC] Initialization failed:', error)
      throw new Error(`Failed to initialize message logic: ${error}`)
    }
  }

  /**
   * Get Next Cluster
   *
   * Generates the next cluster of messages for display.
   * Maintains traversal continuity between clusters.
   *
   * Algorithm:
   * 1. Get batch from pool manager (dual-cursor allocation)
   * 2. Select focus message (next from previous cluster, or first if new)
   * 3. Select related messages using cluster selector
   * 4. Select next message for continuity
   * 5. Build and return cluster
   *
   * Edge cases:
   * - Empty database: Returns null
   * - Single message: Focus = that message, no related
   * - First cluster: No previous focus
   *
   * @returns MessageCluster or null if no messages available
   *
   * @example
   * const cluster = await service.getNextCluster()
   * if (cluster) {
   *   console.log(`Focus: ${cluster.focus.content}`)
   *   console.log(`Related: ${cluster.related.length}`)
   *   console.log(`Next: ${cluster.next?.content}`)
   * }
   */
  async getNextCluster(): Promise<MessageCluster | null> {
    console.log('[MESSAGE_LOGIC] Getting next cluster...')

    if (!this.initialized) {
      throw new Error('Service not initialized. Call initialize() first.')
    }

    try {
      // Step 1: Get batch from pool manager
      const batch = await this.poolManager.getNextBatch(this.config.workingSetSize)

      if (batch.length === 0) {
        console.log('[MESSAGE_LOGIC] No messages available, returning null')
        return null
      }

      // Step 2: Select focus message
      const focus = this.selectFocusMessage(batch)

      console.log(`[MESSAGE_LOGIC] Selected focus: ${focus.id}`)

      // Step 3: Select related messages
      const related = this.clusterSelector.selectRelatedMessages(
        focus,
        batch,
        this.previousFocusId
      )

      console.log(`[MESSAGE_LOGIC] Selected ${related.length} related messages`)

      // Step 4: Select next message
      const next = this.clusterSelector.selectNextMessage(focus, related, batch)

      if (next) {
        console.log(`[MESSAGE_LOGIC] Selected next: ${next.id}`)
      } else {
        console.log('[MESSAGE_LOGIC] No next message (will recycle to first)')
      }

      // Step 5: Build cluster
      const cluster: MessageCluster = {
        focus,
        focusId: focus.id,
        related: related.map((r) => ({
          message: r.message,
          messageId: r.message.id,
          similarity: r.similarity
        })),
        next,
        nextId: next ? next.id : null,
        duration: this.config.clusterDuration,
        timestamp: new Date(),
        totalClustersShown: this.totalClustersShown
      }

      // Validate cluster
      const isValid = this.clusterSelector.validateCluster(focus, related)
      if (!isValid) {
        console.error('[MESSAGE_LOGIC] Generated invalid cluster')
        throw new Error('Cluster validation failed')
      }

      // Update state
      this.previousFocusId = focus.id
      this.currentFocus = next // Next becomes current for next iteration
      this.totalClustersShown++

      console.log(
        `[MESSAGE_LOGIC] Cluster ${this.totalClustersShown} generated (focus: ${focus.id}, related: ${related.length})`
      )

      return cluster
    } catch (error) {
      console.error('[MESSAGE_LOGIC] Get next cluster failed:', error)
      throw new Error(`Failed to get next cluster: ${error}`)
    }
  }

  /**
   * Add New Message
   *
   * Handles new message submission.
   * Adds message to priority queue for quick visibility.
   *
   * @param message - Message to add (without ID)
   * @returns Inserted message with ID, or null on failure
   *
   * @example
   * const newMsg = await service.addNewMessage({
   *   content: "Missing you every day",
   *   approved: true,
   *   created_at: new Date().toISOString(),
   *   deleted_at: null
   * })
   * if (newMsg) {
   *   console.log(`Message ${newMsg.id} submitted`)
   * }
   */
  async addNewMessage(
    message: Omit<GriefMessage, 'id'>
  ): Promise<GriefMessage | null> {
    console.log('[MESSAGE_LOGIC] Adding new message...')

    if (!this.initialized) {
      throw new Error('Service not initialized. Call initialize() first.')
    }

    try {
      // Insert into database
      const inserted = await this.databaseService.addMessage(message)

      if (!inserted) {
        console.error('[MESSAGE_LOGIC] Message insert failed')
        return null
      }

      console.log(`[MESSAGE_LOGIC] Message ${inserted.id} inserted into database`)

      // Add to priority queue
      await this.poolManager.addNewMessage(inserted)

      console.log(`[MESSAGE_LOGIC] Message ${inserted.id} added to priority queue`)

      return inserted
    } catch (error) {
      console.error('[MESSAGE_LOGIC] Add message failed:', error)
      return null
    }
  }

  /**
   * Get Statistics
   *
   * Returns comprehensive statistics about the traversal system.
   * Useful for monitoring, debugging, and health checks.
   *
   * @returns Statistics object
   *
   * @example
   * const stats = service.getStats()
   * console.log(`Clusters shown: ${stats.totalClustersShown}`)
   * console.log(`Queue size: ${stats.pool.priorityQueueSize}`)
   * console.log(`Surge mode: ${stats.pool.surgeMode}`)
   */
  getStats(): {
    initialized: boolean
    totalClustersShown: number
    currentFocus: string | null
    previousFocus: string | null
    pool: PoolStats
    config: MessagePoolConfig
  } {
    const poolStats = this.poolManager.getStats()

    return {
      initialized: this.initialized,
      totalClustersShown: this.totalClustersShown,
      currentFocus: this.currentFocus?.id || null,
      previousFocus: this.previousFocusId,
      pool: poolStats,
      config: this.config
    }
  }

  /**
   * Get Total Message Count
   *
   * Returns total count of approved messages in database.
   * Useful for statistics and health checks.
   *
   * @returns Total message count
   */
  async getTotalMessageCount(): Promise<number> {
    if (!this.initialized) {
      throw new Error('Service not initialized. Call initialize() first.')
    }

    return await this.databaseService.getMessageCount()
  }

  /**
   * Is Surge Mode Active
   *
   * Checks if pool manager is currently in surge mode.
   * Surge mode activates during high submission rates.
   *
   * @returns True if surge mode active
   */
  isSurgeMode(): boolean {
    return this.poolManager.isSurgeMode()
  }

  /**
   * Reset Traversal
   *
   * Resets traversal state to beginning.
   * Useful for testing or manual control.
   * Does NOT reset pool manager cursors.
   */
  resetTraversal(): void {
    console.log('[MESSAGE_LOGIC] Resetting traversal state...')

    this.currentFocus = null
    this.previousFocusId = null
    this.totalClustersShown = 0

    console.log('[MESSAGE_LOGIC] Traversal reset complete')
  }

  /**
   * Cleanup
   *
   * Stops all subsystems and releases resources.
   * Should be called when service is no longer needed.
   *
   * @example
   * // On app shutdown
   * service.cleanup()
   */
  cleanup(): void {
    console.log('[MESSAGE_LOGIC] Cleaning up...')

    // Stop pool manager polling
    this.poolManager.cleanup()

    // Cleanup database service
    this.databaseService.cleanup()

    // Reset state
    this.currentFocus = null
    this.previousFocusId = null
    this.totalClustersShown = 0
    this.initialized = false

    console.log('[MESSAGE_LOGIC] Cleanup complete')
  }

  // ========== PRIVATE METHODS ==========

  /**
   * Select Focus Message
   *
   * Chooses the focus message for the next cluster.
   *
   * Strategy:
   * 1. If currentFocus exists (from previous cluster's next), use it
   * 2. Otherwise, use first message from batch
   *
   * @param batch - Available messages
   * @returns Selected focus message
   */
  private selectFocusMessage(batch: GriefMessage[]): GriefMessage {
    // If we have a currentFocus from previous iteration, use it
    if (this.currentFocus) {
      // Check if currentFocus is in batch
      const focusInBatch = batch.find((msg) => msg.id === this.currentFocus!.id)

      if (focusInBatch) {
        console.log(
          `[MESSAGE_LOGIC] Using currentFocus ${this.currentFocus.id} (from previous next)`
        )
        return focusInBatch
      } else {
        console.warn(
          `[MESSAGE_LOGIC] currentFocus ${this.currentFocus.id} not in batch, using first`
        )
      }
    }

    // Fallback: Use first message in batch
    const first = batch[0]
    console.log(`[MESSAGE_LOGIC] Using first message from batch: ${first.id}`)
    return first
  }
}
