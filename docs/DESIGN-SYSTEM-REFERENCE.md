# Design System Quick Reference

## Typography

**Font**: Inter (variable weight 300-700)

**Sizes**:
- `text-xs` (12px) - Small labels
- `text-sm` (14px) - Metadata
- `text-base` (16px) - Body
- `text-lg` (20px) - Large body
- `text-xl` (24px) - Subheadings
- `text-2xl` (32px) - Headings
- `text-3xl` (40px) - Section titles
- `text-4xl` (48px) - Page titles
- `text-5xl` (64px) - Hero

**Weights**:
- `font-light` (300) - Display
- `font-normal` (400) - Body
- `font-medium` (500) - Emphasis
- `font-semibold` (600) - Subheadings

---

## Colors

**Backgrounds**:
- `bg-stone-50` - Main background
- `bg-stone-100` - Cards/sections
- `bg-stone-200` - Borders
- `bg-black` - Visualization

**Text**:
- `text-stone-900` - Primary
- `text-stone-600` - Secondary
- `text-stone-500` - Tertiary
- `text-stone-50` - Inverse (on dark)

**Accents**:
- `text-sky-900` / `bg-sky-900` - Primary CTA
- `text-sky-800` / `bg-sky-800` - Hover
- `bg-sky-100` - Subtle highlight

---

## Spacing

**Padding/Margin**:
- `p-2` (8px) - Tight
- `p-4` (16px) - Default
- `p-6` (24px) - Comfortable
- `p-8` (32px) - Generous
- `p-12` (48px) - Section
- `p-16` (64px) - Large section
- `p-24` (96px) - Major divider

**Common Patterns**:
- Paragraph spacing: `mb-6`
- Section spacing: `mb-12` or `mb-16`
- Container padding: `px-6 py-16 md:px-12 md:py-24`

---

## Components

**Primary Button**:
```tsx
<button className="btn-primary">
  Share Your Grief
</button>
```

**Secondary Button**:
```tsx
<button className="btn-secondary">
  Learn More
</button>
```

**Page Section**:
```tsx
<section className="page-section">
  Content here
</section>
```

**Hero Section**:
```tsx
<section className="hero-section">
  Hero content
</section>
```

**Content Card**:
```tsx
<div className="content-card">
  Card content
</div>
```

---

## Responsive Breakpoints

- `sm:` - 640px and up (mobile landscape)
- `md:` - 768px and up (tablets)
- `lg:` - 1024px and up (small desktop)
- `xl:` - 1280px and up (large desktop)

**Usage**:
```tsx
<div className="text-base md:text-lg lg:text-xl">
  Scales from 16px → 20px → 24px
</div>
```

---

## Layout

**Container**:
```tsx
<div className="max-w-6xl mx-auto">
  Centered, max 1152px wide
</div>
```

**Full Width**:
```tsx
<div className="w-full">
  Edge to edge
</div>
```

**Grid** (for artist bios, etc.):
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
  Grid items
</div>
```

---

## Accessibility

**Focus States**: Auto-applied via `globals.css`

**Tap Targets**: Minimum 44x44px
- Buttons: `py-3` (48px height)
- Links: `text-base` minimum

**Color Contrast**: All combinations meet WCAG AA

---

## Animation

**Transitions**:
```tsx
<div className="transition-all duration-200">
  Smooth transition
</div>
```

**Hover Effects**:
```tsx
<button className="hover:bg-stone-100 hover:-translate-y-0.5">
  Subtle lift on hover
</button>
```

---

## Usage Examples

**Page Layout**:
```tsx
<main>
  <section className="hero-section">
    <h1>House of Mourning</h1>
    <p className="text-lg text-stone-600">
      December 19-20, 2025
    </p>
  </section>
  
  <section className="page-section">
    <h2 className="mb-8">About the Project</h2>
    <p>Content here...</p>
  </section>
</main>
```

**Call to Action**:
```tsx
<div className="text-center py-16">
  <h2 className="mb-6">Ready to participate?</h2>
  <button className="btn-primary">
    Share Your Grief
  </button>
</div>
```

**Content Grid**:
```tsx
<div className="page-section">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
    <div className="content-card">
      <h3 className="mb-4">Visual Art</h3>
      <p>Description...</p>
    </div>
    <div className="content-card">
      <h3 className="mb-4">Sound Design</h3>
      <p>Description...</p>
    </div>
  </div>
</div>
```
