# Position-Specific Pentagon, Position Toggle, Onboarding & Profile Integration

## Context

The 4-corner diamond forces 5 skill groups into 4 FA corners, creating misleading labels and lopsided weighting. We replace it with a **position-specific pentagon** showing the 5 actual skills for each position. We add a **position toggle** so parents see progress per position. We add `primaryPosition` to child profiles (set by parent during add-child/edit, used by coach as default). We update onboarding to use the existing `PositionSelector` component instead of a freeform text field. We change "Attacker" to "Striker" in all display labels.

**Services are PROTECTED — zero logic changes to any service file.**

---

## Label change

`constants/position-skills.ts` line 37:
```
ATT: 'Attacker'  →  ATT: 'Striker'
```

Internal type stays `ATT`. Display label changes everywhere automatically via `POSITION_LABELS`.

---

## Phase 1: Types + Constants (3 files)

### 1. `types/progress-types.ts`
- Add `PentagonData` interface:
  ```ts
  interface PentagonData {
    position: PositionRole;
    attributes: PentagonAttribute[];  // 5 items
    universalSkills: UniversalSkillRating[];  // 4 items (for character bar)
    deltas: Record<string, number>;
    sessionSnapshots: Array<{ id: string; label: string; values: Record<string, number> }>;
    comparisonLabel: string | null;
  }
  interface PentagonAttribute {
    key: string;           // kebab skill name
    label: string;         // e.g. "Shot Stopping"
    value: number;         // 0-100 scale
    rating: number;        // 1-5 dots
    ratingLabel: SkillRatingLevel;  // e.g. "Excellent"
    trend: SkillTrendDirection;
    color: string;
    icon: string;
  }
  interface UniversalSkillRating {
    skill: UniversalSkill;
    rating: number;        // 1-5
    ratingLabel: SkillRatingLevel;
    trend: SkillTrendDirection;
  }
  ```
- Keep `FourCornerData` / `FourCornerDisplay` (backward compat, player card can still use internally)

### 2. `constants/position-skills.ts`
- Change `ATT` label: `'Attacker'` → `'Striker'`
- Add `POSITION_SKILL_COLORS: Record<PositionRole, Record<string, string>>` — unique color per skill per position (5 colors per position)
- Add `POSITION_SKILL_ICONS: Record<string, string>` — Ionicon name per skill (e.g. `'Shot Stopping': 'hand-left-outline'`)
- Add `POSITION_OPTIONS_WITH_ROTATE` for onboarding/profile:
  ```ts
  export const POSITION_OPTIONS_WITH_ROTATE = [
    { key: 'GK', label: 'Goalkeeper', icon: 'hand-left-outline' },
    { key: 'DEF', label: 'Defender', icon: 'shield-outline' },
    { key: 'MID', label: 'Midfielder', icon: 'swap-horizontal-outline' },
    { key: 'ATT', label: 'Striker', icon: 'football-outline' },
    { key: null, label: 'They rotate', icon: 'sync-outline' },
  ];
  ```

### 3. `constants/storage-keys.ts`
- Already has `POSITION_HISTORY` — no change needed

---

## Phase 2: Data model — primaryPosition on child profiles (3 files)

### 4. `services/child-service.ts` — INTERFACE ONLY, no logic change
- Add to `ChildProfile` interface (after `relationship`):
  ```ts
  primaryPosition?: PositionRole | null;  // null = "they rotate"
  ```
- Add same field to `CreateChildInput` interface
- Existing `createChild()` and `updateChild()` pass-through — field flows through automatically

### 5. `hooks/use-add-child.ts`
- Add state: `const [primaryPosition, setPrimaryPosition] = useState<PositionRole | null>(null);`
- Add to `basicProps` object passed to step component
- Include in `handleSave` payload: `primaryPosition: primaryPosition ?? undefined`

### 6. `hooks/use-edit-child-profile.ts`
- Add state: `const [primaryPosition, setPrimaryPosition] = useState<PositionRole | null>(null);`
- Hydrate from `child.primaryPosition` on load
- Include in `handleSave` updates payload

---

## Phase 3: Onboarding + Profile UI (3 files)

### 7. `components/auth/onboarding-step-athlete.tsx`
- Replace freeform TextInput (lines 154-165) with `PositionSelector` component
- Change prop type: `position: string` → `position: PositionRole | null`
- Change callback: `onChangePosition: (value: string) => void` → `onChangePosition: (position: PositionRole | null) => void`
- Add "They rotate" option (5th button or separate "skip" link below)

