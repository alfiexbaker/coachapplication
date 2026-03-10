# Sprint 02 - Relationship Model And Blocking Integrity

## Objective

Define the correct relationship model for Clubroom and enforce blocking truth across that model.

## Why This Sprint Exists

The current system mixes:

- follow
- friend request
- mutual-follow friendship
- coach discovery
- booking trust

That is too many models for a coaching marketplace, and blocking does not fully cut across them.

## Current Evidence

- coach detail uses `Add Friend`
- profile uses `Send Friend Request`
- follow service turns accepted requests into two-way follows
- follow service does not reference `blockService`
- booking, messaging, and search do enforce blocks

## Macro Decisions To Discuss

1. Should coach connections ever use `friend` language?
2. Is user-to-user friendship a real product feature, or should the app use simpler asymmetric relationships?
3. What should blocking do to existing follows, requests, and feed visibility?

## Scope

1. Decide coach-facing relationship vocabulary.
2. Decide whether symmetric friendship remains anywhere in the product.
3. Make block behavior explicit across:
   - follow requests
   - accepted follows
   - feed eligibility
   - messaging access
   - booking visibility
4. Remove or rename misleading CTA copy on coach surfaces.

## Acceptance Criteria

- coach profile surfaces no longer imply the wrong relationship model
- blocked users cannot create or preserve social graph state that contradicts block policy
- relationship copy is consistent across generic profile and coach profile surfaces
- the team can explain, in one paragraph, what "connected" means in Clubroom

## Verification

- targeted tests around follow/block behavior
- targeted UI smoke for coach profile, profile, feed, chat, and booking entry
- direct source audit for legacy friend wording on coach surfaces

## Risk

This sprint is product-definition heavy. Do not implement it blindly without settling the vocabulary and policy first.
