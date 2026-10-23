#!/usr/bin/env bash
# Applies this repo's GitHub settings: merge options, security features, Actions
# permissions, and the `main-protection` ruleset. Re-running with nothing changed is a no-op. 
# Requires the GitHub CLI (gh) authenticated with repo admin access.
# Run by hand:
#
#   ./scripts/setup-github.sh
#
# Re-run any time a workflow job is renamed/added/removed to keep this in sync.
set -euo pipefail

REPO="PaulAugsten/wettseite"

echo "==> Merge settings"
gh api --method PATCH "repos/${REPO}" \
    -F allow_squash_merge=true \
    -F allow_merge_commit=false \
    -F allow_rebase_merge=false \
    -f squash_merge_commit_title=PR_TITLE \
    -f squash_merge_commit_message=COMMIT_MESSAGES \
    -F allow_auto_merge=true \
    -F delete_branch_on_merge=true \
    >/dev/null

echo "==> Security features"

gh api --method PUT "repos/${REPO}/vulnerability-alerts" >/dev/null
gh api --method DELETE "repos/${REPO}/automated-security-fixes" >/dev/null
gh api --method PUT "repos/${REPO}/private-vulnerability-reporting" >/dev/null
gh api --method PATCH "repos/${REPO}" --input - >/dev/null <<'JSON'
{
    "security_and_analysis": {
        "secret_scanning": { "status": "enabled" },
        "secret_scanning_push_protection": { "status": "enabled" }
    }
}
JSON

echo "==> Actions permissions"

gh api --method PUT "repos/${REPO}/actions/permissions" \
    -F enabled=true \
    -f allowed_actions=all \
    -F sha_pinning_required=true \
    >/dev/null

gh api --method PUT "repos/${REPO}/actions/permissions/workflow" \
    -f default_workflow_permissions=read \
    -F can_approve_pull_request_reviews=false

ruleset="$(
    cat <<'JSON'
{
    "name": "main-protection",
    "target": "branch",
    "enforcement": "active",
    "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
    "bypass_actors": [
        { "actor_id": null, "actor_type": "DeployKey", "bypass_mode": "always" },
        { "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "pull_request" }
    ],
    "rules": [
        { "type": "deletion" },
        { "type": "non_fast_forward" },
        {
            "type": "pull_request",
            "parameters": {
                "allowed_merge_methods": ["merge", "squash", "rebase"],
                "dismiss_stale_reviews_on_push": true,
                "require_code_owner_review": false,
                "require_extra_approval_for_unattributed_changes": true,
                "require_last_push_approval": false,
                "required_approving_review_count": 0,
                "required_review_thread_resolution": true
            }
        },
        {
            "type": "required_status_checks",
            "parameters": {
                "do_not_enforce_on_create": false,
                "strict_required_status_checks_policy": true,
                "required_status_checks": [
                    { "context": "lint" },
                    { "context": "typecheck" },
                    { "context": "knip" },
                    { "context": "unit" },
                    { "context": "build" },
                    { "context": "bundle-size" },
                    { "context": "analyze" },
                    { "context": "review" },
                    { "context": "scan" },
                    { "context": "conventional" },
                    { "context": "e2e" },
                    { "context": "lighthouse" }
                ]
            }
        },
        { "type": "required_linear_history" },
        {
            "type": "required_deployments",
            "parameters": { "required_deployment_environments": ["Preview"] }
        }
    ]
}
JSON
)"

existing_id="$(gh api "repos/${REPO}/rulesets" --jq '.[] | select(.name == "main-protection") | .id')"
if [[ -n "${existing_id}" ]]; then
    echo "==> Updating ruleset 'main-protection' (#${existing_id})"
    gh api --method PUT "repos/${REPO}/rulesets/${existing_id}" --input - <<<"${ruleset}" >/dev/null
else
    echo "==> Creating ruleset 'main-protection'"
    gh api --method POST "repos/${REPO}/rulesets" --input - <<<"${ruleset}" >/dev/null
fi

echo "Done."
