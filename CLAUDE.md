@README.md
@AGENTS.md

## Session Workflow

### Session start — "what to implement next?"
1. Read `docs/planning/dependency-map.md` — check current state snapshot and tier order
2. Read relevant feature/ADR docs for the top candidate
3. Check Linear for any newly completed issues that haven't been synced to docs yet
4. Recommend the highest-leverage next item with rationale

### Per commit — keep docs in sync
After every commit (non-negotiable — do not skip):
1. Update CHANGELOG.md — append to today's date entry (one entry per day, no numbered suffixes)
2. Update `docs/planning/dependency-map.md` — mark completed items ✓, add new items if the commit introduces new dependencies or phases
3. Check `docs/architecture/` — if commit fixes a known issue, mark it done in the relevant doc
4. Check `docs/adr/` and `docs/features/` — if a design decision changed, update the relevant doc

## Standing Rules
- Update CHANGELOG.md before every commit. One entry per day — append to today's date header if it exists, create it if not. Do not create numbered suffixes.

## Docs vs Tasks
- Design decisions, ADRs, feature specs → `/docs/` in git (canonical)
- Tasks, in-flight work, bugs → Linear (https://linear.app/ledger-ai)
- Nothing deleted — stale docs move to `/docs/archive/`

## Docs Structure
- `/docs/adr/` — architecture decision records
- `/docs/features/<name>/overview.md` — one folder per feature
- `/docs/architecture/` — system-wide design and reviews
- `/docs/planning/` — dependency maps, priority rationale, sequencing
- `/docs/archive/` — superseded docs, never deleted
