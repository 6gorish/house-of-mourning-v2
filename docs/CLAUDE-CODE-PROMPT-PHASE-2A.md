# Claude Code Prompt: Phase 2A - Business Logic Layer Implementation

## Context

You are implementing the **Business Logic Layer** for "The House of Mourning" art installation. This layer manages message traversal, clustering, and priority queue management for grief messages that will be visualized as an interactive constellation.

**CRITICAL**: This is a **pure business logic layer** with **ZERO visualization concepts**. You must not import or reference:
- Three.js, p5.js, or any rendering framework
- React components (except for type definitions)
- Canvas APIs or WebGL
- Particles, positions, velocities, or spatial concepts
- Colors, sizes, or any visual properties

Your code will be consumed by a separate presentation layer via clean TypeScript interfaces.

## Reference Documentation

**Primary Spec**: `/docs/MESSAGE-TRAVERSAL-API.md`

Read this document carefully. It contains:
- Complete API reference with TypeScript interfaces
- Dual-cursor algorithm specification
- Edge case handling
- Configuration system
- Performance requirements

## Project Structure

```
house-of-mourning-v2/
├── types/
│   ├── database.ts (EXISTS - do not modify)
│   └── grief-messages.ts (CREATE - new interfaces)
├── lib/
│   ├── config/
│   │   └── message-pool-config.ts (CREATE)
│   ├── services/
│   │   ├── database-service.ts (CREATE)
│   │   ├── message-pool-manager.ts (CREATE)
│   │   ├── cluster-selector.ts (CREATE)
│   │   └── message-logic-service.ts (CREATE)
│   └── utils/
│       └── similarity-scoring.ts (CREATE)
└── tests/
    └── services/
        ├── message-pool-manager.test.ts (CREATE)
        ├── cluster-selector.test.ts (CREATE)
        └── message-logic-service.test.ts (CREATE)
```

## Deliverables

### 1. Type Definitions (`types/grief-messages.ts`)

Create normalized interfaces from the existing `Database.Message` type.

**Requirements:**
- Import `Message` from `./database`
- Create `GriefMessage` interface (normalized for business logic use)
- Create `MessageCluster` interface (as specified in API doc)
- Create `WorkingSetChange` interface
- Create `PoolStats` interface
- Create `HealthCheck` interface
- Create `MessagePoolConfig` interface
- Add JSDoc comments for every interface and field

**Example structure:**
```typescript
/**
 * Grief Message
 * 
 * Normalized message representation for business logic layer.
 * Simplified from Database.Message with only essential fields.
 */
export interface GriefMessage {
  /** Unique identifier (database primary key) */
  id: string
  
  /** Message content (user's grief expression) */
  content: string
  
  /** Timestamp (server-side, UTC) */
  created_at: string
  
  /** Moderation status */
  approved: boolean
  
  /** Soft delete timestamp */
  deleted_at: string | null
}

// ... continue with other interfaces from API doc
```

### 2. Configuration System (`lib/config/message-pool-config.ts`)

**Requirements:**
- Export `DEFAULT_CONFIG` constant with all default values from API doc
- Export `loadConfig()` function that reads from environment variables
- Support all config parameters from API doc:
  - `workingSetSize`
  - `clusterSize`
  - `clusterDuration`
  - `pollingInterval`
  - `priorityQueue.*`
  - `surgeMode.*`
  - `similarity.*`
- Validate config values (throw error if invalid)
- Add JSDoc comments

**Example:**
```typescript
export const DEFAULT_CONFIG: MessagePoolConfig = {
  workingSetSize: 400,
  clusterSize: 20,
  clusterDuration: 8000,
  // ... etc
}

export function loadConfig(): MessagePoolConfig {
  return {
    workingSetSize: parseInt(
      process.env.POOL_WORKING_SET_SIZE || 
      DEFAULT_CONFIG.workingSetSize.toString()
    ),
    // ... etc with validation
  }
}
```

### 3. Database Abstraction (`lib/services/database-service.ts`)

