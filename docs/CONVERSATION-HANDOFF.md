# Conversation Handoff Document
**Date**: November 14, 2025  
**Project**: The House of Mourning - Interactive Installation  
**Current Phase**: Phase 2A (Business Logic Layer) - IN PROGRESS

---

## Project Overview

**The House of Mourning** is a grant-funded art exhibition (Dec 19-20, 2025) exploring grief through contemporary sacred aesthetics. The interactive installation transforms grief messages into a constellation visualization showing the interconnectedness of loss.

**Key People:**
- James (VI Gorish) - Co-founder, Two Flaneurs, leading development
- Lee Knight - Partner, co-founder

**Tech Stack:**
- Next.js 16 + React 19
- Supabase (PostgreSQL database)
- Three.js (visualization - not yet implemented)
- Tailwind CSS
- Vercel (deployment)

---

## Current Project State

### ✅ Completed Work

#### Track A: Marketing Website (COMPLETE - DEPLOYED)
- Homepage with shader background
- About, Artists, Event, Participate pages
- Mobile-responsive navigation
- Page transitions (Framer Motion)
- Deployed to Vercel
- URL: https://thehouseofmourning.com (or similar)

#### Database Layer (COMPLETE)
- Supabase project configured
- `messages` table with full schema:
  - id, content, created_at, approved, deleted_at
  - session_id, ip_hash, user_agent (privacy-preserving)
  - semantic_tags (future feature)
  - moderator_notes, flagged (moderation)
- Indexes created for dual-cursor pagination:
  - `idx_messages_created_at_desc` (historical cursor)
  - `idx_messages_id_asc` (new message polling)
  - `idx_messages_id_lookup` (working set queries)
- Seed data: 597 realistic grief messages loaded

#### API Layer (BASIC - COMPLETE)
- `POST /api/messages` - Submit new message with rate limiting
- `GET /api/messages` - Fetch messages (basic offset pagination)
- Session tracking and IP hashing for privacy

#### Documentation (COMPLETE)
**Critical Documents Created:**
1. `/docs/API-REQUIREMENTS-PROMPT.md` - Requirements framework
2. `/docs/MESSAGE-TRAVERSAL-API.md` - Comprehensive API specification (62KB)
3. `/docs/IMPLEMENTATION-PLAN.md` - Phase breakdown and timeline
4. `/docs/CLAUDE-CODE-PROMPT-PHASE-2A.md` - Implementation instructions
5. `/docs/PHASE-2A-PROGRESS.md` - Current progress tracker

### 🚧 In Progress: Phase 2A - Business Logic Layer

**Assigned to**: Claude Code  
**Status**: 50% complete (foundation done, core services in progress)  
**Started**: November 14, 2025

#### What Claude Code Completed (✅ 4/8 deliverables)

1. **Type Definitions** (`types/grief-messages.ts`)
   - GriefMessage interface (normalized from Database.Message)
   - MessageCluster interface (focus + related + next)
   - WorkingSetChange interface (particle sync)
   - PoolStats interface (monitoring)
   - HealthCheck interface (service status)
   - MessagePoolConfig interface (configuration)
   - All with comprehensive JSDoc comments

2. **Configuration System** (`lib/config/message-pool-config.ts`)
   - DEFAULT_CONFIG with all tunable parameters
   - loadConfig() with environment variable support
   - Validation for all values
   - Memory-adaptive queue sizing

3. **Database Service** (`lib/services/database-service.ts`)
   - fetchBatchWithCursor() - Dual-cursor pagination
   - fetchNewMessagesAboveWatermark() - New message polling
   - getMaxMessageId() - Cursor initialization
   - addMessage() - New submission handling
   - Exponential backoff retry logic
   - Supabase client integration

4. **Similarity Scoring** (`lib/utils/similarity-scoring.ts`)
   - calculateSimilarity() - Weighted scoring
   - calculateTemporalProximity() - Time-based similarity
   - calculateLengthSimilarity() - Length-based similarity
   - Ready for future semantic similarity

