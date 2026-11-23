"""Fail-closed, read-only pull request merge decision simulator.

No GitHub writes. Unknown branch protection or publication side effects deny.
"""
import fnmatch
import json
import sys

CRITICAL = (
    ".github/workflows/**", ".github/CODEOWNERS", "**/firebase.json",
    "**/.firebaserc", "functions/**", "**/auth/**", "**/payment/**",
    "**/secrets/**", "**/*.key", "**/*.pem", "package.json",
    "package-lock.json", "android/**", "ios/**", "scripts/golge_ai_*",
)
SAFE = ("docs/**", "**/*.md", "scripts/tests/**")


def decide(evidence):
    reasons = []
    if evidence.get("repo") != "cihatsarsilmaz/astrowar-capacitor":
        reasons.append("repository_not_allowlisted")
    if evidence.get("base") != "main":
        reasons.append("base_not_main")
    if evidence.get("draft") is not False:
        reasons.append("draft_or_unknown")
    if evidence.get("stop_switch") is not False:
        reasons.append("stop_or_unknown")
    if evidence.get("branch_protection_verified") is not True:
        reasons.append("branch_protection_unverified")
    if evidence.get("independent_review_verified") is not True:
        reasons.append("independent_review_unverified")
    if evidence.get("checks_commit_sha") != evidence.get("head_sha") or not evidence.get("head_sha"):
        reasons.append("stale_or_missing_checks")
    if evidence.get("required_checks_passed") is not True:
        reasons.append("checks_not_verified")
    if evidence.get("deploy_on_merge") is not False:
        reasons.append("deployment_risk_or_unknown")
    files = evidence.get("files")
    if not isinstance(files, list) or not files or any(not isinstance(f, str) or not f for f in files):
        reasons.append("missing_file_inventory")
    else:
        for path in files:
            if any(fnmatch.fnmatchcase(path, p) for p in CRITICAL):
                reasons.append("critical_file:" + path)
            elif not any(fnmatch.fnmatchcase(path, p) for p in SAFE):
                reasons.append("unclassified_file:" + path)
    return {"decision": "BLOCK" if reasons else "SIMULATED_ELIGIBLE",
            "reasons": sorted(set(reasons)), "mode": "dry_run",
            "merge_performed": False}


if __name__ == "__main__":
    data = json.load(sys.stdin)
    print(json.dumps(decide(data), sort_keys=True))
