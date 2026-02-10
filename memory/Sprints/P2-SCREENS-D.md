# P2-SCREENS-D — useScreen + Visual States (Settings + Verification + Videos + Skills)

**Category**: Screen Layer (35 → 80)
**Scope**: Specific app/ subdirectories listed below ONLY.
**Run**: Parallel with P2-A, P2-B, P2-C, P2-E. No file overlap.

## Screens to Migrate (22 files)

```
app/settings/account.tsx
app/settings/appearance.tsx
app/settings/calendar-sync.tsx
app/settings/coaching.tsx
app/settings/help.tsx
app/settings/index.tsx
app/settings/notifications/index.tsx
app/settings/notifications/preferences.tsx
app/settings/privacy-policy.tsx
app/settings/privacy.tsx
app/settings/terms.tsx
app/skills/[category].tsx
app/skills/index.tsx
app/verification/background.tsx
app/verification/credentials.tsx
app/verification/id.tsx
app/verification/index.tsx
app/videos/[id].tsx
app/videos/annotate/[id].tsx
app/videos/index.tsx
app/videos/review/[id].tsx
app/videos/upload.tsx
```

## Owned Directories (exclusive)
- `app/settings/`
- `app/skills/`
- `app/verification/`
- `app/videos/`

## Migration Pattern
Same as P2-SCREENS-A.md.

## Special Cases

**Settings screens** (most are static/form screens):
Many settings screens don't load data — they're configuration forms. Use palette-only:
```typescript
const { colors: palette } = useScreen<null>({
  load: async () => ok(null),
  isEmpty: () => false,
});
```
Exceptions: `settings/index.tsx` (loads user profile), `settings/notifications/preferences.tsx` (loads preferences).

**Static content screens** (privacy-policy, terms, help):
These render static text. Palette-only useScreen.

**Verification screens** (form flow):
These are a multi-step wizard. Palette-only useScreen, except `verification/index.tsx` which loads verification status.

**Video screens** (data-heavy):
Full useScreen:
- `videos/index.tsx` — loads video list
- `videos/[id].tsx` — loads video by ID
- `videos/review/[id].tsx` — loads video + annotations
- `videos/annotate/[id].tsx` — loads video for annotation (form-like)
- `videos/upload.tsx` — form, palette-only

**Skills screens**:
- `skills/index.tsx` — loads skill tree
- `skills/[category].tsx` — loads skills by category

## Quality Gate
- [ ] All 22 files have `useScreen` import
- [ ] Data screens have full 4 states
- [ ] Static/form screens have palette-only useScreen
- [ ] No new TypeScript errors

## Do NOT Touch
- Other app/ directories
- components/, services/
