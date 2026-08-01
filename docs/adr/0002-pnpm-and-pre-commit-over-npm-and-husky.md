# 2. pnpm + pre-commit instead of npm + Husky

## Status

Accepted

## Context

The project started on npm with Husky-managed git hooks. npm's flat-ish `node_modules` and
duplicate installs across dependency trees are slower to install and easy to get into a broken
state; Husky only manages git hooks and still needs a separate tool (lint-staged or similar) to
decide *what* to run on them.

## Decision

Switched the package manager to pnpm (content-addressable store, strict dependency resolution,
faster installs) and replaced Husky with [pre-commit](https://pre-commit.com/) for git hooks -
see [.pre-commit-config.yaml](../../.pre-commit-config.yaml). pre-commit's hook definitions are
declarative and language-agnostic, which mattered here since the repo also had a Deno-based
Supabase Edge Function alongside the Node/Next.js app at the time (since removed - see
[ADR 0004](0004-supabase-as-backend.md)).

`pnpm install` runs [scripts/postinstall-precommit.mjs](../../scripts/postinstall-precommit.mjs),
which installs the git hooks automatically if `pre-commit` is on `PATH`, or otherwise warns with
the one-line install command - so missing it is loud, not silent.

## Consequences

- One less Node-specific tool in the toolchain; hooks are defined the same way regardless of
  which language a given check happens to run in.
- Contributors need `pre-commit` available as a system dependency (`pipx install pre-commit`),
  which npm/Husky wouldn't have required.
