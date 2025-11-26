# Example: How to Update artists.md with Image References

## Before (Original Format)

```markdown
## Sam Grabowska
*Visual Artist*

Sam Grabowska (b.1982 San Diego, CA, USA) is a multidisciplinary artist living and working in Denver, Colorado, USA...
```

## After (With Image Reference)

```markdown
## Sam Grabowska
*Visual Artist*
**image:** sam-grabowska.jpg

Sam Grabowska (b.1982 San Diego, CA, USA) is a multidisciplinary artist living and working in Denver, Colorado, USA...
```

---

## Complete Section Examples

### Visual Artist with Image

```markdown
## Lee Knight
*Visual Artist, Musician*
**image:** lee-knight.jpg

Lee Knight is a multidisciplinary artist and curator working at the intersections of visual art, music, and experiential production.

www.blackwolfelectric.com

---
```

### Performer with Image

```markdown
### Leah Nieboer
*Poetry/Spoken Word*
**image:** leah-nieboer.jpg

Leah Nieboer is a poet, Deep Listener, and the author of SOFT APOCALYPSE (UGA Press/Georgia Poetry Prize, 2023).

Instagram: @mznieboer
www.leahnieboer.com

---
```

### Artist Without Image

```markdown
## Eric Anderson
*Visual Artist*

[Bio to be added]

---
```

---

## Rules

1. **Placement:** The `**image:**` line MUST come immediately after the discipline/role line
2. **Spacing:** One blank line after `**image:**` before the bio paragraph begins
3. **Filename:** Must match exactly (case-sensitive, including .jpg extension)
4. **Format:** `**image:** filename.jpg` (bold text, colon, space, filename)
5. **Optional:** If no image is available, simply omit the `**image:**` line entirely

---

## Quick Reference

```markdown
## [Artist Name]
*[Discipline/Role]*
**image:** [filename].jpg

[Bio paragraph starts here...]

[Optional: Links]

---
```
