# Build Guide

This directory contains the complete executable documentation for building **House of Mourning** from scratch.

## Philosophy

This is a **recipe**, not just documentation. Each stage can be followed step-by-step to rebuild the entire application. If something goes wrong at any stage, you can start over from Stage 0 and rebuild to the failure point quickly.

## Structure

Files are numbered to indicate build order:

- **00-PROJECT-VISION.md** - The north star. Creative brief and requirements.
- **01-** through **99-** - Build stages in order

## How to Use This Guide

### For Building Fresh

1. Start with `00-PROJECT-VISION.md` - Read and approve the vision
2. Follow stages in numerical order
3. Complete all tests in each stage before proceeding
4. Don't skip stages (dependencies matter)

### For Debugging

1. Identify which stage is broken
2. Roll back to previous stage (or start fresh)
3. Follow that stage's instructions exactly
4. Test thoroughly before proceeding

### For Onboarding

Give someone this directory and:
- They understand the creative vision (00)
- They can build each component (01-99)
- They know what "done" looks like (tests in each stage)
- They can rebuild if things break

## Stage Categories

### Track A: Marketing Site (Stages A1-A4)
Foundation site with design system and content

### Track B: Visualization (Stages B1-B10)
The interactive constellation experience

### Track C: Infrastructure (Stages C1-C3)
Submission, moderation, and security

## Key Principles

1. **Test after every stage** - Don't proceed until current stage works
2. **Copy production styling exactly** - Don't innovate on proven aesthetics
3. **Measure, don't guess** - If production oscillates at 7.85s, verify yours does too
4. **One feature at a time** - Horizontal slices, not vertical
5. **Document as you build** - Update stages if you discover better approaches

## Timeline

**Exhibition**: December 19-20, 2025  
**Today**: November 12, 2025  
**Days remaining**: 37

See `00-PROJECT-VISION.md` for detailed timeline breakdown.

## Next Step

Read `00-PROJECT-VISION.md` and approve the creative direction before proceeding to build stages.
