# Sprint 0 — Git Hygiene — Agent Prompts

## Agent 1: Commit 420 Orphaned Files

```
You are a Git Hygiene agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Commit ~420 uncommitted files into clean, feature-grouped git commits. This is a prerequisite for ALL other sprints.

RULES:
1. Read memory/sprints/sprint-0-git-hygiene/Agent1Update.md for your full work order.
2. Run `cd /Users/tubton/Desktop/coachapplication && git status` to see all uncommitted files.
3. Group files by feature area and create ONE commit per group.
4. Use conventional commit messages: "feat(area): description" or "refactor(area): description"
5. NEVER use `git add -A` or `git add .` — add specific files by name/glob per commit.
6. NEVER push to remote. Local commits only.
7. NEVER amend existing commits.
8. NEVER modify any file content — only stage and commit what exists.

COMMIT GROUPING (do these in order):

1. `feat(athlete): add athlete management screens and components`
   - clubroom/app/athlete/**
   - clubroom/components/athlete/**

2. `feat(academy): add academy components`
   - clubroom/components/academy/**

3. `feat(analytics): add analytics components`
   - clubroom/components/analytics/**

4. `feat(availability): add availability components`
   - clubroom/components/availability/**

5. `feat(badges): add badge components`
   - clubroom/components/badges/**

6. `feat(booking): add booking flow components`
   - clubroom/components/booking/**

7. `feat(child): add child management components`
   - clubroom/components/child/**

8. `feat(club): add club components`
   - clubroom/components/club/**

9. `feat(coach): add coach profile components`
   - clubroom/components/coach/**

10. `feat(community): add community components`
    - clubroom/components/community/**

11. `feat(development): add development tracking components`
    - clubroom/components/development/**

12. `feat(discover): add discover/search components`
    - clubroom/components/discover/**

13. `feat(drills): add drill components and screens`
    - clubroom/components/drills/**
    - clubroom/app/drills/challenges.tsx
    - clubroom/app/drills/create-challenge.tsx

14. `feat(earnings): add earnings components`
    - clubroom/components/earnings/**

15. `feat(event): add event components`
    - clubroom/components/event/**

16. `feat(family): add family components`
    - clubroom/components/family/**

17. `feat(goals): add goals components`
    - clubroom/components/goals/**

18. `feat(group): add group session components`
    - clubroom/components/group/**

19. `feat(health): add health components`
    - clubroom/components/health/**

20. `feat(invite): add invite components`
    - clubroom/components/invite/**

21. `feat(match): add match components`
    - clubroom/components/match/**

22. `feat(negotiate): add negotiate components`
    - clubroom/components/negotiate/**

23. `feat(progress): add progress components`
    - clubroom/components/progress/**

24. `feat(promo): add promo code components`
    - clubroom/components/promo/**

25. `feat(review): add review components`
    - clubroom/components/review/**

26. `feat(roster): add roster concern screen and components`
    - clubroom/app/roster/[athleteId]/raise-concern.tsx
    - clubroom/components/roster/**

27. `feat(safety): add safety components`
    - clubroom/components/safety/**

28. `feat(settings): add settings components`
    - clubroom/components/settings/**

29. `feat(skills): add skills components`
    - clubroom/components/skills/**

30. `feat(social): add social feed components`
    - clubroom/components/social/**

31. `feat(squad): add squad components`
    - clubroom/components/squad/**

32. `feat(verification): add verification components`
    - clubroom/components/verification/**

33. `feat(video): add video components`
    - clubroom/components/video/**

34. `feat(hooks): add screen hooks`
    - clubroom/hooks/** (all new hook files)

35. `feat(services): add concern service`
    - clubroom/services/concern-service.ts

36. `feat(utils): add contact actions utility`
    - clubroom/utils/contact-actions.ts

37. `refactor(screens): update screen decompositions`
    - All remaining modified app/ screen files

38. `refactor(components): update existing components`
    - All remaining modified component files

39. `refactor(services): update service event types`
    - clubroom/services/event-bus.ts
    - clubroom/services/event/**
    - clubroom/services/club-service.ts
    - clubroom/services/service-subscribers.ts

40. `chore(config): update storage keys and mock data`
    - clubroom/constants/mock-data.ts
    - clubroom/constants/storage-keys.ts
    - clubroom/navigation/routes.ts

41. `docs: update roadmap and user stories`
    - clubroom/docs/ROADMAP.md
    - clubroom/docs/USER-STORIES.md
    - CLAUDE.md

42. `chore(memory): add sprint execution infrastructure`
    - memory/** (all memory files)

After each commit group, run `git status` to verify files were committed.
After ALL commits, run `git log --oneline -50` to verify clean history.

WHEN DONE: Update memory/sprints/sprint-0-git-hygiene/Agent1Update.md:
- Set Status to DONE
- List all commits created under "Files Modified"
- Note any files that couldn't be committed under "Blockers"
```