#### What Claude Code is Working On (❌ 4/8 deliverables)

5. **Message Pool Manager** (`lib/services/message-pool-manager.ts`)
   - Dual-cursor pagination (historical DESC + new watermark)
   - Priority queue with surge mode
   - Memory-adaptive sizing
   - Polling timer for new messages
   - Edge case handling (empty DB, single message, cursor exhaustion)

6. **Cluster Selector** (`lib/services/cluster-selector.ts`)
   - selectRelatedMessages() - Top N by similarity
   - selectNextMessage() - Sequential or best candidate
   - CRITICAL: Must include previous focus for traversal continuity

7. **Message Logic Service** (`lib/services/message-logic-service.ts`)
   - Main coordinator tying everything together
   - initialize(), start(), stop(), cleanup()
   - setWorkingSet() - Sync with particle universe
   - cycleFromWorkingSet() - Core traversal logic
   - Callback system (onClusterUpdate, onWorkingSetChange)
   - getPoolStats(), getHealth() - Monitoring

8. **Unit Tests** (`tests/services/*.test.ts`)
   - Mock database service
   - Tests for Pool Manager, Cluster Selector, Logic Service
   - Edge case coverage
   - Vitest configuration

**Estimated completion**: 8-12 more hours

### ❌ Not Started: Phase 2B & 2C

**Phase 2B: API Enhancement** (Strategic work for James + Claude)
- Enhanced API endpoints (cluster endpoint, health check, stats)
- Service initialization in Next.js
- WebSocket or polling strategy decision
- Estimated: 1.5-2.5 hours

**Phase 2C: Visualization Layer** (Collaboration)
- Three.js scene setup
- Particle system (400 message nodes)
- Connection rendering (focus → related)
- Camera controls
- Integration with MessageLogicService
- Estimated: 11-25 hours (depending on complexity)

---

## Critical Architecture Decisions

### Layer Separation (MUST ENFORCE)

```
┌─────────────────────────────────────────┐
│  PRESENTATION LAYER                     │
│  (Three.js, particles, rendering)       │
│  CONSUMES: MessageLogicService API      │
└───────────────┬─────────────────────────┘
                │ (TypeScript interfaces)
┌───────────────▼─────────────────────────┐
│  BUSINESS LOGIC LAYER                   │
│  (MessageLogicService, PoolManager)     │
│  NO VISUALIZATION CONCEPTS              │
└───────────────┬─────────────────────────┘
                │ (Supabase client)
┌───────────────▼─────────────────────────┐
│  DATA LAYER (Supabase/PostgreSQL)       │
└─────────────────────────────────────────┘
```

**CRITICAL CONSTRAINT**: Business Logic MUST NOT:
- Import Three.js, p5.js, or rendering frameworks
- Import React components (except type-only)
- Reference: particles, positions, colors, canvas, WebGL
- Know about visualization at all

**Why This Matters**: 
Previous attempt failed due to "god object" anti-pattern (1600-line orchestrator mixing everything). See `/Users/bjameshaskins/Desktop/house-of-mourning-backup/ARCHITECTURE_AUDIT.md` for lessons learned.

### Dual-Cursor Algorithm

**Problem**: How to show new user submissions quickly while maintaining historical balance?

**Solution**: Two independent cursors
1. **Historical Cursor**: Works backwards (DESC) from newest to oldest
2. **New Message Watermark**: Tracks incoming submissions, polls every 5 seconds

**Allocation Strategy**:
- Normal mode: Max 5 new messages per cluster, rest historical
- Surge mode (queue > 100): 70% new, 30% historical (guaranteed minimum)

**See**: `/docs/MESSAGE-TRAVERSAL-API.md` sections on "Dual-Cursor Algorithm" and "Traversal Flow"

### Traversal Continuity

**Critical UX Requirement**: Users must perceive a smooth journey through messages, not random jumps.

