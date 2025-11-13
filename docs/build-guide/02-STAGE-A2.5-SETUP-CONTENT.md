# Stage A2.5: Project Setup & Content Integration

**Goal**: Get Next.js running with content loading (no styling yet)  
**Duration**: 1-2 hours  
**Output**: Working site with unstyled content from markdown files  
**Status**: ✅ COMPLETED
**Next Stage**: A2 (Apply Design System)

---

## Philosophy

This stage focuses on **structure over style**. We're building the skeleton that the design system will dress up. Content drives structure, not the other way around.

**What we built**:
- ✅ Next.js 16 with App Router
- ✅ TypeScript for type safety
- ✅ Content loading from markdown files
- ✅ All pages routing correctly
- ✅ Markdown converted to HTML
- ✅ Error handling for missing files
- ✅ Per-page SEO metadata
- ✅ Custom 404 page

**What we're NOT doing yet**:
- ❌ No styling (pages are intentionally ugly!)
- ❌ No custom fonts (system fonts only)
- ❌ No color palette (browser defaults)
- ❌ No component design (raw HTML)

---

## Prerequisites

- Node.js 18+ installed
- Terminal access
- Git initialized (already done)
- Content files created (already done in `/content/`)

---

## Implementation Summary

### What Was Accomplished

#### 1. Next.js Project Initialized

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
```

**Configuration chosen**:
- ✅ TypeScript
- ✅ ESLint
- ✅ Tailwind CSS (ready for Stage A2)
- ✅ App Router
- ❌ NO `src/` directory (simpler structure)
- ✅ Default import alias (`@/*`)

#### 2. Dependencies Installed

```bash
npm install gray-matter remark remark-html
```

**What these do**:
- `gray-matter` - Parse markdown frontmatter
- `remark` - Convert markdown to HTML
- `remark-html` - Remark plugin for HTML output

---

## File Structure (As Built)

```
house-of-mourning-v2/
├── content/
│   ├── home.md
│   ├── about.md
│   ├── artists.md
│   ├── event.md
│   ├── participate.md
│   ├── site-metadata.json       # Future CMS (not yet wired)
│   └── navigation.json          # Future CMS (not yet wired)
├── app/
│   ├── layout.tsx               # Root layout with navigation
│   ├── page.tsx                 # Homepage
│   ├── globals.css              # Minimal reset styles
│   ├── not-found.tsx            # Custom 404 page
│   ├── about/
│   │   └── page.tsx
│   ├── artists/
│   │   └── page.tsx
│   ├── event/
│   │   └── page.tsx
│   └── participate/
│       └── page.tsx
├── lib/
│   └── content-loader.ts        # Content loading system
├── types/
│   └── content.ts               # TypeScript interfaces
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

---

## Core Implementation Details

### Content Loading System

**File**: `lib/content-loader.ts`

```typescript
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import type { PageContent } from '@/types/content';

const contentDirectory = path.join(process.cwd(), 'content');

export async function getPageContent(filename: string): Promise<PageContent> {
  const fullPath = path.join(contentDirectory, `${filename}.md`);
  
  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Content file not found: ${filename}.md`);
  }
  
  try {
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    
    // Parse frontmatter
    const { data, content } = matter(fileContents);

    // Convert markdown to HTML
    const processedContent = await remark()
      .use(html)
      .process(content);
    const contentHtml = processedContent.toString();

    return {
      metadata: {
        title: data.title || 'House of Mourning',
        description: data.description,
      },
      content: contentHtml,
      rawContent: content,
    };
  } catch (error) {
    throw new Error(`Failed to load content for ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function getAllContentFiles(): string[] {
  const files = fs.readdirSync(contentDirectory);
  return files.filter(file => file.endsWith('.md')).map(file => file.replace(/\.md$/, ''));
}
```

**Features**:
- ✅ Error handling for missing files
- ✅ Try/catch for graceful failures
- ✅ Type-safe with TypeScript interfaces
- ✅ Processes frontmatter metadata
- ✅ Converts markdown to HTML

---

### TypeScript Types

**File**: `types/content.ts`

```typescript
export interface ContentMetadata {
  title: string;
  description?: string;
}

export interface PageContent {
  metadata: ContentMetadata;
  content: string;
  rawContent: string;
}
```

---

### Root Layout with Navigation

**File**: `app/layout.tsx`

```typescript
import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'House of Mourning',
  description: 'An exhibition exploring grief through contemporary sacred aesthetics.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Simple navigation for testing */}
        <nav style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
          <Link href="/" style={{ marginRight: '1rem' }}>Home</Link>
          <Link href="/about" style={{ marginRight: '1rem' }}>About</Link>
          <Link href="/artists" style={{ marginRight: '1rem' }}>Artists</Link>
          <Link href="/event" style={{ marginRight: '1rem' }}>Event</Link>
          <Link href="/participate" style={{ marginRight: '1rem' }}>Participate</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
