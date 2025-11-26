# The House of Mourning
## Technical Documentation

**Exhibition**: December 19-20, 2025  
**Location**: Truss House, RiNo Art Park, Denver  
**Produced by**: Two Flaneurs (Lee Knight & VI Gorish)

---

## The Vision

The House of Mourning is an interactive art installation that transforms anonymous grief expressions into a luminous particle constellation. Each message becomes a glowing point of light in a shared cosmos—stationary, witnessed, honored. The system reveals hidden connections between individual experiences of loss through semantic clustering, creating ephemeral constellations that emerge and dissolve like breath.

The work creates a **contemporary, secular recreation of entering a gothic cathedral and lighting a votive candle**. Visitors witness grief not as isolation, but as a constellation of shared humanity.

---

## Aesthetic Philosophy

Every technical decision in this system serves a single purpose: **creating sacred space for contemplation**.

### Core Principles

**Stillness Over Motion**  
Particles remain stationary—votive candles don't move around. They exist as witnessed, honored points of light. Connection lines billow gently like gossamer spider silk, but the particles themselves are anchored, creating a stable field for contemplation.

**Emergence Over Declaration**  
Meaning emerges from the collective. Individual messages are brief and anonymous; the power comes from seeing hundreds coexist, discovering unexpected kinship through semantic resonance. The system reveals connections rather than imposing them.

**Technology as Transparency**  
The technical infrastructure should become invisible. Visitors connect with grief—their own and others'—not with impressive technology. Museum-quality aesthetics require that every detail feels effortless and inevitable.

**Contemplative Restraint**  
The visual equivalent of a moment of silence. No ornamentation for its own sake. Every element has purpose. White space breathes. Typography is precise. Animation serves reflection, never distraction.

### Reference Points

**Visual Inspiration**:
- teamLab's immersive environments (organic, living systems)
- Nonotak's geometric precision with organic flexibility
- James Turrell's light installations (transcendent simplicity)
- Deep sea bioluminescence (natural glow, cosmic depth)

**Design Standards**:
- White cube galleries: Gagosian, David Zwirner (generous space, minimal distraction)
- Museum websites: MoMA, Tate Modern (sophisticated, information-rich without clutter)
- Luxury contemplative brands: Aesop, Byredo, The Row (quality over ornamentation)
- Memorial spaces: Vietnam Veterans Memorial, 9/11 Memorial (dignity, individual + collective presence)

---

## Architecture Overview

The system maintains strict separation between three layers, each with distinct responsibilities and no knowledge of the others' internal workings.

```
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                          │
│  p5.js WEBGL • Particles • Connection Lines • Shaders       │
│  "What the visitor sees"                                     │
└───────────────────────────────────────────────────────────────┘
                              │
                              │ MessageCluster, WorkingSetChange events
                              │
┌─────────────────────────────────────────────────────────────┐
│  BUSINESS LOGIC LAYER                                        │
│  Working Set • Dual Cursors • Clustering • Priority Queue   │
│  "How messages flow through the system"                      │
└───────────────────────────────────────────────────────────────┘
                              │
                              │ SQL queries via Supabase
                              │
┌─────────────────────────────────────────────────────────────┐
│  DATA LAYER                                                  │
│  PostgreSQL • Messages Table • Semantic Embeddings          │
│  "Where grief is stored and retrieved"                       │
└───────────────────────────────────────────────────────────────┘
```

**Why This Matters**: Version 1 of this project failed because layers were entangled. The business logic knew about particle positions; the data layer was queried from rendering code. This made the system impossible to test, debug, or modify. The strict separation is non-negotiable.

---

## Documentation Structure

### [Site Layer](./site/)
Marketing website styling, typography, content management.

| Document | Description |
|----------|-------------|
| [Style Guide](./site/STYLE-GUIDE.md) | Typography, colors, CSS classes, design system |
| [Content Guides](./site/content-guides/) | Artist bios, headshots, content formatting |

### [Data Layer](./data/)
Database schema, storage, semantic encoding.

| Document | Description |
|----------|-------------|
| [Database Schema](./data/DATABASE-SCHEMA.md) | Tables, columns, indexes, RLS policies |
| [Semantic Encoding](./data/SEMANTIC-ENCODING.md) | Anthropic API integration for message embeddings |
| [Configuration Reference](./data/CONFIGURATION.md) | Data layer configuration options |

