# UI Flow Check Report (coach)

- Base URL: http://localhost:8083
- Generated: 2026-07-31T19:26:07.082Z
- Total flows: 40
- Failed: 5
- High: 5
- Medium: 0
- Roles: coach
- Chunk size: 40
- Retries: 1

## High / Medium Findings

- [HIGH] coach_add_member_to_squad (/club/squad/sqd_9640510a-e7cb-7575-a2a7-649ac28b5ee2) :: action_failed:clickButton:Error: Button not visible: Add
- [HIGH] coach_schedule_location_modal_actions (/schedule?segment=availability) :: action_failed:clickText:Error: Text not visible: Add time block | action_failed:clickButton:Error: Button not visible: Add new venue | action_failed:assertTextVisible:Error: Text not visible: Use Location
- [HIGH] coach_earnings_payment_instructions (/earnings) :: action_failed:clickText:Error: Text not visible: Payment Instructions | action_failed:assertTextVisible:Error: Text not visible: Direct Payment Instructions | action_failed:assertButtonVisible:Error: Button not visible: Copy direct payment instructions
- [HIGH] coach_verification_identity (/verification/id) :: action_failed:clickText:Error: Text not visible: Passport | action_failed:assertButtonVisible:Error: Button not visible: Choose document
- [HIGH] coach_verification_credentials (/verification/credentials) :: action_failed:clickButton:Error: Button not visible: Add credential | action_failed:assertTextVisible:Error: Text not visible: Credential type | action_failed:clickText:Error: Text not visible: Other qualification | action_failed:assertTextVisible:Error: Text not visible: Qualification name | action_failed:assertButtonVisible:Error: Button not visible: Choose document
