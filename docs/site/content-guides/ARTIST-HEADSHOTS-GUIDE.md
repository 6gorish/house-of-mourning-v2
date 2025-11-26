# Artist Headshots Implementation Guide

## Overview
This guide walks through adding professional artist headshots to The House of Mourning website with a high-end gallery aesthetic.

---

## Image Specifications

### Standardized Format
- **Aspect Ratio:** 3:4 portrait (600px × 800px)
- **File Format:** JPG (Next.js will auto-optimize to WebP)
- **Color Treatment:** Subtle desaturation for contemplative aesthetic
- **File Size:** Aim for <200KB before Next.js optimization
- **Naming Convention:** `firstname-lastname.jpg`

### Gallery Aesthetic Guidelines
- Consistent aspect ratio across all headshots
- Subtle grayscale or desaturated treatment
- Clean, minimal presentation
- Professional quality and composition

---

## Step 1: Process & Optimize Images

### Option A: Using Online Tools (Easiest)

**Recommended Tool: Squoosh.app (Free, Web-based)**

1. Go to https://squoosh.app/
2. Upload each headshot
3. Left panel: Resize to 600×800 (or crop to 3:4 ratio first)
4. Right panel: Select "MozJPEG" codec, quality 85
5. Optional: Reduce color saturation by 20-30%
6. Download optimized image
7. Rename to `firstname-lastname.jpg`

### Option B: Using Mac Preview (Built-in)

1. Open image in Preview
2. Tools → Adjust Size: Set width to 600px (height auto to 800px)
3. Tools → Adjust Color: Reduce saturation slightly
4. File → Export: Choose JPG, quality 85%
5. Save to `/public/images/artists/headshots/`

---

## Step 2: Save Images to Correct Location

Place all processed images in:
```
/public/images/artists/headshots/
```

Example filenames:
- `sam-grabowska.jpg`
- `lee-knight.jpg`
- `leah-nieboer.jpg`

---

## Step 3: Update artists.md with Image References

Add an `image:` field to each artist's section in `/content/artists.md`:

### Before:
```markdown
## Sam Grabowska
*Visual Artist*

Sam Grabowska (b.1982 San Diego, CA, USA) is a multidisciplinary artist...
```

### After:
```markdown
## Sam Grabowska
*Visual Artist*
**image:** sam-grabowska.jpg

Sam Grabowska (b.1982 San Diego, CA, USA) is a multidisciplinary artist...
```

**Important:** The `**image:**` line must come immediately after the role/discipline line and before the bio paragraph.

---

## Testing Checklist

- [ ] All images are 600×800 (3:4 ratio)
- [ ] File sizes are optimized (<200KB each)
- [ ] Filenames match markdown references exactly
- [ ] Images display correctly on desktop
- [ ] Images display correctly on mobile
- [ ] Hover effects work smoothly
- [ ] Loading performance is acceptable
- [ ] Grayscale treatment is consistent

---

## Troubleshooting

### Image Not Appearing
- Check filename matches exactly (case-sensitive)
- Verify image is in `/public/images/artists/headshots/`
- Check browser console for 404 errors
- Clear Next.js cache: `rm -rf .next && npm run dev`

### Image Looks Distorted
- Verify source image is 3:4 aspect ratio
- Check object-fit CSS property is set to 'cover'
- Re-crop source image to exactly 600×800
