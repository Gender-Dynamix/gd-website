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

Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` and fill in test values. See the [Environment Variables](environment.md) guide for details and test keys.

Start the dev server:

```bash
npm run dev
```

The site will be available at [http://localhost:4321](http://localhost:4321). Forms and all other functionality work in this single dev server.

## Project Structure

```
gd-website/
├── public/              # Static assets (copied as-is to dist/)
├── src/
│   ├── actions/         # Astro Actions (server-side form handling)
│   │   └── index.ts     # Form submission action
│   ├── components/      # Reusable Astro components
│   ├── layouts/         # Page layouts
│   ├── pages/           # Routes — each .astro file becomes a page
│   ├── scripts/         # Client-side JavaScript
│   └── styles/          # Global stylesheets
├── docs/                # Project documentation
├── astro.config.mjs     # Astro configuration and env schema
└── .env.example         # Environment variable template
```

## Available Scripts

| Command                | Description                          |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Start the Astro dev server           |
| `npm run build`        | Build the site for production        |
| `npm run preview`      | Preview the production build locally |
| `npm run lint`         | Run ESLint                           |
| `npm run lint:fix`     | Run ESLint and auto-fix issues       |
| `npm run format`       | Format all files with Prettier       |
| `npm run format:check` | Check formatting without writing     |
| `npm run check`        | Run Astro type checking              |

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

### Missing environment variables

If the build fails or forms don't work, check that you have `.env` in place:

```bash
cp .env.example .env
```

See [Environment Variables](environment.md) for the full variable reference and test keys.
