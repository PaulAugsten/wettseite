# 4. Supabase for database, auth, and edge functions

## Status

Accepted

## Context

The app needs persistent storage for matches/tournaments/predictions, user auth (signup/login),
row-level access control, and a place to run a small piece of server logic (`get-matches`)
outside the Next.js request lifecycle. Building and hosting each of those separately (a
Postgres host, an auth provider, a function runtime) is significant operational surface for a
small team.

## Decision

Use Supabase as the single backend: Postgres + Row Level Security for data access, Supabase
Auth for signup/login (with [lib/supabase/proxy.ts](../../lib/supabase/proxy.ts) refreshing the
session on every request), and a Supabase Edge Function
([supabase/functions/get-matches](../../supabase/functions/get-matches)) for logic that should
run close to the database on Deno rather than inside the Next.js server.

## Consequences

- One vendor for data, auth, and edge compute instead of three; fewer moving pieces to operate.
- The Edge Function runs on Deno, a different runtime/toolchain than the rest of the app — it's
  excluded from the main `tsconfig.json` and type-checked separately via `deno check` in CI
  (see the `deno-check` job in [.github/workflows/ci.yml](../../.github/workflows/ci.yml)).
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and must stay server-only — see the env var table in
  the [README](../../README.md#environment-variables).
- Auth/data correctness depends on RLS policies being right; there's no separate authorization
  layer to fall back on if a policy is missing or wrong.
