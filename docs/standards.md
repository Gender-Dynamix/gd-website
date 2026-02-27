# Project Standards

## Why Standards Matter

Standards are guidelines and best practices that help a team deliver quality software consistently. They set shared expectations for how we communicate, plan, build, and ship — so that everyone on the team can work effectively without second-guessing how things should be done.

Without standards, teams fall into inconsistency: code quality varies, deployments break, knowledge lives in one person's head, and onboarding new contributors becomes painful. Standards reduce that friction. They cover areas such as communication, collaboration, and automation, and help us improve our development process and deliver a better product.

Standards are not rigid rules. They are living guidelines that we revisit and refine as the project evolves. If a standard isn't serving us well, we change it.

## 1. Strategy Standard — Why, What, Who

Before starting any piece of work, we apply the **Three W's** to make sure we understand the purpose behind it:

- **Why** — The reasons and motivations behind the work. What problem are we solving? Why does it matter now?
- **What** — The goals and objectives the work is intended to achieve. What does success look like?
- **Who** — The people who benefit from this work. Who are we building this for?

These three questions should be answerable for every issue, feature, and decision we make. If they can't be answered clearly, the work isn't ready to start.

**In practice:**
- GitHub issues should include the Why, What, and Who in their description
- Pull request descriptions should reference the problem being solved and who it helps
- If you're unsure about any of the three W's, ask before writing code

## 2. Communication Standard

We encourage open communication and collaboration among all members of the team.

**In practice:**
- Use GitHub Issues and the Project Board as the primary place for project discussion — not private messages or verbal conversations that others can't reference later
- Ask questions early. If something is unclear, raise it in the issue or PR rather than guessing
- PR reviews are a conversation, not a gatekeeping exercise. Reviewers explain the reasoning behind requested changes and are open to discussion
- Keep commit messages and PR descriptions clear and descriptive so that anyone can understand the history of a change without needing to ask

## 3. Quality Standard

We implement version control and review processes to ensure that software is properly tested and deployed.

**In practice:**
- All changes go through pull requests with code review (see [Branching Strategy](branching_strategy.md))
- PRs should be small and focused — one concern per PR makes review effective
- Test your changes locally before opening a PR
- Code should work on the main branch at all times — if `main` is broken, fixing it is the top priority
- Review your own PR before requesting review — check the diff as if you were the reviewer

## 4. Planning Standard

We use agile practices to increase collaboration and flexibility, keeping work visible and manageable.

**In practice:**
- Work is tracked on the [GitHub Project Board](https://github.com/orgs/Gender-Dynamix/projects) using issues
- Issues are broken down into small, deliverable pieces of work — if an issue feels too big, split it
- We work in short cycles: pick up an issue, complete it, get it reviewed, merge it, then move on
- Priorities can shift — that's expected. The project board reflects current priorities, not a fixed plan
- Regular check-ins keep us aligned on what's in progress and what's blocked

## 5. Automation Standard

We automate the software development and deployment process where possible, using tools such as continuous integration and delivery (CI/CD).

**In practice:**
- Repetitive manual tasks are candidates for automation — if you do it more than twice, consider automating it
- CI/CD pipelines will handle linting, testing, and deployment so that these steps are consistent and reliable
- Automated checks run on every PR before it can be merged
- As the project grows, we will add automation incrementally rather than trying to build everything upfront
