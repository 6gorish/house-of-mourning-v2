# Artist Headshots: Quick Start Guide (Mixed Orientations)

## What's Been Set Up

✅ **Smart Orientation Handling:**
- Component automatically detects portrait, landscape, or square
- Images maintain natural composition (no forced cropping!)
- Display adjusts based on orientation while maintaining visual cohesion

✅ **Directory Structure:**
- `/public/images/artists/headshots/` - Place all processed headshots here

✅ **Components:**
- `ArtistProfile.tsx` - Handles mixed orientations gracefully
- Updated `app/artists/page.tsx` - Displays artists with elegant layout

✅ **Documentation:**
- `MIXED-ORIENTATION-GUIDE.md` - Comprehensive mixed-orientation details
- `ARTISTS-MD-FORMAT-EXAMPLE.md` - How to add image references
- `scripts/process-headshots-v2.js` - Smart batch processor

---

## 🎨 New Approach: Museum Curation

Instead of forcing all images into one rigid size, we use **gallery principles**:
- Consistent maximum dimensions (not fixed dimensions)
- Centered alignment
- Thoughtful spacing
- Subtle visual treatment

**Result:** Professional variation that feels curated, not chaotic.

---

## Image Specifications (Any Orientation!)

**Portrait (Height > Width):**
- Process: Resize longest edge to ~800px
- Display: Max 320px wide × 500px tall

**Landscape (Width > Height):**
- Process: Resize longest edge to ~800px
- Display: Max 320px wide × 400px tall

**Square (Width ≈ Height):**
- Process: Resize to ~600×600
- Display: Max 320px × 320px

**All Orientations:**
- Format: JPG (auto-optimized by Next.js)
- Saturation: Reduced by 20-30%
- File size: <200KB target
- Naming: `firstname-lastname.jpg`

---

## Your Next Steps (3 Options)

### Option 1: Automated Batch Processing (RECOMMENDED)

**Best for:** Any number of images, any orientations, want consistency

1. **Install Sharp:**
   ```bash
   cd /Users/bjameshaskins/Desktop/house-of-mourning-v2
   npm install sharp --save-dev
   ```

2. **Add originals:**
   ```bash
   mkdir original-headshots
   # Copy ALL headshots (any orientation) to this folder
   ```

3. **Run processor:**
   ```bash
   node scripts/process-headshots-v2.js
   ```
   
   The script automatically:
   - Detects orientation (portrait/landscape/square)
   - Resizes appropriately based on orientation
   - Reduces saturation by 25%
   - Optimizes to 85% quality JPG
   - Saves to `/public/images/artists/headshots/`
   - Renames with lowercase-hyphen format

4. **Update artists.md:**
   - Add `**image:** filename.jpg` for each artist
   - See format example below

5. **Test:**
   ```bash
   npm run dev
   # Visit: http://localhost:3001/artists
   ```

---

### Option 2: Manual Web Tool (Simple, No Installation)

**Best for:** 1-5 images, want control over each

1. **Go to:** https://squoosh.app/

2. **For each image:**
   - Upload
   - Resize:
     - **Portrait:** Longest edge to 800px
     - **Landscape:** Longest edge to 800px  
     - **Square:** 600×600
   - **Important:** Keep "maintain aspect ratio" checked!
   - Set MozJPEG quality to 85
   - Optional: Reduce saturation slider by 20-30%
   - Download

3. **Rename:** `firstname-lastname.jpg`

4. **Save to:** `/public/images/artists/headshots/`

5. **Update artists.md** with image references

---

### Option 3: Mac Preview (Native Mac Tool)

**Best for:** Mac users, manual control

1. **For each image:**
   - Open in Preview
   - Tools → Adjust Size
   - Set longest edge to 800px
   - Check "Scale proportionally"
   - Tools → Adjust Color: Reduce saturation
   - File → Export: JPG, 85%
   - Save as `firstname-lastname.jpg`

2. **Move to:** `/public/images/artists/headshots/`

3. **Update artists.md**

---

## Updating artists.md (Same for All Orientations)

**Location:** `/content/artists.md`

Add `**image:**` line after the role/discipline:

