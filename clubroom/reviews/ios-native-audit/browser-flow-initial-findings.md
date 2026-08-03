# Initial cross-role browser findings

- Total flows: 71
- Clean: 68
- Failed: 0
- High findings: 0
- Medium findings: 3

## Medium findings

| Flow | Route | Finding |
| --- | --- | --- |
| Coach home | `/` | Athlete entity ID sent to `/v1/users/:id`, returning 404 |
| Session invites | `/session-invites` | Interactive invite card contained a nested button |
| Club settings | `/club/settings` | Read-only coach requested manager-only invite codes, returning 403; raw enum copy was visible |

The source run used a local responsive web bundle backed by the staging API. It
performed no destructive writes.
