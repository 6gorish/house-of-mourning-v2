# Artist Headshots: Mixed Orientation Guide

## The Problem: Different Image Orientations

Artist headshots come in all shapes: portrait, landscape, square. Forcing everything into one aspect ratio can destroy composition and crop faces awkwardly. But mixing orientations randomly creates visual chaos.

## The Solution: Museum Curation Principles

Like a professional gallery displaying works of different sizes, we use:
- **Consistent maximum dimensions** (not fixed dimensions)
- **Centered alignment** 
- **Generous negative space**
- **Subtle visual treatment** (grayscale, shadow)
- **Thoughtful spacing**

The result: Intentional variation that feels curated, not chaotic.

---

## Updated Image Specifications

### Flexible Dimensions (NEW)

**Portrait Images:**
- Maximum width: 320px
- Maximum height: 500px
- Recommended: 600-800px tall for quality

**Landscape Images:**
- Maximum width: 320px (will size proportionally)
- Maximum height: 400px
- Recommended: 600-800px wide for quality

**Square Images:**
- Treated as portrait
- Maximum: 320px × 320px

### Technical Specs (All Orientations)

- **File Format:** JPG (Next.js auto-optimizes to WebP)
- **Color Treatment:** 30% desaturation (automatic)
- **File Size:** Aim for <200KB before Next.js optimization
- **Naming:** `firstname-lastname.jpg` (lowercase, hyphens)

---

## Processing Guidelines by Orientation

### Portrait Images (Height > Width)

**Recommended Approach:**
1. Resize longer edge to 800px, maintain aspect ratio
2. Reduce saturation by 20-30%
3. Export as JPG, quality 85%

**Example:** 
- Original: 2400×3600 (2:3 ratio)
- Processed: 533×800 (maintains 2:3 ratio)
- Display: Scales to max 320px wide

### Landscape Images (Width > Height)

**Recommended Approach:**
1. Resize longer edge to 800px, maintain aspect ratio
2. Reduce saturation by 20-30%
3. Export as JPG, quality 85%

**Example:**
- Original: 3600×2400 (3:2 ratio)
- Processed: 800×533 (maintains 3:2 ratio)
- Display: Scales to max 400px tall

### Square Images (Width ≈ Height)

**Recommended Approach:**
1. Resize to 600×600
2. Reduce saturation by 20-30%
3. Export as JPG, quality 85%

**Example:**
- Original: 2400×2400
- Processed: 600×600
- Display: Scales to max 320px

---

## Quick Processing Methods

### Option 1: Squoosh.app (Web-based, Free)

1. Upload image to https://squoosh.app
2. Resize:
   - **Portrait:** Longest edge to 800px
   - **Landscape:** Longest edge to 800px
   - **Square:** 600×600