**Mechanism**:
- Current cluster identifies "next" message
- Next message becomes focus in next cluster
- Previous focus is kept in related messages for one more cycle
- Creates visual "thread" through message space

**Example**:
```
Cycle 1: Focus=A, Related=[B,C,D...], Next=B
Cycle 2: Focus=B, Related=[A,C,E...], Next=C (A kept for continuity)
Cycle 3: Focus=C, Related=[B,F,G...], Next=F (A can now be removed)
```

---

## Git Branch Structure

```
main (deployed - marketing site)
  └── develop (integration branch - created)
      └── feature/business-logic-layer (current work)
          └── feature/api-enhancement (future Phase 2B)
              └── feature/visualization-layer (future Phase 2C)
```

**Current Branch**: `feature/business-logic-layer`  
**Working Directory**: `/Users/bjameshaskins/Desktop/house-of-mourning-v2`

**Merged to main**: API documentation (safe, documentation-only)

---

## Key Configuration

### Environment Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Pool Configuration (optional - defaults in code)
POOL_WORKING_SET_SIZE=400
POOL_CLUSTER_SIZE=20
POOL_CLUSTER_DURATION=8000
POOL_POLLING_INTERVAL=5000
```

### Default Config Values
- Working set size: 400 messages (particle universe)
- Cluster size: 20 related messages
- Cluster duration: 8 seconds
- Polling interval: 5 seconds
- Surge threshold: 100 queued messages
- Surge mode allocation: 70% new, 30% historical

---

## Important Context & Decisions

### Why We Restarted (v2)

Previous version (`house-of-mourning-backup`) suffered from:
- God object orchestrator (1600+ lines)
- Config flags ignored (hardcoded `enabled: true`)
- Memory leaks (p5.js color objects)
- Duplicate rendering systems ("phantom renderer")
- Visualization and business logic mixed

**v2 Strategy**: Clean separation, proper architecture, comprehensive docs before implementation.

### User Experience Priorities

1. **New messages appear quickly** - Target < 30 seconds from submission to visibility
2. **Traversal never stops** - Even with 0 messages (show placeholder)
3. **Historical balance** - Minimum 30% historical messages, always
4. **Smooth continuity** - No jarring jumps between clusters
5. **Emotional impact** - Messages feel connected, flow feels organic

### Exhibition Requirements

- **Dates**: December 19-20, 2025 (35 days away)
- **Venue**: Truss House, RiNo Art Park, Denver
- **Runtime**: 48 hours continuous (opening night + next day)
- **Traffic**: 0-10,000 concurrent viewers, 0-500 messages/minute
- **Uptime**: 99.9% target (no manual intervention)

### Performance Targets

| Metric | Target (p95) | Max Acceptable |
|--------|--------------|----------------|
| API response | < 100ms | 500ms |
| New message visibility | < 30s | 60s |
| Memory (desktop) | < 500MB | 1GB |
| Memory (mobile) | < 200MB | 500MB |
| Frame rate | 60fps | 30fps |

---

## Next Immediate Steps

### 1. Wait for Claude Code to Finish Phase 2A

Claude Code should deliver:
- Message Pool Manager
- Cluster Selector  
- Message Logic Service
- Unit Tests

**Verification Commands**:
```bash
# TypeScript compilation check
npx tsc --noEmit

# Run tests
npm test

# Manual test (if test script created)
npx tsx test-business-logic.ts
```

**Expected behavior**:
- Service initializes without errors
- Loads 400 messages into working set
- Cycles through clusters every 8 seconds
- Focus changes each cycle
- Working set changes emit events
- No crashes, memory stable

### 2. Human Review of Phase 2A

**Architecture Checklist**:
- [ ] No visualization concepts in business logic
- [ ] No Three.js/React imports
- [ ] All interfaces match API spec exactly
- [ ] Config system works with env vars
- [ ] Dual cursors implemented correctly
- [ ] Traversal continuity maintained (next → focus, previous kept)
- [ ] Edge cases handled (empty DB, single message, exhaustion)
- [ ] Memory cleanup in cleanup() methods
- [ ] Proper error handling with try/catch
- [ ] Unit tests pass with good coverage

**If Issues Found**: Work with Claude Code to fix before proceeding.

### 3. Commit Phase 2A

```bash
git add .
git commit -m "Complete Phase 2A: Business Logic Layer

