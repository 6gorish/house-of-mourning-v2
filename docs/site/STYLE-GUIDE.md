# Site Style Guide
## The House of Mourning Marketing Website

This guide defines the visual language for the marketing website. Every choice serves the project's core aesthetic: **contemplative restraint**—the visual equivalent of a moment of silence.

---

## Design Vision

### The Feeling We're Creating

Visitors should experience the website as they would a museum lobby before entering a contemplative exhibition. The space is:

- **Generous**: Ample white space lets content breathe
- **Quiet**: No competing elements, no visual noise
- **Confident**: Quality over ornamentation
- **Respectful**: Grief is not entertainment; the design honors its weight

### What This Is Not

- Not trendy (should feel timeless in 10 years)
- Not playful (grief is serious subject matter)
- Not cold (sophisticated but warm)
- Not cluttered (every element has purpose)

---

## Typography

### Font Family

**Inter** (variable weight 300-700)

Inter was chosen for its:
- Exceptional legibility at all sizes
- Neutral character that doesn't impose personality
- Variable weight support for nuanced hierarchy
- Excellent rendering on screens

```css
font-family: 'Inter', system-ui, sans-serif;
```

### Type Scale

| Class | Size | Use Case |
|-------|------|----------|
| `text-xs` | 12px | Small labels, metadata |
| `text-sm` | 14px | Secondary text, captions |
| `text-base` | 16px | Body text (default) |
| `text-lg` | 20px | Large body, emphasis |
| `text-xl` | 24px | Subheadings |
| `text-2xl` | 32px | Section headings |
| `text-3xl` | 40px | Page titles |
| `text-4xl` | 48px | Large page titles |
| `text-5xl` | 64px | Hero text |

### Font Weights

| Class | Weight | Use Case |
|-------|--------|----------|
| `font-light` | 300 | Display text, hero headings |
| `font-normal` | 400 | Body text, navigation |
| `font-medium` | 500 | Emphasis, buttons |
| `font-semibold` | 600 | Strong headings |

### Typography Principles

**Hierarchy through weight, not decoration**  
Use font weight and size to establish hierarchy. Avoid underlining (except links on hover), bold within body text, or all-caps except for small labels.

**Generous line height**  
Body text uses `leading-relaxed` (1.625). Headlines can be tighter (`leading-tight`, 1.25).

**Letter spacing for display**  
Large headlines benefit from `tracking-tight` (-0.025em). Small labels use `tracking-wide` (0.025em).

---

## Color System

### Background Colors

| Class | Hex | Use |
|-------|-----|-----|
| `bg-stone-50` | #FAFAF9 | Primary background |
| `bg-stone-100` | #F5F5F4 | Cards, sections |
| `bg-stone-200` | #E7E5E4 | Borders, dividers |
| `bg-black` | #000000 | Visualization background |

### Text Colors

| Class | Hex | Use |
|-------|-----|-----|
| `text-stone-900` | #1C1917 | Primary text |
| `text-stone-600` | #57534E | Secondary text |
| `text-stone-500` | #78716C | Tertiary text, captions |
| `text-stone-50` | #FAFAF9 | Inverse (on dark backgrounds) |

### Accent Colors

| Class | Hex | Use |
|-------|-----|-----|
| `bg-stone-800` | #292524 | Primary buttons |
| `bg-stone-900` | #1C1917 | Button hover |
| `text-sky-700` | #0369A1 | Links (hover state) |

### Why Stone, Not Gray

The stone palette has warm undertones that feel more human and less clinical than pure gray. This subtle warmth supports the contemplative, non-institutional atmosphere.

---

## Spacing System

### Padding & Margin

| Class | Size | Use |
|-------|------|-----|
| `p-2` / `m-2` | 8px | Tight spacing |
| `p-4` / `m-4` | 16px | Default internal padding |
| `p-6` / `m-6` | 24px | Comfortable padding |
| `p-8` / `m-8` | 32px | Generous padding |
| `p-12` / `m-12` | 48px | Section internal padding |
| `p-16` / `m-16` | 64px | Large section padding |
| `p-24` / `m-24` | 96px | Major section dividers |

### Common Patterns

**Paragraph spacing**: `mb-6` between paragraphs  
**Section spacing**: `mb-12` or `mb-16` between sections  
**Container padding**: `px-6 py-16 md:px-12 md:py-24`

---

## Components

### Primary Button

```tsx
<button className="btn-primary">
  Share Your Grief
</button>
```

**Characteristics**:
- Dark background (`bg-stone-800`)
- Uppercase, tracked text
- Subtle scale on hover
- Generous padding (touch-friendly)

