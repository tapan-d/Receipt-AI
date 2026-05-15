@README.md
@AGENTS.md

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
