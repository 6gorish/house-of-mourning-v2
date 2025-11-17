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

**For Batch Processing: Photopea.com (Free Photoshop alternative)**

1. Open https://photopea.com/
2. File > Open: Select all headshots
3. For each image:
   - Image > Canvas Size: Set to 600×800 (or crop to 3:4 ratio)
   - Adjustments > Hue/Saturation: Reduce saturation by -20 to -30
   - File > Export As > JPG (quality 85)
   - Save as `firstname-lastname.jpg`

### Option B: Using Mac Preview (Built-in)

1. Open image in Preview
2. Tools > Adjust Size: Set width to 600px (height auto to 800px)
3. Tools > Adjust Color: Reduce saturation slightly
4. File > Export: Choose JPG, quality 85%
5. Save to `/public/images/artists/headshots/`

### Option C: Automated Batch Processing (Advanced)

If you have ImageMagick installed via Homebrew:

```bash
# Install ImageMagick (if not already installed)
brew install imagemagick

# Navigate to folder with original headshots
cd /path/to/original/headshots

# Batch process all images
for img in *.{jpg,jpeg,png,JPG,JPEG,PNG}; do
  # Resize to 600x800, crop to fit, desaturate by 30%
  magick "$img" \
    -resize 600x800^ \
    -gravity center \
    -extent 600x800 \
    -modulate 100,70,100 \
    -quality 85 \
    "/Users/bjameshaskins/Desktop/house-of-mourning-v2/public/images/artists/headshots/$(echo "$img" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')"
done
```

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
- `jeffrey-pethybridge.jpg`
- `eric-anderson.jpg`
- `valerie-tamplin.jpg`
- `kawaji.jpg`

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

### Complete Example:

```markdown
## Lee Knight
*Visual Artist, Musician*
**image:** lee-knight.jpg

Lee Knight is a multidisciplinary artist and curator working at the intersections of visual art...

www.blackwolfelectric.com
```

**Important:** The `**image:**` line must come immediately after the role/discipline line and before the bio paragraph.

---

## Step 4: Update Artists Page Component

The new component will:
- Parse image references from markdown
- Display headshots in elegant grid layout
- Apply subtle hover effects
- Maintain gallery aesthetic

See `components/ArtistProfile.tsx` for the implementation.

---

## Visual Design Specifications

### Layout
- Two-column grid on desktop (artist info left, headshot right)
- Single column on mobile (headshot above bio)
- Generous whitespace between artists
- Subtle dividers between sections

### Typography
- Artist Name: Large, light weight, tracking tight
- Discipline: Small caps, subtle gray
- Bio: Light weight, generous line height

### Headshot Treatment
- Grayscale filter on hover (if not already desaturated)
- Subtle shadow or border
- Aspect ratio maintained via object-fit
- Loading blur placeholder for performance

### Color Palette
- Background: Warm white (stone-50)
- Text: Deep stone (stone-900 for names, stone-700 for bio)
- Accents: Subtle stone-300 borders

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
- [ ] Layout maintains gallery aesthetic

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

### Performance Issues
- Compress images further (reduce quality to 75)
- Verify Next.js Image component is being used
- Check that images are served as WebP by Next.js

---

## Next Steps

1. Process all artist headshots to 600×800 JPG
2. Save to `/public/images/artists/headshots/`
3. Update `/content/artists.md` with image references
4. Implement the ArtistProfile component (see next file)
5. Update `/app/artists/page.tsx` to use new component
6. Test on local development server
7. Deploy to production

---

## Reference: Complete File Structure

```
house-of-mourning-v2/
├── public/
│   └── images/
│       └── artists/
│           └── headshots/
│               ├── sam-grabowska.jpg
│               ├── lee-knight.jpg
│               ├── leah-nieboer.jpg
│               ├── jeffrey-pethybridge.jpg
│               ├── eric-anderson.jpg
│               ├── valerie-tamplin.jpg
│               └── kawaji.jpg
├── content/
│   └── artists.md  # Updated with image: references
├── components/
│   └── ArtistProfile.tsx  # New component
└── app/
    └── artists/
        └── page.tsx  # Updated to use ArtistProfile
```
