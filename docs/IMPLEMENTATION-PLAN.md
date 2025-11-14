# Implementation Plan: Phase 2 - Interactive Installation
## Gap Analysis & Work Breakdown

**Date**: November 14, 2025  
**Current Branch**: `feature/api-documentation`  
**Status**: Planning Phase

---

## Current State Assessment

### ✅ What Exists (Complete)

**Track A: Marketing Website**
- [x] Homepage with shader background
- [x] About page (content-driven)
- [x] Artists page (content-driven)
- [x] Event page (content-driven)
- [x] Participate page with grief submission form
- [x] Mobile responsive navigation
- [x] Page transitions (Framer Motion)
- [x] Design system (Tailwind + custom styles)
- [x] Deployed to Vercel
- [x] Mobile viewport fixes (iOS Safari)

**Database Layer**
- [x] Supabase project configured
- [x] Messages table schema (with all fields)
- [x] Dual-cursor indexes created
- [x] Seed data loaded (597 messages)
- [x] TypeScript types defined (Database, Message, etc.)

**API Layer (Basic)**
- [x] POST /api/messages (submission endpoint with rate limiting)
- [x] GET /api/messages (basic fetch with offset pagination)
- [x] Session tracking
- [x] IP hashing for privacy

**Dependencies**
- [x] Next.js 16 + React 19
- [x] Supabase client
- [x] Three.js (visualization framework)
- [x] Framer Motion (animations)
- [x] Tailwind CSS

### ❌ What's Missing (Phase 2 Work)

**Business Logic Layer (CRITICAL - Zero Exists)**
- [ ] Type definitions for API contracts
  - GriefMessage interface (normalized from Database.Message)
  - MessageCluster interface
  - WorkingSetChange interface
  - PoolStats interface
  - HealthCheck interface
- [ ] Configuration system
  - MessagePoolConfig interface
  - Default config values
  - Environment variable loading
- [ ] MessagePoolManager class
  - Dual-cursor pagination
  - New message watermark
  - Priority queue management
  - Surge mode detection
  - Memory-adaptive sizing
- [ ] ClusterSelector class
  - Similarity scoring (temporal, length, semantic)
  - Related message selection
  - "Next message" selection
- [ ] MessageLogicService class (coordinator)
  - Working set management
  - Cluster cycling
  - Callback system (onClusterUpdate, onWorkingSetChange)
  - Lifecycle methods (initialize, start, stop, cleanup)
- [ ] Database abstraction layer
  - Fetch batch with cursor
  - Fetch new messages above watermark
  - Get max message ID
  - Query optimization

**API Layer (Enhanced)**
- [ ] GET /api/messages/stream (cluster-based endpoint)
- [ ] GET /api/health (service health check)
- [ ] GET /api/stats (pool statistics)
- [ ] WebSocket or polling for real-time updates (optional)

**Visualization Layer (ZERO Exists)**
- [ ] Three.js scene setup
- [ ] Particle system (message nodes)
- [ ] Connection rendering (focus → related)
- [ ] Camera controls
- [ ] Performance optimization
- [ ] Integration with MessageLogicService
- [ ] User interaction (hover, click)

**Testing Infrastructure**
- [ ] Unit tests (business logic)
- [ ] Integration tests (with Supabase)
- [ ] Load tests (viral traffic simulation)
- [ ] E2E tests (optional)

**Monitoring & Operations**
- [ ] Logging system
- [ ] Error tracking (Sentry or similar)
- [ ] Performance monitoring
- [ ] Health check endpoint
- [ ] Deployment validation checklist

---

## Implementation Phases

### Phase 2A: Business Logic Foundation (Claude Code)
**Estimated Time**: 4-6 hours  
**Branch**: `feature/business-logic-layer`  
**Tool**: Claude Code (mechanical implementation from spec)

**Deliverables:**
1. Type definitions (`types/grief-messages.ts`)
   - GriefMessage (normalized from Database.Message)
   - MessageCluster
   - WorkingSetChange
   - PoolStats
   - HealthCheck
   - MessagePoolConfig

