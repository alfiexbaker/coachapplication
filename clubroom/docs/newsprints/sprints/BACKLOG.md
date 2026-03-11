# Sprint Backlog

Updated: 2026-03-11
Rule: active and current work only.

| ID | Work | Spine(s) | Status | Source |
|---|---|---|---|---|
| AUTH-01 | Unify frontend auth calls with the real `/v1` backend contract and remove `/api/auth/*` drift | Trust/Safety/Ops + Development | NOW | `docs/SOURCE_OF_TRUTH.md`, `CHATGPT.md`, `docs/trust/auth-and-permission-boundaries.md` |
| API-01 | Make sensitive family, medical, booking, and safeguarding flows backend-authoritative instead of mock-first | Trust/Safety/Ops + Booking/Revenue | OPEN | `docs/SOURCE_OF_TRUTH.md`, `docs/backend-api/ROUTE_INVENTORY_V1.md`, `docs/backend-api/AUTHZ_AUDIT_AND_SECURITY.md` |
| OBS-01 | Wire Sentry across Expo native, Expo web, and `apps/api` with release tagging and source maps | Development + Trust/Safety/Ops | OPEN | `docs/SOURCE_OF_TRUTH.md`, `docs/backend-api/README.md` |
| DX-01 | Fix repo-critical audit and lint scripts so missing shell tooling cannot produce false green signals | Development | OPEN | `docs/product-reality/PRODUCT_REALITY_AUDIT_2026-03-10.md` |
| GOV-01 | Keep club governance as the shared authority for UI and API authorization decisions | Booking/Revenue + Trust/Safety/Ops | OPEN | `contracts/club-governance.ts`, `docs/architecture/club-relationship-rules.md` |

## Execution Order

1. `AUTH-01`
2. `API-01`
3. `OBS-01`
4. `DX-01`
5. `GOV-01` as follow-through on the first two items
