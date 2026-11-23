"""Read-only GitHub merge evidence adapter. Deny on missing permissions or data.

API is injected for testability and must implement get(path) -> JSON object/list.
No write methods or merge operations are used.
"""
from scripts.golge_ai_merge_integrated import integrated_decide


def collect(api, owner, repo, number):
    evidence = {
        "repo": owner + "/" + repo,
        "base": None, "draft": None, "head_sha": None,
        "checks_commit_sha": None, "required_checks_passed": False,
        "branch_protection_verified": False,
        "independent_review_verified": False,
        "stop_switch": None, "files": None,
        "external_deploy_hooks_verified": False,
    }
    errors = []
    root = "/repos/{}/{}".format(owner, repo)

    def read(path):
        try:
            return api.get(path)
        except Exception as exc:
            errors.append("api_unavailable:" + path.split("?")[0])
            return None

    pr = read(root + "/pulls/" + str(number))
    if not isinstance(pr, dict):
        return evidence, errors
    evidence["base"] = (pr.get("base") or {}).get("ref")
    evidence["draft"] = pr.get("draft")
    evidence["head_sha"] = (pr.get("head") or {}).get("sha")
    author = (pr.get("user") or {}).get("login")
    if not evidence["head_sha"] or not author or evidence["base"] != "main":
        errors.append("incomplete_pr")

    # Pagination is mandatory: missing or malformed pages fail closed.
    def pages(endpoint):
        collected = []
        for page in range(1, 51):
            batch = read(endpoint + ("&" if "?" in endpoint else "?") +
                         "per_page=100&page=" + str(page))
            if not isinstance(batch, list):
                errors.append("pagination_incomplete")
                return None
            collected.extend(batch)
            if len(batch) < 100:
                return collected
        errors.append("pagination_limit")
        return None

    files = pages(root + "/pulls/" + str(number) + "/files")
    if files is not None and all(isinstance(f, dict) and isinstance(f.get("filename"), str)
                                 for f in files):
        evidence["files"] = [f["filename"] for f in files]
    else:
        errors.append("invalid_file_inventory")

    protection = read(root + "/branches/main/protection")
    if isinstance(protection, dict):
        checks = protection.get("required_status_checks")
        reviews = protection.get("required_pull_request_reviews")
        evidence["branch_protection_verified"] = (
            isinstance(checks, dict) and
            bool(checks.get("contexts") or checks.get("checks")) and
            isinstance(reviews, dict) and
            reviews.get("required_approving_review_count", 0) >= 1 and
            protection.get("enforce_admins", {}).get("enabled") is True
        )
    else:
        errors.append("branch_protection_access_denied_or_unavailable")

    reviews = pages(root + "/pulls/" + str(number) + "/reviews")
    if isinstance(reviews, list) and evidence["branch_protection_verified"]:
        # Latest review per reviewer is authoritative; self-review never counts.
        latest = {}
        for review in reviews:
            if not isinstance(review, dict):
                errors.append("invalid_review")
                break
            login = (review.get("user") or {}).get("login")
            if login:
                latest[login] = review.get("state")
        else:
            needed = protection["required_pull_request_reviews"]["required_approving_review_count"]
            evidence["independent_review_verified"] = (
                sum(state == "APPROVED" for login, state in latest.items()
                    if login != author) >= needed
            )

    # A live STOP switch is required to be explicitly absent.
    issues = pages(root + "/issues?state=open")
    if isinstance(issues, list):
        evidence["stop_switch"] = any(
            isinstance(issue, dict) and issue.get("title") == "[GOLGE AI STOP]"
            and "pull_request" not in issue for issue in issues
        )

    # Verify exact PR head SHA, not stale checks from an older commit.
    sha = evidence["head_sha"]
    if sha:
        checks = pages(root + "/commits/" + sha + "/check-runs")
        if isinstance(checks, list):
            # Some clients return an object for check-runs; this adapter deliberately
            # fails closed until a normalized, audited client is provided.
            errors.append("check_runs_unexpected_schema")
        else:
            errors.append("checks_unverified")

    # External deploy hooks cannot be proven absent from these endpoints.
    errors.append("external_deploy_hooks_unverified")
    return evidence, sorted(set(errors))


def evaluate(api, owner, repo, number, workflow_dir):
    evidence, errors = collect(api, owner, repo, number)
    result = integrated_decide(evidence, workflow_dir)
    result["reasons"] = sorted(set(result["reasons"] + errors))
    result["decision"] = "BLOCK"
    result["merge_performed"] = False
    return result
