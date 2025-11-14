# API Requirements Prompt: Message Traversal & Clustering System

## Context

You are creating a requirements document for a **message traversal and clustering API** that powers an art installation called "The House of Mourning." This API will manage the continuous flow of grief messages through a visualization system, showing the interconnectedness of loss through semantic clustering and infinite traversal.

## Core Objective

Design a **bomb-proof, presentation-agnostic business logic layer** that provides:
1. Continuous message traversal (never stops, even with 0 messages)
2. Semantic clustering (focus message + related messages)
3. Priority for new user submissions
4. Resilience under viral traffic
5. Clean contracts for visualization consumption

## Critical Requirements to Document

### 1. FUNCTIONAL REQUIREMENTS

#### 1.1 Message Traversal Pattern
- Define the focus → cluster → next → new focus cycle
- Specify cluster size (20 messages default, configurable)
- Document "next message" selection criteria
- Define recycling behavior when all messages exhausted
- Specify how traversal maintains visual continuity (previous focus persists for one cycle)

#### 1.2 Dual-Cursor Pagination
- Historical cursor: Works backwards through existing messages (DESC order)
- New message watermark: Tracks highest seen message ID
- Priority queue: New submissions "cut in line"
- Surge mode: Adaptive behavior under heavy traffic
- Document cursor reset logic and recycling strategy

#### 1.3 User Submission Priority
- Maximum time from submission to visibility (target: < 30 seconds)
- Queue allocation strategy (normal vs surge mode)
- Fair balance between new and historical messages (minimum 30% historical)
- Rate limiting and spam prevention

#### 1.4 Data Structures & Contracts

Define TypeScript interfaces for:
```typescript
// Message cluster returned by API
interface MessageCluster {
  focus: GriefMessage
  related: Array<{ message: GriefMessage; similarity: number }>
  next: GriefMessage | null
  duration: number // Display time in ms
  timestamp: Date
}

// Working set change event
interface WorkingSetChange {
  removed: string[] // Message IDs to remove from universe
  added: GriefMessage[] // New messages to add
}
```

### 2. NON-FUNCTIONAL REQUIREMENTS

#### 2.1 Performance
- API response time: < 100ms (p95)
- Memory footprint: Bounded, adaptive to device capabilities
- Database queries: Optimized with proper indexes
- No N+1 queries or expensive joins

#### 2.2 Scalability
- Handle 0-10,000 concurrent viewers
- Support 0-500 messages/minute submission rate
- Adaptive queue sizing based on available memory
- Graceful degradation under extreme load

#### 2.3 Reliability
- 99.9% uptime during exhibition (Dec 19-20, 2025)
- Automatic recovery from database disconnections
- No catastrophic failures (always degrades gracefully)
- Comprehensive error logging

#### 2.4 Maintainability
- Zero coupling to visualization framework (p5.js, Three.js, etc.)
- Framework-agnostic: Could work with React, Vue, vanilla JS
- Clear separation: Business logic layer has NO knowledge of rendering
- Testable: All logic can be unit tested without UI

### 3. EDGE CASES & FAILURE MODES

#### 3.1 Data Edge Cases
- Empty database (0 messages)
- Single message in database
- All messages deleted/moderated
- Duplicate message submissions
- Messages exceeding character limits
- Malformed timestamps or IDs

#### 3.2 Traffic Edge Cases
- No viewers (system idle)
- 10,000 simultaneous viewers
- 500 submissions in 1 minute (viral moment)
- Sustained high traffic for hours
- Burst traffic then sudden drop

#### 3.3 System Failures
- Database connection lost
- Supabase rate limiting triggered
- Out of memory condition
- Clock drift / timestamp issues
- Network partition

#### 3.4 User Experience Edge Cases
- User submits message but never sees it (unacceptable)
- Message appears multiple times in short period (confusing)
- Traversal stops or loops infinitely (breaks installation)
- New messages never appear (defeats purpose)
- Only new messages appear (loses historical context)

### 4. ARCHITECTURAL CONSTRAINTS

#### 4.1 Layer Separation (CRITICAL - previous attempt failed here)
```
┌─────────────────────────────────────────┐
│  Presentation Layer (p5.js/Three.js)    │
│  - Particles, rendering, animation      │
│  - Consumes MessageLogicService API     │
│  - ZERO business logic                  │
└─────────────────┬───────────────────────┘
                  │ (clean API boundary)
┌─────────────────▼───────────────────────┐
│  Business Logic Layer                   │
│  - MessageLogicService                  │
│  - MessagePoolManager (dual cursors)    │
│  - ClusterSelector (similarity)         │
│  - ZERO visualization concepts          │
└─────────────────┬───────────────────────┘
                  │ (data access)
┌─────────────────▼───────────────────────┐
│  Data Layer (Supabase/Database)         │
└─────────────────────────────────────────┘
```

#### 4.2 Dependency Rules
- Presentation MAY depend on Business Logic
- Business Logic MUST NOT depend on Presentation
- Business Logic MUST NOT import p5.js, Three.js, canvas APIs
- Business Logic MUST NOT know about particles, positions, colors

#### 4.3 Configuration Management
- Single source of truth for all settings
- Runtime-enforceable config flags
- No hardcoded values in business logic
- Config changes don't require code changes

### 5. UX CONSIDERATIONS