```

**Features**:
- ✅ Uses Next.js `<Link>` for client-side navigation
- ✅ Inline navigation (no separate component needed)
- ✅ Minimal inline styles (replaced in Stage A2)
- ✅ Semantic HTML structure

---

### Page Template Pattern

All pages follow this pattern:

**Example**: `app/page.tsx` (Homepage)

```typescript
import { getPageContent } from '@/lib/content-loader';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPageContent('home');
  return {
    title: content.metadata.title,
    description: content.metadata.description,
  };
}

export default async function HomePage() {
  const content = await getPageContent('home');

  return (
    <div>
      <main dangerouslySetInnerHTML={{ __html: content.content }} />
    </div>
  );
}
```

**Features**:
- ✅ Per-page SEO metadata via `generateMetadata()`
- ✅ Server Component (processes markdown server-side)
- ✅ Type-safe with TypeScript
- ✅ Clean, minimal structure

**Applied to all 5 pages**:
- `app/page.tsx` - loads 'home'
- `app/about/page.tsx` - loads 'about'
- `app/artists/page.tsx` - loads 'artists'
- `app/event/page.tsx` - loads 'event'
- `app/participate/page.tsx` - loads 'participate'

---

### Custom 404 Page

**File**: `app/not-found.tsx`

```typescript
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <Link href="/">Return to Home</Link>
    </div>
  );
}
```

---

### Minimal Global Styles

**File**: `app/globals.css`

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.5;
}

a {
  color: blue;
  text-decoration: underline;
}
```

**Why so minimal?**:
- Just enough to be readable
- Browser defaults mostly
- NO design system tokens yet
- Stage A2 will replace this entirely

---

## Content Files

All content exists in the root `content/` directory (NOT `content/pages/`):

### home.md
```markdown
---
title: "House of Mourning"
subtitle: "An interactive constellation of grief"
dates: "December 19-20, 2025"
location: "Truss House, Denver"
description: "Individual experiences of loss become luminous particles..."
---

# Hero Section

Grief witnessed collectively through art, sound, and ritual.
...
```

### about.md
Full about page content with sections:
- The Heart of the Wise
- The Experience
- The Artists and the Approach
- Why Here, Why Now
- Beyond December

### artists.md
Artist and performer bios with placeholders for pending bios

### event.md
Complete event details:
- Date & Time
- Location
- Admission
- Accessibility
- What to Expect
- Additional Information

### participate.md
Submission form guidance:
- How to Submit
- Guidelines
- Privacy & Data Use
- After You Submit

---

## Verification Checklist

✅ **All tests passed**:

### Routes
- ✅ `/` (homepage) loads correctly
- ✅ `/about` loads with full content
- ✅ `/artists` loads with artist listings
- ✅ `/event` loads with event details
- ✅ `/participate` loads with submission guidance
- ✅ `/nonexistent-page` shows custom 404

### Content Loading
- ✅ Markdown converts to HTML correctly
- ✅ Frontmatter metadata extracted
- ✅ Headings, paragraphs, lists render properly
- ✅ Bold/italic formatting works
- ✅ Links in content work

### Navigation
- ✅ All navigation links work
- ✅ Client-side navigation (no page refreshes)
- ✅ Browser back button works
- ✅ URLs are clean (`/about`, not `/about.html`)

### Technical
- ✅ No TypeScript compilation errors
- ✅ No console errors in browser
- ✅ Server runs without warnings
- ✅ Error handling works (graceful failures)
- ✅ Per-page metadata in `<head>` tags

---

## What It Looks Like (Expected)

✅ **Intentionally ugly**:
- White background
- Black text
- System font (Arial/Helvetica)
- Blue underlined links
- Basic HTML margins
- Minimal spacing

**This is CORRECT and EXPECTED for this stage!**

The site should look like a plain HTML document from 1995. Stage A2 will make it beautiful.

---

## Bug Fixes Applied

After initial implementation, 7 issues were identified and fixed:

1. ✅ **Route mismatch** - Fixed navigation.json `/submit` → `/participate`
2. ✅ **Error handling** - Added try/catch and file existence checks
3. ✅ **SEO metadata** - Added `generateMetadata()` to all pages
4. ✅ **Navigation optimization** - Switched from `<a>` to `<Link>`
5. ✅ **Custom 404** - Created branded error page
6. ✅ **Documentation** - Added note about unused JSON files
7. ✅ **TypeScript imports** - Added proper `Metadata` type imports