**Requirements:**
- Create `DatabaseService` class wrapping Supabase client
- Implement methods:
  - `fetchBatchWithCursor(cursor: number, limit: number, direction: 'ASC' | 'DESC', maxId?: number): Promise<GriefMessage[]>`
  - `fetchNewMessagesAboveWatermark(watermark: number): Promise<GriefMessage[]>`
  - `getMaxMessageId(): Promise<number>`
  - `addMessage(message: Omit<GriefMessage, 'id'>): Promise<GriefMessage | null>`
- Use existing Supabase client from `@/lib/supabase/server`
- Convert `Database.Message` to `GriefMessage` (normalize fields)
- Filter: `approved = true AND deleted_at IS NULL`
- Handle errors with try/catch and logging
- Add exponential backoff retry for connection errors

**Key queries:**

**Backward cursor (historical):**
```typescript
const { data, error } = await supabase
  .from('messages')
  .select('id, content, created_at, approved, deleted_at')
  .eq('approved', true)
  .is('deleted_at', null)
  .lte('id', cursor)
  .lte('id', maxId) // if maxId provided
  .order('id', { ascending: false })
  .limit(limit)
```

**New messages above watermark:**
```typescript
const { data, error } = await supabase
  .from('messages')
  .select('id, content, created_at, approved, deleted_at')
  .eq('approved', true)
  .is('deleted_at', null)
  .gt('id', watermark)
  .order('id', { ascending: true })
```

### 4. Message Pool Manager (`lib/services/message-pool-manager.ts`)

**Requirements:**
- Implement `MessagePoolManager` class per API spec
- Constructor: `constructor(databaseService: DatabaseService, config: MessagePoolConfig)`
- Implement all methods from API doc:
  - `initialize(): Promise<void>` - Set up cursors and start polling
  - `getNextBatch(count: number): Promise<GriefMessage[]>` - Allocation strategy
  - `addNewUserMessage(message: GriefMessage): Promise<void>` - Priority queue
  - `getStats(): PoolStats` - Current state
  - `cleanup(): void` - Resource release
  - `isSurgeMode(): boolean` - Status check
  - `getClusterConfig(): { slots: number; duration: number }` - For coordinator

**Private methods:**
- `fetchHistoricalBatch(count: number): Promise<GriefMessage[]>`
- `checkForNewMessages(): Promise<void>` - Polling function
- `updateSurgeMode(): void` - Threshold detection
- `calculateAdaptiveQueueSize(): number` - Memory-based sizing

**State management:**
- `historicalCursor: number | null` - Current position in DESC traversal
- `newMessageWatermark: number` - Highest seen ID
- `priorityQueue: GriefMessage[]` - New messages waiting
- `pollingTimer: NodeJS.Timeout | null` - Interval timer
- `surgeMode: boolean` - Current mode

**Edge cases to handle:**
- Empty database (cursor = null, return empty array)
- Single message (loop to self)
- Cursor exhausted (recycle to max ID)
- Queue overflow (drop oldest when exceeding maxSize)
- Memory pressure (reduce queue size dynamically)

**Allocation logic:**
```typescript
// Normal mode
const prioritySlots = Math.min(queueSize, config.priorityQueue.normalSlots)
const historicalSlots = count - prioritySlots

// Surge mode
if (surgeMode) {
  prioritySlots = Math.floor(count * config.surgeMode.newMessageRatio)
  historicalSlots = Math.floor(count * config.surgeMode.minHistoricalRatio)
}

// GUARANTEE minimum historical
const minHistorical = Math.floor(count * config.surgeMode.minHistoricalRatio)
if (historicalSlots < minHistorical) {
  historicalSlots = minHistorical
  prioritySlots = count - historicalSlots
}
```

### 5. Cluster Selector (`lib/services/cluster-selector.ts`)

