# ADRs

Purpose: keep short decision records that explain why a change was made when the answer is not obvious from code or sprint docs.

## When To Add An ADR

Add one when a change affects:

- runtime mode behavior
- auth or permission boundaries
- a canonical service entrypoint
- route ownership
- a core product relationship or commercial rule
- an irreversible data-model decision

## ADR Format

Recommended filename:

- `0001-short-kebab-title.md`

Recommended sections:

- Date
- Status
- Context
- Decision
- Consequences
- Links

## Rules

- Keep ADRs short.
- Link to the deep source docs and relevant code.
- Do not restate sprint logs unless the decision itself matters long-term.
- When a decision changes, write a superseding ADR instead of rewriting history.