2. Configuration system (`lib/config/message-pool-config.ts`)
   - Default configuration object
   - Environment variable loading
   - Runtime validation

3. Database abstraction (`lib/services/database-service.ts`)
   - fetchBatchWithCursor()
   - fetchNewMessagesAboveWatermark()
   - getMaxMessageId()
   - Connection pooling
   - Error handling with retry logic

4. MessagePoolManager (`lib/services/message-pool-manager.ts`)
   - Initialize dual cursors
   - fetchHistoricalBatch() - DESC with cursor
   - checkForNewMessages() - polling with watermark
   - getNextBatch() - allocation strategy (normal vs surge)
   - updateSurgeMode() - threshold detection
   - Memory management
   - Cleanup

5. ClusterSelector (`lib/services/cluster-selector.ts`)
   - calculateSimilarity() - temporal + length scoring
   - selectRelatedMessages() - top N by similarity
   - selectNextMessage() - sequential or best candidate
   - Ensure previous focus included (traversal continuity)

6. MessageLogicService (`lib/services/message-logic-service.ts`)
   - initialize() - setup pool, cursors, polling
   - start() / stop() - control traversal cycle
   - setWorkingSet() - sync with visualization
   - cycleToNext() - main traversal logic
   - getCurrentCluster() - getter
   - addNewMessage() - priority queue injection
   - onClusterUpdate() / onWorkingSetChange() - callbacks
   - getPoolStats() / getHealth() - monitoring
   - cleanup() - resource release

**Success Criteria:**
- [ ] All TypeScript compiles without errors
- [ ] Unit tests pass (business logic in isolation)
- [ ] Can initialize service and cycle through messages
- [ ] No visualization concepts in business logic layer
- [ ] Zero imports of Three.js, React, or UI frameworks

**Testing Approach:**
```typescript
// Simple test script (no visualization)
const service = new MessageLogicService()
await service.initialize()

let clusterCount = 0
service.onClusterUpdate((cluster) => {
  console.log(`Cluster ${++clusterCount}:`)
  console.log(`  Focus: ${cluster.focus.content.substring(0, 50)}`)
  console.log(`  Related: ${cluster.related.length}`)
  console.log(`  Next: ${cluster.next?.content.substring(0, 50)}`)
})

service.start()

// Let it run for 60 seconds
await sleep(60000)

console.log('Stats:', service.getPoolStats())
service.cleanup()
```

---

### Phase 2B: API Enhancement (You - Strategic)
**Estimated Time**: 1-2 hours  
**Branch**: Continue on `feature/business-logic-layer`  
**Tool**: You (Claude chat) - strategic thinking needed

**Deliverables:**
1. Enhanced API endpoints (`app/api/`)
   - GET /api/messages/cluster - Returns current cluster
   - GET /api/health - Service health check
   - GET /api/stats - Pool statistics
   - WebSocket setup (optional - may defer to Phase 3)

2. Service initialization in Next.js
   - Singleton pattern for MessageLogicService
   - Initialize on server startup
   - Proper cleanup on shutdown

**Why You, Not Claude Code:**
- Strategic decision: REST vs WebSocket vs Server-Sent Events
- Next.js integration patterns (singleton service, edge runtime considerations)
- Caching strategy for cluster endpoint
- Rate limiting considerations

---

### Phase 2C: Visualization Layer (TBD - Requires Design Decision)
**Estimated Time**: 8-12 hours  
**Branch**: `feature/visualization-layer`  
**Tool**: TBD based on complexity

**Critical Decision Needed First:**
We need to decide visualization approach:

**Option A: Simple Three.js Particle Cloud**
- Stationary particles in 3D space
- Lines connect focus to related messages
- Camera can orbit/zoom
- Simpler, faster to implement
- Good for: Proof of concept, MVP

