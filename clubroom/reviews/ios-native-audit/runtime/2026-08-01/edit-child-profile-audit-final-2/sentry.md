# Sentry read-only check

- Used the bundled Sentry skill client and GET-only unresolved-issue request for the configured production environment and a 24-hour window.
- Initial Python certificate lookup failed locally; rerunning with the installed Homebrew CA bundle completed TLS verification.
- The Sentry API returned HTTP 403: the configured credential does not have permission to read project issues.
- No Sentry issue or event data was returned, no token was printed, and no Sentry state was changed.
- Observability verification remains blocked under `ENV-004`; a credential with project issue-read access is required.
