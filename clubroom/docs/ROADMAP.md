# Clubroom — 5-Month UI & Product Roadmap

> Created: 2026-02-08
> Based on: 6-agent deep audit (sprint, screen, service, component, docs/nav, UX flow, quality metrics)

---

## Current State (Updated 2026-02-08)

| Metric | Score | Detail |
|--------|-------|--------|
| Architecture (service layer) | 95/100 | Zero `any`, Result<T> pattern, event bus, base service |
| Screen layer | 42/100 | 132/185 screens >300 lines, only 10 have error states |
| Component layer | 50/100 | 195/380 components >250 lines, ~162 hardcoded hex colors remain |
| Test coverage | 22/100 | 27/123 services tested, 16 component tests, 0 integration, 0 E2E |
| Design tokens | 85/100 | Spacing/Typography/Radii adopted; TouchableOpacity: 0, Colors.light: ~3, Shadows.light: 0, fontWeight: clean |
| Navigation | 98/100 | 185 routes, zero dead routes, Routes.* used everywhere |
| Documentation | 90/100 | CLAUDE.md 9-agent pipeline, ROADMAP, USER-STORIES, Sprint index |
| **Overall** | **58/100** | Strong foundations, critical gaps in screen decomposition + testing |

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
1. **78% services untested** — Shipping blind on regressions
2. **132 screens >300 lines** — Unmaintainable, need decomposition
3. **~162 hardcoded hex colors** — Need migration to withAlpha()

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
- [ ] 20 critical services have tests (api-client, event-bus, base-service, auth, booking, invite, availability, calendar, roster, review, notification, badge, club, match, squad, social-feed, drill, family, community, discover)
- [ ] Score: 62/100 (+4)

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
- [ ] 40 services tested
- [ ] Score: 70/100 (+8)

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
- [ ] All hardcoded hex colors replaced (162 -> 0)
- [ ] 60 services tested
- [ ] Comment system (Sprint 4A) fully working
- [ ] Score: 78/100 (+8)

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
- [ ] 80 services tested
- [ ] Score: 88/100 (+10)

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
- [ ] 100% service test coverage
- [ ] 5 E2E tests passing
- [ ] 0 architecture rule violations
- [ ] Score: 95/100 (+7)

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
Month 0 (Now):     58/100  ████████████░░░░░░░░
Month 1 (March):   62/100  ████████████▓░░░░░░░
Month 2 (April):   70/100  ██████████████░░░░░░
Month 3 (May):     78/100  ███████████████▓░░░░
Month 4 (June):    88/100  █████████████████▓░░
Month 5 (July):    95/100  ███████████████████░
```

---

## Key Metrics to Track

| Metric | Now | Month 1 | Month 3 | Month 5 |
|--------|-----|---------|---------|---------|
| Screens >300 lines | 132 | 122 | 80 | 0 |
| Components >250 lines | 195 | 185 | 120 | 0 |
| TouchableOpacity count | **0** ✅ | 0 | 0 | 0 |
| Colors.light.* count | **~3** ✅ | 0 | 0 | 0 |
| Shadows.light.* count | **0** ✅ | 0 | 0 | 0 |
| Hardcoded hex colors | 162 | 140 | 0 | 0 |
| Services tested | 27/123 | 47/123 | 87/123 | 123/123 |
| Screens with error state | 10/185 | 30/185 | 100/185 | 185/185 |
| User stories complete | 151/394 | 170/394 | 260/394 | 340/394 |

---

*This roadmap is a living document. Update after each sprint retrospective.*