**Option B: Complex Fluid Dynamics System**
- Particles move organically
- Fluid simulation for background
- Connection springs with physics
- More sophisticated, longer to implement
- Good for: Final polished version

**Recommendation**: Start with Option A (simple), iterate to Option B if time allows.

**Deliverables (Option A):**
1. Three.js scene setup (`components/visualization/Scene.tsx`)
   - WebGL renderer
   - Camera setup (OrbitControls)
   - Lighting
   - Resize handling

2. Particle manager (`lib/visualization/particle-manager.ts`)
   - Create particle mesh for each message
   - Position in 3D space (random or layout algorithm)
   - Update colors/opacity based on cluster state
   - Remove particles for cycled-out messages

3. Connection renderer (`lib/visualization/connection-renderer.ts`)
   - Draw lines from focus to related messages
   - Color based on similarity score
   - Fade in/out on cluster change

4. MessageLogicService integration
   - Subscribe to onClusterUpdate
   - Subscribe to onWorkingSetChange
   - Update visualization based on events

5. Performance optimization
   - Instanced rendering (if many particles)
   - LOD system (optional)
   - Frustum culling

**Success Criteria:**
- [ ] Visualization shows messages as particles
- [ ] Focus message is visually emphasized
- [ ] Connections draw from focus to related
- [ ] Smooth transitions between clusters
- [ ] Performance: 60fps with 400 particles
- [ ] User can orbit/zoom camera
- [ ] Works on mobile (fallback to fewer particles)

---

## Branching Strategy

### Recommended Approach: Feature Branches

**Current State:**
```
main (deployed - marketing site)
  └── feature/api-documentation (current branch)
```

**Proposed Structure:**
```
main
  └── feature/api-documentation (merge this first)
      ├── feature/business-logic-layer (Phase 2A)
      │   └── feature/api-enhancement (Phase 2B)
      │       └── feature/visualization-layer (Phase 2C)
      └── hotfix/* (if needed for live site)
```

**Workflow:**
1. **Now**: Merge `feature/api-documentation` to main (documentation only, no risk)
2. **Phase 2A**: Create `feature/business-logic-layer` from main
3. **Phase 2B**: Continue on same branch (API is closely related)
4. **Phase 2C**: Create `feature/visualization-layer` from business-logic branch

**Merge Strategy:**
- Merge to main only when phase is complete and tested
- Use PR review even if solo (self-review checklist)
- Keep branches alive until exhibition is over (easy rollback)

**Alternative: Long-lived Development Branch**
```
main (production)
  └── develop (integration branch)
      ├── feature/business-logic-layer
      ├── feature/api-enhancement
      └── feature/visualization-layer
```

This is safer for exhibition - keep production stable, only merge to main when everything is ready.

**Recommendation**: Use long-lived `develop` branch. Merge to `main` only for exhibition deployment (Dec 15-18).

---

## Work Assignment: You vs Claude Code

### Claude Code Should Do (Mechanical):
✅ **Phase 2A: Business Logic Implementation**
- All TypeScript classes from API spec
- Strict adherence to interfaces
- Unit test scaffolding
- No strategic decisions needed

**Why**: The API documentation is comprehensive. This is "follow the blueprint" work.

### You Should Do (Strategic):
✅ **Phase 2B: API Enhancement**
- Endpoint design decisions (REST vs WebSocket)
- Next.js integration patterns
- Caching strategies
- Performance trade-offs

✅ **Initial Visualization Planning**
- Choose rendering approach (simple vs complex)
- Design particle layout algorithm
- Plan camera interaction patterns

**Why**: These require taste, trade-offs, and understanding of the artistic vision.

### Collaboration (Pair Programming):
✅ **Phase 2C: Visualization Implementation**
- You: Design and architecture decisions
- Claude Code: Mechanical Three.js implementation
- You: Review and refinement

**Why**: Visualization is both technical and artistic - needs both skills.

---

## Next Immediate Steps

### Step 1: Merge Documentation (Now)
```bash
git checkout feature/api-documentation
git push origin feature/api-documentation
# Create PR and merge to main
```

