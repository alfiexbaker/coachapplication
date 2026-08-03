# UI Flow Check Report (coach, chunk-1-of-1)

- Base URL: http://localhost:8083
- Generated: 2026-07-31T19:53:49.654Z
- Total flows: 5
- Failed: 4
- High: 4
- Medium: 0
- Roles: coach
- Profiles: verification
- Chunk size: 5
- Chunk index: 1
- Retries: 1

## High / Medium Findings

- [HIGH] coach_verification_identity (/verification/id) :: action_failed:clickText:Error: Text not visible: Passport | action_failed:assertButtonVisible:Error: Button not visible: Choose document
- [HIGH] coach_verification_background (/verification/background) :: action_failed:assertTextVisible:Error: Text not visible: DBS verified
- [HIGH] coach_verification_insurance (/verification/insurance) :: action_failed:assertButtonVisible:Error: Button not visible: Choose document
- [HIGH] coach_verification_credentials (/verification/credentials) :: action_failed:clickButton:Error: Button not visible: Add credential | action_failed:assertTextVisible:Error: Text not visible: Credential type | action_failed:clickText:Error: Text not visible: Other qualification | action_failed:assertTextVisible:Error: Text not visible: Qualification name | action_failed:assertButtonVisible:Error: Button not visible: Choose document
