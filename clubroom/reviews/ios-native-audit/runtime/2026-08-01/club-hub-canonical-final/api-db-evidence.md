# Club Hub API and database evidence

Checked 2026-08-01 against the local Fastify process configured for the non-production staging database. No business mutation was submitted. Login/logout created and closed only test authentication sessions.

## Cross-role Fastify results

Target club: `clb_4ee614a0-62ee-73ff-9328-0f74a326c2c1` (Riverside FC).

| Role | Club list | Club detail | Viewer role | Full roster field | Invite credential | Feed | Schedule | Member-directory request from UI |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| coach | 200 `req_f3c98024-4d20-4a95-b742-82d46c4617ff` | 200 `req_4ad1210f-1cc7-4ad9-bafe-41b1ad68c777` | COACH | absent | absent | 200, 1 post `req_d58d4d85-6474-407e-b4cc-5f89e8eee11f` | 200, 5 activities `req_887a652c-575c-44ab-ba2f-71e51dcaf80c` | 0 |
| parent | 200 `req_58c88bfc-c3eb-4b86-a956-e4ea903aa43b` | 200 `req_fa10e51b-e592-411c-b383-e29c64befed8` | MEMBER | absent | absent | 200, 1 post `req_807065df-0a01-4549-a43e-64a6dbe6ada8` | 200, 5 activities `req_fe8eb05b-da33-4827-903e-196f4d45a34e` | 0 |
| guardian | 200 `req_46860543-ff26-4fb8-afc6-217ccd10877c` | 200 `req_3582b3e4-58e4-4881-b4dd-88a524338698` | MEMBER | absent | absent | 200, 1 post `req_89192560-30a4-46e1-a6fe-9e1380523664` | 200, 5 activities `req_056698fa-6802-42bc-9716-1610e73f6079` | 0 |
| athlete | 200, target absent `req_0e8778b6-7696-4b2e-91a4-de3b9ac9c5c2` | 404 RESOURCE_NOT_FOUND `req_db10ad1a-844d-4495-8432-29d0dfcb6038` | none | absent | absent | not requested | not requested | 0 |
| club admin | 200 `req_d38d4d71-8f27-4658-94fd-8216d9e9fd3e` | 200 `req_73fe3100-f314-407d-9a9a-5279308d47b4` | ADMIN | absent | present: authorized | 200, 1 post `req_8075768d-c28d-4b5d-a0e4-acab1d270637` | 200, 5 activities `req_9eff4f08-dcf2-42bb-bac2-72506eba2340` | 1; 200, 9 members `req_bbd5bf1b-8e67-402c-b280-d98ec9c1e8e7` |

Every visible response returned `memberCount=9` and `coachCount=5`. Every login was followed by a 204 logout. Tokens, emails, passwords and the invite-code value were not recorded.

## Direct staging database checks

- `API_DATA_BACKEND=db`; production-looking database URLs were rejected before connecting.
- Database `postgres`, role `postgres`; 58 completed Prisma migrations.
- Riverside FC exists at version 1 and is not deleted.
- Active membership counts: 1 club admin, 4 coaches, 4 members.
- One active invite code and one active club post.
- RLS is enabled on `AuditEvent`, `Club`, `ClubEvent`, `ClubInviteCode`, `ClubMatch`, `ClubMembership`, `GroupSession`, `Post` and `Squad`; each currently has zero Postgres policies.
- Current grants on those tables were limited to `postgres` and `service_role`; no current `anon` or `authenticated` table grants were returned.
- The 19 request IDs above produced zero `AuditEvent` rows. These were ordinary club-directory/feed/schedule reads, which the current backend does not classify as sensitive audited reads. This is recorded as runtime truth, not an audit pass.

## Open security item

`SEC-004` remains open: `supabase_admin` has three default ACL entries in the `public` schema for each of `anon` and `authenticated`, expanding to 12 future-object privileges per role (24 total). The current database user cannot safely alter those owner-level defaults. Supabase MCP was unavailable, so the checks above used the configured direct read-only staging connection.
