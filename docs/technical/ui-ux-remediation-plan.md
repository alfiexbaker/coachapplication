# UI/UX Audit, Causes, and Wireframes (Mobile Web/Expo)

## What is causing the current "short/baggy" look
- **Inconsistent spacing + lack of grid:** Screens mix ad-hoc padding (e.g., `paddingHorizontal: 20` and `paddingVertical: 16` in the social feed header) with tokenized spacing (`Spacing.lg` etc.), so elements stack tightly and break vertical rhythm. 【F:clubroom/app/(tabs)/feed.tsx†L17-L40】
- **Cards sit on flat backgrounds:** Many screens layer surface cards on the same dark background without contrast/elevation hierarchy, so sections blur together instead of feeling structured. Examples: coach development list and athlete detail cards reuse the same palette/background with minimal separation. 【F:clubroom/components/coach/development-screen.tsx†L76-L146】【F:clubroom/app/development/athlete/[athleteId].tsx†L55-L143】
- **Heavy mock data blocks instead of progressive disclosure:** Lists dump full stats/skills without chunking (session history cards include date, badges, skills, notes, video indicators in one dense card), making the page feel busy and short on breathing room. 【F:clubroom/app/development/athlete/[athleteId].tsx†L95-L191】
- **No safe bottom padding for long lists on some views:** Several ScrollViews rely on minimal `paddingBottom`, so content stops abruptly above the tab bar rather than flowing to the end with an affordance. 【F:clubroom/app/(tabs)/feed.tsx†L28-L40】【F:clubroom/components/coach/development-screen.tsx†L126-L135】

## Plan to reach Uber/Airbnb-level clarity
1) **Establish design tokens + layout grid**
   - Define 8pt spacing, type scale, radii, and elevation levels in a single token source; expose via `Colors/Spacing/Radii/Shadows` and enforce across screens.
   - Add a `Screen`/`Page` wrapper that sets standard padding, max width, and vertical rhythm to replace per-screen ad-hoc padding.
2) **Brand system: color + typography**
   - Commit to a restrained palette: background neutrals (e.g., off-black `#0E0E10`, surface `#17171B`), two accent hues (primary `#5C7CFA` for CTAs, success `#2BD17E` for positive trends), and semantic roles (info/warn/error) with WCAG contrast checked.
   - Typography: swap to a humanist/rounded sans (e.g., Inter/Manrope/SF Pro) with a 1.25–1.333 modular scale; define weights for headings (600), body (400/500), and numerals (tabular for stats). Apply consistent letter-spacing and 150% line-height on body.
   - Export tokens for React Native + web via a single source (Style Dictionary / token JSON) to avoid drift; lint against inline color codes and font sizes.
3) **Introduce surface hierarchy**
   - Lighten/darken surfaces to create a clear stack: background → section surface → interactive card. Add soft shadows/borders and consistent corner radii.
   - Add section titles and dividers to group related cards (e.g., athlete overview vs. session history).
4) **Progressive disclosure + skeletal loading**
   - Collapse dense cards by default: show key metric + CTA, reveal details in a drawer/modal.
   - Add skeletons/shimmers for lists while data loads; include empty/error states with clear CTAs.
5) **Action-first headers and floating CTAs**
   - Replace plain titles with headers that contain the primary action (e.g., “Development” + “Add session” button). Add a floating “New booking”/"New post" CTA where appropriate.
6) **Navigation and padding guardrails**
   - Standardize SafeArea + bottom padding so lists scroll under a 16–24px buffer above the tab bar; audit every `ScrollView` for `contentContainerStyle` that uses `flexGrow:1` and consistent bottom spacing.
7) **Brand + motion accents**
   - Add tactile micro-interactions: 200–250ms ease-in-out, 8–12px tap/press offsets on cards, and haptic feedback for primary actions. Keep motion subtle and consistent.

## Color/typography changes to make the app feel “wow”
- **Global palette**: Off-black background (`#0E0E10`), surface (`#17171B`), card (`#1F2025`), border (`rgba(255,255,255,0.06)`); Primary (`#5C7CFA`), Success (`#2BD17E`), Warning (`#FFB545`), Error (`#FF5C8A`), Text (`#F6F7FB`), Subtext (`#AEB3C7`). Build light equivalents for future theming.
- **Gradients for hero moments**: Use restrained, dark-to-brand gradients on hero/CTA areas (e.g., top of athlete progress, booking confirm) while keeping most surfaces flat for readability.
- **Type system**: H1 28–32/36, H2 22–24/30, H3 18/26, Body 16/24, Caption 13/20; use tabular numbers for stats; uppercase micro-labels with 3–4% letter-spacing for pills.
- **Component tokens**: Button heights 48–52px with 14–16px text; icon sizes 20–24px; radii 12–16px for cards, 999px for pills/chips.

## Hooks to make the experience sticky (addictive but respectful)
- **Immediate value on open**: Home shows live/session today info and one-tap primary CTA (e.g., “Start session” or “Log progress”).
- **Progress narrative**: Trend pills (“+8% vs last week”), streaks with gentle reminders, and celebratory states after key actions (confetti pulse/shine on buttons, share prompt optional).
- **Personalization**: Remember last filter/tab per user; surface “next best action” chip (e.g., “Check in with Sam – 2 days since last session”).
- **Social proof & community**: Compact comments/likes preview, social avatars, and lightweight reactions on feed posts.
- **Trust & calm**: Strong contrast, generous whitespace, predictable motion; avoid aggressive notifications—allow snooze/turn off.

## Wireframe sketches (mobile)

### Development (coach home)
```
[Header: Development        (Add session)]
[Key stat strip: Active athletes | Sessions this week | Avg rating]
[Segmented control: Athletes | Sessions]
-- Athletes list --
[Avatar + Name          >]
[Last session • Avg rating • Needs notes badge]
...
```

### Athlete progress
```
[< Back]  Athlete Progress
[Hero card]
- Avatar + Name + Trend pill (📈 Improving)
- Level pill (⭐ Silver)   [CTA: Log session]
- Stats row: Total sessions | Avg rating | Last session
[Section header] Recent focus
[Chips for skills/objectives]
[Section header] Session history
[List of cards: Date + rating + quick badges]
```

### Session detail
```
[< Back]  Session • 20 Nov 2025
[Summary strip: Rating | Attendance | Duration]
[Skills worked on]   [CTA: Add/edit notes]
[Notes area]
[Media row: videos/photos]
[Actions: Share recap | Duplicate session]
```

### Bookings
```
[Header: Bookings        (New booking)]
[Tabs: Calendar | Requests | Past]
[Upcoming card]
- Coach/athlete avatar + name
- Date/time • Location • Status pill
- Objectives preview
[Empty/request states]
```

### Social feed
```
[Header: Social Feed    (+ Post)]
[Story/quick actions row (optional)]
[Feed cards]
- Poster avatar + name + role
- Post text/image
- Engagement row (like/comment/share)
- Compact comments preview
[Floating action button: +]
```
