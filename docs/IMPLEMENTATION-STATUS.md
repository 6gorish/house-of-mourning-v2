# Working Set Architecture - Implementation Status
**Date:** November 15, 2025  
**Current Step:** Step 1 Verification

---

## Implementation Plan (4 Steps)

### ✅ Step 1: MessagePoolManager (IMPLEMENTATION COMPLETE - TESTING NEEDED)

**Changes Made:**
- ✅ Added `BatchResult` interface export
- ✅ Changed `getNextBatch()` return type from `GriefMessage[]` to `BatchResult`
- ✅ Implemented simplified three-stage allocation:
  - Stage 1: Drain in-memory priority queue
  - Stage 2: Check database for NEW messages above watermark
  - Stage 3: Fill remainder from historical cursor
- ✅ Track `priorityIds` array for messages from priority sources
- ✅ Updated all console logs

**What We're Testing:**
Location: `/Users/bjameshaskins/Desktop/house-of-mourning-v2/tests/services/message-pool-manager.test.ts`

Key tests:
- `should fetch historical messages in normal mode`
- `should drain priority queue first with simplified allocation`
- `should recycle historical cursor when exhausted`
- `should add message to priority queue`
- All tests updated to expect `BatchResult` type

**Action Required:**
```bash
cd /Users/bjameshaskins/Desktop/house-of-mourning-v2
npm test -- tests/services/message-pool-manager.test.ts
```

**Success Criteria:**
- All MessagePoolManager unit tests PASS
- No type errors
- BatchResult properly destructured in tests

---

### ⏳ Step 2: ClusterSelector (NOT STARTED)

**Required Changes:**
- [ ] Add `priorityIds: Set<string>` parameter to `selectCluster()`
- [ ] Implement first-class preference logic in `selectFocus()`
- [ ] Ensure previous focus always in `related` array
- [ ] Require first-class message for `next` if any available
- [ ] Update all method signatures

**Files to Modify:**
- `/lib/services/cluster-selector.ts`
- `/tests/services/cluster-selector.test.ts`

**Success Criteria:**
- All ClusterSelector unit tests PASS
- First-class messages preferred in selection
- Previous focus guaranteed in related messages

---

### ⏳ Step 3: MessageLogicService (NOT STARTED)

**Current State:**
- ⚠️ Handles `BatchResult` from PoolManager (compatibility with Step 1)
- ❌ Still fetching FRESH batches each cluster (line 143)
- ❌ NO persistent working set array
- ❌ NO priorityMessageIds Set
- ❌ NO onWorkingSetChange callback

**Required Changes:**
- [ ] Add `private workingSet: GriefMessage[] = []`
- [ ] Add `private priorityMessageIds: Set<string> = new Set()`
- [ ] Modify `initialize()` to load initial working set
- [ ] Completely rewrite `getNextCluster()`:
  - [ ] Select FROM working set (not database)
  - [ ] Calculate outgoing messages
  - [ ] Remove from working set
  - [ ] Replenish with replacements
  - [ ] Add `onWorkingSetChange` callback
  - [ ] Track first-class messages
  - [ ] Remove featured messages from priority tracking
- [ ] Update all tests

**Files to Modify:**
- `/lib/services/message-logic-service.ts`
- `/tests/services/message-logic-service.test.ts`
- `/tests/integration/critical-behaviors.test.ts`

**Success Criteria:**
- All MessageLogicService unit tests PASS
- All integration tests PASS
- Working set stays fixed size (400)
- onWorkingSetChange callback fires correctly

---

### ⏳ Step 4: Diagnostic Test (NOT STARTED)

**Test Goal:**
Verify >90% traversal coverage before recycling

**Test File:**
`/tests/integration/critical-behaviors.test.ts`

**Specific Test:**
```typescript
it('should see >90% of messages before recycling', async () => {
  const totalCount = await service.getTotalMessageCount()
  const seenIds = new Set<string>()
  
  for (let i = 0; i < 1000; i++) {
    const cluster = await service.getNextCluster()
    
    if (seenIds.has(cluster.focus.id)) {
      break  // Recycling detected
    }
    
    seenIds.add(cluster.focus.id)
  }
  
  const coverage = (seenIds.size / totalCount) * 100
  expect(coverage).toBeGreaterThan(90)
})
```

**Expected Results:**
- BEFORE fix: ~10.1% coverage (13 unique IDs)
- AFTER fix: >90% coverage (2200+ unique IDs from 2454 total)

**Success Criteria:**
- Diagnostic test PASSES with >90% coverage
- Proves working set architecture works correctly

---

## Current Status Summary

**Completed:**
- ✅ Architecture designed (handoff document)
- ✅ Documentation updated (dev journal, API docs)
- ✅ Step 1 implementation (MessagePoolManager)

**Immediate Next Action:**
**RUN STEP 1 TESTS** to verify MessagePoolManager works correctly

**Command:**
```bash
cd /Users/bjameshaskins/Desktop/house-of-mourning-v2
npm test -- tests/services/message-pool-manager.test.ts
```

**If Step 1 tests PASS:**
- Move to Step 2 (ClusterSelector)

**If Step 1 tests FAIL:**
- Debug and fix MessagePoolManager
- Re-run tests
- Do NOT proceed until all tests pass

---

## Why This Matters

We're building **bomb-proof business logic** before touching presentation layer.

Each step builds on the previous:
1. MessagePoolManager provides messages with priority tracking
2. ClusterSelector uses priority tracking to select clusters
3. MessageLogicService orchestrates working set management
4. Diagnostic test proves the whole system works

**Skipping verification = building on shaky foundation = trainwreck**

---

**Last Updated:** November 15, 2025  
**Next Checkpoint:** Step 1 Tests Verification
