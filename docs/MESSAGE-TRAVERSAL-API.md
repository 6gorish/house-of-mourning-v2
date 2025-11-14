# Message Traversal & Clustering API
## Technical Documentation v1.0

**Project**: The House of Mourning  
**Component**: Business Logic Layer  
**Date**: November 14, 2025  
**Status**: Design Phase  

---

## Executive Summary

The Message Traversal & Clustering API is a **presentation-agnostic business logic layer** that manages continuous message flow for "The House of Mourning" art installation. It ensures new user submissions appear quickly while maintaining balanced representation of historical messages through an infinite traversal cycle.

**Key Capabilities:**
- **Dual-cursor pagination** for efficient message pool management
- **Priority queue** ensuring user submissions visible within 30 seconds
- **Semantic clustering** showing interconnectedness of grief
- **Infinite traversal** that never stops, even with zero messages
- **Surge mode** adapting to viral traffic (0-500 messages/minute)
- **Framework-agnostic** with zero coupling to visualization layer

**Critical Success Factors:**
- Strict layer separation (learned from previous architectural failure)
- Response time < 100ms (p95)
- 99.9% uptime during 48-hour exhibition
- Memory-bounded operation on all devices

---

## Table of Contents

1. [Architecture](#architecture)
2. [API Reference](#api-reference)
3. [Data Contracts](#data-contracts)
4. [Traversal Flow](#traversal-flow)
5. [Dual-Cursor Algorithm](#dual-cursor-algorithm)
6. [Configuration](#configuration)
7. [Edge Cases](#edge-cases)
8. [Performance](#performance)
9. [Testing Strategy](#testing-strategy)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)

---

## Architecture

### Layer Separation

```
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (p5.js / Three.js / React)              │
│  ─────────────────────────────────────────────────────────  │
│  Responsibilities:                                           │
│  • Rendering (particles, connections, animations)           │
│  • User interaction (hover, click events)                   │
│  • Visual effects (colors, sizes, opacity)                  │
│  • Canvas/WebGL management                                  │
│                                                              │
│  What it CANNOT do:                                         │
│  • Access database directly                                 │
│  • Manage message pools or queues                           │
│  • Calculate semantic similarity                            │
│  • Control traversal timing                                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ API Boundary (TypeScript interfaces)
                        │ • MessageCluster
                        │ • WorkingSetChange
                        │ • GriefMessage
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  BUSINESS LOGIC LAYER                                       │
│  ─────────────────────────────────────────────────────────  │
│  Responsibilities:                                           │
│  • Message pool management (dual cursors)                   │
│  • Cluster selection (focus + related)                      │
│  • Priority queue (new submissions)                         │
│  • Traversal cycle coordination                             │
│  • Working set synchronization                              │
│                                                              │
│  Components:                                                 │
│  • MessageLogicService (coordinator)                        │
│  • MessagePoolManager (dual-cursor pagination)              │
│  • ClusterSelector (similarity scoring)                     │
│                                                              │
│  What it CANNOT know:                                       │
│  • Particles, positions, velocities                         │
│  • Colors, sizes, opacity values                            │
│  • Canvas, WebGL, rendering APIs                            │
│  • Animation states or timings                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ Data Access (Supabase client)
                        │
┌───────────────────────▼─────────────────────────────────────┐
│  DATA LAYER (Supabase / PostgreSQL)                        │
│  ─────────────────────────────────────────────────────────  │
│  Schema:                                                     │
│  • messages table (id, content, created_at, approved)       │
│  • Indexes (created_at DESC, id DESC)                       │
│  • Row-level security policies                              │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Rules

**MUST FOLLOW:**
1. ✅ Presentation MAY depend on Business Logic
2. ✅ Business Logic MAY depend on Data Layer
3. ❌ Business Logic MUST NOT depend on Presentation
4. ❌ Business Logic MUST NOT import visualization frameworks
5. ❌ Data Layer MUST NOT depend on Business Logic or Presentation

**Validation:** Any import of p5.js, Three.js, canvas APIs, or visualization concepts in Business Logic layer is a **critical architecture violation**.

---

## API Reference

### MessageLogicService

The core coordinator service consumed by the presentation layer.

```typescript
/**
 * Message Logic Service
 * 
 * Coordinates message traversal, clustering, and priority queue management.
 * This is the ONLY interface the presentation layer should interact with.
 * 
 * @example
 * const service = new MessageLogicService();
 * await service.initialize();
 * 
 * // Subscribe to cluster updates
 * service.onClusterUpdate((cluster) => {
 *   // Update visualization with new focus and connections
 * });
 * 
 * // Subscribe to working set changes
 * service.onWorkingSetChange(({ removed, added }) => {
 *   // Remove particles for removed messages
 *   // Create particles for added messages
 * });
 * 
 * // Start traversal cycle
 * service.start();
 */
class MessageLogicService {
  
  /**
   * Initialize the service
   * 
   * Loads initial data, sets up dual cursors, starts polling.
   * MUST be called before any other methods.
   * 
   * @throws {Error} If database connection fails
   * @throws {Error} If unable to determine initial watermark
   */
  async initialize(): Promise<void>
  
  /**
   * Start the traversal cycle
   * 
   * Begins continuous message cycling through clusters.
   * Safe to call multiple times (idempotent).
   * 
   * @postcondition Service enters active state
   * @postcondition First cluster emitted within 100ms
   */
  start(): void
  
  /**
   * Stop the traversal cycle
   * 
   * Pauses cycling but maintains state.
   * Can be resumed with start().
   * 
   * @postcondition No more cluster updates emitted
   * @postcondition Timers cleared
   */
  stop(): void
  
  /**
   * Cleanup all resources
   * 
   * Stops traversal, clears callbacks, releases memory.
   * Service cannot be reused after cleanup.
   * 
   * @postcondition All timers cleared
   * @postcondition All callbacks unregistered
   * @postcondition Working set cleared
   */
  cleanup(): void
  
  /**
   * Get current cluster
   * 
   * Returns the currently active cluster, or null if none.
   * 
   * @returns Current cluster or null
   */
  getCurrentCluster(): MessageCluster | null
  
  /**
   * Set working set (particle universe)
   * 
   * CRITICAL: This must match the visualization layer's particle universe.
   * The service will ONLY use messages in this set for traversal.
   * 
   * @param messages - Complete set of messages with particles
   * @precondition Messages array must not be empty
   * @precondition All messages must have valid IDs
   */
  setWorkingSet(messages: GriefMessage[]): void
  
  /**
   * Add new user-submitted message
   * 
   * Adds message to priority queue for quick visibility.
   * Message will appear in a cluster within 30 seconds (target).
   * 
   * @param message - Newly submitted grief message
   * @returns Promise resolving when message queued
   * @throws {Error} If message validation fails
   */
  async addNewMessage(message: GriefMessage): Promise<void>
  
  /**
   * Subscribe to cluster updates
   * 
   * Called whenever focus changes to new cluster.
   * Presentation layer should update connections/highlights.
   * 
   * @param callback - Function receiving new cluster
   */
  onClusterUpdate(callback: (cluster: MessageCluster) => void): void
  
  /**
   * Subscribe to working set changes
   * 
   * Called when messages are cycled out and replaced.
   * Presentation layer should remove/add particles accordingly.
   * 
   * @param callback - Function receiving change event
   */
  onWorkingSetChange(callback: (change: WorkingSetChange) => void): void
  
  /**
   * Get pool statistics
   * 
   * Provides visibility into internal state for monitoring/debugging.
   * 
   * @returns Current pool statistics
   */
  getPoolStats(): PoolStats
  
  /**
   * Get health check status
   * 
   * Reports service health for monitoring/alerting.
   * 
   * @returns Health status object
   */
  getHealth(): HealthCheck
}
```

---

## Data Contracts

### GriefMessage

```typescript
/**
 * Grief Message
 * 
 * Represents a single user-submitted grief expression.
 * Immutable once created.
 */
interface GriefMessage {
  /**
   * Unique identifier (database primary key)
   * Format: Numeric string from PostgreSQL SERIAL
   * @example "12345"
   */
  id: string
  
  /**
   * Message content (user's grief expression)
   * 
   * Constraints:
   * - Length: 1-280 characters (trimmed)
   * - No HTML or markdown
   * - May contain unicode/emoji
   * 
   * @example "My mother. Every day I reach for the phone."
   */
  content: string
  
  /**
   * Timestamp (server-side, UTC)
   * Used for ordering and temporal proximity calculations.
   * 
   * @example "2025-11-14T20:30:00.000Z"
   */
  created_at: string
  
  /**
   * Moderation status
   * Only approved=true messages are visible.
   * 
   * @default true (for MVP - auto-approve all)
   */
  approved: boolean
  
  /**
   * Soft delete timestamp
   * Non-null indicates message is deleted.
   * Deleted messages never appear in visualization.
   * 
   * @default null
   */
  deleted_at: string | null
}
```

### MessageCluster

```typescript
/**
 * Message Cluster
 * 
 * Represents a complete cluster: focus message + related messages + next.
 * Emitted by MessageLogicService.onClusterUpdate()
 */
interface MessageCluster {
  /**
   * Focus message (center of current cluster)
   * This message should be visually emphasized in presentation layer.
   */
  focus: GriefMessage
  
  /**
   * Focus message ID (convenience accessor)
   */
  focusId: string
  
  /**
   * Related messages with similarity scores
   * 
   * Sorted by similarity (highest first).
   * Length: 1-20 messages (configurable)
   * 
   * Presentation layer should draw connections from focus to these.
   */
  related: Array<{
    message: GriefMessage
    messageId: string
    
    /**
     * Similarity score (0.0 - 1.0)
     * 
     * Factors:
     * - Temporal proximity (messages near in time)
     * - Length similarity (short vs long)
     * - Semantic similarity (future: keyword matching)
     * 
     * 1.0 = Very high similarity (e.g., previous focus for traversal continuity)
     * 0.5 = Moderate similarity (default)
     * 0.0 = No similarity (should not occur)
     */
    similarity: number
  }>
  
  /**
   * Next message (becomes focus in next cycle)
   * 
   * CRITICAL: This ensures traversal continuity.
   * The "next" message from this cluster will be the focus in next cluster.
   * Presentation layer can pre-load or highlight this message.
   * 
   * May be null only if database is empty.
   */
  next: GriefMessage | null
  
  /**
   * Next message ID (convenience accessor)
   */
  nextId: string | null
  
  /**
   * Display duration (milliseconds)
   * How long this cluster should be displayed before cycling.
   * 
   * @default 8000 (8 seconds)
   */
  duration: number
  
  /**
   * Cluster creation timestamp
   * When this cluster was assembled.
   */
  timestamp: Date
  
  /**
   * Total clusters shown (statistics)
   * Increments with each cycle.
   */
  totalClustersShown: number
}
```

### WorkingSetChange

```typescript
/**
 * Working Set Change Event
 * 
 * Emitted when messages are cycled out and replaced.
 * Presentation layer MUST synchronize particle universe with this.
 */
interface WorkingSetChange {
  /**
   * Message IDs to remove
   * 
   * These messages are no longer in the working set.
   * Presentation layer should:
   * 1. Remove particles for these IDs
   * 2. Clear any visual effects
   * 3. Release memory
   * 
   * EXCEPTION: Previous focus ID may be in removed list but should be
   * kept for one more cycle to maintain traversal thread.
   * Check if ID matches previousFocus before removing.
   */
  removed: string[]
  
  /**
   * New messages to add
   * 
   * These messages are now in the working set.
   * Presentation layer should:
   * 1. Create particles for these messages
   * 2. Position in particle universe
   * 3. Initialize visual state
   * 
   * Source: Dual-cursor system (may be historical or priority queue)
   */
  added: GriefMessage[]
  
  /**
   * Change reason (for debugging/monitoring)
   * 
   * @example "cluster_cycle" | "initialization" | "manual_refresh"
   */
  reason?: string
}
```

### PoolStats

```typescript
/**
 * Pool Statistics
 * 
 * Internal state visibility for monitoring/debugging.
 */
interface PoolStats {
  /**
   * Historical cursor position
   * Current ID in backwards traversal.
   * Null when recycling to newest.
   */
  historicalCursor: number | null
  
  /**
   * New message watermark
   * Highest message ID seen.
   * New messages above this go to priority queue.
   */
  newMessageWatermark: number
  
  /**
   * Priority queue size
   * Number of new messages waiting for visibility.
   * 
   * High values trigger surge mode.
   */
  priorityQueueSize: number
  
  /**
   * Surge mode active
   * True when queue exceeds threshold (adaptive behavior).
   */
  surgeMode: boolean
  
  /**
   * Estimated queue wait time (seconds)
   * How long until queued message becomes visible.
   * 
   * Target: < 30 seconds
   */
  queueWaitTime: number
  
  /**
   * Memory usage (percentage)
   * Estimated JavaScript heap usage.
   * Used for adaptive queue sizing.
   * 
   * @range 0-100
   */
  memoryUsage: number
}
```

### HealthCheck

```typescript
/**
 * Health Check Status
 * 
 * Reports service health for monitoring.
 */
interface HealthCheck {
  /**
   * Overall health status
   */
  status: 'healthy' | 'degraded' | 'unhealthy'
  
  /**
   * Component health breakdown
   */
  components: {
    database: 'up' | 'down'
    poolManager: 'active' | 'stalled'
    traversal: 'running' | 'stopped'
  }
  
  /**
   * Health check timestamp
   */
  timestamp: Date
  
  /**
   * Metrics snapshot
   */
  metrics: {
    messagesInPool: number
    averageResponseTime: number // milliseconds
    errorRate: number // 0.0 - 1.0
  }
  
  /**
   * Warnings (non-fatal issues)
   */
  warnings: string[]
  
  /**
   * Errors (fatal issues)
   */
  errors: string[]
}
```

---

## Traversal Flow

### Cycle Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  INITIALIZATION                                              │
│  1. Load working set (e.g., 400 messages)                   │
│  2. Initialize dual cursors                                 │
│  3. Start new message polling                               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  CLUSTER SELECTION                                           │
│  1. Select focus from working set                           │
│     - First cycle: Use index 0                              │
│     - Subsequent: Use "next" from previous cluster          │
│  2. Select 20 related messages from working set             │
│     - MUST include previous focus (traversal continuity)    │
│     - Sort by similarity (temporal/length/semantic)         │
│  3. Select "next" message (sequential in working set)       │
│  4. Create MessageCluster object                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  EMIT CLUSTER UPDATE                                         │
│  1. Call onClusterUpdate() callbacks                        │
│  2. Presentation layer updates visualization                │
│     - Emphasize focus message                               │
│     - Draw connections to related                           │
│     - Pre-load next message                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  DISPLAY DURATION                                            │
│  Wait for cluster.duration (default 8 seconds)              │
│  User observes focus and connections                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  WORKING SET CYCLING                                         │
│  1. Mark previous cluster messages for removal              │
│     - EXCEPT previous focus (kept for continuity)           │
│     - EXCEPT next message (becomes new focus)               │
│  2. Remove marked messages from working set                 │
│  3. Fetch replacements from pool manager                    │
│     - Dual-cursor system (historical + priority)           │
│     - Same count as removed                                 │
│  4. Add replacements to working set                         │
│  5. Emit WorkingSetChange event                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER SYNC                                     │
│  1. Receive WorkingSetChange event                          │
│  2. Remove particles for removed IDs                        │
│  3. Create particles for added messages                     │
│  4. Update particle universe                                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
                Loop back to CLUSTER SELECTION
                (next message becomes new focus)
```

### Traversal Continuity

**CRITICAL:** The traversal must maintain visual continuity so users perceive a smooth journey through messages, not random jumps.

**Mechanism:**
1. Current cluster has message A as focus
2. Current cluster identifies message B as "next"
3. Message B is explicitly excluded from removal in next cycle
4. Message B becomes focus in next cluster
5. Message A is kept in related messages (one more cycle)
6. After that, message A can be removed

**Example:**
```
Cycle 1: Focus=A, Related=[B,C,D...], Next=B
Cycle 2: Focus=B, Related=[A,C,E...], Next=C (A kept for continuity)
Cycle 3: Focus=C, Related=[B,F,G...], Next=F (A can now be removed)
```

This creates a visual "thread" through the message space that users can follow.

---

## Dual-Cursor Algorithm

### Concept

The dual-cursor system solves the problem: **How do we ensure new user submissions appear quickly while maintaining balanced historical representation?**

**Answer:** Use TWO independent cursors:
1. **Historical Cursor**: Works backwards through existing messages
2. **New Message Watermark**: Tracks incoming submissions

### Historical Cursor

```typescript
/**
 * Historical Cursor Logic
 */

// Initialization
historicalCursor = MAX(message_id)  // Start at newest
newMessageWatermark = MAX(message_id)  // Same starting point

// Fetching batch
async function fetchHistoricalBatch(count: number) {
  if (historicalCursor === null) {
    // Exhausted - recycle to newest
    historicalCursor = await getMaxMessageId()
    viewedSet.clear()  // Reset viewed tracking
  }
  
  // Fetch messages in DESC order (backwards in time)
  const messages = await database.query(`
    SELECT id, content, created_at
    FROM messages
    WHERE id <= $1
      AND id <= $2  -- Don't overlap with new watermark
      AND approved = true
      AND deleted_at IS NULL
    ORDER BY id DESC
    LIMIT $3
  `, [historicalCursor, newMessageWatermark, count])
  
  if (messages.length === 0) {
    // Reached oldest message - recycle
    historicalCursor = null
    return fetchHistoricalBatch(count)  // Try again
  }
  
  // Move cursor backwards
  const oldestFetched = messages[messages.length - 1].id
  historicalCursor = oldestFetched - 1
  
  return messages
}
```

**Properties:**
- Works backwards (DESC) from newest to oldest
- Never overlaps with new message watermark
- Automatically recycles when exhausted
- Provides "fair" historical distribution

### New Message Watermark

```typescript
/**
 * New Message Watermark Logic
 */

// Polling for new messages (every 5 seconds)
setInterval(async () => {
  // Fetch messages above watermark
  const newMessages = await database.query(`
    SELECT id, content, created_at
    FROM messages
    WHERE id > $1
      AND approved = true
      AND deleted_at IS NULL
    ORDER BY id ASC
  `, [newMessageWatermark])
  
  if (newMessages.length > 0) {
    // Add to priority queue (front of line)
    priorityQueue.unshift(...newMessages)
    
    // Update watermark
    const highestId = Math.max(...newMessages.map(m => m.id))
    newMessageWatermark = highestId
    
    console.log(`Found ${newMessages.length} new messages`)
    
    // Check if surge mode needed
    if (priorityQueue.length > surgeThreshold) {
      enterSurgeMode()
    }
  }
}, 5000)
```

**Properties:**
- Polls database periodically (configurable interval)
- Only fetches messages above watermark (efficient)
- Feeds priority queue for quick visibility
- Triggers surge mode if queue grows

### Allocation Strategy

When fetching a batch of N messages, how many come from historical cursor vs priority queue?

**Normal Mode:**
```
Priority Queue Slots: min(queueSize, 5)  // Max 5 new per cluster
Historical Slots: N - prioritySlots
```

**Surge Mode (queue > 100 messages):**
```
Priority Queue Slots: floor(N * 0.7)  // 70% new messages
Historical Slots: floor(N * 0.3)  // 30% historical (minimum)
```

**GUARANTEE:** At least 30% historical messages, always. This prevents the visualization from showing ONLY new submissions during viral moments.

### Edge Case: Empty Database

```typescript
if (messages.length === 0) {
  // No messages at all - show placeholder or idle state
  return {
    focus: createPlaceholderMessage("Waiting for first message..."),
    related: [],
    next: null,
    duration: 5000
  }
}
```

### Edge Case: Single Message

```typescript
if (messages.length === 1) {
  const solo = messages[0]
  return {
    focus: solo,
    related: [],  // No connections
    next: solo,  // Loop back to self
    duration: 8000
  }
}
```

---

## Configuration

### Config Structure

```typescript
/**
 * Message Pool Configuration
 * 
 * All tunable parameters in one place.
 * Changes to these values should NOT require code changes.
 */
interface MessagePoolConfig {
  /**
   * Working set size (particle universe)
   * Total number of messages active in visualization.
   * 
   * @default 400
   * @range 100-1000
   * 
   * Higher = More variety, more memory
   * Lower = Less variety, less memory
   */
  workingSetSize: number
  
  /**
   * Cluster size (related messages)
   * Number of connections drawn from focus.
   * 
   * @default 20
   * @range 5-50
   */
  clusterSize: number
  
  /**
   * Cluster display duration (ms)
   * How long to show each focus before cycling.
   * 
   * @default 8000 (8 seconds)
   * @range 3000-30000
   */
  clusterDuration: number
  
  /**
   * New message polling interval (ms)
   * How often to check for new submissions.
   * 
   * @default 5000 (5 seconds)
   * @range 1000-30000
   * 
   * Lower = Faster visibility, more queries
   * Higher = Slower visibility, fewer queries
   */
  pollingInterval: number
  
  /**
   * Priority queue configuration
   */
  priorityQueue: {
    /**
     * Max queue size
     * Maximum new messages to buffer.
     * Oldest dropped when exceeded.
     * 
     * @default 200
     * @range 50-500
     */
    maxSize: number
    
    /**
     * Cluster slots (normal mode)
     * How many new messages per cluster.
     * 
     * @default 5
     * @range 1-10
     */
    normalSlots: number
    
    /**
     * Memory adaptive
     * Adjust queue size based on available memory.
     * 
     * @default true
     */
    memoryAdaptive: boolean
  }
  
  /**
   * Surge mode configuration
   */
  surgeMode: {
    /**
     * Activation threshold
     * Queue size triggering surge mode.
     * 
     * @default 100
     * @range 50-200
     */
    threshold: number
    
    /**
     * Cluster slots (surge mode)
     * Percentage of cluster for new messages.
     * 
     * @default 0.7 (70%)
     * @range 0.5-0.9
     */
    newMessageRatio: number
    
    /**
     * Minimum historical ratio
     * Ensures balanced representation.
     * 
     * @default 0.3 (30%)
     * @range 0.1-0.5
     */
    minHistoricalRatio: number
  }
  
  /**
   * Similarity scoring weights
   */
  similarity: {
    /**
     * Temporal proximity weight
     * How much to favor messages near in time.
     * 
     * @default 0.6
     * @range 0.0-1.0
     */
    temporalWeight: number
    
    /**
     * Length similarity weight
     * How much to favor similar length messages.
     * 
     * @default 0.2
     * @range 0.0-1.0
     */
    lengthWeight: number
    
    /**
     * Semantic similarity weight
     * How much to favor keyword matches.
     * (Future feature)
     * 
     * @default 0.2
     * @range 0.0-1.0
     */
    semanticWeight: number
  }
}
```

### Default Configuration

```typescript
const DEFAULT_CONFIG: MessagePoolConfig = {
  workingSetSize: 400,
  clusterSize: 20,
  clusterDuration: 8000,
  pollingInterval: 5000,
  
  priorityQueue: {
    maxSize: 200,
    normalSlots: 5,
    memoryAdaptive: true
  },
  
  surgeMode: {
    threshold: 100,
    newMessageRatio: 0.7,
    minHistoricalRatio: 0.3
  },
  
  similarity: {
    temporalWeight: 0.6,
    lengthWeight: 0.2,
    semanticWeight: 0.2
  }
}
```

### Configuration Loading

```typescript
/**
 * Load configuration from environment or defaults
 */
function loadConfig(): MessagePoolConfig {
  return {
    workingSetSize: parseInt(
      process.env.POOL_WORKING_SET_SIZE || '400'
    ),
    clusterSize: parseInt(
      process.env.POOL_CLUSTER_SIZE || '20'
    ),
    // ... etc
  }
}
```

---

## Edge Cases

### Data Edge Cases

#### Empty Database (0 messages)

**Scenario:** System starts before any messages submitted.

**Behavior:**
```typescript
if (totalMessages === 0) {
  // Show placeholder message
  const placeholder: GriefMessage = {
    id: '0',
    content: 'Waiting for first message...',
    created_at: new Date().toISOString(),
    approved: true,
    deleted_at: null
  }
  
  return {
    focus: placeholder,
    related: [],
    next: null,
    duration: 5000  // Shorter duration, will retry
  }
}
```

**Presentation Impact:** Show empty state or gentle prompt to submit.

#### Single Message

**Scenario:** Only one message in database.

**Behavior:**
```typescript
if (totalMessages === 1) {
  const sole = messages[0]
  return {
    focus: sole,
    related: [],  // No connections possible
    next: sole,  // Loop to self
    duration: 8000
  }
}
```

**Presentation Impact:** Show single particle, no connections.

#### All Messages Deleted/Moderated

**Scenario:** Messages exist but all are `deleted_at != null` or `approved = false`.

**Behavior:** Same as empty database (filtered messages = 0).

**Recovery:** System continuously polls for new approved messages.

### Traffic Edge Cases

#### No Viewers (Idle)

**Scenario:** Exhibition closed, no traffic.

**Behavior:**
- Service continues running (traversal doesn't stop)
- Database queries continue (minimal load)
- Priority queue empty (no new submissions)
- Memory usage minimal

**Optimization:** Could reduce polling frequency during idle.

#### Viral Moment (500 submissions/minute)

**Scenario:** Opening night, social media sharing, many simultaneous submissions.

**Behavior:**
1. Priority queue rapidly fills
2. Reaches surge threshold (100 messages)
3. **Surge mode activates**:
   - 70% of each cluster = new messages
   - 30% = historical (guaranteed)
   - Cluster duration may reduce (optional)
4. Queue drains faster
5. When queue < 50, surge mode deactivates

**User Experience:** New messages still visible within 30 seconds (target maintained).

#### Sustained High Traffic

**Scenario:** Continuous high submission rate for hours.

**Behavior:**
- Surge mode stays active
- Oldest queued messages may be dropped (queue size limit)
- Historical messages still represented (30% minimum)
- Memory stays bounded (adaptive queue sizing)

**Monitoring:** Log queue overflow events, alert if prolonged.

### System Failures

#### Database Connection Lost

**Scenario:** Supabase connection drops mid-exhibition.

**Behavior:**
```typescript
try {
  const messages = await database.query(...)
} catch (error) {
  console.error('Database connection lost:', error)
  
  // Retry with exponential backoff
  await sleep(retryDelay)
  retryDelay *= 2
  
  if (retryDelay > maxRetryDelay) {
    // Degrade gracefully - use in-memory messages
    return getFromMemoryCache()
  }
}
```

**Recovery:**
- Automatic retry with exponential backoff
- Use in-memory cache (working set) while offline
- Resume normal operation when connection restored

#### Out of Memory

**Scenario:** Memory usage exceeds threshold.

**Behavior:**
```typescript
if (memoryUsage > 0.85) {  // 85% threshold
  console.warn('Memory pressure detected')
  
  // Emergency actions:
  // 1. Reduce queue size
  priorityQueue.maxSize = Math.floor(priorityQueue.maxSize * 0.5)
  
  // 2. Clear viewed message tracking
  viewedMessages.clear()
  
  // 3. Trigger garbage collection (if available)
  if (global.gc) global.gc()
}
```

**Prevention:** Memory-adaptive queue sizing prevents reaching this state.

### User Experience Edge Cases

#### Message Never Appears

**Scenario:** User submits but never sees their message.

**Root Causes:**
1. Message filtered by moderation (`approved = false`)
2. Message deleted before appearing
3. Queue overflow (dropped due to size limit)
4. User leaves before their turn (30+ seconds wait)

**Mitigation:**
- Target < 30 second visibility (90th percentile)
- Show estimated wait time on submission
- Surge mode prioritizes queue drainage
- Consider showing confirmation: "Your message will appear in ~20 seconds"

#### Message Appears Multiple Times

**Scenario:** User sees same message as focus multiple times in short period.

**Root Cause:** Small working set + recycling.

**Mitigation:**
- Maintain viewed message tracking
- Delay recycling (wait N cycles before reusing)
- Increase working set size if database has enough messages

#### Traversal Stops

**Scenario:** Cycling halts, visualization freezes.

**Root Causes:**
1. Uncaught exception in cycle logic
2. Timer not rescheduled
3. Working set becomes empty

**Prevention:**
```typescript
try {
  await cycleToNext()
} catch (error) {
  console.error('Cycle failed:', error)
  // Reschedule anyway - never stop
  scheduleCycle()
}
```

**Watchdog:** Monitor cycle frequency, alert if > 2x expected interval.

---

## Performance

### Response Time Targets

| Operation | Target (p50) | Target (p95) | Max Acceptable |
|-----------|-------------|--------------|----------------|
| initialize() | 50ms | 200ms | 500ms |
| getNextCluster() | 20ms | 50ms | 100ms |
| addNewMessage() | 30ms | 100ms | 500ms |
| Database query | 10ms | 30ms | 100ms |

### Memory Targets

| Device Class | Working Set | Queue Size | Total Budget |
|--------------|-------------|------------|--------------|
| Mobile | 200 messages | 50 messages | 200MB |
| Desktop | 400 messages | 200 messages | 500MB |
| High-end | 600 messages | 500 messages | 1GB |

### Database Optimization

**Required Indexes:**
```sql
-- Primary index for DESC traversal
CREATE INDEX idx_messages_created_at_desc 
ON messages(created_at DESC, id DESC)
WHERE approved = true AND deleted_at IS NULL;

-- Index for new message polling
CREATE INDEX idx_messages_id_asc
ON messages(id ASC)
WHERE approved = true AND deleted_at IS NULL;

-- Index for working set lookups
CREATE INDEX idx_messages_id_lookup
ON messages(id)
WHERE approved = true AND deleted_at IS NULL;
```

**Query Patterns:**

✅ **Efficient** (uses index):
```sql
SELECT * FROM messages
WHERE id <= 12345
  AND approved = true
  AND deleted_at IS NULL
ORDER BY id DESC
LIMIT 50;
```

❌ **Inefficient** (full scan):
```sql
SELECT * FROM messages
WHERE content LIKE '%mother%'  -- Avoid LIKE without index
ORDER BY created_at DESC;
```

### Monitoring Metrics

**Critical Metrics:**
- API response time (p50, p95, p99)
- Database query time
- Priority queue size (current, max)
- Memory usage (JS heap size)
- Cycle frequency (cycles per minute)
- Queue wait time (estimated)

**Alerting Thresholds:**
- Response time p95 > 100ms (warning)
- Response time p95 > 500ms (critical)
- Queue size > 200 (warning)
- Queue size > 500 (critical)
- Memory usage > 85% (warning)
- Cycle frequency < 50% expected (critical)

---

## Testing Strategy

### Unit Tests

Test business logic in isolation (no database, no UI).

```typescript
describe('MessagePoolManager', () => {
  it('should initialize dual cursors correctly', async () => {
    const mockDB = createMockDatabase([
      { id: '100', content: 'Message 100' },
      { id: '99', content: 'Message 99' }
    ])
    
    const pool = new MessagePoolManager(mockDB)
    await pool.initialize()
    
    expect(pool.historicalCursor).toBe(100)
    expect(pool.newMessageWatermark).toBe(100)
  })
  
  it('should prioritize new messages in surge mode', async () => {
    // ... test surge mode allocation
  })
  
  it('should recycle when historical cursor exhausted', async () => {
    // ... test cursor recycling
  })
})

describe('MessageLogicService', () => {
  it('should emit cluster update on cycle', async () => {
    const service = new MessageLogicService()
    await service.initialize()
    
    const updates: MessageCluster[] = []
    service.onClusterUpdate((cluster) => {
      updates.push(cluster)
    })
    
    service.start()
    await sleep(100)  // Wait for first cycle
    
    expect(updates).toHaveLength(1)
    expect(updates[0].focus).toBeDefined()
  })
  
  it('should maintain traversal continuity', async () => {
    // ... test that "next" becomes focus
  })
})
```

### Integration Tests

Test with real database (Supabase test instance).

```typescript
describe('Integration: Full Traversal Flow', () => {
  let supabase: SupabaseClient
  let service: MessageLogicService
  
  beforeEach(async () => {
    supabase = createTestClient()
    await seedTestData(supabase, 100) // 100 test messages
    service = new MessageLogicService()
    await service.initialize()
  })
  
  it('should cycle through messages without duplicates', async () => {
    const seenFocusIds = new Set<string>()
    
    service.onClusterUpdate((cluster) => {
      expect(seenFocusIds.has(cluster.focusId)).toBe(false)
      seenFocusIds.add(cluster.focusId)
    })
    
    service.start()
    await sleep(50000)  // 50 seconds ~ 6 cycles
    
    expect(seenFocusIds.size).toBeGreaterThanOrEqual(6)
  })
  
  it('should show new message within 30 seconds', async () => {
    service.start()
    
    const startTime = Date.now()
    
    // Submit new message
    const newMessage = await submitMessage(supabase, {
      content: 'Test new message'
    })
    
    // Wait for it to appear as focus
    const appeared = await waitFor(() => {
      const current = service.getCurrentCluster()
      return current?.focusId === newMessage.id
    }, 30000)  // 30 second timeout
    
    const elapsed = Date.now() - startTime
    
    expect(appeared).toBe(true)
    expect(elapsed).toBeLessThan(30000)
  })
})
```

### Load Tests

Simulate exhibition conditions.

```typescript
describe('Load Test: Viral Traffic', () => {
  it('should handle 500 submissions per minute', async () => {
    const service = new MessageLogicService()
    await service.initialize()
    service.start()
    
    // Simulate 500 messages over 60 seconds
    const submissions = []
    for (let i = 0; i < 500; i++) {
      const promise = service.addNewMessage({
        id: `load-${i}`,
        content: `Load test message ${i}`,
        created_at: new Date().toISOString(),
        approved: true,
        deleted_at: null
      })
      submissions.push(promise)
      
      // Stagger submissions (120ms apart)
      await sleep(120)
    }
    
    await Promise.all(submissions)
    
    // Check queue didn't overflow
    const stats = service.getPoolStats()
    expect(stats.priorityQueueSize).toBeLessThan(500)
    
    // Check surge mode activated
    expect(stats.surgeMode).toBe(true)
  })
  
  it('should maintain performance under load', async () => {
    // Measure response times during high traffic
    const responseTimes: number[] = []
    
    for (let i = 0; i < 1000; i++) {
      const start = performance.now()
      await service.getCurrentCluster()
      const duration = performance.now() - start
      responseTimes.push(duration)
    }
    
    const p95 = percentile(responseTimes, 0.95)
    expect(p95).toBeLessThan(100)  // p95 < 100ms
  })
})
```

### Manual Testing Checklist

Before exhibition deployment:

- [ ] Start with empty database - shows placeholder
- [ ] Add first message - appears in visualization
- [ ] Add 10 messages rapidly - all appear within 30 seconds
- [ ] Let system run for 1 hour - no memory leaks
- [ ] Let system run for 8 hours - no crashes
- [ ] Disconnect database - system degrades gracefully
- [ ] Reconnect database - system recovers automatically
- [ ] Submit 100 messages in 1 minute - surge mode activates
- [ ] Check historical messages still appear (30% minimum)
- [ ] Stop and restart service - state recovers correctly

---

## Deployment

### Pre-Deployment Checklist

**Environment Configuration:**
- [ ] Supabase connection string configured
- [ ] Database indexes created
- [ ] Row-level security policies enabled
- [ ] Environment variables set (polling interval, queue size, etc.)

**Performance Validation:**
- [ ] Load test passed (500 messages/minute)
- [ ] Response time < 100ms (p95)
- [ ] Memory usage < 500MB (desktop)
- [ ] No memory leaks over 8 hours

**Functional Validation:**
- [ ] Empty database handled correctly
- [ ] Single message handled correctly
- [ ] New message visibility < 30 seconds
- [ ] Traversal continuity maintained
- [ ] Surge mode activates correctly
- [ ] Database disconnection handled gracefully

**Monitoring Setup:**
- [ ] Logging configured (error, warn, info levels)
- [ ] Metrics collection enabled
- [ ] Health check endpoint working
- [ ] Alert thresholds configured

### Deployment Steps

1. **Database Setup:**
   ```sql
   -- Run migrations
   psql $DATABASE_URL < migrations/001_create_messages_table.sql
   psql $DATABASE_URL < migrations/002_create_indexes.sql
   psql $DATABASE_URL < migrations/003_setup_rls.sql
   ```

2. **Seed Data (Optional):**
   ```bash
   # Load seed messages for testing
   npm run seed
   ```

3. **Environment Variables:**
   ```bash
   # .env.production
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
   SUPABASE_SERVICE_ROLE_KEY=xxx
   
   # Pool configuration
   POOL_WORKING_SET_SIZE=400
   POOL_CLUSTER_SIZE=20
   POOL_POLLING_INTERVAL=5000
   ```

4. **Deploy Application:**
   ```bash
   # Vercel deployment
   vercel --prod
   
   # Or Docker
   docker build -t house-of-mourning .
   docker run -p 3000:3000 house-of-mourning
   ```

5. **Smoke Test:**
   ```bash
   # Test health endpoint
   curl https://your-domain.com/api/health
   
   # Submit test message
   curl -X POST https://your-domain.com/api/messages \
     -H "Content-Type: application/json" \
     -d '{"content":"Test message","sessionId":"test"}'
   ```

### Rollback Plan

If deployment fails:

1. **Immediate:** Revert to previous Vercel deployment
   ```bash
   vercel rollback
   ```

2. **Database:** Revert migrations if needed
   ```bash
   psql $DATABASE_URL < migrations/rollback.sql
   ```

3. **Monitoring:** Check logs for root cause
   ```bash
   vercel logs
   ```

### Post-Deployment Monitoring

**First 15 minutes:**
- Monitor error rate (should be 0%)
- Check response times (p95 < 100ms)
- Verify new messages appearing

**First hour:**
- Monitor memory usage (should stabilize)
- Check cycle frequency (should be consistent)
- Verify no database connection issues

**First day:**
- Review error logs (should be minimal)
- Check queue size trends
- Validate surge mode behavior if applicable

---

## Troubleshooting

### Common Issues

#### Issue: New messages not appearing

**Symptoms:**
- User submits message via form
- Message saved to database
- Message never appears in visualization

**Diagnosis:**
```typescript
// Check pool stats
const stats = service.getPoolStats()
console.log('Queue size:', stats.priorityQueueSize)
console.log('Watermark:', stats.newMessageWatermark)

// Check if message above watermark
const messageId = parseInt(newMessage.id)
if (messageId <= stats.newMessageWatermark) {
  console.error('Message below watermark - will not appear')
}
```

**Solutions:**
1. Check polling interval (may be too long)
2. Verify message `approved = true`
3. Check queue hasn't overflowed
4. Restart service to reset watermark

#### Issue: Traversal stops/freezes

**Symptoms:**
- Visualization shows same focus message
- No cluster updates emitted
- Console shows no errors

**Diagnosis:**
```typescript
// Check if service active
console.log('Service active:', service.isActive)

// Check last cycle time
console.log('Last update:', service.getCurrentCluster()?.timestamp)

// Check for timer issues
console.log('Timer active:', service.cycleTimer !== null)
```

**Solutions:**
1. Check for uncaught exceptions in callbacks
2. Verify working set not empty
3. Check database connection
4. Restart service (`service.stop()` then `service.start()`)

#### Issue: Memory leak

**Symptoms:**
- Memory usage grows continuously
- Eventually crashes or slows down
- Garbage collection ineffective

**Diagnosis:**
```typescript
// Monitor memory over time
setInterval(() => {
  const mem = (performance as any).memory
  console.log('Heap used:', (mem.usedJSHeapSize / 1024 / 1024).toFixed(2), 'MB')
}, 10000)
```

**Common Causes:**
1. Callbacks not unregistered
2. Working set growing unbounded
3. Viewed message set not cleared
4. Database query results not released

**Solutions:**
1. Call `cleanup()` method properly
2. Verify working set size constant
3. Clear viewed set periodically
4. Check for circular references

#### Issue: Database connection lost

**Symptoms:**
- Queries fail with connection errors
- Service stops updating
- Error logs show Supabase errors

**Diagnosis:**
```typescript
// Test database connection
try {
  const result = await supabase.from('messages').select('id').limit(1)
  console.log('Database connection:', result.error ? 'FAILED' : 'OK')
} catch (error) {
  console.error('Connection test failed:', error)
}
```

**Solutions:**
1. Check network connectivity
2. Verify Supabase credentials
3. Check Supabase service status
4. Service will auto-retry with exponential backoff

#### Issue: Queue overflow

**Symptoms:**
- New messages dropped
- Queue size at maximum
- Surge mode permanently active

**Diagnosis:**
```typescript
const stats = service.getPoolStats()
console.log('Queue size:', stats.priorityQueueSize)
console.log('Max size:', config.priorityQueue.maxSize)
console.log('Surge mode:', stats.surgeMode)
console.log('Wait time:', stats.queueWaitTime, 'seconds')
```

**Solutions:**
1. Increase queue size limit
2. Reduce cluster duration (drain faster)
3. Increase surge mode allocation (70% → 80%)
4. Scale horizontally (multiple instances)

### Debug Mode

Enable verbose logging:

```typescript
// In config
const DEBUG_MODE = process.env.DEBUG === 'true'

// In service
if (DEBUG_MODE) {
  console.log('[CYCLE] Starting cycle', {
    focusId: this.currentFocusId,
    workingSetSize: this.workingSet.length,
    queueSize: this.priorityQueue.length
  })
}
```

### Health Check Endpoint

Implement monitoring endpoint:

```typescript
// /api/health
export async function GET() {
  const health = service.getHealth()
  
  const statusCode = health.status === 'healthy' ? 200 :
                     health.status === 'degraded' ? 503 :
                     500
  
  return Response.json(health, { status: statusCode })
}
```

Monitor this endpoint:
- Uptime monitoring (pingdom, uptimerobot)
- Log aggregation (Datadog, Sentry)
- Alerting (PagerDuty, Slack)

### Emergency Procedures

#### During Exhibition

**If visualization stops updating:**
1. Check health endpoint: `curl https://domain.com/api/health`
2. Check error logs: View Vercel logs
3. Quick fix: Hard refresh browser (Cmd+Shift+R)
4. Nuclear option: Restart Vercel deployment

**If new messages not appearing:**
1. Check Supabase dashboard (is database up?)
2. Check queue stats in browser console
3. Temporary fix: Reduce polling interval to 1 second
4. Restart service if needed

**If memory usage critical:**
1. Reduce working set size immediately
2. Reduce queue size
3. Clear viewed message tracking
4. Restart service (will reset memory)

---

## Appendix

### Glossary

**Business Logic Layer**: Framework-independent code managing data and workflows. No UI/rendering.

**Cluster**: A focus message plus related messages (typically 20).

**Dual-Cursor**: Algorithm using two independent cursors (historical + new) for efficient pagination.

**Focus Message**: The central message in a cluster, emphasized in visualization.

**Historical Cursor**: Pointer working backwards through existing messages.

**New Message Watermark**: Highest message ID seen, used to detect new submissions.

**Presentation Layer**: Visualization code (p5.js, Three.js, etc.). Consumes Business Logic API.

**Priority Queue**: Buffer for new messages waiting for visibility.

**Surge Mode**: Adaptive behavior during high submission rates (70% new, 30% historical).

**Traversal**: Continuous cycling through message clusters.

**Working Set**: Current set of messages active in visualization (particle universe).

### References

- [Previous Architecture Audit](/Users/bjameshaskins/Desktop/house-of-mourning-backup/ARCHITECTURE_AUDIT.md)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

### Change Log

**v1.0 (2025-11-14)**
- Initial documentation
- Defined all interfaces and contracts
- Documented dual-cursor algorithm
- Established layer separation rules
- Defined edge case handling
- Created testing strategy
- Documented deployment procedures

---

**Document Status:** Draft  
**Last Updated:** November 14, 2025  
**Next Review:** After Phase 2 implementation  
**Maintainer:** James Haskins / Two Flaneurs