**Requirements:**
- Implement `ClusterSelector` class
- Constructor: `constructor(config: MessagePoolConfig)`
- Methods:
  - `selectRelatedMessages(focus: GriefMessage, candidates: GriefMessage[], previousFocusId: string | null): Array<{ message: GriefMessage; similarity: number }>` - Select top N by similarity
  - `selectNextMessage(focus: GriefMessage, related: GriefMessage[]): GriefMessage | null` - Choose next in sequence

**Similarity scoring** (in `lib/utils/similarity-scoring.ts`):
```typescript
export function calculateSimilarity(
  messageA: GriefMessage,
  messageB: GriefMessage,
  config: MessagePoolConfig['similarity']
): number {
  // Temporal proximity score (0-1)
  const temporal = calculateTemporalProximity(
    messageA.created_at,
    messageB.created_at
  )
  
  // Length similarity score (0-1)
  const length = calculateLengthSimilarity(
    messageA.content.length,
    messageB.content.length
  )
  
  // Weighted sum
  return (
    temporal * config.temporalWeight +
    length * config.lengthWeight
  )
  // Note: semanticWeight reserved for future keyword matching
}

function calculateTemporalProximity(timeA: string, timeB: string): number {
  const diff = Math.abs(
    new Date(timeA).getTime() - new Date(timeB).getTime()
  )
  
  // Normalize: 0 = same time, 1 = 30+ days apart
  const thirtyDays = 30 * 24 * 60 * 60 * 1000
  return Math.max(0, 1 - (diff / thirtyDays))
}

function calculateLengthSimilarity(lengthA: number, lengthB: number): number {
  const maxLength = 280 // Character limit
  const diff = Math.abs(lengthA - lengthB)
  
  // Normalize: 1 = identical length, 0 = opposite extremes
  return 1 - (diff / maxLength)
}
```

**CRITICAL**: When selecting related messages, ensure `previousFocusId` is ALWAYS included if not null:
```typescript
// Ensure previous focus is in related messages (traversal continuity)
if (previousFocusId) {
  const previousFocus = candidates.find(m => m.id === previousFocusId)
  if (previousFocus) {
    relatedMessages.unshift({
      message: previousFocus,
      similarity: 1.0  // High similarity for traversal thread
    })
  }
}
```

### 6. Message Logic Service (`lib/services/message-logic-service.ts`)

**Requirements:**
- Implement `MessageLogicService` class (coordinator)
- Constructor: `constructor(databaseService: DatabaseService, config: MessagePoolConfig)`
- Implement all methods from API spec:
  - `initialize(): Promise<void>`
  - `start(): void`
  - `stop(): void`
  - `cleanup(): void`
  - `getCurrentCluster(): MessageCluster | null`
  - `setWorkingSet(messages: GriefMessage[]): void`
  - `addNewMessage(message: GriefMessage): Promise<void>`
  - `onClusterUpdate(callback: (cluster: MessageCluster) => void): void`
  - `onWorkingSetChange(callback: (change: WorkingSetChange) => void): void`
  - `getPoolStats(): PoolStats`
  - `getHealth(): HealthCheck`

**State:**
- `poolManager: MessagePoolManager`
- `clusterSelector: ClusterSelector`
- `workingSet: GriefMessage[]` - Current particle universe
- `workingSetIndex: number` - Position in working set
- `currentCluster: MessageCluster | null`
- `nextMessageId: string | null` - For traversal continuity
- `previousFocusId: string | null` - Keep for one more cycle
- `currentClusterMessageIds: Set<string>` - Track for removal
- `cycleTimer: NodeJS.Timeout | null`
- `isActive: boolean`
- `clusterUpdateCallbacks: Array<(cluster: MessageCluster) => void>`
- `workingSetChangeCallbacks: Array<(change: WorkingSetChange) => void>`