- Implemented MessagePoolManager with dual-cursor pagination
- Implemented ClusterSelector with similarity scoring
- Implemented MessageLogicService coordinator
- Added comprehensive unit tests
- All services follow strict layer separation
- Zero visualization concepts in business logic"

git push origin feature/business-logic-layer
```

### 4. Start Phase 2B: API Enhancement

**Strategic work** (James + Claude together):
- Design enhanced API endpoints
- Choose REST vs WebSocket strategy
- Set up service initialization in Next.js
- Implement health check and stats endpoints
- Test end-to-end data flow

**Time**: 1.5-2.5 hours

### 5. Plan Phase 2C: Visualization

**Decision needed**: Simple vs Complex visualization
- **Simple**: Stationary particles, basic connections (11-15 hours)
- **Complex**: Fluid dynamics, organic movement (17-25 hours)

**Recommendation**: Start simple, iterate if time allows.

---

## Important Files & Locations

### Documentation (All in `/docs`)
- `MESSAGE-TRAVERSAL-API.md` - **PRIMARY SPEC** (62KB, comprehensive)
- `IMPLEMENTATION-PLAN.md` - Phase breakdown and estimates
- `CLAUDE-CODE-PROMPT-PHASE-2A.md` - Implementation instructions
- `PHASE-2A-PROGRESS.md` - Current status tracker
- `CONVERSATION-HANDOFF.md` - This file

### Project Structure
```
house-of-mourning-v2/
├── app/
│   ├── api/messages/route.ts (POST/GET endpoints)
│   ├── page.tsx (homepage)
│   └── [other pages]
├── components/
│   ├── grief/GriefSubmissionForm.tsx
│   └── [nav, transitions, etc]
├── lib/
│   ├── config/message-pool-config.ts ✅
│   ├── services/
│   │   ├── database-service.ts ✅
│   │   ├── message-pool-manager.ts 🚧
│   │   ├── cluster-selector.ts 🚧
│   │   └── message-logic-service.ts 🚧
│   ├── supabase/ (client, server)
│   └── utils/similarity-scoring.ts ✅
├── types/
│   ├── database.ts (Supabase schema)
│   └── grief-messages.ts ✅
├── supabase/
│   └── seeds/001_seed_messages.sql (597 messages)
└── tests/
    └── services/ 🚧
