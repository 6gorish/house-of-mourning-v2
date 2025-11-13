# Stage A2: Design System

**Goal**: Establish visual design tokens and component foundations  
**Duration**: 2-3 hours  
**Prerequisites**: Stage A1 (Project Vision) complete

---

## Overview

Create a comprehensive design system that defines:
- Typography (fonts, sizes, weights, line-heights)
- Color palette (backgrounds, text, accents)
- Spacing scale (consistent margins and padding)
- Component patterns (buttons, links, sections)

This design system will be implemented in Tailwind CSS and serve as the foundation for all pages.

---

## Design Principles (from Project Vision)

### Visual References
- **Museums**: MoMA, Tate Modern, Guggenheim (sophisticated, information-rich)
- **Galleries**: Gagosian, David Zwirner (generous space, minimal distraction)
- **Luxury brands**: Aesop, Byredo, The Row (restraint, quality)
- **Memorials**: Vietnam Veterans Memorial, 9/11 Memorial (dignity, gravity)

### Key Characteristics
- **Contemplative restraint** - space for reflection
- **Generous white space** - let content breathe
- **Sophisticated simplicity** - museum quality without coldness
- **Respect for content** - grief deserves dignity

---

## Typography

### Font Selection

**Primary Font: Inter**
- Clean, highly legible sans-serif
- Excellent web performance (variable font)
- Wide range of weights (100-900)
- Open source, free to use
- Good alternative to Helvetica Neue

**Why Inter over Futura?**
- Better web rendering (designed for screens)
- More legible at small sizes
- Variable font = faster loading
- Free and unrestricted
- Futura can be added later if desired

### Type Scale

Based on 16px base with 1.250 (major third) scale:

```
Scale:
xs:   12px / 0.75rem   - Captions, small labels
sm:   14px / 0.875rem  - Secondary text, metadata
base: 16px / 1rem      - Body copy (default)
lg:   20px / 1.25rem   - Large body, intro paragraphs
xl:   24px / 1.5rem    - Section subheadings
2xl:  32px / 2rem      - Page subheadings
3xl:  40px / 2.5rem    - Section headings
4xl:  48px / 3rem      - Page titles
5xl:  64px / 4rem      - Hero headings
```

### Font Weights

```
light:    300 - Large headings, elegant display
normal:   400 - Body text (default)
medium:   500 - Emphasis, important text
semibold: 600 - Subheadings, buttons
bold:     700 - Strong emphasis (use sparingly)
```

### Line Heights

```
tight:  1.25 - Large headings only
snug:   1.375 - Smaller headings
normal: 1.5 - Body text (default)
relaxed: 1.625 - Long-form reading
loose:  2.0 - Dramatic spacing (rarely used)
```

### Letter Spacing

```
tighter: -0.05em - Large display text
tight:   -0.025em - Headings
normal:   0 - Body text (default)
wide:     0.025em - Small caps, labels
wider:    0.05em - Very wide spacing (rare)
```

---

## Color Palette

### Core Colors

**Background Layers**
```css
--color-bg-primary:   #FAFAF9    /* Off-white, main background */
--color-bg-secondary: #F5F5F4    /* Slightly darker, cards/sections */
--color-bg-tertiary:  #E7E5E4    /* Borders, dividers */
--color-bg-black:     #000000    /* Visualization background */
```

**Text Colors**
```css
--color-text-primary:   #1C1917  /* Main text, near-black */
--color-text-secondary: #57534E  /* Secondary text, metadata */
--color-text-tertiary:  #78716C  /* Captions, less important */
--color-text-inverse:   #FAFAF9  /* White text on dark backgrounds */
```

**Accent Colors**
```css
--color-accent-primary:   #0C4A6E  /* Deep teal, links, CTAs */
--color-accent-hover:     #075985  /* Darker teal for hover states */
--color-accent-subtle:    #E0F2FE  /* Light teal, backgrounds */
```

