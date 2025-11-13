# Mobile Menu & iOS Viewport Fixes

## Changes Made

### 1. Fixed Mobile Menu
**Problem:** Mobile menu button didn't work - was just static HTML
**Solution:** Created interactive client-side Navigation component

**Files Changed:**
- Created `/components/Navigation.tsx` - New client component with:
  - Working hamburger menu toggle (☰ / ✕)
  - Slide-in menu panel from right
  - Backdrop overlay with blur
  - Active page highlighting
  - Click-to-close functionality
  
- Updated `/app/layout.tsx`:
  - Imported new Navigation component
  - Replaced static nav code with `<Navigation />`

### 2. Fixed iOS Viewport Glitch
**Problem:** Black bar at bottom on iOS due to Safari's dynamic address bar and `100vh` issues
**Solution:** Implemented iOS-aware viewport handling

**Files Changed:**
- Updated `/components/ShaderBackground.tsx`:
  - Added `window.visualViewport` detection for iOS
  - Added listener for visualViewport resize events
  - Proper cleanup of visualViewport listeners
  - Shader now resizes correctly when iOS Safari's UI appears/disappears

- Updated `/app/globals.css`:
  - Added support for `100dvh` (dynamic viewport height)
  - CSS automatically uses `100dvh` on supporting browsers (iOS Safari 15.4+)
  - Falls back gracefully on older browsers

## How the Fixes Work

### Mobile Menu
1. User taps hamburger icon
2. State toggles (`useState` hook)
3. Menu slides in from right with backdrop
4. User can tap links or backdrop to close
5. Menu shows active page with highlight

### iOS Viewport
1. Three.js uses `visualViewport.height` instead of `window.innerHeight`
2. Listens to both `window.resize` and `visualViewport.resize`
3. CSS uses `100dvh` which adjusts to visible viewport (excluding Safari UI)
4. Shader canvas resizes smoothly as user scrolls and Safari's UI changes

## Testing Locally

```bash
cd /Users/bjameshaskins/Desktop/house-of-mourning-v2

# Test the build
npm run build

# Test locally
npm run dev
```

**Mobile Testing:**
1. Open on iPhone/iPad in Safari
2. Test mobile menu (hamburger icon)
3. Scroll page - shader should resize smoothly
4. No black bars should appear

## Deployment

```bash
# Commit changes
git add .
git commit -m "Fix: Mobile menu functionality and iOS viewport handling"
git push origin main

# Vercel will auto-deploy (if connected)
# Or deploy manually: vercel --prod
```

## Expected Results

✅ Mobile menu opens/closes smoothly
✅ Active page highlighted in mobile menu
✅ No black bars on iOS devices
✅ Shader resizes correctly as Safari address bar appears/disappears
✅ Smooth animations and transitions
✅ Works on all viewport sizes

## Browser Support

- **iOS Safari 15.4+:** Full support with `100dvh`
- **Older iOS:** Falls back to standard viewport handling
- **All modern browsers:** Full support
- **Mobile Chrome/Firefox:** Works perfectly

---

**Next Step:** Push to GitHub and Vercel will redeploy automatically! 🚀