3. Maintain aspect ratio (don't force crop)
4. Select MozJPEG, quality 85
5. Optional: Reduce saturation
6. Download and rename to `firstname-lastname.jpg`

### Option 2: Updated Batch Script (Handles All Orientations)

The batch processing script automatically detects orientation and processes accordingly:

```bash
# Install Sharp if not already installed
npm install sharp --save-dev

# Place originals in this folder
mkdir original-headshots

# Copy all images (any orientation) to original-headshots/

# Run processor - it handles orientation automatically
node scripts/process-headshots-v2.js
```

### Option 3: Mac Preview (Manual)

**For any orientation:**
1. Open in Preview
2. Tools → Adjust Size
   - Set longest edge to 800px
   - Check "Scale proportionally"
3. Tools → Adjust Color: Reduce saturation
4. File → Export: JPG, 85% quality
5. Save as `firstname-lastname.jpg`

---

## Updated Batch Processing Script

The new script intelligently handles all orientations:

```javascript
// scripts/process-headshots-v2.js

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.join(__dirname, '..', 'original-headshots');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'artists', 'headshots');

async function processImage(filename) {
  const inputPath = path.join(INPUT_DIR, filename);
  const outputFilename = path.basename(filename, path.extname(filename))
    .toLowerCase()
    .replace(/\s+/g, '-') + '.jpg';
  const outputPath = path.join(OUTPUT_DIR, outputFilename);

  const metadata = await sharp(inputPath).metadata();
  const { width, height } = metadata;
  
  // Determine orientation
  const isPortrait = height > width;
  const isSquare = Math.abs(height - width) < 50;
  
  let resizeOptions;
  
  if (isPortrait) {
    // Portrait: resize to max 800px tall
    resizeOptions = { height: 800, withoutEnlargement: true };
  } else if (isSquare) {
    // Square: resize to 600x600
    resizeOptions = { width: 600, height: 600, fit: 'cover' };
  } else {
    // Landscape: resize to max 800px wide
    resizeOptions = { width: 800, withoutEnlargement: true };
  }

  await sharp(inputPath)
    .resize(resizeOptions)
    .modulate({ saturation: 0.75 }) // 25% desaturation
    .jpeg({ quality: 85, progressive: true })
    .toFile(outputPath);

  const orientation = isPortrait ? 'Portrait' : (isSquare ? 'Square' : 'Landscape');
  console.log(`✓ ${filename} → ${outputFilename} [${orientation}]`);
}
```

---

## Visual Harmony Principles

Even with mixed orientations, the page maintains elegance through:

1. **Consistent Column Width:** Image column is always 320px
2. **Centered Alignment:** All images centered in their container
3. **Max Dimensions:** Portrait max 320w×500h, Landscape max 320w×400h
4. **Visual Treatment:** All images get same grayscale + hover effect
5. **Spacing:** Generous margins between artist profiles
6. **Typography:** Consistent font treatment across all artists

---

## artists.md Format (Unchanged)

The markdown format stays the same regardless of orientation:

```markdown
## Sam Grabowska
*Visual Artist*
**image:** sam-grabowska.jpg

Bio text here...

---

## Lee Knight
*Visual Artist, Musician*
**image:** lee-knight.jpg

Bio text here...
```

---

## Testing Different Orientations

When testing, verify:

- [ ] Portrait images display at appropriate width (not too wide)
- [ ] Landscape images display at appropriate height (not too tall)
- [ ] Square images display nicely
- [ ] All images are centered in their column
- [ ] Grayscale effect applies to all
- [ ] Hover effect works on all
- [ ] No image appears distorted or stretched
- [ ] Page maintains visual cohesion despite mixed orientations

---

## Real-World Example Layout

```
┌─────────────────────────────────────────────────────────┐
│  Artist Name (Portrait Image)                           │
│  ┌─────────────┐                    ┌──────┐           │
│  │             │  Bio text...       │      │           │
│  │             │                    │      │           │
│  │   Bio       │                    │ Port │           │
│  │   Text      │                    │ rait │           │
│  │             │                    │      │           │
│  └─────────────┘                    │      │           │
│                                     └──────┘           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Artist Name (Landscape Image)                          │
│  ┌─────────────┐                 ┌──────────┐          │
│  │             │  Bio text...    │Landscape │          │
│  │   Bio       │                 └──────────┘          │
│  │   Text      │                                        │
│  │             │                                        │
│  └─────────────┘                                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Artist Name (Square Image)                             │
│  ┌─────────────┐                    ┌─────┐            │
│  │             │  Bio text...       │     │            │
│  │   Bio       │                    │ Sqr │            │
│  │   Text      │                    │     │            │
│  │             │                    └─────┘            │
│  └─────────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

The varied image sizes create visual interest while maintaining professional presentation.

---

## Key Takeaway

**Don't force crops.** Let images maintain their natural composition. The component automatically handles display based on orientation, creating a curated gallery aesthetic rather than a rigid grid.

This approach is actually more professional than forcing everything into identical dimensions - it respects the photographer's original composition while maintaining visual cohesion through thoughtful constraints.
