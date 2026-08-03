# Sentry read-only check

Sentry issue/event inspection remains blocked by `ENV-004`. The Sentry MCP is not exposed in this task. The bundled read-only API helper was rerun for the staging environment and last 24 hours with the current configured token; after using the host CA bundle for TLS verification, Sentry returned HTTP 403: the token does not have permission to list project issues.

No Sentry state was changed and no absence-of-error claim is inferred from the blocked readback. Runtime request and console assertions are recorded in `report.json`.
