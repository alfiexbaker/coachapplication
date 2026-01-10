# UI Standards

Reference for consistent, purposeful UI across the coach application.

---

## Design Principles

1. **Thin, compact, non-verbose** - Every screen should feel light
2. **No emojis or AI hallmarks** - Professional, clean aesthetic
3. **Every element must have purpose** - Remove anything decorative
4. **Minimal visual weight** - Favor whitespace over density

---

## Spacing

Use theme constants only. Never hardcode pixel values.

| Constant | Value | Usage |
|----------|-------|-------|
| `Spacing.xs` | 8px | Tight gaps, inline spacing |
| `Spacing.sm` | 16px | Card padding, card gaps |
| `Spacing.md` | 24px | Section spacing |
| `Spacing.lg` | 32px | Major section breaks |
| `Spacing.xl` | 48px | Page-level spacing |

### Common Patterns

```typescript
// Card padding
padding: Spacing.sm        // 16px

// Gap between cards
gap: Spacing.sm            // 16px

// Section vertical spacing
marginBottom: Spacing.md   // 24px
```

---

## Typography

Use semantic names from the Typography system. Never use raw `fontSize` values.

| Name | Usage |
|------|-------|
| `display` | Hero numbers, large stats |
| `title` | Screen titles |
| `heading` | Section headers |
| `body` | Primary content |
| `small` | Secondary content |
| `caption` | Labels, metadata |
| `micro` | Fine print, timestamps |

### Color Application

```typescript
// Primary text
color: theme.text

// Secondary/supporting text
color: theme.muted

// Interactive text
color: theme.tint
```

---

## Component Sizes

### Avatar

| Size | Dimension |
|------|-----------|
| `sm` | 32px |
| `md` | 44px |
| `lg` | 64px |

### Icon

| Size | Dimension |
|------|-----------|
| `sm` | 16px |
| `md` | 20px |
| `lg` | 24px |
| `xl` | 32px |

### Interactive Elements

| Component | Height |
|-----------|--------|
| Button (standard) | 44px |
| Button (compact) | 32px |
| Input | 44px |

---

## Positioning

### Rules

1. **NEVER use absolute positioning for layout**
2. Use flexbox for all layouts
3. Use `SafeAreaInsets` for edge-aware positioning
4. If absolute is required, always account for safe areas

### Correct Patterns

```typescript
// Screen container
flex: 1,
paddingTop: insets.top,
paddingBottom: insets.bottom,

// Centered content
justifyContent: 'center',
alignItems: 'center',

// Spaced row
flexDirection: 'row',
justifyContent: 'space-between',
```

### Incorrect Patterns

```typescript
// WRONG - absolute for layout
position: 'absolute',
top: 100,
left: 20,

// WRONG - ignoring safe areas
paddingTop: 44,
```

---

## Colors

Use semantic colors from theme only.

| Token | Usage |
|-------|-------|
| `theme.text` | Primary text, headings |
| `theme.foreground` | Primary text (alias) |
| `theme.muted` | Secondary text, placeholders |
| `theme.tint` | Interactive elements, links |
| `theme.background` | Screen backgrounds |
| `theme.card` | Card backgrounds |
| `theme.border` | Dividers, outlines |
| `theme.success` | Positive status |
| `theme.warning` | Caution status |
| `theme.error` | Error status, destructive |

### Never

- Hardcode hex values
- Use opacity for text hierarchy (use `muted` instead)
- Create custom color variants

---

## Content

### Text Rules

1. **No emojis** in any UI text
2. **Labels: 1-3 words max**
3. **No chatty language** - avoid "Great job!", "Oops!", etc.
4. **Helper text only when essential**

### Examples

| Wrong | Right |
|-------|-------|
| "Add your first workout!" | "Add workout" |
| "No workouts yet" | "No workouts" |
| "Successfully saved!" | "Saved" |
| "Oops! Something went wrong" | "Error" |

### Button Labels

- Use verbs: Save, Add, Delete, Cancel
- 1-2 words maximum
- No punctuation

---

## Checklist

Before submitting UI changes:

- [ ] No hardcoded spacing values
- [ ] No hardcoded colors
- [ ] No raw fontSize values
- [ ] No absolute positioning for layout
- [ ] No emojis
- [ ] Labels are concise
- [ ] Safe areas respected
- [ ] Theme tokens used throughout