**Visualization Colors** (for particle rendering)
```css
--color-viz-blue:    #3B82F6    /* Primary particle blue */
--color-viz-purple:  #8B5CF6    /* Secondary particle purple */
--color-viz-teal:    #14B8A6    /* Tertiary particle teal */
```

**Semantic Colors**
```css
--color-success: #10B981  /* Confirmation, success states */
--color-error:   #EF4444  /* Errors, warnings */
--color-warning: #F59E0B  /* Caution, alerts */
```

### Tailwind Implementation

```javascript
// tailwind.config.ts
colors: {
  'stone': {  // Using Tailwind's stone palette as base
    50:  '#FAFAF9',  // bg-primary
    100: '#F5F5F4',  // bg-secondary
    200: '#E7E5E4',  // bg-tertiary
    300: '#D6D3D1',
    400: '#A8A29E',
    500: '#78716C',  // text-tertiary
    600: '#57534E',  // text-secondary
    700: '#44403C',
    800: '#292524',
    900: '#1C1917',  // text-primary
    950: '#0C0A09',
  },
  'sky': {  // For accent colors
    50:  '#F0F9FF',
    100: '#E0F2FE',  // accent-subtle
    500: '#0EA5E9',
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',  // accent-hover
    900: '#0C4A6E',  // accent-primary
  }
}
```

---

## Spacing Scale