```markdown
## Sam Grabowska
*Visual Artist*
**image:** sam-grabowska.jpg

Sam Grabowska (b.1982 San Diego, CA, USA) is a multidisciplinary artist...

---

## Lee Knight
*Visual Artist, Musician*  
**image:** lee-knight.jpg

Lee Knight is a multidisciplinary artist and curator working...

---
```

**Critical Rules:**
1. `**image:**` must be bold (two asterisks each side)
2. Filename must match exactly (case-sensitive, include .jpg)
3. One blank line before bio paragraph
4. If no image, skip the `**image:**` line

---

## Visual Design (Handles All Orientations)

✨ **Smart Display:**
- Portrait images: Display tall and narrow
- Landscape images: Display wide and short
- Square images: Display as perfect square
- All: Centered, with consistent spacing

🎨 **Visual Treatment (All Images):**
- 30% grayscale by default
- Hover effect: Transitions to full color
- Subtle shadow for depth
- Rounded corners

📱 **Responsive:**
- Desktop: Bio left, image right (side-by-side)
- Mobile: Image above bio (stacked)

---

## Testing Checklist

- [ ] All headshots in `/public/images/artists/headshots/`
- [ ] Filenames lowercase with hyphens (e.g., `first-last.jpg`)
- [ ] Mixed orientations processed appropriately
- [ ] File sizes optimized (<200KB each)
- [ ] `artists.md` has `**image:**` references
- [ ] Filenames match exactly (including .jpg)
- [ ] `npm run dev` runs without errors
- [ ] Page displays at http://localhost:3001/artists
- [ ] Portrait images look good (not too wide)
- [ ] Landscape images look good (not too tall)
- [ ] All images have grayscale treatment
- [ ] Hover effects work (grayscale → color)
- [ ] Mobile view looks good

---

## Quick Command Reference

```bash
# Navigate to project
cd /Users/bjameshaskins/Desktop/house-of-mourning-v2

# Install Sharp (for batch processing)
npm install sharp --save-dev

# Create folder for originals
mkdir original-headshots

# Copy images there, then run processor
node scripts/process-headshots-v2.js

# Start dev server
npm run dev

# Clear cache if needed
rm -rf .next && npm run dev
```

---

## Troubleshooting

**Image looks distorted?**
- Make sure you selected "maintain aspect ratio" when resizing
- Don't force crop - let images keep natural proportions

**Landscape image too wide?**
- Should auto-limit to 400px tall
- If not, check browser console for errors
- Try clearing Next.js cache: `rm -rf .next && npm run dev`

**Portrait image too narrow?**
- This is normal for very tall portraits
- Component centers them nicely in the column
- Maintains professional gallery aesthetic

**Mixed orientations look chaotic?**
- Ensure all images have same saturation treatment
- Verify consistent spacing (mb-16 between profiles)
- Check that all images have shadow effect
- Trust the museum curation approach - variation is intentional!

---

## Example Batch Processing Output

```
Found 7 image(s) to process
Processing mixed orientations intelligently...

✓ Sam Grabowska Headshot.jpg
  → sam-grabowska-headshot.jpg [Portrait: 533×800, 142.3 KB]

✓ Lee Knight Photo.png
  → lee-knight-photo.jpg [Landscape: 800×533, 156.8 KB]

✓ Leah Square.jpg
  → leah-square.jpg [Square: 600×600, 98.2 KB]

✓ Processed 7 image(s)

Orientation handling:
  • Portrait images: Scaled to max 800px tall
  • Landscape images: Scaled to max 800px wide
  • Square images: Cropped to 600×600
  • All images: 25% desaturated, 85% quality JPG
```

---

## The Bottom Line

**DON'T force crops.** Let portrait images be portrait, landscape be landscape. The component handles display intelligently, creating a curated gallery aesthetic that respects each photographer's original composition.

This approach is more professional than forcing identical dimensions - it shows thoughtful curation rather than rigid conformity.

---

## Ready to Go!

1. Choose processing method (automated recommended)
2. Process images (any orientation!)
3. Save to `/public/images/artists/headshots/`
4. Update `/content/artists.md` with `**image:**` references
5. Run `npm run dev` → http://localhost:3001/artists
6. Admire your elegant, gallery-quality artist page!

**Questions?** Check:
- `MIXED-ORIENTATION-GUIDE.md` - Detailed orientation handling
- `ARTISTS-MD-FORMAT-EXAMPLE.md` - Markdown format examples
