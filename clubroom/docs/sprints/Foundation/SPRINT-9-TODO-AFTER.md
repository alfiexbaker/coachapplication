# Sprint 9: TODO After Foundation

> **Purpose:** Things to fix AFTER all 5 foundation phases are complete.
> **Not urgent now.** This is a parking lot for improvements that matter but shouldn't block the foundation work.

---

## Agent Quality

The code audit proved agents violate CLAUDE.md rules. Fix this BEFORE resuming feature work.

### Harden Agent Prompts
- [ ] Add concrete checklists to every agent prompt (SPEC, ARCHITECT, DESIGN, VERIFY)
- [ ] Replace prose rules with checkbox lists that agents must confirm
- [ ] Add AUTO-FAIL list to every prompt (any, TouchableOpacity, raw Pressable, missing states, >250 lines)
- [ ] Require every agent to read 2-3 existing files as reference before writing code

### Add Automated Verification to VERIFY Agent
- [ ] VERIFY must run `grep` checks, not just read code subjectively
- [ ] `grep "storageService"` → FAIL
- [ ] `grep "Promise<" without "Result<"` in service files → FAIL
- [ ] `grep "throw new Error"` in service files → FAIL
- [ ] `grep "TouchableOpacity\|from 'react-native'.*Pressable"` in screen files → FAIL
- [ ] `grep "flexDirection.*row"` in new screen files → WARN
- [ ] Line count per file → FAIL if >250
- [ ] `grep "useState(true)"` in screen files → FAIL (should use useScreen)

### Agent Logging Rule
**Every agent MUST document what it changes.** Not optional. In every agent prompt, add:

```
MANDATORY: Before finishing, output a CHANGES section:
## Changes Made
| File | Action | What changed |
|------|--------|-------------|
| path/to/file.ts | Modified | Changed X to Y |
```

This lets the orchestrator verify without reading every file.

---

## Dark Mode

- [ ] `constants/theme.ts` has identical light and dark palettes — differentiate them
- [ ] Test every screen in dark mode after differentiating
- [ ] The 266 hardcoded colors (fixed in Phase 4) would have broken dark mode — verify they're all using `colors.*` tokens

---

## Performance

- [ ] Audit FlatList usage — ensure `getItemLayout` where possible for scroll performance
- [ ] Audit image loading — ensure `expo-image` with blur placeholder everywhere
- [ ] Profile the 10 heaviest screens — identify rendering bottlenecks
- [ ] Add `React.memo()` to any remaining un-memoized list item components

---

## Accessibility (WCAG AA)

Sprint 5C (`polish-accessibility.md`) is 50% done. After foundation:
- [ ] Screen reader testing (VoiceOver on iOS, TalkBack on Android)
- [ ] Colour contrast audit (WCAG AA minimum 4.5:1)
- [ ] Focus order verification on every form screen
- [ ] Keyboard navigation for any web deployment
- [ ] `accessibilityRole` on all interactive elements (button, link, checkbox, etc.)

---

## Legacy Cleanup

- [ ] Delete `storageService` entirely (all consumers migrated in Phase 1)
- [ ] Delete `mock-data.ts` function exports (data moved to seed/fixtures in Phase 2)
- [ ] Remove legacy Typography sizes (`xs`, `sm`, `base`, `lg`, `xl`, `2xl`, `3xl`) from theme.ts
- [ ] Remove 6 `as unknown as Href` casts in routes.ts (Expo Router upgrade may fix)
- [ ] Fix 3 `_logger` (unused) declarations in services

---

## Backend Planning

When foundation is complete and API-ready:
- [ ] Review `docs/Sprints/Evaluation/API_README.md` — 22 domains, ~62 DB tables
- [ ] Review `docs/Sprints/Evaluation/SOFTWARE_DESIGN_DOCUMENT.md` — system architecture
- [ ] Review `docs/Sprints/Evaluation/DATA_ARCHITECTURE.md` — data schema
- [ ] Build real auth (registration, login, token management, session expiry)
- [ ] Implement API endpoint mapping in apiClient (storage key → REST endpoint)
- [ ] Deploy backend
- [ ] Flip `USE_MOCK` to `false`

---

## Tracking

As foundation work progresses, ADD items here whenever something is discovered that shouldn't be fixed now but must be fixed later. Format:

```
- [ ] [Category] Description — discovered during Phase X
```

This doc is the "don't forget" list. Everything here gets done before feature work resumes.