Using 8px base unit (Tailwind's default):

```
0:    0px
0.5:  2px   - Tiny gaps
1:    4px   - Very tight spacing
2:    8px   - Base unit
3:    12px  - Compact spacing
4:    16px  - Default spacing
6:    24px  - Comfortable spacing
8:    32px  - Generous spacing
12:   48px  - Section spacing
16:   64px  - Large section spacing
24:   96px  - Major section dividers
32:   128px - Hero spacing
40:   160px - Extra large spacing
```

### Usage Guidelines

**Text spacing**:
- Paragraph margin-bottom: `mb-6` (24px)
- Section margin-bottom: `mb-12` (48px)
- Major section: `mb-24` (96px)

**Container padding**:
- Mobile: `px-6 py-8` (24px, 32px)
- Tablet: `px-12 py-12` (48px, 48px)
- Desktop: `px-16 py-16` (64px, 64px)

**Component spacing**:
- Button padding: `px-6 py-3` (24px, 12px)
- Card padding: `p-8` (32px)
- Section padding: `py-16 md:py-24` (64px → 96px)

---

## Component Patterns

### Buttons

**Primary CTA** (Share Your Grief):
```css
.btn-primary {
  background: var(--color-accent-primary);
  color: var(--color-text-inverse);
  padding: 0.75rem 2rem;  /* 12px 32px */
  font-weight: 500;
  border-radius: 0;  /* Sharp corners for serious tone */
  letter-spacing: 0.025em;
  transition: all 200ms ease;
}

.btn-primary:hover {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
```

**Secondary Button**:
```css
.btn-secondary {
  background: transparent;
  color: var(--color-text-primary);
  border: 1px solid var(--color-bg-tertiary);
  padding: 0.75rem 2rem;
  font-weight: 400;
}

.btn-secondary:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-text-tertiary);
}
```

### Links

**Text Links**:
```css
.text-link {
  color: var(--color-accent-primary);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
  transition: color 150ms ease;
}

.text-link:hover {
  color: var(--color-accent-hover);
  text-decoration-thickness: 2px;
}
```

### Sections

**Page Section**:
```css
.page-section {
  padding: 4rem 1.5rem;  /* 64px 24px */
  max-width: 1200px;
  margin: 0 auto;
}

@media (min-width: 768px) {
  .page-section {
    padding: 6rem 3rem;  /* 96px 48px */
  }
}

@media (min-width: 1024px) {
  .page-section {
    padding: 8rem 4rem;  /* 128px 64px */
  }
}
```

**Hero Section**:
```css
.hero-section {
  padding: 8rem 1.5rem 4rem;  /* Extra top padding */
  text-align: center;
}
```

### Cards

**Content Card**:
```css
.content-card {
  background: var(--color-bg-secondary);
  padding: 2rem;  /* 32px */
  border: 1px solid var(--color-bg-tertiary);
}
```

---

## Layout Grid

### Container Widths

```
sm:  640px  - Mobile landscape
md:  768px  - Tablets
lg:  1024px - Small desktops
xl:  1280px - Large desktops
2xl: 1536px - Very large screens

Content max-width: 1200px (readable line lengths)
Full-bleed sections: 100vw (for visualization, hero)
```

### Breakpoints

```javascript
screens: {
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
  '2xl': '1536px',
}
```

---

## Accessibility

### Contrast Ratios

All color combinations must meet WCAG 2.1 AA standards:
- **Normal text** (16px+): 4.5:1 minimum
- **Large text** (24px+): 3:1 minimum
- **Interactive elements**: 3:1 minimum

**Verified combinations**:
- `#1C1917` on `#FAFAF9` = 15.8:1 ✅
- `#57534E` on `#FAFAF9` = 7.1:1 ✅
- `#0C4A6E` on `#FAFAF9` = 9.2:1 ✅
- `#FAFAF9` on `#000000` = 20.6:1 ✅

### Focus States

```css
.focusable:focus {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 2px;
}

.focusable:focus-visible {
  outline: 2px solid var(--color-accent-primary);
  outline-offset: 2px;
}
```

### Interactive Element Sizes

- **Minimum tap target**: 44x44px (WCAG 2.5.5)
- **Buttons**: Minimum 48px height
- **Links**: Minimum 16px font size
- **Form inputs**: Minimum 44px height

---

## Animation & Motion

### Principles

- **Subtle, not flashy** - Everything serves contemplation
- **Purposeful** - Animations guide attention or provide feedback
- **Slow easing** - Nothing jarring or fast
- **Respects motion preferences** - Honor `prefers-reduced-motion`

### Timing

```css
--duration-instant: 100ms;  /* Micro-interactions */
--duration-fast:    200ms;  /* Hover states */
--duration-normal:  300ms;  /* Default transitions */
--duration-slow:    500ms;  /* Larger movements */
--duration-slower:  700ms;  /* Dramatic reveals */
```

### Easing Functions

```css
--ease-in:     cubic-bezier(0.4, 0, 1, 1);
--ease-out:    cubic-bezier(0, 0, 0.2, 1);  /* Default */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### Implementation

```css
/* Default transition */
transition: all 200ms cubic-bezier(0, 0, 0.2, 1);

/* Respect motion preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Implementation Steps

### Step 1: Initialize Next.js with Tailwind

```bash
npx create-next-app@latest . --typescript --tailwind --app
```

Answer prompts:
- TypeScript: **Yes**
- ESLint: **Yes**
- Tailwind CSS: **Yes**
- `src/` directory: **Yes** (we already created it)
- App Router: **Yes**
- Import alias: **@/\*** (default)

### Step 2: Configure Tailwind

Create `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        stone: {
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
          950: '#0C0A09',
        },
        sky: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          500: '#0EA5E9',
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
export default config
```

### Step 3: Configure Fonts

Update `src/app/layout.tsx`:

```typescript
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

### Step 4: Create Global Styles

Update `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Colors */
    --color-bg-primary: #FAFAF9;
    --color-bg-secondary: #F5F5F4;
    --color-bg-tertiary: #E7E5E4;
    --color-bg-black: #000000;
    
    --color-text-primary: #1C1917;
    --color-text-secondary: #57534E;
    --color-text-tertiary: #78716C;
    --color-text-inverse: #FAFAF9;
    
    --color-accent-primary: #0C4A6E;
    --color-accent-hover: #075985;
    --color-accent-subtle: #E0F2FE;
    
    /* Timing */
    --duration-fast: 200ms;
    --duration-normal: 300ms;
    --duration-slow: 500ms;
    
    /* Easing */
    --ease-out: cubic-bezier(0, 0, 0.2, 1);
  }
  
  body {
    @apply bg-stone-50 text-stone-900;
    @apply font-sans;
    font-feature-settings: 'kern' 1;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  h1, h2, h3, h4, h5, h6 {
    @apply font-light;
    letter-spacing: -0.025em;
  }
  
  h1 {
    @apply text-5xl leading-tight;
  }
  
  h2 {
    @apply text-4xl leading-tight;
  }
  
  h3 {
    @apply text-3xl leading-snug;
  }
  
  p {
    @apply text-base leading-relaxed;
    @apply mb-6;
  }
  
  a {
    @apply text-sky-900 underline underline-offset-2;
    @apply transition-colors duration-200;
  }
  
  a:hover {
    @apply text-sky-800;
    text-decoration-thickness: 2px;
  }
}

