# Pre-API Sprint Series

> Everything that must be done before we connect a real backend.
> Cash-only payments — no Stripe, no wallet, no invoices for MVP.

## Principles

- **Quality > quantity** — concise, clean code. No dead code, no over-abstraction.
- **Great UI** — every screen handles loading, error, empty. Smooth transitions. Clear hierarchy.
- **One place** — types in `constants/`, services in `services/`, screens in `app/`. No duplication.
- **User-first** — every sprint starts with "what does each role need?"

## Sprint Map

| Sprint | Focus | Fixes |
|--------|-------|-------|
| **1** | Service layer + broken flows | Standardise all 46 services. Fix invite→booking. Fix counter-offer→booking. |
| **2** | Session lifecycle | Attendance marking. Session completion flow. Post-session notes. Review prompt. |
| **3** | Coach settings | Scheduling rules UI. Cancellation policy UI. Buffer time. Min notice. |
| **4** | Club & school revamp | Branding editor. Club calendar. Rich feed cards. Academy differentiation. |
| **5** | UI polish & states | Loading/error/empty on all screens. Onboarding checklists. Responsive tweaks. |
| **6** | Auth + API contracts | Real auth flow prep. API contract per domain. DB schema. Final handoff doc. |

## What's Out of Scope (for now)

- Stripe / wallet / invoices / promo codes / packages (cash-only MVP)
- Live streaming / wearable integration
- AI recommendations
- Multi-sport (football only)
- Push notifications infrastructure (just in-app)

## Payment Model for MVP

Coaches set their price. Parents see the price. Parent books. Parent pays coach in cash at the session. No money flows through the platform yet. The `priceUsd` / `pricePerSession` fields remain for display only.

## Reading Order

1. This README
2. Each sprint doc (1-6) in order
3. `API_README.md` — the master API contract for all domains
