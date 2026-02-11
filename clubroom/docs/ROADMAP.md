# Clubroom — 5-Month UI & Product Roadmap

> Created: 2026-02-08
> Last synced with repo metrics: 2026-02-11
> Based on: 6-agent deep audit (sprint, screen, service, component, docs/nav, UX flow, quality metrics)

---

## Current State (Updated 2026-02-11)

| Metric | Score | Detail |
|--------|-------|--------|
| Architecture (service layer) | 95/100 | Zero `any`, Result<T> pattern, event bus, base service |
| Screen layer | 88/100 | 4/189 screens >300 lines; `use-screen` imported in 76 route files |
| Component layer | 72/100 | 61/924 components >250 lines; decomposition still needed |
| Test coverage | 74/100 | 92 service-related test files for 126 service TS files, 0 E2E |
| Design tokens | 90/100 | TouchableOpacity: 0, Colors.light: 3, Shadows.light: 0, withAlpha widely adopted |
| Navigation | 98/100 | 189 route files, zero dead routes, Routes.* used everywhere |
| Documentation | 84/100 | Core docs are strong but had metric drift; now re-synced |
| **Overall** | **74/100** | Foundations are strong; priorities moved to components, test depth, and polish |

### Completed Quality Sprints (since audit)
- **Sprint 6**: Shadows.light → Shadows[scheme] — 7/7 files, 0 remaining
- **Sprint 7**: TouchableOpacity → Pressable — 52/52 files, 0 remaining
- **Sprint 8**: Colors.light.* → useTheme() — ~216 files, ~3 infrastructure-only remaining
- **Sprint 9**: fontWeight → Typography tokens — 17 files, 19 edits, remaining are intentional
- **Sprint 1A**: API client pattern standardised across 59 services
- **Sprint 1B**: Invite→booking + counter-offer→booking bugs FIXED
- **Sprint 1C**: Offline banner + action queue BUILT
- **Sprint 5B**: Coach + parent onboarding checklists BUILT
- **Sprint 6A**: JWT auth + demo mode + token refresh BUILT
- **Sprint 6B**: API contracts (1,584 lines) + error types BUILT
- **Sprint 10A**: Coach + parent welcome/onboarding flows BUILT

### User Stories
- 155 built, 24 need enhancement, 96 to build, 18 deferred (cash MVP)
- 101 new stories identified from audit

### Remaining Blockers
1. **61 components >250 lines** — still expensive to maintain and review
2. **Test depth uneven across domains** — high file count, but no integration/E2E confidence
3. **Visual-state standardisation incomplete** — `use-screen` pattern is not universal yet
4. **359 raw hex literals remain** — requires semantic-token cleanup pass

---

## Month 1: Foundation Fix (March 2026)

**Theme:** Fix what's broken. Make the core booking loop work flawlessly.

### Week 1-2: Critical Path Fixes
| Item | Sprint | Impact |
|------|--------|--------|
| Fix invite->booking bug (accept creates Booking) | 1 | CRITICAL — core loop broken |
| Offline banner + action queue | 1 | CRITICAL — users lose data |
| Standardise API client pattern across services | 1 | Infrastructure debt |