### [Logic Layer](./logic/)
Message traversal, clustering, priority management.

| Document | Description |
|----------|-------------|
| [Dual-Cursor System](./logic/DUAL-CURSOR-SYSTEM.md) | Working set architecture, pagination, message flow |
| [API Contracts](./logic/API-CONTRACTS.md) | TypeScript interfaces, event contracts |
| [Configuration Reference](./logic/CONFIGURATION.md) | Logic layer configuration options |

### [Presentation Layer](./presentation/)
Visualization, particles, connection lines, shaders.

| Document | Description |
|----------|-------------|
| [Particle System](./presentation/PARTICLE-SYSTEM.md) | Particle rendering, positioning, glow effects |
| [Connection Lines](./presentation/CONNECTION-LINES.md) | Spring physics, catenary curves, gossamer aesthetic |
| [Shader System](./presentation/SHADER-SYSTEM.md) | Cosmic background, foreground layers, breathing |
| [Timing System](./presentation/TIMING-SYSTEM.md) | Message display timing, cluster transitions |
| [Configuration Reference](./presentation/CONFIGURATION.md) | Presentation layer configuration options |

---

## Quick Start for Developers

### Understanding the Flow

1. **User submits grief message** → Stored in database with semantic embedding
2. **Working set initialized** → 300 messages loaded into memory
3. **Cluster selected** → Focus message + semantically similar messages
4. **Presentation renders** → Particles visible, connections drawn
5. **Cycle advances** → Next message becomes focus, working set refreshes
6. **New submissions prioritized** → Appear within 1-3 cluster cycles (20-60 seconds)

### Key Files

```
lib/
├── config/
│   ├── message-pool-config.ts     # Logic layer configuration
│   ├── visualization-config.ts    # Presentation configuration  
│   └── spring-physics-config.ts   # Connection line physics
├── services/
│   ├── message-logic-service.ts   # Main orchestrator
│   ├── message-pool-manager.ts    # Dual-cursor pagination
│   ├── cluster-selector.ts        # Similarity-based clustering
│   └── database-service.ts        # Supabase integration
├── physics/
│   ├── spring-physics-update.ts   # Connection line animation
│   └── spring-physics-utils.ts    # Catenary curve utilities
└── semantic-encoding.ts           # Anthropic API integration

app/
└── installation/
    └── page.tsx                   # Main visualization (p5.js)
```

### Configuration Priority

When tuning the system, changes propagate from configuration files without code modifications:

1. **Environment Variables** → Override defaults for deployment
2. **Config Files** → Define defaults and validation ranges
3. **Code** → Consumes configuration, never hardcodes values

---

## How Technical Decisions Support the Vision

Throughout this documentation, you'll see explanations of *why* specific implementations were chosen. Every significant decision connects back to the aesthetic philosophy:

| Technical Choice | Aesthetic Purpose |
|-----------------|-------------------|
| Stationary particles | Votive candles don't move; stillness invites contemplation |
| Catenary curves for connection lines | Natural hanging curves feel organic, not engineered |
| Spring physics with high damping | Slow, gentle motion—the system breathes, doesn't jitter |
| Semantic clustering | Reveals hidden kinship between isolated grief experiences |
| 20-second cluster duration | Contemplative pacing—time to read, absorb, reflect |
| Priority queue for new submissions | User's contribution appears quickly, honoring their participation |
| Working set architecture | Bounded memory ensures stability during 8+ hour exhibition days |

---

## For Different Audiences

**Developers maintaining the code**: Start with the [Logic Layer](./logic/) documentation to understand message flow, then [Presentation Layer](./presentation/) for visualization details. Configuration references in each section explain tunable parameters.

**Artists and collaborators**: The [Style Guide](./site/STYLE-GUIDE.md) explains the visual language. The Aesthetic Philosophy section above articulates the creative vision that technical decisions serve.

**Grant reviewers and funders**: This architecture overview demonstrates technical sophistication while the Aesthetic Philosophy section shows how technology serves artistic vision. The [Semantic Encoding](./data/SEMANTIC-ENCODING.md) document explains our innovative use of AI for clustering grief expressions.

---

## Contact

**Lee Knight** (Producer/Curator): lee@twoflaneurs.com  
**VI Gorish** (Technical Development): vig@twoflaneurs.com

---

*Documentation last updated: November 2025*
