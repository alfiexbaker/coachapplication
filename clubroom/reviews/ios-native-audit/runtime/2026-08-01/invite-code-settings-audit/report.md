# UI Flow Check Report (50+)

- Base URL: http://localhost:8083
- Generated: 2026-08-01T15:01:00.808Z
- Total flows: 5
- Failed: 2
- High: 2
- Medium: 0
- Roles: coach, parent, guardian, athlete, admin
- Profiles: invite-code-settings-audit
- Retries: 1

## High / Medium Findings

- [HIGH] coach_invite_code_settings_ready (/club/settings?clubId=clb_4ee614a0-62ee-73ff-9328-0f74a326c2c1&section=invites) :: action_failed:assertTextVisible:Error: Text not visible: Invite Codes | action_failed:assertTextVisible:Error: Text not visible: Share codes to invite coaches and members | action_failed:assertTextVisible:Error: Text not visible: Member Invite | action_failed:assertTargetInViewport:Error: Viewport target not visible: Invite Codes | action_failed:assertTargetUnobscured:Error: Unobscured target not visible: Invite Codes
- [HIGH] admin_invite_code_settings_denied (/club/settings?clubId=clb_4ee614a0-62ee-73ff-9328-0f74a326c2c1&section=invites) :: action_failed:assertTextAbsent:Error: Text should be absent: Invite Codes | action_failed:assertTextAbsent:Error: Text should be absent: Member Invite | action_failed:assertTextAbsent:Error: Text should be absent: Coach Invite