### Week 3-4: Session Completion + RSVP
| Item | Sprint | Impact |
|------|--------|--------|
| Session completion checklist (attendance -> notes -> badges -> done) | 2 | Coach post-session UX |
| RSVP for group sessions (going/can't/maybe) | 2 | Spond-beater feature |
| Rate session with coach (trigger after completion) | 2 | Review flow |
| RSVP count on group sessions | 2 | Social proof |
| Add booking to phone calendar | 2 | Retention |
| Decline invite with reason | 2 | Communication |

### Quality Gate (end of Month 1)
- [ ] Core booking loop works end-to-end (invite -> accept -> booking -> complete -> review)
- [x] 20 critical services have tests (baseline exceeded; now 92/126 service-related test files)
- [ ] Score: 78/100 (+4)

---

## Month 2: Schedule & Safety (April 2026)

**Theme:** Coach scheduling polished. Safety features complete. Cancellation flows trustworthy.

### Week 1-2: Schedule & Cancellation
| Item | Sprint | Impact |
|------|--------|--------|
| Cancellation policy display (before booking + on cancel) | 3 | Trust |
| "Pay cash at session" reminder | 3 | Clarity |
| Cancel session with notification to all participants | 3 | Communication |
| Reschedule session proper flow | 3 | UX |
| Maximum advance booking setting | 3 | Coach control |
| Same-day booking toggle | 3 | Flexibility |
| Buffer time / minimum notice enhancement | 3 | Schedule quality |
| Mark no-show with categorisation | 3 | Coach tools |

### Week 3-4: Quality Sprint + Codemod
| Item | Sprint | Impact |
|------|--------|--------|
| ~~Replace TouchableOpacity -> Pressable~~ | ~~Quality~~ | ✅ DONE (Sprint 7 — 52/52 files) |
| ~~Fix Colors.light.* -> useTheme()~~ | ~~Quality~~ | ✅ DONE (Sprint 8 — ~216 files) |
| Refactor top 10 oversized screens into sub-components | Quality | Maintainability |
| Smart slot suggestions based on booking patterns | 3 | Delight |

### Quality Gate (end of Month 2)
- [x] TouchableOpacity: 0 ✅ (Sprint 7)
- [x] Colors.light.* → useTheme() ✅ (Sprint 8, ~3 infrastructure-only remain)
- [ ] 10 worst screens refactored to <300 lines
- [x] 40 services tested (already exceeded)
- [ ] Score: 84/100 (+6)

---

## Month 3: Social & Community (May 2026)

**Theme:** Club Hub becomes the heartbeat. Invites become shareable. Communication flows naturally.

### Week 1-2: Club & Squad Communication
| Item | Sprint | Impact |
|------|--------|--------|
| Squad auto-create group chat on creation | 4B | Communication |
| Auto-sync squad group membership | 4B | Consistency |
| Coach message whole squad from squad screen | 4B | Convenience |
| Parent auto-join squad group when child added | 4B | Onboarding |
| Club dashboard with stats + quick actions | 4 | Admin power |
| Club calendar aggregating all squads | 4 | Overview |
| Pin announcements in group chat | 4 | Moderation |

### Week 3-4: Invite Experience Revolution
| Item | Sprint | Impact |
|------|--------|--------|
| Cover images on invites/sessions (Facebook Events style) | 5 | Visual appeal |
| Shareable invite link (WhatsApp/SMS) | 5 | Growth |
| Quick 1-tap RSVP from invite list | 5 | Conversion |
| "Maybe" RSVP option | 5 | Flexibility |
| Social proof on invite cards (attendee count + avatars) | 5 | Social proof |
| Attendee list modal ("See who's going") | 5 | Transparency |
| Location map preview + "Get Directions" | 5 | Utility |
| Pin "Upcoming Events" carousel in Club Hub | 5 | Engagement |

### Quality Gate (end of Month 3)
- [x] All Colors.light.* replaced ✅ (Sprint 8 — ~3 infrastructure-only remain)
- [ ] All hardcoded hex colors replaced (359 -> 0)
- [x] 60 services tested (already exceeded)
- [ ] Comment system (Sprint 4A) fully working
- [ ] Score: 88/100 (+4)

---

## Month 4: Safety, Notifications & Polish (June 2026)

**Theme:** Push notifications live. Safety features complete. Error states everywhere.

### Week 1-2: Notifications & Safety
| Item | Sprint | Impact |
|------|--------|--------|
| Push notification infrastructure | 6 | CRITICAL — engagement |
| Deep link from notification to relevant screen | 6 | UX |
| Booking confirmation notifications | 6 | Trust |
| Session reminder 24h + 1h with directions | 6 | Attendance |
| Cancellation notifications | 6 | Communication |
| Block a user | 5 | Safety |
| Report inappropriate messages | 5 | Safety |
| Safety reporting full flow | 5 | Safety |
| Delete account (GDPR) | 5 | Compliance |
| Data export (GDPR) | 5 | Compliance |

### Week 3-4: Error States + Screen Quality
| Item | Sprint | Impact |
|------|--------|--------|
| Loading skeletons on every screen (not spinners) | 5 | Polish |
| Error states with retry on every screen | 5 | Reliability |
| Contextual empty states with CTA on every screen | 5 | Guidance |
| Refactor remaining oversized screens (target: 0 over 300 lines) | Quality | Maintainability |
| Refactor oversized components (target: 0 over 250 lines) | Quality | Maintainability |
| Notification preferences per-type toggles | 5 | Control |
| Family sharing verification | 5 | Trust |
| JWT auth with token refresh | 6 | Infrastructure |
| Mock -> real API toggle via env var | 6 | Infrastructure |

### Quality Gate (end of Month 4)
- [ ] Push notifications working on iOS + Android
- [ ] Every screen has all 4 visual states
- [ ] 0 screens over 300 lines
- [ ] 0 components over 250 lines
- [x] 80 services tested (already exceeded)
- [ ] Score: 92/100 (+4)

---

## Month 5: Discovery, Delight & Launch Prep (July 2026)

**Theme:** Coach discovery becomes Airbnb-quality. Celebrations make the app feel alive. Launch-ready.

### Week 1-2: Discovery Revolution
| Item | Sprint | Impact |
|------|--------|--------|
| Shareable public coach profile (works without login) | 7 | Growth |
| Shareable booking link + QR code | 7 | Growth |
| Offer trial/taster sessions | 7 | Conversion |
| "Similar coaches" on coach profile | 7 | Discovery |
| Earnings projections (confirmed + pending + projected) | 7 | Coach value |
| Trial session conversion tracking | 7 | Analytics |
| Coaches on map with price pins (Airbnb-style) | 8 | Discovery |
| Featured coaches near me | 8 | Discovery |
| Recommended coaches for child (age/skill match) | 8 | Personalisation |
| Browse by specialty chips | 8 | Navigation |
| Search suggestions (recent + popular) | 8 | UX |
| Filter by trial available | 8 | Discovery |

### Week 3-4: Delight + Launch
| Item | Sprint | Impact |
|------|--------|--------|
| Confetti celebration on badge earned | 10 | Delight |
| Celebration on goal completed | 10 | Delight |
| Coach milestone celebrations (10/25/50/100 sessions) | 10 | Retention |
| Guided coach onboarding (5 screens) | 10 | Activation |
| Guided parent onboarding (3 screens) | 10 | Activation |
| Session reminders with directions | 10 | Attendance |
| Micro-interactions (haptics, press states, animations) | 10 | Polish |
| Shareable achievement cards | 10 | Organic growth |
| Deep linking for all shareable content | 6 | Infrastructure |
| 100% service test coverage | Quality | Confidence |
| E2E tests for 5 critical user journeys | Quality | Confidence |

### Quality Gate (end of Month 5)
- [ ] Coach discovery is Airbnb-quality
- [ ] Onboarding exists for all personas
- [ ] 126/126 service modules with strong test depth + 5 E2E critical journeys
- [ ] 5 E2E tests passing
- [ ] 0 architecture rule violations
- [ ] Score: 95/100 (+3)

---

## Sprint-to-Month Mapping

| Sprint | Month | Focus |
|--------|-------|-------|
| Sprint 1 | Month 1 (W1-2) | Critical path fixes |
| Sprint 2 | Month 1 (W3-4) | Session completion + RSVP |
| Sprint 3 | Month 2 (W1-2) | Schedule + cancellation |
| Sprint 4/4B | Month 3 (W1-2) | Club + squad comms |
| Sprint 5 | Month 3-4 | Invite UX + safety + polish |
| Sprint 6 | Month 4 | Notifications + infrastructure |
| Sprint 7 | Month 5 (W1) | Coach profiles + earnings |
| Sprint 8 | Month 5 (W1-2) | Discovery revolution |
| Sprint 9 | Partial | Progress tracking — 9A/9C/9D BUILT (radar, challenges, journal) |
| Sprint 10 | Month 5 (W3-4) | Delight + onboarding |

---

## Deferred to Post-Launch (Sprint 9 Backlog)

These are valuable but not launch-critical:
- Session plan templates
- ~~Video challenges~~ ✅ Sprint 9C (challenges list, create challenge, submit attempts)
- Challenge leaderboard
- Monthly progress report (shareable)
- ~~Personal session journal with mood/energy~~ ✅ Sprint 9D (journal screen + session-journal component)
- Goal setting with age-based suggestions
- Assign from session plan templates
- ~~Create video challenges for players~~ ✅ Sprint 9C (create-challenge.tsx)
- Challenge leaderboard
- Submit video challenge attempts

---

## Quality Score Trajectory

```
Month 0 (Now):     74/100  ███████████████░░░░░
Month 1 (March):   78/100  ███████████████▓░░░░
Month 2 (April):   84/100  █████████████████░░░
Month 3 (May):     88/100  █████████████████▓░░
Month 4 (June):    92/100  ██████████████████▓░
Month 5 (July):    95/100  ███████████████████░
```

---

## Key Metrics to Track

| Metric | Now | Month 1 | Month 3 | Month 5 |
|--------|-----|---------|---------|---------|
| Screens >300 lines | 4 | 2 | 0 | 0 |
| Components >250 lines | 61 | 45 | 20 | 0 |
| TouchableOpacity count | **0** ✅ | 0 | 0 | 0 |
| Colors.light.* count | **3** ✅ | 0 | 0 | 0 |
| Shadows.light.* count | **0** ✅ | 0 | 0 | 0 |
| Hardcoded hex colors | 359 | 280 | 120 | 0 |
| Service-related test files | 92/126 | 100/126 | 115/126 | 126/126 |
| Screens using `use-screen` pattern | 76/189 | 110/189 | 150/189 | 189/189 |
| User stories complete | 155/293 | 170/293 | 220/293 | 260/293 |

---

*This roadmap is a living document. Update after each sprint retrospective.*
