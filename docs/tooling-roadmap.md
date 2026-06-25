# Tooling roadmap

Ideas for additional CI/quality tooling, roughly grouped by how much they're worth the setup
cost. Not all of these are adopted — this is a running list to pull from, not a commitment.

## Higher-effort tier

Genuinely more than most teams do, but each is real and defensible:

- **Mutation testing (StrykerJS)** — measures whether the test suite would actually catch bugs by
  mutating code and checking if tests fail. The real signal behind a coverage %.
- **Contract / API testing** — schema-test the API routes (Zod at runtime + OpenAPI
  + Schemathesis/Dredd in CI).
- **Visual regression across browsers** (Argos/Chromatic).
- **SBOM generation** (anchore/sbom-action, CycloneDX) — software bill of materials attached to
  each release. Increasingly expected for compliance.
- **Container/image scanning** (Trivy, Grype) — relevant once a Docker image ships (e.g. a
  worker).
- **OpenSSF Scorecard + Allstar** — automated org-wide security-policy enforcement.
- **Required code-scanning merge protection** — block any PR that introduces a new HIGH/CRITICAL
  CodeQL alert (GHAS feature).
- **Canary / progressive delivery** — Vercel traffic-shifting or feature flags (Vercel Edge
  Config, LaunchDarkly, Statsig) to decouple "deploy" from "release" and roll out by %.
- **Load testing in CI** (k6, Artillery) against the preview, with thresholds on p95 latency.
- **Lockfile lint / `pnpm audit --prod` gate**, license compliance scanning (license-checker).
- **Reusable workflows + composite actions** — DRY up the repeated "checkout + setup + install"
  block that repeats across the workflow files in [.github/workflows/](../.github/workflows/).
- **act** for running workflows locally before pushing.
- **Renovate with auto-merge** + lockfile maintenance scheduled weekly.
