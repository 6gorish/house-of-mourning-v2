# Artist Headshots: Quick Start Guide

## Image Specifications

**Any Orientation (Portrait, Landscape, Square):**
- Process: Resize longest edge to ~800px
- Format: JPG (auto-optimized by Next.js)
- Saturation: Reduced by 20-30%
- File size: <200KB target
- Naming: `firstname-lastname.jpg`

---

## Quick Processing Methods

### Option 1: Squoosh.app (Web-based, Free)

1. Upload image to https://squoosh.app
2. Resize longest edge to 800px (maintain aspect ratio)
3. Select MozJPEG, quality 85
4. Optional: Reduce saturation
5. Download and rename to `firstname-lastname.jpg`

### Option 2: Mac Preview

1. Open in Preview
2. Tools → Adjust Size: Set longest edge to 800px, check "Scale proportionally"
3. Tools → Adjust Color: Reduce saturation
4. File → Export: JPG, 85% quality
5. Save as `firstname-lastname.jpg`

---

## Save Location

Place all processed images in:
```
/public/images/artists/headshots/
```

---

## Update artists.md

Add `**image:**` line after the role/discipline:

```markdown
## Sam Grabowska
*Visual Artist*
**image:** sam-grabowska.jpg

Sam Grabowska (b.1982 San Diego, CA, USA) is a multidisciplinary artist...

---
```

**Critical Rules:**
1. `**image:**` must be bold (two asterisks each side)
2. Filename must match exactly (case-sensitive, include .jpg)
3. One blank line before bio paragraph
4. If no image, skip the `**image:**` line

---

## Testing Checklist

- [ ] All headshots in `/public/images/artists/headshots/`
- [ ] Filenames lowercase with hyphens
- [ ] File sizes optimized (<200KB each)
- [ ] `artists.md` has `**image:**` references
- [ ] Filenames match exactly (including .jpg)
- [ ] `npm run dev` runs without errors
- [ ] Page displays at http://localhost:3001/artists
- [ ] All images have grayscale treatment
- [ ] Hover effects work (grayscale → color)
- [ ] Mobile view looks good

---

## Troubleshooting

**Image not appearing?**
- Check filename matches exactly (case-sensitive)
- Verify image is in correct folder
- Clear Next.js cache: `rm -rf .next && npm run dev`

**Image looks distorted?**
- Make sure "maintain aspect ratio" was checked when resizing
- Don't force crop - let images keep natural proportions