**Core traversal logic** (`cycleFromWorkingSet` method):
```typescript
private async cycleFromWorkingSet(): Promise<void> {
  const removedIds: string[] = []
  let addedMessages: GriefMessage[] = []
  
  // STEP 1: Remove previous cluster messages (except previous focus and next)
  if (this.currentClusterMessageIds.size > 0) {
    const toRemove = Array.from(this.currentClusterMessageIds).filter(
      id => id !== this.previousFocusId && id !== this.nextMessageId
    )
    removedIds.push(...toRemove)
    
    this.workingSet = this.workingSet.filter(m => !toRemove.includes(m.id))
    
    // STEP 2: Get replacements from pool
    if (toRemove.length > 0) {
      addedMessages = await this.poolManager.getNextBatch(toRemove.length)
      this.workingSet.push(...addedMessages)
    }
  }
  
  // STEP 3: Select focus (use "next" from previous cycle)
  let focusMessage: GriefMessage
  if (this.nextMessageId) {
    const index = this.workingSet.findIndex(m => m.id === this.nextMessageId)
    if (index >= 0) {
      focusMessage = this.workingSet[index]
      this.workingSetIndex = index
    } else {
      // Fallback if next not found
      focusMessage = this.workingSet[this.workingSetIndex]
    }
  } else {
    focusMessage = this.workingSet[this.workingSetIndex]
  }
  
  // STEP 4: Select related messages (ensure previous focus included)
  const candidates = this.workingSet.filter(m => m.id !== focusMessage.id)
  const related = this.clusterSelector.selectRelatedMessages(
    focusMessage,
    candidates,
    this.previousFocusId
  )
  
  // STEP 5: Select next message
  this.workingSetIndex = (this.workingSetIndex + 1) % this.workingSet.length
  const nextMessage = this.workingSet[this.workingSetIndex]
  this.nextMessageId = nextMessage.id
  
  // STEP 6: Build cluster
  this.currentCluster = {
    focus: focusMessage,
    focusId: focusMessage.id,
    related,
    next: nextMessage,
    nextId: nextMessage.id,
    duration: this.config.clusterDuration,
    timestamp: new Date(),
    totalClustersShown: ++this.totalClustersCreated
  }
  
  // STEP 7: Track for next removal (exclude next message)
  this.currentClusterMessageIds.clear()
  this.currentClusterMessageIds.add(focusMessage.id)
  related.forEach(r => {
    if (r.messageId !== this.nextMessageId) {
      this.currentClusterMessageIds.add(r.messageId)
    }
  })
  
  this.previousFocusId = focusMessage.id
  
  // STEP 8: Emit events
  if (removedIds.length > 0 || addedMessages.length > 0) {
    this.workingSetChangeCallbacks.forEach(cb => 
      cb({ removed: removedIds, added: addedMessages })
    )
  }
  
  this.clusterUpdateCallbacks.forEach(cb => cb(this.currentCluster!))
  
  this.scheduleCycle()
}
```

### 7. Unit Tests

**Test files:**
- `tests/services/message-pool-manager.test.ts`
- `tests/services/cluster-selector.test.ts`
- `tests/services/message-logic-service.test.ts`

**Use Vitest** (already installed in project).

**Example test structure:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { MessagePoolManager } from '@/lib/services/message-pool-manager'
import { MockDatabaseService } from '../mocks/database-service'

describe('MessagePoolManager', () => {
  let poolManager: MessagePoolManager
  let mockDB: MockDatabaseService
  
  beforeEach(() => {
    mockDB = new MockDatabaseService([
      { id: '100', content: 'Message 100', created_at: '2025-11-14T10:00:00Z', approved: true, deleted_at: null },
      { id: '99', content: 'Message 99', created_at: '2025-11-14T09:00:00Z', approved: true, deleted_at: null },
      // ... more test data
    ])
    
    poolManager = new MessagePoolManager(mockDB, DEFAULT_CONFIG)
  })
  
  it('should initialize dual cursors correctly', async () => {
    await poolManager.initialize()
    
    const stats = poolManager.getStats()
    expect(stats.historicalCursor).toBe(100)
    expect(stats.newMessageWatermark).toBe(100)
  })
  
  it('should fetch historical batch in DESC order', async () => {
    await poolManager.initialize()
    const batch = await poolManager.getNextBatch(5)
    
    expect(batch).toHaveLength(5)
    expect(parseInt(batch[0].id)).toBeGreaterThan(parseInt(batch[1].id))
  })
  
  it('should prioritize new messages in surge mode', async () => {
    // ... test surge mode allocation
  })
  
  it('should recycle cursor when exhausted', async () => {
    // ... test cursor recycling
  })
  
  it('should handle empty database gracefully', async () => {
    const emptyDB = new MockDatabaseService([])
    const manager = new MessagePoolManager(emptyDB, DEFAULT_CONFIG)
    
    await manager.initialize()
    const batch = await manager.getNextBatch(10)
    
    expect(batch).toHaveLength(0)
  })
})
```

**Mock database service** (`tests/mocks/database-service.ts`):
```typescript
import { GriefMessage } from '@/types/grief-messages'
import { DatabaseService } from '@/lib/services/database-service'

