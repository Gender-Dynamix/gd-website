# CLAUDE.md

This is the website for Gender Dynamix Aotearoa.

## Documentation

- [Project Standards](docs/standards.md) — strategy, communication, quality, planning, and automation standards
- [Branching Strategy](docs/branching_strategy.md) — GitHub Flow workflow, branch naming, and commit conventions

## Branching and Commit Conventions

Branches use the pattern `type/description` in kebab-case. PR titles use the same type as a prefix — since we squash merge, the PR title becomes the commit message on `main`.

| Type       | Purpose                              |
| ---------- | ------------------------------------ |
| `feature/` | New functionality                    |
| `fix/`     | Bug fixes                            |
| `content/` | Site content changes                 |
| `style/`   | Visual/design changes                |
| `docs/`    | Documentation changes                |
| `chore/`   | Tooling, config, and dependencies    |
| `refactor/`| Code restructuring (no behaviour change) |

Branch example: `feature/add-contact-page`
PR title example: `feature: Add contact page`

## Issue Templates

Each branch type has a matching issue template in `.github/ISSUE_TEMPLATE/` (e.g. `feature.yml`, `bug.yml`, `chore.yml`). When creating an issue via the `gh` CLI, use the appropriate template and ask the user each of the template's questions to populate the issue body.
