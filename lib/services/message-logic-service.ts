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
  PoolStats,
  WorkingSetChange
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

  // Working Set (the particle universe)
  private workingSet: GriefMessage[] = []
  private priorityMessageIds: Set<string> = new Set()

  // Traversal state
  private nextFocus: GriefMessage | null = null  // The message that should be focus in next cluster
  private previousFocusId: string | null = null
  private previousFocus: GriefMessage | null = null  // Store actual message for continuity
  private totalClustersShown: number = 0
  private initialized: boolean = false

  // Event callbacks
  private workingSetChangeCallback: ((change: WorkingSetChange) => void) | null = null

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

      // Load initial working set
      console.log(`[MESSAGE_LOGIC] Loading initial working set (${this.config.workingSetSize} messages)...`)
      const initialBatch = await this.poolManager.getNextBatch(this.config.workingSetSize)
      this.workingSet = initialBatch.messages
      this.priorityMessageIds = new Set(initialBatch.priorityIds)

      console.log(
        `[MESSAGE_LOGIC] Working set loaded: ${this.workingSet.length} messages (${this.priorityMessageIds.size} priority)`
      )

      // Fire callback for initial working set
      if (this.workingSetChangeCallback) {
        const change: WorkingSetChange = {
          removed: [],
          added: this.workingSet,
          reason: 'initialization'
        }
        this.workingSetChangeCallback(change)
        console.log(`[MESSAGE_LOGIC] Initial working set change event emitted`)
      }

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
      // Step 1: Check working set availability
      if (this.workingSet.length === 0) {
        console.log('[MESSAGE_LOGIC] No messages in working set, returning null')
        return null
      }

      console.log(
        `[MESSAGE_LOGIC] Working set: ${this.workingSet.length} messages (${this.priorityMessageIds.size} priority)`
      )

      // Step 2: Select focus message
      // Use the next message from previous cluster
      // For first cluster, use first message in working set
      const focus = this.nextFocus || this.workingSet[0]

      console.log(`[MESSAGE_LOGIC] Selected focus: ${focus.id}`)

      // Step 3: Select related messages FROM working set (with priority awareness)
      const related = this.clusterSelector.selectRelatedMessages(
        focus,
        this.workingSet,
        this.previousFocusId,
        this.priorityMessageIds
      )

      console.log(`[MESSAGE_LOGIC] Selected ${related.length} related messages`)

      // Step 4: Select next message (MUST be priority if any available)
      const next = this.clusterSelector.selectNextMessage(
        focus,
        related,
        this.workingSet,
        this.previousFocusId,
        this.priorityMessageIds
      )

      if (next) {
        console.log(`[MESSAGE_LOGIC] Selected next: ${next.id}`)
      } else {
        console.warn('[MESSAGE_LOGIC] DEGENERATE CLUSTER: No next message available')
        console.warn('[MESSAGE_LOGIC] This indicates broken state - triggering fresh start')
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

      // Step 6: Remove featured messages from priority tracking
      // Once a message appears in ANY role (focus or related), it's no longer first-class
      this.priorityMessageIds.delete(focus.id)
      related.forEach((r) => this.priorityMessageIds.delete(r.message.id))

      console.log(
        `[MESSAGE_LOGIC] Removed featured messages from priority tracking (${this.priorityMessageIds.size} priority remaining)`
      )

      // Step 7: Remove messages from working set
      let messagesToRemove: GriefMessage[]

      if (next) {
        // Normal: remove all related except next
        // Current focus STAYS for one more cycle (appears in next related array)
        messagesToRemove = related
          .map(r => r.message)
          .filter(m => m.id !== next.id)
        console.log(`[MESSAGE_LOGIC] Normal cluster: keeping focus ${focus.id} and next ${next.id}`)
      } else {
        // Degenerate: remove everything for fresh start
        messagesToRemove = [focus, ...related.map(r => r.message)]
        console.log('[MESSAGE_LOGIC] Degenerate cluster: removing ALL messages for fresh start')
        
        this.previousFocusId = null
        this.nextFocus = null
      }

      console.log(`[MESSAGE_LOGIC] Removing ${messagesToRemove.length} messages from working set`)

      const outgoingIds = messagesToRemove.map(m => m.id)
      this.workingSet = this.workingSet.filter((msg) => !outgoingIds.includes(msg.id))

      console.log(`[MESSAGE_LOGIC] Working set after removal: ${this.workingSet.length} messages`)

      // Step 8: Replenish working set to target size
      // The deficit already accounts for what we just removed
      const currentDeficit = this.config.workingSetSize - this.workingSet.length

      if (currentDeficit > 0) {
        console.log(`[MESSAGE_LOGIC] Replenishing working set (deficit: ${currentDeficit})...`)

        const currentIds = new Set(this.workingSet.map(m => m.id))
        const newMessages: GriefMessage[] = []
        const newPriorityIds: string[] = []
        
        // Keep fetching until we have enough unique messages
        let attempts = 0
        const maxAttempts = 5
        
        while (newMessages.length < currentDeficit && attempts < maxAttempts) {
          attempts++
          const stillNeeded = currentDeficit - newMessages.length
          
          // Add 20% buffer to handle deduplication
          // This gives us extra headroom without over-requesting
          const requestCount = Math.ceil(stillNeeded * 1.2)
          
          const replacements = await this.poolManager.getNextBatch(requestCount)
          
          if (replacements.messages.length === 0) {
            console.warn(`[MESSAGE_LOGIC] Pool exhausted, stopping replenishment`)
            break
          }
          
          // Filter out duplicates (already in working set OR already in newMessages)
          const allCurrentIds = new Set([...currentIds, ...newMessages.map(m => m.id)])
          const unique = replacements.messages.filter(m => !allCurrentIds.has(m.id))
          const uniquePriority = replacements.priorityIds.filter(id => !allCurrentIds.has(id))
          
          newMessages.push(...unique)
          newPriorityIds.push(...uniquePriority)
        }
        
        // Take only what we need
        const toAdd = newMessages.slice(0, currentDeficit)
        const priorityToAdd = newPriorityIds.slice(0, currentDeficit)

        console.log(`[MESSAGE_LOGIC] Adding ${toAdd.length} messages to working set (${priorityToAdd.length} priority)`)
        if (priorityToAdd.length > 0) {
          console.log(`[MESSAGE_LOGIC] Priority message IDs being added: ${priorityToAdd.join(', ')}`)
        }

        // Add filtered messages to working set
        this.workingSet.push(...toAdd)

        // Track which are first-class  
        priorityToAdd.forEach((id) => this.priorityMessageIds.add(id))

        console.log(`[MESSAGE_LOGIC] Working set replenished: ${this.workingSet.length} messages (added ${toAdd.length})`)

        // CRITICAL: Check if working set is outside acceptable range (90-110%)
        const minAcceptable = Math.floor(this.config.workingSetSize * 0.9)
        const maxAcceptable = Math.ceil(this.config.workingSetSize * 1.1)
        if (this.workingSet.length < minAcceptable || this.workingSet.length > maxAcceptable) {
          console.error(`[MESSAGE_LOGIC] WARNING: Working set outside acceptable range!`)
          console.error(`   Current: ${this.workingSet.length}, Target: ${this.config.workingSetSize}, Range: ${minAcceptable}-${maxAcceptable}`)
        }

        // Step 9: Emit working set change event
        if (this.workingSetChangeCallback) {
          const change: WorkingSetChange = {
            removed: outgoingIds,
            added: toAdd,
            reason: 'cluster_cycle'
          }

          console.log(
            `[MESSAGE_LOGIC] Emitting working set change: -${change.removed.length} +${change.added.length}`
          )

          this.workingSetChangeCallback(change)
        }
      }

      // Step 10: Update traversal state
      if (next) {
        // Normal case: maintain continuity
        this.previousFocusId = focus.id
        this.previousFocus = focus  // Store message object for continuity
        this.nextFocus = next  // This becomes focus in next cluster
      } else {
        // Degenerate case: reset continuity for fresh start
        this.previousFocusId = null
        this.previousFocus = null
        this.nextFocus = null  // Next cluster picks arbitrary focus from working set
      }
      
      this.totalClustersShown++

      console.log(
        `[MESSAGE_LOGIC] Cluster ${this.totalClustersShown} generated (focus: ${focus.id}, related: ${related.length}, next: ${next?.id || 'null'})`
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
   * Register Working Set Change Callback
   *
   * Sets callback to be invoked when working set changes.
   * Presentation layer MUST use this to synchronize particle universe.
   *
   * @param callback - Function called with WorkingSetChange events
   *
   * @example
   * service.onWorkingSetChange(({ removed, added }) => {
   *   // Remove particles for removed IDs
   *   removed.forEach(id => particles.delete(id))
   *   // Create particles for added messages
   *   added.forEach(msg => particles.create(msg))
   * })
   */
  onWorkingSetChange(callback: (change: WorkingSetChange) => void): void {
    this.workingSetChangeCallback = callback
    console.log('[MESSAGE_LOGIC] Working set change callback registered')
  }

  /**
   * Get Working Set Size
   *
   * Returns current number of messages in working set.
   * Should match config.workingSetSize after initialization.
   *
   * @returns Current working set size
   */
  getWorkingSetSize(): number {
    return this.workingSet.length
  }

  /**
   * Get Working Set
   *
   * Returns copy of current working set.
   * Use for initialization or debugging.
   *
   * @returns Array of messages in working set
   */
  getWorkingSet(): GriefMessage[] {
    return [...this.workingSet]
  }

  /**
   * Get Priority Message Count
   *
   * Returns number of first-class messages in working set.
   *
   * @returns Count of priority messages
   */
  getPriorityMessageCount(): number {
    return this.priorityMessageIds.size
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
    workingSetSize: number
    priorityMessageCount: number
    pool: PoolStats
    config: MessagePoolConfig
  } {
    const poolStats = this.poolManager.getStats()

    return {
      initialized: this.initialized,
      totalClustersShown: this.totalClustersShown,
      currentFocus: this.nextFocus?.id || null,
      previousFocus: this.previousFocusId,
      workingSetSize: this.workingSet.length,
      priorityMessageCount: this.priorityMessageIds.size,
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

    this.nextFocus = null
    this.previousFocusId = null
    this.previousFocus = null
    this.totalClustersShown = 0

    // NOTE: Working set is NOT cleared on reset - that would require re-initialization
    // Only traversal state is reset

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

    // Clear working set and priority tracking
    this.workingSet = []
    this.priorityMessageIds.clear()
    this.workingSetChangeCallback = null

    // Reset traversal state
    this.nextFocus = null
    this.previousFocusId = null
    this.previousFocus = null
    this.totalClustersShown = 0
    this.initialized = false

    console.log('[MESSAGE_LOGIC] Cleanup complete')
  }

  // ========== PRIVATE METHODS ==========
  // (None currently - focus selection is now inline in getNextCluster)
}
