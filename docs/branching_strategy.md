# Branching Strategy

This project follows **GitHub Flow** — a simple, branch-based workflow built around pull requests and code review.

## Overview

- `main` is always the production-ready branch
- All work happens on short-lived feature branches created from `main`
- Changes are merged back to `main` via pull request (PR) after review
- Every PR requires at least one approving review from a code owner before merging
- PRs are merged using **squash and merge** to keep `main` history clean

## Branch Naming

Branches follow the pattern `type/description` where the description uses kebab-case.

| Type       | Purpose                           | Example                        |
| ---------- | --------------------------------- | ------------------------------ |
| `feature/` | New functionality                 | `feature/add-contact-page`     |
| `fix/`     | Bug fixes                         | `fix/nav-alignment`            |
| `docs/`    | Documentation changes             | `docs/update-readme`           |
| `chore/`   | Tooling, config, and dependencies | `chore/setup-linting`          |
| `style/`   | Visual/design changes only        | `style/update-colour-palette`  |
| `refactor/`| Code restructuring (no behaviour change) | `refactor/simplify-header` |

## Workflow

### 1. Pick up a task

- Find an issue assigned to you in the [GitHub Project board](https://github.com/orgs/Gender-Dynamix/projects)
- Move the issue to **In Progress**

### 2. Create a branch

Always branch from an up-to-date `main`:

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### 3. Work in small commits

- Commit early and often with clear, descriptive messages
- Each commit should represent a logical unit of work
- Push your branch regularly to keep a remote backup:

```bash
git push -u origin feature/your-feature-name
```

### 4. Open a pull request

- Open a PR when your work is ready for review (or open a **draft PR** early if you want feedback on work in progress)
- Link the PR to the relevant GitHub issue by including `Closes #<issue-number>` in the PR description
- Fill in the PR template with a summary of changes and a test plan

### 5. Code review

- A code owner will review your PR and may request changes
- Address review feedback by pushing additional commits to the same branch
- Once approved, the reviewer will merge the PR using **squash and merge**

### 6. Clean up

After your PR is merged:

```bash
git checkout main
git pull origin main
git branch -d feature/your-feature-name
```

## Commit Messages

Write clear commit messages that explain **what** changed and **why**.

**Format:**
```
Short summary of the change (imperative mood, max ~72 chars)

Optional longer description explaining the motivation or context
for the change. Wrap at 72 characters.
```

**Good examples:**
- `Add contact page with email form`
- `Fix header overlap on mobile viewport`
- `Update dependencies to resolve security advisory`

**Avoid:**
- `WIP`, `stuff`, `fix`, `updates` — these tell the reviewer nothing
- Overly long first lines — keep the summary concise

## Rules

1. **Never push directly to `main`** (unless you are an org admin making an urgent fix)
2. **Keep branches short-lived** — aim to merge within a few days
3. **One branch per issue** — don't bundle unrelated changes
4. **Keep PRs focused** — smaller PRs are easier to review and less likely to introduce bugs
5. **Delete branches after merging** — keep the repo tidy
6. **Pull from `main` regularly** — if your branch lives for more than a day, rebase or merge `main` into it to avoid conflicts
