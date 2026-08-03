# UI Flow Check Report (50+)

- Base URL: http://localhost:8083
- Generated: 2026-08-01T14:07:49.420Z
- Total flows: 7
- Failed: 0
- High: 0
- Medium: 3
- Roles: coach, parent, guardian, admin, athlete
- Profiles: post-detail-audit
- Chunk size: 10
- Retries: 0

## High / Medium Findings

- [MEDIUM] coach_post_detail_interactions (/post-detail?postId=pst_5163fa19-773d-7a2c-9c52-954f178706ec) :: console:Error data: {postId: pst_5163fa19-773d-7a2c-9c52-954f178706ec, error: Object} | console:Error data: {commentId: cmt_0f055f57-69a1-7136-b238-3cad9c42d7d3, error: Object} | console:Error data: {postId: pst_5163fa19-773d-7a2c-9c52-954f178706ec, parentId: cmt_0f055f57-69a1-7136-b238-3cad9c42d7d3, error: Object}
- [MEDIUM] parent_post_detail_delete_failure (/post-detail?postId=pst_5163fa19-773d-7a2c-9c52-954f178706ec) :: console:Error data: {commentId: cmt_0f055f57-69a1-7136-b238-3cad9c42d7d3, error: Object}
- [MEDIUM] athlete_post_detail_denied (/post-detail?postId=pst_5163fa19-773d-7a2c-9c52-954f178706ec) :: console:Error data: {postId: pst_5163fa19-773d-7a2c-9c52-954f178706ec, error: Object}
