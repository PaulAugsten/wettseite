# 4. Supabase for database, auth, and edge functions

## Status

Accepted; the edge-function part is superseded - the Deno-based `get-matches` Edge Function was
removed and its work now runs in the Node scraper ([lib/scraper/](../../lib/scraper/)). Supabase
remains the database and auth provider. Deno is no longer part of the toolchain or CI.

## Context

The app needs persistent storage for matches/tournaments/predictions, user auth (signup/login),
row-level access control, and a place to run a small piece of server logic (`get-matches`)
outside the Next.js request lifecycle. Building and hosting each of those separately (a
Postgres host, an auth provider, a function runtime) is significant operational surface for a
small team.

## Decision

Use Supabase as the single backend: Postgres + Row Level Security for data access, Supabase
Auth for signup/login (with [lib/supabase/proxy.ts](../../lib/supabase/proxy.ts) refreshing the
session on every request), and originally a Supabase Edge Function (`get-matches`) for logic
that should run close to the database on Deno rather than inside the Next.js server.

## Consequences

- One vendor for data, auth, and edge compute instead of three; fewer moving pieces to operate.
- The Edge Function ran on Deno, a different runtime/toolchain than the rest of the app, which
  meant a second type-check path in CI. That split is what motivated dropping it: the whole
  codebase is now a single Node/TypeScript toolchain.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and must stay server-only - see the env var table in
  the [README](../../README.md#environment-variables).
- Auth/data correctness depends on RLS policies being right; there's no separate authorization
  layer to fall back on if a policy is missing or wrong.
