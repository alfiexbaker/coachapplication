# P2-SCREENS-E — useScreen + Visual States (Remaining Screens)

**Category**: Screen Layer (35 → 80)
**Scope**: Specific app/ files listed below ONLY.
**Run**: Parallel with P2-A through P2-D. No file overlap.

## Screens to Migrate (14 files)

```
app/favourites/index.tsx
app/invoices/[id].tsx
app/invoices/index.tsx
app/matches/[id].tsx
app/matches/create.tsx
app/matches/index.tsx
app/packages/[id].tsx
app/packages/index.tsx
app/packages/manage.tsx
app/payment/add-card.tsx
app/payment/methods.tsx
app/referrals/index.tsx
app/referrals/invite.tsx
app/squads/[id]/invite.tsx
```

## Owned Directories (exclusive)
- `app/favourites/`
- `app/invoices/`
- `app/matches/`
- `app/packages/`
- `app/payment/`
- `app/referrals/`
- `app/squads/`

## Migration Pattern
Same as P2-SCREENS-A.md.

## Screen Types

**List screens** (full useScreen + all 4 states):
- favourites/index.tsx — loads favourited coaches
- invoices/index.tsx — loads invoice list
- matches/index.tsx — loads match list
- packages/index.tsx — loads package list
- packages/manage.tsx — loads coach's packages
- payment/methods.tsx — loads payment methods
- referrals/index.tsx — loads referral history

**Detail screens** (full useScreen by ID):
- invoices/[id].tsx — loads invoice by ID
- matches/[id].tsx — loads match by ID
- packages/[id].tsx — loads package by ID

**Form screens** (palette-only useScreen):
- matches/create.tsx — match creation form
- payment/add-card.tsx — card form
- referrals/invite.tsx — invite form
- squads/[id]/invite.tsx — squad invite form

## Service Mapping
- favourites → `favouriteService`
- invoices → `invoiceService`
- matches → `matchService`
- packages → `packageService`
- payment → `paymentService`
- referrals → `referralService`
- squads → `squadService`

## Quality Gate
- [ ] All 14 files have `useScreen` import
- [ ] List/detail screens have full 4 states
- [ ] Form screens have palette-only useScreen
- [ ] No new TypeScript errors

## Do NOT Touch
- Other app/ directories
- components/, services/