### Step 2: Create Development Branch
```bash
git checkout main
git pull
git checkout -b develop
git push -u origin develop
```

### Step 3: Start Business Logic Branch
```bash
git checkout -b feature/business-logic-layer
git push -u origin feature/business-logic-layer
```

### Step 4: Hand Off to Claude Code
Create a comprehensive prompt for Claude Code:
- Reference: `/docs/MESSAGE-TRAVERSAL-API.md`
- Task: Implement Phase 2A deliverables
- Constraints: Zero visualization concepts
- Testing: Include unit test scaffolding

---

## Risk Assessment

### High Risk Items
1. **Dual-cursor pagination complexity** - Edge cases with empty DB, single message
   - Mitigation: Comprehensive unit tests, start with simulation
2. **Memory leaks** - Previous version had this issue
   - Mitigation: Proper cleanup, WeakMaps, memory monitoring
3. **Three.js performance on mobile** - 400 particles may be too many
   - Mitigation: Adaptive particle count, LOD system
4. **Visualization complexity** - Could become another "god object"
   - Mitigation: Strict separation, small focused classes

### Medium Risk Items
1. **WebSocket vs polling** - Real-time updates strategy unclear
   - Mitigation: Start with polling (simpler), upgrade if needed
2. **Surge mode tuning** - Thresholds may need adjustment
   - Mitigation: Make configurable, test with various loads
3. **Similarity scoring** - May not create interesting clusters
   - Mitigation: Start simple (temporal only), iterate based on results

### Low Risk Items
1. **Type safety** - TypeScript will catch most issues
2. **API contract** - Well-defined interfaces
3. **Database queries** - Indexes already created

---

## Timeline Estimate

**Phase 2A: Business Logic** (Claude Code)
- Implementation: 4-6 hours
- Testing: 2 hours
- **Total: 6-8 hours**

**Phase 2B: API Enhancement** (You)
- Implementation: 1-2 hours
- Testing: 30 minutes
- **Total: 1.5-2.5 hours**

**Phase 2C: Visualization** (Collaboration)
- Planning: 1 hour
- Implementation: 6-8 hours (simple) or 12-16 hours (complex)
- Testing: 2 hours
- Polish: 2-4 hours
- **Total: 11-15 hours (simple) or 17-25 hours (complex)**

**Grand Total: 18.5-25.5 hours (simple) or 24.5-35.5 hours (complex)**

**Recommendation**: Start with simple visualization, iterate if time allows.

**Exhibition Date**: December 19-20, 2025  
**Days Remaining**: ~35 days  
**Comfortable pace**: 1-2 hours per day = Done by early December with time for polish

---

## Success Metrics

### Phase 2A Complete When:
- [ ] All TypeScript compiles without errors
- [ ] Unit tests pass (>80% coverage)
- [ ] Can cycle through messages without visualization
- [ ] No architecture violations (business logic is clean)
- [ ] Documentation updated with actual implementation notes

### Phase 2B Complete When:
- [ ] API endpoints return correct data
- [ ] Health check reports service status
- [ ] Can fetch cluster data from browser
- [ ] Service initializes on server startup
- [ ] Proper error handling and logging

### Phase 2C Complete When:
- [ ] Visualization renders 400 particles
- [ ] Clusters update smoothly (no lag)
- [ ] User can interact (orbit, zoom)
- [ ] Performance: 60fps on desktop, 30fps on mobile
- [ ] New messages appear within 30 seconds
- [ ] Exhibition-ready polish (no debug artifacts)

---

## Decision Required

**Should we start Phase 2A now?**

Options:
1. **Yes, start immediately** - Hand off to Claude Code today
2. **Wait** - You want to review/refine API doc first
3. **Pivot** - Different approach altogether

**My Recommendation**: Start Phase 2A immediately. The API doc is solid, and we can always refine during implementation. The sooner we have working business logic, the sooner we can start visualizing and iterating on the experience.

What do you think?
