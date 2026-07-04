# React Doctor — confirmed false positives

- `react-doctor/async-defer-await` — app/(root)/account/account-form.tsx, getProfile effect:
  the `if (ignore) return` after the await is a fetch-race guard (react.dev ignore-flag
  pattern). `ignore` is only set during the await by the effect cleanup, so it cannot be
  hoisted above it. Skip when the early-return tests a closure flag mutated by cleanup.

- `react-doctor/js-set-map-lookups` — scraper files (match_parser.ts, matches_scraper.ts,
  supabase/functions/get-matches/index.ts): flagged `.includes()` calls are substring tests
  on strings (`stage`, `currentRound`, `tournament.url`), not array scans. Skip after
  verifying the receiver is a string.

- `react-doctor/async-await-in-loop` — Liquipedia scraper loops (matches_scraper.ts,
  tournaments_scraper.ts, get-matches/index.ts): serial awaits with 2–5s sleeps are
  required by Liquipedia's API rate limits (429 handling exists). Do not parallelize.
  Also accepted in teamnames_resolver.ts processReviewedTeams: interactive admin CLI,
  serial keeps console output in review order.

- `react-doctor/server-auth-actions` — app/(login)/signup/actions.ts: `signup` is the
  credential-establishing endpoint (calls `supabase.auth.signUp`); no prior session can
  exist. Per the rule's own fix prompt, do not add an auth gate here.
