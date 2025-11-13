# Content Management System - Setup Complete ✅

## What We Built

A clean, maintainable content management system that separates copy from code.

### File Structure Created

```
house-of-mourning-v2/
├── content/
│   ├── README.md               # How to update content (read this!)
│   ├── pages/
│   │   ├── home.md            # Homepage copy
│   │   ├── about.md           # About page copy  
│   │   ├── artists.md         # Artist bios
│   │   ├── event.md           # Event details
│   │   └── submit.md          # Submission page copy
│   ├── site-metadata.json     # SEO, contact, social
│   └── navigation.json        # Menu structure
├── src/
│   └── lib/
│       └── content.ts         # Helper functions to load content
└── docs/
    └── WEB-COPY-DIRECTIVE.md  # Original copywriting guidelines
```

---

## Benefits of This Setup

### ✅ Easy to Update
- Edit markdown files directly
- No need to touch React/TypeScript code
- Changes are just text edits

### ✅ Version Controlled
- Git tracks all content changes
- Can see history of every edit
- Easy to revert mistakes

### ✅ Portable
- Content is separate from code
- Can move to different framework if needed
- Can use content in multiple places

### ✅ Maintainable
- Clear structure
- Documentation included
- Non-developers can edit

---

## How to Update Content

### Quick Reference

| What to Update | File to Edit |
|----------------|--------------|
| Homepage copy | `content/pages/home.md` |
| About page | `content/pages/about.md` |
| Artist bios | `content/pages/artists.md` |
| Event details | `content/pages/event.md` |
| Submission page | `content/pages/submit.md` |
| Site title, SEO | `content/site-metadata.json` |
| Navigation menu | `content/navigation.json` |

### Workflow

1. **Edit** the file in any text editor
2. **Save** your changes
3. **Commit** to git: `git add . && git commit -m "Update homepage copy"`
4. **Push** to GitHub: `git push`
5. **Deploy** happens automatically (via Vercel)

---

## Current Content Status

### ✅ Complete
- Homepage structure and copy
- About page (full text)
- Event page (placeholder times)
- Submit page (form guidance)
- Site metadata (contact, social)
- Navigation structure

### ⚠️ Needs Completion
- **Event times**: Replace `[TBD]` with actual times
- **Artist bios**: Add full bios for visual artists and performers
- **Performer details**: Add bios and links
- **Social media**: Add Instagram/Twitter handles
- **Performance schedule**: Add specific times for Saturday

---

## Next Steps

### Stage A2: Design System (Next)
Once we build the Next.js site, these content files will be:
- Automatically loaded on each page
- Converted from markdown to HTML
- Styled with the design system
- Deployed to production

### Updating Content (Ongoing)
As artist bios come in, event details are confirmed, or copy needs revision:
1. Edit the relevant `.md` or `.json` file
2. Commit and push
3. Changes appear live automatically

---

## Technical Notes

### How It Works

When Next.js builds the site:
1. `src/lib/content.ts` reads files from `content/`
2. Markdown is parsed (frontmatter + content)
3. Content is passed to React components
4. Components render the HTML

### Dependencies Needed

For Next.js to load this content, we'll need:
```json
{
  "gray-matter": "^4.0.3",  // Parse markdown frontmatter
  "remark": "^15.0.1",      // Convert markdown to HTML
  "remark-html": "^16.0.1"
}
```

These will be added in Stage A3 when we set up Next.js.

---

## Examples

### Update Event Time

**File**: `content/pages/event.md`

**Before**:
```markdown
[Opening time TBD] — [Closing time TBD]
```

**After**:
```markdown
6:00 PM — 10:00 PM
```

### Add Artist Bio

**File**: `content/pages/artists.md`

**Before**:
```markdown
## Eric Anderson
*[Medium/Approach]*

[Bio to be added]
```

**After**:
```markdown
## Eric Anderson
*Mixed Media, Assemblage*

Eric Anderson's practice explores memory and materiality through 
assemblage and reconstruction. His work for House of Mourning examines 
how objects carry the weight of loss.
```

### Update Social Media

**File**: `content/site-metadata.json`

```json
{
  "social": {
    "hashtag": "#TheHouseOfMourning",
    "instagram": "https://instagram.com/houseofmourning",
    "twitter": "https://twitter.com/houseofmourning"
  }
}
```

---

## Documentation

Full instructions available in:
- `content/README.md` - How to update content
- `docs/WEB-COPY-DIRECTIVE.md` - Copywriting guidelines

---

## Questions?

**Common tasks**:
- Updating copy → Edit `.md` files
- Changing dates/times → Edit `event.md` or `site-metadata.json`
- Adding menu items → Edit `navigation.json`
- Changing contact info → Edit `site-metadata.json`

**Need help?**
- Markdown formatting → [Markdown Guide](https://www.markdownguide.org/)
- JSON syntax → [JSONLint Validator](https://jsonlint.com/)
- Git commands → [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)

---

**Status**: Content system ready. Proceed to Stage A2 (Design System) when ready.
