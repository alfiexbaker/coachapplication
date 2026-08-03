# QA-073 — child health editor authority and cache isolation

## Scope

`/child/[id]/medical` and `/child/[id]/emergency` are family-owned editors. This check used seeded local mock data and the actual iOS simulator only. No record was saved, changed, or deleted.

## Finding and fix

The screens checked `canManageChildProfile` before their reads, but their `useScreen` snapshots used only the child ID. A warmed parent snapshot could therefore be considered by a later actor. The shared loader also treated a previously ready frame as visible while a different `dataKey` was loading.

The fix scopes both screen keys to the signed-in user, makes the shared loader block a stale key, and repeats the guardian authority check immediately before editor mutations. It also adds explicit accessibility metadata to icon and switch controls and removes excess helper copy.

## Native iOS evidence

| Role | Route | Result | Screenshot |
| --- | --- | --- | --- |
| Parent | `/child/user2/medical` | Editable child medical form; concise safety disclosure | `parent-medical-authorised.png` |
| Parent | `/child/user2/emergency` | Contacts, primary status, edit/remove and add controls visible | `parent-emergency-authorised.png` |
| Athlete | `/child/user2/medical` | Terminal `Medical information unavailable`; no protected values or retry | `athlete-medical-denied.png` |
| Athlete | `/child/user2/emergency` | Terminal `Emergency contacts unavailable`; no protected values or retry | `athlete-emergency-denied.png` |
| Coach | `/child/user2/medical` | Terminal parent-editor denial; no protected values or retry | `coach-medical-editor-denied.png` |

The parent routes were loaded before the denied checks, so the denial captures specifically exercise the warmed-data boundary. During local role entry, Metro sometimes first showed an unrelated destination skeleton; reopening the target deep link after identity settlement consistently produced the captured authorised or denied state. No persistent target-route loading state was observed.

## API and audit evidence — seeded fixture only

```text
NODE_ENV=test API_DATA_BACKEND=seed apps/api/node_modules/.bin/tsx --test \
  --test-name-pattern='upserts and reads medical, emergency contacts, and consents|denies medical reads for unverified coaches and denies non-guardian writes|ignores forged guardian trust headers on bearer-authenticated requests' \
  apps/api/src/modules/family-athlete/routes.test.ts
```

Passed 3 selected tests. The fixture verifies validation failures create no records, guardian updates and sensitive reads are audited, an unverified coach and a non-guardian are denied, a verified assigned coach can read, a coach cannot update consents, and forged guardian headers do not bypass bearer authentication. Fixture writes are in-memory and end with the test process.

## Local validation

```text
npx eslint --quiet hooks/use-screen.ts hooks/use-medical-info.ts hooks/use-emergency-contacts.ts app/child/[id]/medical.tsx app/child/[id]/emergency.tsx components/child/medical-tag-input.tsx components/child/emergency-contact-form.tsx __tests__/hooks/child-health-authority-boundary.test.ts
./node_modules/.bin/tsc -p tsconfig.test.json --pretty false
node --require ./scripts/test-register.js --test .tmp-tests/__tests__/hooks/child-health-authority-boundary.test.js
```

All passed. Sentry issue inspection remains blocked by `ENV-004`; read-only staging database/RLS posture remains separately recorded under `ENV-005` and `SEC-004`.
