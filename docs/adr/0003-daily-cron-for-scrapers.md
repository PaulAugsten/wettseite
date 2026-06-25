# 3. Scrapers run on a daily Vercel Cron, not on-demand polling

## Status

Accepted

## Context

Match/tournament data comes from scraping external sources (wiki pages, etc.) rather than a
push API. Vercel's Hobby/Pro cron tiers cap how often a cron can fire (no sub-daily schedules on
the lower tiers), and the data doesn't change often enough to justify the scrape cost or the
risk of getting rate-limited/blocked by the source site.

## Decision

Scrapers run on a single daily [Vercel Cron](../../vercel.json) job that hits an
`app/api/cron/*` route handler, instead of polling more frequently or scraping on each request.

## Consequences

- New match data can be up to ~24h stale; acceptable for the current use case (schedules,
  results), not for anything needing real-time updates.
- Only one scheduled invocation to reason about/monitor, rather than a fleet of polling jobs.
- If a more real-time source becomes available (e.g. a webhook or proper API), this should be
  revisited — a new ADR should supersede this one rather than quietly changing the schedule.
