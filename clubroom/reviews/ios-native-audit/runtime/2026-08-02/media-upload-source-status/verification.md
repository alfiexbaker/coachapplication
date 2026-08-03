# Media upload source-status verification

Date: 2026-08-02 BST
Scope: web source reads used by session-media and video signed uploads

## Defect

Both upload services consumed `Response.blob()` without first checking the source response status. A failed HTTP source could therefore be forwarded to the signed storage URL as though it were valid media.

## Fix

- Session media now rejects a non-success source response before reading the body.
- Video uploads now reject a non-success source response before reading the body.
- The signed upload request is not attempted after either source failure.

## Verification

- Root TypeScript typecheck passed.
- Isolated service test compile passed.
- Session-media and API-mode video suites passed: 27/27 tests.
- New failure-path tests returned HTTP 503 from each source and proved the signed upload URLs were never requested.
- React Doctor 0.9.3 diff scan reported zero diagnostics for the changed slice.
- Focused Prettier check passed for both services and the API-mode video test. The media-service test retains its pre-existing whole-file formatter drift to avoid unrelated churn; the new block was formatter-produced.
- Focused ESLint check passed with zero errors and zero warnings after consolidating the pre-existing duplicate API-client import.
- `git diff --check` passed for the slice.

No production or staging request, upload, or database mutation was performed.