#### 5.1 User Expectations
- "My message should appear quickly" → < 30 seconds
- "The visualization never stops" → Infinite traversal
- "I see different messages each time" → No obvious loops
- "Recent messages are prioritized" → Surge mode

#### 5.2 Exhibition Requirements
- Runs continuously for 48 hours (Dec 19-20, 2025)
- No manual intervention needed
- Handles opening night traffic spike
- Recovers automatically from any issues

#### 5.3 Emotional Impact
- Messages feel connected (semantic clustering)
- Flow feels natural, not robotic (varied timing, organic transitions)
- New submissions feel valued (quick visibility)
- Historical messages get fair representation

### 6. TECHNICAL APPROACH

#### 6.1 Dual-Cursor Algorithm

Document the precise logic:
```
Historical Cursor (works backwards):
- Starts at MAX(message_id)
- Fetches batches in DESC order
- Moves backwards: cursor = oldest_fetched_id - 1
- When exhausted: Resets to MAX(message_id)
- Never overlaps with new message watermark

New Message Watermark (tracks incoming):
- Starts at MAX(message_id)
- Polls every N seconds for messages above watermark
- Updates watermark to highest new ID
- Feeds priority queue

Priority Queue:
- New messages added to front
- Drained according to allocation strategy
- Size adapts to available memory
- Oldest messages dropped if overflow
```

#### 6.2 Cluster Selection Strategy

Document similarity calculation:
- Temporal proximity (messages near in time)
- Semantic similarity (keywords, themes)
- Length similarity (short vs long messages)
- Weighted scoring algorithm
- "Next message" selection criteria

#### 6.3 Working Set Management

The "working set" is the current particle universe:
- Fixed size (e.g., 400 messages)
- Messages removed when previous cluster cycles out
- Replacement messages fetched from pool (dual cursors + priority)
- Synchronization between working set and particle system
- Callback-based notification of changes

### 7. API SURFACE

#### 7.1 Core Service Interface
```typescript
class MessageLogicService {
  // Lifecycle
  initialize(): Promise<void>
  start(): void
  stop(): void
  cleanup(): void
  
  // State management
  getCurrentCluster(): MessageCluster | null
  setWorkingSet(messages: GriefMessage[]): void
  
  // User interaction
  addNewMessage(message: GriefMessage): Promise<void>
  
  // Callbacks (presentation layer subscribes)
  onClusterUpdate(callback: (cluster: MessageCluster) => void): void
  onWorkingSetChange(callback: (change: WorkingSetChange) => void): void
  
  // Monitoring
  getPoolStats(): PoolStats
  getHealth(): HealthCheck
}
```

#### 7.2 Data Contracts

Every interface must be documented with:
- Field descriptions
- Valid ranges
- Nullability
- Validation rules
- Example values

### 8. RISKS & MITIGATIONS

#### 8.1 Known Risks from Previous Attempt
- **Risk**: God object anti-pattern (1600+ line orchestrator)
  - **Mitigation**: Strict layer separation, interface-driven design
  
- **Risk**: Config flags ignored (hardcoded `enabled: true`)
  - **Mitigation**: Runtime enforcement, integration tests for config
  
- **Risk**: Memory leaks (p5.js color objects, event listeners)
  - **Mitigation**: Proper cleanup, WeakMaps, monitoring

- **Risk**: Duplicate rendering systems (phantom renderer)
  - **Mitigation**: Single system registration, no parallel codepaths

#### 8.2 New Risks
- **Risk**: Race conditions (concurrent submissions + traversal)
  - **Mitigation**: Mutex locks, atomic operations, transaction isolation
  
- **Risk**: Clock drift causing timestamp issues
  - **Mitigation**: Server-side timestamps, ID-based ordering as tiebreaker
  
- **Risk**: Database connection pool exhaustion
  - **Mitigation**: Connection limits, query timeouts, circuit breaker

### 9. SUCCESS CRITERIA

Define measurable outcomes:
- [ ] API response time < 100ms (p95)
- [ ] New message visibility < 30 seconds
- [ ] Zero downtime during 48-hour exhibition
- [ ] Memory footprint < 500MB on desktop, < 200MB on mobile
- [ ] Unit test coverage > 80%
- [ ] Zero visualization concepts in business logic layer
- [ ] Can swap p5.js for Three.js without touching business logic

### 10. DOCUMENTATION STRUCTURE

The output document should include:
1. **Executive Summary** (1 page)
2. **Architecture Diagram** (visual layer separation)
3. **API Reference** (TypeScript interfaces with JSDoc)
4. **Flow Diagrams** (traversal cycle, cluster lifecycle)
5. **Configuration Reference** (all tunable parameters)
6. **Edge Case Handling** (comprehensive decision trees)
7. **Performance Benchmarks** (expected metrics)
8. **Testing Strategy** (unit, integration, load tests)
9. **Deployment Checklist** (pre-exhibition validation)
10. **Troubleshooting Guide** (common issues + fixes)

## Prompt Usage Instructions

When you provide this prompt, specify:
- Target audience: Developer + future maintainers
- Output format: Markdown with diagrams
- Level of detail: Comprehensive - this is the source of truth
- Code examples: TypeScript, include actual implementation snippets
- Focus: Bomb-proof design that learned from previous architectural failures
