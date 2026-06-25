# 1. Record architecture decisions

## Status

Accepted

## Context

Non-obvious technical choices (why pnpm over npm, why a daily cron instead of hourly, why
Supabase instead of a hand-rolled backend) tend to live only in the head of whoever made them,
or get buried in a single commit message. New contributors — including future-us — end up
re-deriving or re-litigating decisions that were already made for a reason.

## Decision

We use Architecture Decision Records (ADRs), one markdown file per decision, numbered
sequentially in `docs/adr/`. Format follows Michael Nygard's lightweight template: Status,
Context, Decision, Consequences.

Only decisions that are non-obvious from reading the code go here — not a changelog of every
change.

## Consequences

- Each significant decision is searchable and has its reasoning attached.
- ADRs are immutable once accepted; if a decision is reversed, a new ADR supersedes the old one
  rather than editing it in place.
