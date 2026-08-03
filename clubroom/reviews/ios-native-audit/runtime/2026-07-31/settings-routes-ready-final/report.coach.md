# UI Flow Check Report (coach)

- Base URL: http://localhost:8083
- Generated: 2026-07-31T21:15:29.475Z
- Total flows: 11
- Failed: 4
- High: 4
- Medium: 0
- Roles: coach
- Profiles: settings-routes
- Chunk size: 11
- Retries: 1

## High / Medium Findings

- [HIGH] coach_settings_privacy_policy (/settings/privacy-policy) :: requestfailed:GET:http://localhost:4000/v1/auth/me:net::ERR_CONNECTION_REFUSED | console:Failed to load resource: net::ERR_CONNECTION_REFUSED | requestfailed:POST:http://localhost:4000/v1/auth/logout:net::ERR_CONNECTION_REFUSED | console:Failed to load resource: net::ERR_CONNECTION_REFUSED | auth:login_form_visible_after_navigation:/settings/privacy-policy | auth:login_form_visible_after_navigation:/settings/privacy-policy
- [HIGH] coach_settings_privacy (/settings/privacy) :: auth:login_form_visible_after_navigation:/settings/privacy | auth:login_form_visible_after_navigation:/settings/privacy
- [HIGH] coach_settings_terms (/settings/terms) :: auth:login_form_visible_after_navigation:/settings/terms | auth:login_form_visible_after_navigation:/settings/terms
- [HIGH] coach_settings_travel_radius (/settings/travel-radius) :: auth:login_form_visible_after_navigation:/settings/travel-radius | auth:login_form_visible_after_navigation:/settings/travel-radius