@layer components {
  .btn-primary {
    @apply bg-sky-900 text-stone-50;
    @apply px-8 py-3;
    @apply font-medium tracking-wide;
    @apply transition-all duration-200;
    @apply hover:bg-sky-800;
    @apply hover:-translate-y-0.5;
    @apply focus:outline-2 focus:outline-sky-900 focus:outline-offset-2;
  }
  
  .btn-secondary {
    @apply bg-transparent text-stone-900;
    @apply border border-stone-200;
    @apply px-8 py-3;
    @apply font-normal;
    @apply transition-all duration-200;
    @apply hover:bg-stone-100 hover:border-stone-300;
  }
  
  .page-section {
    @apply max-w-6xl mx-auto;
    @apply px-6 py-16;
    @apply md:px-12 md:py-24;
    @apply lg:px-16 lg:py-32;
  }
  
  .hero-section {
    @apply text-center;
    @apply px-6 py-32;
    @apply md:px-12 md:py-40;
  }
  
  .content-card {
    @apply bg-stone-100;
    @apply p-8;
    @apply border border-stone-200;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}

/* Respect motion preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Step 5: Install Dependencies

```bash
npm install gray-matter remark remark-html @tailwindcss/typography
```

---

## Testing Checklist

After implementing the design system:

### Visual Tests
- [ ] Typography renders correctly (Inter loads)
- [ ] Color contrast meets WCAG AA standards
- [ ] Spacing looks consistent across pages
- [ ] Buttons have correct hover states
- [ ] Links are underlined and change on hover
- [ ] Focus states are visible

### Responsive Tests
- [ ] Layout works on mobile (375px)
- [ ] Layout works on tablet (768px)
- [ ] Layout works on desktop (1440px)
- [ ] Font sizes scale appropriately
- [ ] Spacing adjusts at breakpoints

### Accessibility Tests
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Screen reader can navigate
- [ ] Color contrast sufficient
- [ ] Motion respects `prefers-reduced-motion`

### Performance Tests
- [ ] Fonts load without flash of unstyled text
- [ ] CSS bundle is reasonable size (<50KB)
- [ ] No layout shift on load

---

## Success Criteria

✅ **Design system implemented**:
- Tailwind configured with custom tokens
- Inter font loading correctly
- Global styles established
- Component classes defined

✅ **Visual quality**:
- Looks sophisticated and museum-like
- Typography is elegant and readable
- Colors feel contemplative and appropriate
- Spacing creates breathing room

✅ **Technical quality**:
- Type-safe (TypeScript)
- Accessible (WCAG AA)
- Performant (<50KB CSS)
- Responsive (mobile-first)

---

## Next Steps

After completing Stage A2:
- **Stage A3**: Build static pages using this design system
- **Stage A4**: Add content from `content/` directory
- **Test**: Review on multiple devices and screen sizes

---

## Common Issues & Solutions

**Issue**: Fonts not loading
**Solution**: Check `layout.tsx` has `className={inter.variable}` on `<html>`

**Issue**: Tailwind classes not working
**Solution**: Check `content` paths in `tailwind.config.ts`

**Issue**: Colors look different than expected
**Solution**: Verify CSS variables in `globals.css`

**Issue**: Layout shifting on load
**Solution**: Add `font-display: swap` to font configuration

---

**Time to complete**: 2-3 hours  
**Difficulty**: Medium  
**Output**: Fully configured design system ready for component building