export class MockDatabaseService {
  private messages: GriefMessage[]
  
  constructor(messages: GriefMessage[]) {
    this.messages = messages
  }
  
  async fetchBatchWithCursor(
    cursor: number,
    limit: number,
    direction: 'ASC' | 'DESC',
    maxId?: number
  ): Promise<GriefMessage[]> {
    let filtered = this.messages.filter(m => {
      const id = parseInt(m.id)
      if (direction === 'DESC') {
        return id <= cursor && (!maxId || id <= maxId)
      } else {
        return id >= cursor
      }
    })
    
    filtered.sort((a, b) => {
      const diff = parseInt(a.id) - parseInt(b.id)
      return direction === 'DESC' ? -diff : diff
    })
    
    return filtered.slice(0, limit)
  }
  
  async fetchNewMessagesAboveWatermark(watermark: number): Promise<GriefMessage[]> {
    return this.messages
      .filter(m => parseInt(m.id) > watermark)
      .sort((a, b) => parseInt(a.id) - parseInt(b.id))
  }
  
  async getMaxMessageId(): Promise<number> {
    if (this.messages.length === 0) return 0
    return Math.max(...this.messages.map(m => parseInt(m.id)))
  }
  
  async addMessage(message: Omit<GriefMessage, 'id'>): Promise<GriefMessage | null> {
    const id = (await this.getMaxMessageId() + 1).toString()
    const newMessage = { ...message, id }
    this.messages.push(newMessage)
    return newMessage
  }
}
```

## Implementation Guidelines

### Code Style
- Use TypeScript strict mode
- Add JSDoc comments to all public methods
- Use async/await (not .then())
- Handle errors with try/catch
- Log errors to console (use structured logging)
- Use meaningful variable names
- Keep methods focused (single responsibility)

### Error Handling Pattern
```typescript
try {
  const result = await operation()
  return result
} catch (error) {
  console.error('[SERVICE_NAME]:', error)
  // Decide: throw, return null, or degrade gracefully
  throw new Error(`Failed to operation: ${error.message}`)
}
```

### Logging Pattern
```typescript
// Use prefix for easy filtering
console.log('[POOL_MANAGER] Initialized:', { cursor, watermark })
console.warn('[POOL_MANAGER] Surge mode activated:', { queueSize })
console.error('[POOL_MANAGER] Failed to fetch batch:', error)
```

### Memory Management
- Clear intervals/timeouts in cleanup()
- Avoid circular references
- Use WeakMap if needed for caching
- Don't hold references to large objects unnecessarily

## Validation Checklist

Before submitting, verify:

### Architecture Compliance
- [ ] No imports of Three.js, p5.js, or rendering frameworks
- [ ] No imports of React components (except type-only imports)
- [ ] No references to: particles, positions, colors, canvas, WebGL
- [ ] No visualization concepts in variable names or comments
- [ ] All interfaces match API documentation exactly

### Functionality
- [ ] TypeScript compiles without errors
- [ ] All unit tests pass
- [ ] Can initialize service and get first cluster
- [ ] Can cycle through multiple clusters
- [ ] Dual cursors work correctly (historical + new)
- [ ] Priority queue drains appropriately
- [ ] Surge mode activates at threshold
- [ ] Edge cases handled (empty DB, single message, cursor exhaustion)

### Code Quality
- [ ] JSDoc comments on all public methods and interfaces
- [ ] Error handling with try/catch
- [ ] Logging for important events
- [ ] No console.log in production code (use structured logging)
- [ ] Cleanup methods release all resources
- [ ] No memory leaks (timers cleared, references released)

### Testing
- [ ] Unit tests cover happy paths
- [ ] Unit tests cover edge cases
- [ ] Mock database service works correctly
- [ ] Tests are fast (no real database calls)
- [ ] Test coverage > 80%

## Testing the Implementation

After implementation, test with this script:

```typescript
// test-business-logic.ts
import { MessageLogicService } from '@/lib/services/message-logic-service'
import { DatabaseService } from '@/lib/services/database-service'
import { loadConfig } from '@/lib/config/message-pool-config'
import { createClient } from '@/lib/supabase/server'