### Secondary Button

```tsx
<button className="btn-secondary">
  Learn More
</button>
```

**Characteristics**:
- Transparent background
- Border that darkens on hover
- Same proportions as primary

### Navigation Link

```tsx
<a className="nav-link">About</a>
```

**Characteristics**:
- Understated by default
- Underline appears on hover (animated)
- Never all-caps in navigation

### Page Section

```tsx
<section className="page-section">
  {/* Content */}
</section>
```

**Provides**: Consistent vertical rhythm, max-width container, responsive padding.

### Hero Section

```tsx
<section className="hero-section">
  {/* Hero content */}
</section>
```

**Provides**: Extra vertical padding for impact, centered content area.

---

## Responsive Breakpoints

| Prefix | Min Width | Target |
|--------|-----------|--------|
| (none) | 0px | Mobile portrait |
| `sm:` | 640px | Mobile landscape |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Small desktop |
| `xl:` | 1280px | Large desktop |

### Mobile-First Approach

All styles are mobile-first. Add complexity at larger breakpoints:

```tsx
<h1 className="text-3xl md:text-4xl lg:text-5xl">
  The House of Mourning
</h1>
```

---

## Animation

### Principles

**Slow and gentle**: Nothing jarring. Animations should feel like breathing.  
**Purpose-driven**: Animation serves comprehension, never decoration.  
**Respect preferences**: Honor `prefers-reduced-motion`.

### Transition Classes

```css
.transition-elegant {
  transition: all 300ms cubic-bezier(0.4, 0.0, 0.2, 1);
}

.transition-smooth {
  transition: all 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
}
```

### Hover Effects

```tsx
<button className="hover:scale-[1.02] hover:shadow-lg transition-elegant">
  {/* Subtle lift on hover */}
</button>
```

---

## Layout Patterns

### Container

```tsx
<div className="max-w-6xl mx-auto px-6">
  {/* Centered, max 1152px wide */}
</div>
```

### Content Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
  {/* Responsive grid */}
</div>
```

### Full-Width Section with Constrained Content

```tsx
<section className="w-full bg-stone-100">
  <div className="max-w-6xl mx-auto px-6 py-16">
    {/* Content */}
  </div>
</section>
```

---

## Accessibility

### Focus States

All interactive elements have visible focus states (auto-applied via CSS):

```css
:focus {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
```

### Touch Targets

Minimum 44×44px for all interactive elements:
- Buttons use `py-3` minimum (48px height)
- Links use `text-base` minimum with adequate padding

### Color Contrast

All text/background combinations meet WCAG AA standards:
- `text-stone-900` on `bg-stone-50`: 12.6:1
- `text-stone-600` on `bg-stone-50`: 5.7:1
- `text-stone-50` on `bg-stone-800`: 11.3:1

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Voice & Tone

### Writing Style

- **Contemplative, not mournful**: Honor grief without being heavy-handed
- **Sophisticated, not pretentious**: Accessible to general audience
- **Direct, not clinical**: Clear sentences, avoid jargon
- **Warm, not casual**: Professional but human

### Good Examples

> "Grief can feel like the loneliest experience. Yet when we gather these individual moments of loss, patterns emerge."

> "Your message will join a constellation of shared humanity."

### Avoid

- Clinical language: "The installation interrogates..."
- Overly sentimental: "A beautiful journey of healing..."
- Tech-speak: "Using natural language processing algorithms..."
- Presumptuous: "You will feel less alone..."

---

## CSS Custom Properties

Defined in `globals.css`:

```css
:root {
  --background: theme('colors.stone.50');
  --foreground: theme('colors.stone.900');
  --muted: theme('colors.stone.500');
  --border: theme('colors.stone.200');
  --accent: theme('colors.sky.600');
}
```

---

## File Reference

| File | Purpose |
|------|---------|
| `app/globals.css` | Global styles, CSS custom properties, component classes |
| `tailwind.config.ts` | Tailwind configuration, theme extensions |
| `app/layout.tsx` | Root layout with Inter font loading |

---

## How This Serves the Vision

Every choice in this style guide connects to the project's aesthetic philosophy:

| Design Decision | Aesthetic Purpose |
|----------------|-------------------|
| Stone palette over pure gray | Warmth without compromising sophistication |
| Light font weights | Elegance, not heaviness |
| Generous whitespace | Room to breathe, contemplate |
| Slow animations | Gentleness appropriate to grief |
| Minimal decoration | Nothing competes with the content |
| High contrast text | Accessibility is respect |

The website should feel like the lobby of a museum—preparing visitors for a contemplative experience, not overwhelming them before they arrive.
