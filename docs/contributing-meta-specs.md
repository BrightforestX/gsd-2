# Contributing: meta-specs and `.gsd/`

GSD keeps workflow state under `.gsd/` (milestones, journal, preferences). Optional **meta-spec** files for human and tool consumption can live at the repo root (for example `openspec/`).

## Layout

| Path | Role |
|------|------|
| `.gsd/` | Runtime workflow — milestones, activity logs, preferences |
| `openspec/` | Bootstrap-only area for OpenSpec-style artifacts (no runtime dependency) |

## Conventions

1. Do **not** require OpenSpec for core CLI behaviour.
2. Prefer small, reviewable spec increments committed with the features they describe.
3. Link milestone or slice docs back to spec IDs in frontmatter when useful.