async function testBusinessLogic() {
  console.log('Initializing service...')
  
  const supabase = createClient()
  const db = new DatabaseService(supabase)
  const config = loadConfig()
  const service = new MessageLogicService(db, config)
  
  await service.initialize()
  console.log('✓ Service initialized')
  
  // Load working set (simulate particle universe)
  const initialMessages = await db.fetchBatchWithCursor(
    await db.getMaxMessageId(),
    config.workingSetSize,
    'DESC'
  )
  service.setWorkingSet(initialMessages)
  console.log(`✓ Working set loaded: ${initialMessages.length} messages`)
  
  // Subscribe to events
  let clusterCount = 0
  service.onClusterUpdate((cluster) => {
    clusterCount++
    console.log(`\n=== Cluster ${clusterCount} ===`)
    console.log(`Focus: ${cluster.focus.content.substring(0, 60)}...`)
    console.log(`Related: ${cluster.related.length} messages`)
    console.log(`Next: ${cluster.next?.content.substring(0, 60)}...`)
  })
  
  service.onWorkingSetChange((change) => {
    console.log(`\n>>> Working Set Change`)
    console.log(`    Removed: ${change.removed.length}`)
    console.log(`    Added: ${change.added.length}`)
  })
  
  // Start traversal
  console.log('\nStarting traversal...\n')
  service.start()
  
  // Let it run for 60 seconds (7-8 cycles)
  await new Promise(resolve => setTimeout(resolve, 60000))
  
  // Check stats
  const stats = service.getPoolStats()
  console.log('\n=== Final Stats ===')
  console.log('Clusters shown:', clusterCount)
  console.log('Historical cursor:', stats.historicalCursor)
  console.log('Watermark:', stats.newMessageWatermark)
  console.log('Queue size:', stats.priorityQueueSize)
  console.log('Surge mode:', stats.surgeMode)
  
  // Cleanup
  service.cleanup()
  console.log('\n✓ Service cleaned up')
}

testBusinessLogic().catch(console.error)
```

Run with:
```bash
npx tsx test-business-logic.ts
```

Expected output:
- Service initializes without errors
- Working set loads 400 messages
- Clusters cycle every 8 seconds
- Focus message changes each cycle
- Working set changes emit events
- No crashes or memory leaks
- Stats look reasonable

## Questions?

If you encounter ambiguity:
1. Check API documentation first (`/docs/MESSAGE-TRAVERSAL-API.md`)
2. Prefer simple solutions over complex ones
3. When in doubt, log and degrade gracefully rather than crashing
4. Add TODO comments for future enhancements

## Success Criteria

This phase is complete when:
- [ ] All TypeScript files compile
- [ ] All unit tests pass
- [ ] Test script runs without errors
- [ ] Can cycle through clusters continuously
- [ ] Zero visualization concepts in code
- [ ] Memory usage stable over 5+ minutes
- [ ] Code follows all architecture constraints

Good luck! This is foundational work that will enable the entire visualization layer.