### 8. `components/auth/onboarding-types.ts`
- Line 48: Change `position: string` → `position: PositionRole | null`
- Line 163 (INITIAL_STATE): Change `position: ''` → `position: null`

### 9. `app/(modal)/edit-child-profile.tsx`
- Add position selector in "Basic Information" section (after relationship pills, ~line 146)
- Uses same pill pattern as gender/relationship (Clickable pills in a Row)
- Shows 5 options: GK / DEF / MID / Striker / They rotate
- Import `POSITION_OPTIONS_WITH_ROTATE` from position-skills

---

## Phase 4: Position toggle component (1 new file)

### 10. `components/progress/position-toggle.tsx` — NEW
- Props: `positions: Array<{ role: PositionRole; sessionCount: number }>`, `selected: PositionRole`, `onChange: (role: PositionRole) => void`
- Horizontal row of pills: `MID (6) · DEF (3) · GK (1)`
- Active pill: tint bg, bold text
- Only shows positions the athlete has been rated in (from position history)
- If only 1 position → don't render (no toggle needed)
- 44px min touch targets, memo'd, useTheme

---

## Phase 5: Pentagon component (1 new file)

### 11. `components/progress/position-pentagon.tsx` — NEW
Clone diamond geometry, change to 5 axes:

**SVG geometry:**
- 5 vertices at 72° intervals, starting from top (-90°):
  ```
  angle(i) = -π/2 + (2π/5) * i
  point(i) = { x: cx + r*cos(angle), y: cy + r*sin(angle) }
  ```
- Grid rings at 1/2/3/4/5 (pentagon-shaped, not circular)
- 5 colored axis lines from center to tips
- Filled polygon (current values) with radial gradient
- Dashed polygon (comparison values, 4 weeks ago)
- Vertex dots at each point

**Props:**
```ts
interface PositionPentagonProps {
  data: PentagonData;
  isParentView?: boolean;
  velocityHighlight?: { skill: string; delta: number; weeks: number } | null;
}
```

**Below chart — 5 attribute chips:**
- Layout: Row of 3 on top, Row of 2 below (centered)
- Each chip: color dot + label + rating label (e.g. "Excellent") + trend arrow
- Tap chip → expand detail panel showing that single skill's history
- Same animation pattern as diamond (FadeInDown entry)

**Session morphing:**
- Reuse same interval/interpolation pattern from diamond
- 5 values instead of 4, same timing (12 steps, 105ms/frame, 520ms pause)

---

## Phase 6: Character bar (1 new file)

### 12. `components/progress/character-bar.tsx` — NEW
- Shows 4 universal skills in a compact horizontal layout
- Each skill: label + rating label (e.g. "Work Rate: Excellent") + trend arrow (↑ or →)
- Single row if space allows, 2x2 grid on compact screens
- Props: `universalSkills: UniversalSkillRating[]`
- Muted styling — secondary to pentagon, not competing for attention
- memo'd, useTheme

---

## Phase 7: Pentagon data hook (1 new file)

### 13. `hooks/use-pentagon-data.ts` — NEW
- Signature: `usePentagonData(skills: SkillLevel[], feedback: SessionFeedback[], position: PositionRole)`
- Returns: `PentagonData`

**Logic:**
1. Get position-specific skills: `POSITION_SKILLS[position]` (5 skills)
2. For each positional skill, find matching `SkillLevel` in `skills` array
3. Convert level (1-10) to value (0-100): `level * 10`
4. Convert level to rating (1-5): `Math.ceil(level / 2)`
5. Get rating label from `RATING_LABELS[rating]`
6. Compute deltas from 28-day comparison (same pattern as use-four-corners)
7. Build session snapshots from feedback that has `positionPlayed === position`
8. Extract universal skills separately for character bar

Also returns:
- `availablePositions: Array<{ role: PositionRole; sessionCount: number }>` — for toggle
- `universalSkills: UniversalSkillRating[]` — for character bar

---

## Phase 8: Wire to My Progress (3 files)

### 14. `hooks/use-my-progress.ts`
- Import `usePentagonData` (new hook)
- Load child's `primaryPosition` from child service
- Add state: `selectedPosition` (defaults to `primaryPosition` or most-played from position service)
- Call `usePentagonData(skills, feedback, selectedPosition)` alongside existing `useFourCorners`
- Return: `pentagonData`, `selectedPosition`, `setSelectedPosition`, `availablePositions`, `universalSkills`
- Keep `fourCorners` for backward compat (player card still uses it for now)