```

### Reference Files (Backup)
- `/Users/bjameshaskins/Desktop/house-of-mourning-backup/ARCHITECTURE_AUDIT.md` - Lessons from previous failure
- `/Users/bjameshaskins/Desktop/house-of-mourning-backup/src/lib/services/` - Old implementation (reference only, DO NOT COPY)

### Project Files (Read-Only)
- `/mnt/project/2025_0921_updated_complete_breakdown.md` - Original epic/story breakdown
- `/mnt/project/2025_1112_HouseOfMourning_WebCopy_EDITED.md` - Website content
- `/mnt/project/devdirective.pdf` - Not yet reviewed

---

## Common Questions & Answers

### Q: Why dual-cursor pagination instead of simple offset?
**A**: Performance at scale. With 10,000+ messages, offset pagination becomes slow (database must scan N rows). Cursor-based is O(1) with proper indexes. Plus, the dual-cursor system elegantly solves the "new message priority" problem.

### Q: Why separate business logic from visualization?
**A**: Previous version failed due to mixing concerns. This separation allows:
- Testing business logic without UI
- Swapping visualization frameworks (p5.js → Three.js)
- Parallel development (logic + viz)
- Clear responsibilities

### Q: What if Claude Code can't finish?
**A**: James (you) + Claude (chat) can:
1. Review what Claude Code completed
2. Implement remaining services together (pair programming style)
3. Claude provides code, James reviews and commits
Estimated time: Same 8-12 hours, just different approach.

### Q: What if we run out of time before exhibition?
**A**: Fallback plan:
1. Deploy marketing site (already done ✅)
2. Show static visualization (pre-rendered)
3. Accept submissions but don't show real-time
4. Complete interactive version post-exhibition for future showings

### Q: How do we know business logic is working?
**A**: Test script (`test-business-logic.ts`) should show:
- Service initializes
- Clusters cycle every 8 seconds
- Focus changes each time
- Related messages update
- Working set syncs
- No errors for 60+ seconds

---

## Memory & Context for Next Conversation

**User Info**:
- Name: James (VI Gorish)
- Co-founder: Two Flaneurs (with Lee Knight)
- Background: Music + technology + visual media
- Working style: Methodical, staged development, detailed documentation
- Preference: Asks for manageable chunks, not too much at once
- Project management: Uses JIRA, maintains dev journal

**Collaboration Pattern**:
- Claude (chat) for strategic decisions, architecture, content
- Claude Code for mechanical implementation tasks
- James reviews and provides artistic/UX direction

**Key Learnings from This Session**:
1. Comprehensive documentation before implementation = success
2. Architecture constraints MUST be enforced (no viz in business logic)
3. Breaking work into phases prevents overwhelm
4. Git branching strategy keeps main stable
5. Test scripts validate without visualization

**Current Risk Items**:
1. Time pressure (35 days to exhibition)
2. Visualization complexity (could balloon to 25+ hours)
3. Claude Code completing remaining 50% of Phase 2A
4. Integration testing (will business logic + viz work together?)
5. Performance on mobile devices

**Mitigation Strategies**:
1. Comfortable 1-2 hours/day pace = early Dec completion
2. Start with simple viz, iterate if time
3. Clear handoff if Claude Code gets stuck
4. Test early and often
5. Adaptive particle count based on device

---

## To Resume This Work

In a new conversation with Claude (chat), say:

```
Please read the handoff document to understand the current state of the project:
/Users/bjameshaskins/Desktop/house-of-mourning-v2/docs/CONVERSATION-HANDOFF.md

Current status: Claude Code is implementing Phase 2A (Business Logic Layer).
I'll let you know when Claude Code finishes, then we can review together.

For now, just acknowledge you've read the handoff and are ready to help.
```

In a new conversation with Claude Code, say:

```
Resume Phase 2A implementation. Read the current status:
/Users/bjameshaskins/Desktop/house-of-mourning-v2/docs/PHASE-2A-PROGRESS.md

And the implementation spec:
/Users/bjameshaskins/Desktop/house-of-mourning-v2/docs/CLAUDE-CODE-PROMPT-PHASE-2A.md

Continue with the remaining deliverables:
- Message Pool Manager
- Cluster Selector
- Message Logic Service  
- Unit Tests

Work in: /Users/bjameshaskins/Desktop/house-of-mourning-v2
Branch: feature/business-logic-layer
```

---

## Success Criteria for Phase 2A

This phase is complete when:
- [x] Types defined and documented
- [x] Config system implemented
- [x] Database service working
- [x] Similarity scoring implemented
- [ ] Message Pool Manager implemented and tested
- [ ] Cluster Selector implemented and tested
- [ ] Message Logic Service implemented and tested
- [ ] Unit tests pass with >80% coverage
- [ ] TypeScript compiles without errors
- [ ] Test script runs successfully
- [ ] No architecture violations
- [ ] Memory stable over 5+ minutes
- [ ] Human review approves quality

---

**End of Handoff Document**

Good luck with Phase 2A! The foundation is solid. The remaining work is well-specified in the documentation. Trust the architecture, enforce the constraints, and iterate based on testing.

🏛️ The House of Mourning awaits its constellation of grief.