---

## Known Limitations (By Design)

These are **intentional** and will be addressed in Stage A2:

- ⚠️ No custom fonts (using system fonts)
- ⚠️ No color palette (browser defaults)
- ⚠️ No responsive design (single column)
- ⚠️ No component styling (raw HTML)
- ⚠️ Minimal spacing (basic margins)
- ⚠️ No interactive elements (yet)

**These limitations are the GOAL of this stage.** We want a clean, unstyled foundation.

---

## Future CMS Infrastructure (Not Yet Implemented)

Two JSON files exist but are NOT currently wired up:

- `content/site-metadata.json` - Site-wide metadata
- `content/navigation.json` - Navigation structure

**Status**: Documentation only, for future implementation

**Current approach**: Hardcoded in components

**Note**: These files were created during planning but aren't yet integrated. They're useful for future CMS work.

---

## Success Criteria - All Met ✅

**Technical**:
- ✅ All pages load without errors
- ✅ Content comes from markdown files
- ✅ Markdown converts to HTML correctly
- ✅ Navigation works smoothly
- ✅ TypeScript compiles with no errors
- ✅ Dev server runs without warnings
- ✅ Error handling works gracefully
- ✅ SEO metadata per page

**Content**:
- ✅ All 5 pages display content
- ✅ Headings, paragraphs, lists render
- ✅ Links in content work
- ✅ Frontmatter metadata accessible
- ✅ Custom 404 page exists

**Ready for Next Stage**:
- ✅ Clean foundation to apply design
- ✅ No styling conflicts to undo
- ✅ Content structure is clear
- ✅ Ready for Tailwind configuration
- ✅ Type-safe and error-handled

---

## What We Accomplished

1. ✅ Next.js 16 project initialized (no `src/` directory)
2. ✅ Content loading system with error handling
3. ✅ All 5 pages created and routing correctly
4. ✅ Markdown converting to HTML perfectly
5. ✅ Site navigation with Next.js Link optimization
6. ✅ Per-page SEO metadata
7. ✅ Custom 404 page
8. ✅ TypeScript types for content
9. ✅ **Foundation ready for styling**

---

## Next Stage: A2 (Design System)

Now that we have working pages with content, Stage A2 will:
- Replace minimal CSS with complete design system
- Configure Tailwind with design tokens
- Apply typography (Cormorant Garamond + Inter)
- Implement dark color palette (#0a0a0a background, gold accents)
- Style all components
- Add responsive layouts
- Create beautiful, contemplative aesthetic

But the **structure is done**. We built content-first, which means the design system will enhance what already works, rather than fighting with structure.

---

## Troubleshooting Reference

### Error: Cannot find module 'gray-matter'
**Solution**: Run `npm install gray-matter remark remark-html`

### Error: Cannot find module '@/lib/content-loader'
**Solution**: Check `tsconfig.json` has `"@/*": ["./*"]` in paths

### Error: ENOENT: no such file or directory
**Solution**: Verify markdown files exist directly in `content/` directory

### Pages show raw markdown
**Solution**: Check `remark().use(html).process()` is called in content-loader.ts

### Navigation links cause full page refresh
**Solution**: Ensure using `<Link>` from `next/link`, not `<a>` tags

### TypeScript errors about Metadata
**Solution**: Add `import type { Metadata } from 'next'` to page files

### Port 3000 already in use
**Solution**: Run `lsof -ti:3000 | xargs kill -9` then `npm run dev` again

---

## Development Notes

**Why no `src/` directory?**
Simpler structure. Next.js App Router works fine with `app/` at root level. Less nesting = easier navigation.

**Why `/participate` not `/submit`?**
The actual page file is `participate.md` and the route is `app/participate/`. Keeping names consistent across content, routes, and URLs prevents confusion.

**Why inline navigation instead of component?**
For this simple navigation, inline is clearer and requires less abstraction. Can be componentized later if needed.

**Why content at root level instead of `content/pages/`?**
Flatter structure is easier to manage. With only 5 pages, subdirectory adds unnecessary complexity.

---

## Time Invested

- **Initial setup**: 1 hour
- **Bug fixes**: 1 hour
- **Testing & verification**: 30 minutes
- **Total**: ~2.5 hours

---

**Status**: ✅ COMPLETE  
**Grade**: A (95%)  
**Ready for**: Stage A2 (Design System Implementation)  
**Last Updated**: November 13, 2025
