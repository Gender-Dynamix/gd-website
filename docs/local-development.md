# Local Development

This guide covers everything you need to get the site running on your machine.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm (comes with Node.js)
- Git

## Getting Started

Clone the repository and install dependencies:

```bash
git clone git@github.com:Gender-Dynamix/gd-website.git
cd gd-website
npm install
```

Set up build-time environment variables:

```bash
cp .env.example .env
```

Edit `.env` and fill in test values. See the [Environment Variables](environment.md) guide for details and test keys.

Start the dev server:

```bash
npm run dev
```

The site will be available at [http://localhost:4321](http://localhost:4321).

## Two Dev Servers

This project has two dev servers because the site is split into two layers:

| Server   | Command                | What it runs                | Hot reload |
| -------- | ---------------------- | --------------------------- | ---------- |
| Astro    | `npm run dev`          | Pages, components, styles   | Yes        |
| Wrangler | `npm run dev:wrangler` | Full site + Pages Functions | No         |

**Use Astro (`npm run dev`) for most work.** It has fast hot module replacement and is the best experience for editing pages, components, layouts, and styles.

**Use Wrangler (`npm run dev:wrangler`) when testing form submissions.** Pages Functions (the `functions/` directory) only run under Wrangler. This requires a build step first:

```bash
cp .dev.vars.example .dev.vars   # first time only — fill in values
npm run build
npm run dev:wrangler
```

Wrangler serves the built output from `dist/`, so you need to re-run `npm run build` each time you change source files. The site will be available at [http://localhost:8788](http://localhost:8788).

## Project Structure

```
gd-website/
├── functions/           # Cloudflare Pages Functions (server-side)
│   └── api/
│       └── form.ts      # Form submission handler
├── public/              # Static assets (copied as-is to dist/)
├── src/
│   ├── components/      # Reusable Astro components
│   ├── layouts/         # Page layouts
│   ├── pages/           # Routes — each .astro file becomes a page
│   ├── scripts/         # Client-side JavaScript
│   └── styles/          # Global stylesheets
├── docs/                # Project documentation
├── astro.config.mjs     # Astro configuration and env schema
├── .env.example         # Build-time env var template
└── .dev.vars.example    # Runtime env var template (Pages Functions)
```

## Available Scripts

| Command                | Description                           |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Start the Astro dev server            |
| `npm run build`        | Build the site for production         |
| `npm run preview`      | Preview the production build locally  |
| `npm run dev:wrangler` | Serve built site with Pages Functions |
| `npm run lint`         | Run ESLint                            |
| `npm run lint:fix`     | Run ESLint and auto-fix issues        |
| `npm run format`       | Format all files with Prettier        |
| `npm run format:check` | Check formatting without writing      |
| `npm run check`        | Run Astro type checking               |

## Code Quality

The project uses several tools to maintain code quality, all of which run automatically on commit via [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged):

- **Prettier** — formats `.astro`, `.js`, `.ts`, `.css`, `.json`, and `.md` files
- **ESLint** — lints `.astro`, `.js`, and `.ts` files with accessibility rules (`eslint-plugin-jsx-a11y`)

When you commit, lint-staged automatically formats and lints your staged files. If there are issues that can't be auto-fixed, the commit will be blocked until you resolve them.

To run these manually before committing:

```bash
npm run lint        # check for linting issues
npm run format      # format all files
npm run check       # Astro type checking
```

## Troubleshooting

### `npm run dev:wrangler` shows stale content

Wrangler serves from `dist/`. Run `npm run build` before starting Wrangler to pick up your latest changes.

### Forms don't work in `npm run dev`

Pages Functions only run under Wrangler. Switch to `npm run dev:wrangler` for form testing — see [Two Dev Servers](#two-dev-servers).

### Missing environment variables

If the build fails or forms don't work, check that you have both config files in place:

- `.env` — build-time variables (copy from `.env.example`)
- `.dev.vars` — runtime variables (copy from `.dev.vars.example`)

See [Environment Variables](environment.md) for the full variable reference and test keys.
