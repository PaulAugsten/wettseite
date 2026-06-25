#!/usr/bin/env bash
# Applies branch protection to main, matching the actual job names in
# .github/workflows/*.yml. Requires the GitHub CLI (gh) authenticated with
# repo admin access. Run by hand, not in CI:
#
#   ./scripts/branch-protection.sh
#
# Re-run any time a workflow job is renamed/added/removed to keep this in sync.
set -euo pipefail

REPO="PaulAugsten/wettseite"

# Job ids as they appear in the workflow files (these become the check-run
# "context" names GitHub matches against):
#   ci.yml             -> lint, typecheck, unit, build, deno-check
#   codeql.yml         -> analyze
#   dependency-review.yml -> review
#   e2e.yml (fires off Vercel's deployment_status, so these land on the same
#            commit SHA slightly after the PR-triggered checks do) -> e2e, lighthouse
gh api --method PUT "repos/${REPO}/branches/main/protection" --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["lint", "typecheck", "unit", "build", "deno-check", "analyze", "review", "e2e", "lighthouse"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "required_linear_history": true,
  "required_conversation_resolution": true,
  "restrictions": null
}
EOF
