# S Design Systems & Motion Prong

## Why this prong exists
- Make design excellence a peer to Discovery, Bookings, Coach Ops, Messaging, Performance, and Trust so the app always reads as a £100k flagship rather than an MVP.
- Translate the S0 foundations (visual language, tokens, accessibility, haptics) into concrete deliverables and QA gates for every sprint.
- Provide a single source of truth for imagery, illustration, icon, and animation usage so the product feels bespoke yet consistent across iOS, Android, and web previews.

## Experience goals (building on S0 principles)
1. **Heroic storytelling** – cinematic photography and depth create a "tunnel" into elite coaching; dual-pane Discover should feel choreographed the moment the app opens.
2. **Calm density** – cards and trays hold rich metadata without overload via progressive disclosure, skeletons, and purposeful whitespace.
3. **Trust signals everywhere** – verification badges, safeguarding copy, timestamps, and attendance cues are styled artifacts, not plain labels.
4. **Cross-platform polish** – React Native components always reference shared tokens; platform-specific idioms (blur sheets vs. ripples) are captured with motion specs and haptic notes.
5. **Accessible luxury** – all visual flourishes are paired with WCAG contrast, Dynamic Type support, and VoiceOver-ready labels so "premium" never excludes.

## Asset + imagery system (single library strategy)
To keep the app cohesive, we commit to **one curated asset library, _Just1_**, with three content streams:
- **Photography pack** – raw hero shots and portraits of academy-level coaching from the Just1 "Elite Football" pack. Apply warm diffusion overlays (12% gradient) for Discover hero, Coach profile headers, and onboarding slides.
- **Illustrations** – monochrome spot illustrations from Just1's "Motion Stripe" set for skeletons, empty states, safeguarding banners, and receipt drawers. Tint with `color.secondary` or `color.muted` tokens only.
- **Iconography** – stroke-based icons from the Just1 "Linear Sport" set sized to the typography scale (`font.sm` body icons, `font.lg` hero icons). No mixing with SF Symbols/Material; if a glyph is missing, brief Just1 for a custom addition.
- **Asset handling checklist**
  - Store exports in `app/assets/just1/` (subfolders `photos`, `illustrations`, `icons`).
  - Maintain a `manifest.json` with slug, usage context, credits, and alt-text snippet.
  - Any new feature must reference a manifest entry before merging.

## Animation & motion toolkit
Use one animation technology end-to-end: **Lottie (Just1 Motion Kit)**. The kit ships layered `.json` files for both hero and micro states.

| Surface | Lottie ID | Trigger | Notes |
| --- | --- | --- | --- |
| Discover hero reveal | `just1/hero_pitch.json` | App launch + pull-to-refresh | 600ms ease-out depth zoom synchronized with coach cards sliding in.
| Map pin activation | `just1/pin_pulse.json` | When list item gains focus | Scale 0.9→1.05 with ripple; pair with light haptic `Selection`.
| Booking success | `just1/check_mint.json` | Booking moves to Confirmed | 750ms confetti arc, triggers medium impact haptic + toast.
| Chat message send | `just1/message_whoosh.json` | On send | 320ms stroke reveal; ensure VoiceOver announces "Message sent" simultaneously.
| Performance card expand | `just1/timeline_fold.json` | Expand/collapse | 400ms height animation with physics spring; accessible toggle control required.

Implementation guidance:
- All animations wrapped via a single `MotionAsset` component that loads Lottie JSONs from the Just1 manifest and accepts `prefersReducedMotion` to swap to fade-only transitions.
- Keep JSON payloads <400kb; compress via LottieFiles optimizer and document version in the manifest.
- Motion specs must include haptic + sound pairings (where relevant) and VoiceOver copy to avoid dissonance.

## Screen-by-screen asset expectations
| Screen / Flow | Required imagery | Motion moments | QA checklist |
| --- | --- | --- | --- |
| **Discover dual-pane** | Hero photo (`hero_pitch`) + 3 coach portraits | Hero reveal, map pin pulses, contextual tray snap | Skeleton covers map + list, tokens verified, alt text for hero + portraits |
| **Coach profile** | Cover photo, badge illustration, testimonial portrait | Tab underline slide, service card hover (press) | Ratings and verification badges use icon tokens, gradient overlay within 8% opacity |
| **Booking flow** | Service illustration, child avatar placeholder | Slot selection wiggle, success confetti | Calendar states have 4.5:1 contrast, haptic selection on slot chips |
| **Availability (coach)** | Empty-state illustration, attendance badge | Drag-to-duplicate slot animation | Reduced motion friendly, lottie toggles to fade |
| **Messaging** | Chat background texture, safeguarding illustration | Message send, typing indicator | Typing indicator hidden when reduced motion set, attachments show preview skeleton |
| **Performance timeline** | Entry photo/video thumbnail, Just1 skill badge icons | Timeline fold animation, acknowledgement pulse | Media placeholders follow calm density spacing, voiceover labels mention date + child |
| **Trust & payments** | Verification badge set, insurance card illustration | Badge unlock sparkle | Expiring doc banner uses Just1 icon and tertiary motion (blink) |

## Implementation hooks for engineers
- **Asset manifest** – Build `scripts/assetManifest.ts` to expose strongly typed access (`getAsset('hero_pitch')`). Add lint rule failing builds if asset slug missing alt text or contexts.
- **Design tokens** – Keep referencing `constants/theme.ts`; no literal colors/radii in new components. Expand tokens with `shadow.elevation` + gradient tokens to match hero overlays.
- **Component kit** – Create `components/design/` housing `HeroCard`, `BadgeStack`, `DataTray`, `MotionAsset`, each with Storybook stories showing light/dark, reduced motion, and localization extremes.
- **QA gates** – Add "Design Prong" checklist to PR template: tokens applied, Just1 asset referenced, motion recorded (<10s Loom or GIF), accessibility checked.

## Backlog & ownership
1. **Week 1** – Import Just1 assets, set up manifest + lint, wire MotionAsset + Storybook stories for hero + success animations.
2. **Week 2** – Apply hero system to Discover + Coach profile, update skeletons/empty states with Just1 illustrations, add booking success motion.
3. **Week 3** – Finish chat + performance timeline motions, run cross-platform audit for haptics + reduced motion.
4. **Week 4+** – Monthly design ops review: audit new screens, rotate photography, commission new Just1 icons, archive outdated assets.

## Deliverables per sprint
- Motion spec deck (Figma prototype + Lottie references) linked from sprint doc.
- Updated asset manifest diff with alt text + usage evidence.
- Storybook recording (light/dark, reduced motion) for every new component.
- Accessibility validation log (contrast, Dynamic Type, VoiceOver script).

Treat this document as the gatekeeper for anything visual: no feature ships until it satisfies the asset sourcing, motion execution, token usage, and accessibility promises spelled out here.
