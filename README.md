# wettseite

[![CI](https://github.com/PaulAugsten/wettseite/actions/workflows/ci.yml/badge.svg)](https://github.com/PaulAugsten/wettseite/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/PaulAugsten/wettseite/branch/main/graph/badge.svg)](https://codecov.io/gh/PaulAugsten/wettseite)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/PaulAugsten/wettseite/badge)](https://scorecard.dev/viewer/?uri=github.com/PaulAugsten/wettseite)

A Next.js site for tracking esports/sports matches and tournaments (currently Rainbow Six Siege,
with a football scraper alongside it), backed by Supabase.

## Quickstart

```bash
pnpm install
cp .env.example .env.local   # fill in the values, see the table below
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

> `pnpm install` also tries to install the [pre-commit](https://pre-commit.com/) git hooks (see
> [.pre-commit-config.yaml](.pre-commit-config.yaml)). If `pre-commit` isn't on your `PATH`
> (e.g. `pipx install pre-commit`), the install step prints a warning instead of failing — run
> `pre-commit install -t pre-commit -t commit-msg -t pre-push` yourself afterwards.

Useful next steps:

```bash
pnpm test          # unit tests (Vitest)
pnpm test:e2e       # Playwright end-to-end tests
pnpm lint           # Biome
pnpm typecheck       # tsc --noEmit
```

## Architecture overview

- **Framework**: Next.js (App Router) on React 19, deployed on Vercel.
- **Route groups** under [app/](app/):
  - `(root)` — public pages: home, `[game]` match/tournament listings, `about`, `account`.
  - `(login)` — `login`, `signup`, `auth` (Supabase auth flows).
  - `(dashboard)` — authenticated dashboard.
  - `api/cron` — scheduled route handlers invoked by [Vercel Cron](vercel.json).
- **Auth/session**: [lib/supabase/proxy.ts](lib/supabase/proxy.ts) refreshes the Supabase session
  on every request via the root [proxy.ts](proxy.ts) middleware.
- **Scrapers**: [lib/supabase/api/scraper/](lib/supabase/api/scraper/) — per-game scrapers
  (currently `rainbow-six-siege`, `football`) that fetch and parse match/tournament data and
  write it into Supabase. These run on the cron schedule above.
- **Supabase Edge Function**: [supabase/functions/get-matches](supabase/functions/get-matches)
  (Deno runtime — type-checked separately in CI since it's outside the Next.js TS project).
- **Observability**: Sentry ([instrumentation.ts](instrumentation.ts),
  [instrumentation-client.ts](instrumentation-client.ts)) for error/performance monitoring,
  Vercel Analytics + Speed Insights for traffic and Core Web Vitals.
- **PWA**: `next-pwa` generates the service worker/manifest at build time (disabled in dev).

## Environment variables

Copy [.env.example](.env.example) to `.env.local` and fill these in. Never commit a real `.env`.

| Variable | Required for | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | app | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | app | Supabase publishable (anon) key, safe for the client. |
| `SUPABASE_SERVICE_ROLE_KEY` | server/scrapers | Supabase service-role key. Server-only — bypasses RLS, never expose to the client. |
| `NEXT_PUBLIC_SENTRY_DSN` | client errors | Sentry DSN used by the browser SDK. |
| `SENTRY_DSN` | server errors | Sentry DSN used by the server/edge SDK. |
| `SENTRY_ORG` | build (CI/CD) | Sentry org slug, used to upload source maps and tag releases. |
| `SENTRY_PROJECT` | build (CI/CD) | Sentry project slug. |
| `SENTRY_AUTH_TOKEN` | build (CI/CD) | Sentry auth token for source map upload. Build no-ops without it. |
| `CODECOV_TOKEN` | CI only | Upload token for the Codecov GitHub Action. Not needed locally. |

## Scripts reference

| Script | Purpose |
|---|---|
| `pnpm dev` | Start the Next.js dev server. |
| `pnpm build` | Production build. |
| `pnpm start` | Run the production build. |
| `pnpm analyze` | Production build with the bundle analyzer enabled. |
| `pnpm lint` / `pnpm lint:fix` | Biome check / check-and-fix. |
| `pnpm lint:next` | ESLint (Next.js-specific rules, e.g. Core Web Vitals). |
| `pnpm format` | Biome format, write in place. |
| `pnpm typecheck` | `tsc --noEmit`. |
| `pnpm test` / `pnpm test:watch` | Vitest unit tests. |
| `pnpm test:coverage` | Vitest with coverage thresholds enforced. |
| `pnpm test:e2e` | Playwright end-to-end tests. |
| `pnpm knip` | Find unused files, exports, and dependencies. |
| `pnpm size` | Check production bundle size against [.size-limit.json](.size-limit.json) budgets. |
| `pnpm doctor` | Run `react-doctor` against the codebase. |
| `pnpm release:dry-run` | Preview the next semantic-release version/changelog without publishing. |

## Releases

Versioning and `CHANGELOG.md` are automated by
[semantic-release](release.config.mjs) from [Conventional Commits](https://www.conventionalcommits.org/)
on every merge to `main` — see the `release` job in [.github/workflows/ci.yml](.github/workflows/ci.yml).
`CHANGELOG.md` is generated on the first release and committed by the release workflow, so it
won't exist until then.

## Further docs

See [docs/](docs/) for architecture decision records and anything else too detailed for this
README.