### 15. `app/development/my-progress.tsx`
- Between player card (line 504) and coach card (line 520), replace diamond section:
  - Remove `<FourCornerDiamond>` (lines 506-518)
  - Add `<PositionToggle>` (only if `availablePositions.length > 1`)
  - Add `<PositionPentagon>`
  - Add `<CharacterBar>`
- Import new components, remove `FourCornerDiamond` import

### 16. `hooks/use-quick-rate.ts`
- Change default position: instead of hardcoded `'MID'`, use child's `primaryPosition` if available
- Minimal change — just the default value in initialization

---

## Phase 9: Child card + athlete profile (2 files)

### 17. `components/family/children-child-card.tsx`
- Show position pill in metadata row (alongside age/relationship pills)
- Uses `POSITION_LABELS[child.primaryPosition]` for text
- If `primaryPosition === null`, show "Rotates" pill or nothing

### 18. `app/development/athlete/[athleteId]/index.tsx` (or equivalent coach athlete view)
- Show primary position in athlete hero section
- Coach can tap to change → position selector inline
- Saves via `childService.updateChild()`

---

## Phase 10: Player card update (2 files)

### 19. `hooks/use-player-card.ts`
- Accept `position?: PositionRole` parameter
- If position provided: compute 5 position-specific scores instead of 4 corner scores
- Use `POSITION_SKILLS[position]` to get skill names, match against `skills` array
- Return 5 attributes with FIFA scores (0-99)
- If no position: fall back to existing 4-corner logic

### 20. `components/progress/player-card-front.tsx`
- If 5 attributes: render as 3 pills top row + 2 pills bottom row (centered)
- Dynamic labels/icons from `POSITION_SKILL_ICONS`
- If 4 corners (fallback): keep existing 2x2 layout

---

## Phase 11: Onboarding screen wiring (1 file)

### 21. `components/auth/onboarding-screen.tsx`
- Update `handleChangePosition` callback type: `(value: string)` → `(position: PositionRole | null)`
- Import `PositionRole` type

---

## Files summary

| # | File | Action | Risk |
|---|------|--------|------|
| 1 | `types/progress-types.ts` | EDIT — add pentagon types | None |
| 2 | `constants/position-skills.ts` | EDIT — Striker label, colors, icons | None |
| 3 | `services/child-service.ts` | EDIT — add `primaryPosition` to interface | **Zero logic** |
| 4 | `hooks/use-add-child.ts` | EDIT — add position state | Low |
| 5 | `hooks/use-edit-child-profile.ts` | EDIT — add position state | Low |
| 6 | `components/auth/onboarding-step-athlete.tsx` | EDIT — PositionSelector | Low |
| 7 | `components/auth/onboarding-types.ts` | EDIT — position type | None |
| 8 | `app/(modal)/edit-child-profile.tsx` | EDIT — add position pills | Low |
| 9 | `components/auth/onboarding-screen.tsx` | EDIT — callback type | None |
| 10 | `components/progress/position-toggle.tsx` | **NEW** | — |
| 11 | `components/progress/position-pentagon.tsx` | **NEW** | — |
| 12 | `components/progress/character-bar.tsx` | **NEW** | — |
| 13 | `hooks/use-pentagon-data.ts` | **NEW** | — |
| 14 | `hooks/use-my-progress.ts` | EDIT — wire pentagon | Medium |
| 15 | `app/development/my-progress.tsx` | EDIT — swap diamond | Medium |
| 16 | `hooks/use-quick-rate.ts` | EDIT — default position | Low |
| 17 | `components/family/children-child-card.tsx` | EDIT — position pill | Low |
| 18 | `app/development/athlete/[athleteId]/index.tsx` | EDIT — show position | Low |
| 19 | `hooks/use-player-card.ts` | EDIT — 5 attributes | Medium |
| 20 | `components/progress/player-card-front.tsx` | EDIT — 5 pill layout | Medium |
| 21 | `components/auth/onboarding-screen.tsx` | EDIT — callback type | None |

**4 new files, 17 edits. 0 service logic changes. 1 interface-only service touch.**

---

## Verification

1. `npx tsc -p tsconfig.test.json` — zero errors
2. Onboarding: athlete signup shows PositionSelector with GK/DEF/MID/Striker/They rotate
3. Add child: position selector appears in basic info section
4. Edit child: position selector shows current position, can change
5. Child card: shows position pill next to age
6. My Progress: pentagon shows 5 position-specific skills
7. My Progress: position toggle switches between positions (if multiple)
8. My Progress: character bar shows 4 universal skills with labels
9. Player card: shows 5 position-specific FIFA scores
10. Quick rate: pre-fills position from child's primaryPosition
11. All labels show "Striker" not "Attacker"
