# UI Flow Check Report (admin, chunk-1-of-1)

- Base URL: http://localhost:8083
- Generated: 2026-08-01T15:01:00.704Z
- Total flows: 1
- Failed: 1
- High: 1
- Medium: 0
- Roles: admin
- Profiles: invite-code-settings-audit
- Chunk size: 1
- Chunk index: 1
- Retries: 1

## High / Medium Findings

- [HIGH] admin_invite_code_settings_denied (/club/settings?clubId=clb_4ee614a0-62ee-73ff-9328-0f74a326c2c1&section=invites) :: action_failed:assertTextAbsent:Error: Text should be absent: Invite Codes | action_failed:assertTextAbsent:Error: Text should be absent: Member Invite | action_failed:assertTextAbsent:Error: Text should be absent: Coach Invite
