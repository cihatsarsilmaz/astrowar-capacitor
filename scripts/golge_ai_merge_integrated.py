"""Integrated, read-only merge decision simulator.

Workflow evidence is derived from checked-out files, never accepted as a caller
assertion. External deployment hooks and branch protection must be verified by
a separate trusted reviewer; unknown means BLOCK. No GitHub write operations.
"""
import json
from pathlib import Path
import re
import sys

from scripts.golge_ai_merge_safety import decide

# These workflows can publish, deploy or mutate releases.
PUBLISHING_WORKFLOWS = (
    "deploy-web.yml", "build-apk.yml", "deploy-functions.yml", "publish.yml"
)
DANGEROUS_TRIGGERS = ("push", "pull_request", "pull_request_target", "workflow_run")


def _trigger_block(source):
    """Extract the top-level on: section, failing closed on unknown syntax."""
    match = re.search(r"(?m)^on:\s*\n", source)
    if not match:
        return None
    remainder = source[match.end():]
    next_key = re.search(r"(?m)^[A-Za-z_][\w-]*\s*:", remainder)
    return remainder[:next_key.start()] if next_key else remainder


def workflow_isolation(workflow_dir):
    reasons = []
    for name in PUBLISHING_WORKFLOWS:
        path = Path(workflow_dir) / name
        try:
            source = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError):
            reasons.append("workflow_unreadable:" + name)
            continue
        triggers = _trigger_block(source)
        if triggers is None:
            reasons.append("workflow_trigger_unknown:" + name)
            continue
        # Only explicit manual dispatch (or release publication for publish.yml)
        # is allowed. Even release publication is NOT automatic merge approval.
        active = re.findall(r"(?m)^  ([A-Za-z_][\w-]*):", triggers)
        allowed = {"release"} if name == "publish.yml" else {"workflow_dispatch"}
        if not active or set(active) != allowed:
            reasons.append("publishing_trigger_not_isolated:" + name)
        if name == "build-apk.yml" and (
            "gh release create" in source or "gh release delete" in source
            or "contents: write" in source
        ):
            reasons.append("apk_release_mutation:" + name)
    return sorted(set(reasons))


def integrated_decide(evidence, workflow_dir):
    """Never trust a caller-supplied deploy_on_merge=false as proof."""
    local_risks = workflow_isolation(workflow_dir)
    verified = not local_risks and evidence.get("external_deploy_hooks_verified") is True
    safe_evidence = dict(evidence)
    safe_evidence["deploy_on_merge"] = not verified
    result = decide(safe_evidence)
    reasons = set(result["reasons"])
    reasons.update(local_risks)
    if evidence.get("external_deploy_hooks_verified") is not True:
        reasons.add("external_deployment_hooks_unverified")
    result["reasons"] = sorted(reasons)
    result["decision"] = "BLOCK" if reasons else "SIMULATED_ELIGIBLE"
    result["workflow_isolation_checked"] = not local_risks
    result["merge_performed"] = False
    return result


if __name__ == "__main__":
    payload = json.load(sys.stdin)
    root = Path(__file__).resolve().parents[1]
    print(json.dumps(integrated_decide(payload, root / ".github/workflows"),
                     sort_keys=True))
