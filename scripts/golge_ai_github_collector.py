"""Read-only authenticated GitHub Actions evidence collector.

The caller MUST provide a GitHub App/installation authenticated client with
get(path). This module never accepts raw webhooks, credentials, or arbitrary
URLs and does not execute actions. Authentication is enforced by the injected
client, not inferred from the response or a GitHub-looking URL.
"""
from datetime import datetime
from scripts.golge_ai_operation_ledger import append_event, PROJECT

ROOT = "/repos/" + PROJECT
MAX_PAGES = 10


class CollectionBlocked(RuntimeError):
    pass


def _utc(value):
    if not isinstance(value, str):
        raise CollectionBlocked("missing timestamp")
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise CollectionBlocked("invalid timestamp") from exc
    if dt.tzinfo is None:
        raise CollectionBlocked("timestamp lacks timezone")
    return value


def _sha(value):
    if not isinstance(value, str) or len(value) != 40 or any(
        c not in "0123456789abcdef" for c in value
    ):
        raise CollectionBlocked("invalid SHA")
    return value


def _get(client, path):
    # An explicit authentication contract avoids treating public anonymous
    # GitHub responses as authenticated operational evidence.
    if getattr(client, "authenticated", False) is not True:
        raise CollectionBlocked("authenticated GitHub client required")
    if not path.startswith(ROOT + "/") or ".." in path:
        raise CollectionBlocked("endpoint not allowlisted")
    try:
        result = client.get(path)
    except Exception as exc:
        raise CollectionBlocked("GitHub API unavailable or unauthorized") from exc
    if not isinstance(result, dict):
        raise CollectionBlocked("malformed GitHub response")
    return result


def collect(client, ledger_path, expected_sha):
    """Collect a bounded consistent snapshot; fail closed before any writes."""
    sha = _sha(expected_sha)
    collected = []
    seen = set()
    complete = False
    for page in range(1, MAX_PAGES + 1):
        path = ROOT + "/actions/runs?head_sha=" + sha + "&per_page=100&page=" + str(page)
        response = _get(client, path)
        batch = response.get("workflow_runs")
        total = response.get("total_count")
        if not isinstance(batch, list) or type(total) is not int or total < 0:
            raise CollectionBlocked("invalid workflow run page")
        for run in batch:
            if not isinstance(run, dict) or run.get("head_sha") != sha:
                raise CollectionBlocked("stale or mismatched workflow SHA")
            ident = run.get("id")
            if type(ident) is not int or ident <= 0 or ident in seen:
                raise CollectionBlocked("invalid or duplicate workflow id")
            seen.add(ident)
            status = run.get("status")
            conclusion = run.get("conclusion")
            mapped = ("failed" if status == "completed" and conclusion != "success"
                      else "completed" if status == "completed"
                      else status)
            if mapped not in {"queued", "in_progress", "completed", "failed"}:
                raise CollectionBlocked("unsupported workflow state")
            occurred = _utc(run.get("updated_at"))
            url = "https://github.com/" + PROJECT + "/actions/runs/" + str(ident)
            if run.get("html_url") != url:
                raise CollectionBlocked("unexpected workflow source")
            collected.append({
                "event_id": "workflow-run-" + str(ident) + "-" + str(run.get("run_attempt", 1)),
                "kind": "workflow_run", "repo": PROJECT, "commit_sha": sha,
                "status": mapped, "occurred_at": occurred, "source_url": url
            })
        if len(batch) < 100:
            complete = len(collected) == total
            break
    if not complete:
        raise CollectionBlocked("incomplete pagination")

    checks = []
    complete = False
    for page in range(1, MAX_PAGES + 1):
        response = _get(client, ROOT + "/commits/" + sha +
                        "/check-runs?per_page=100&page=" + str(page))
        batch = response.get("check_runs")
        total = response.get("total_count")
        if not isinstance(batch, list) or type(total) is not int or total < 0:
            raise CollectionBlocked("invalid check-run page")
        for check in batch:
            if not isinstance(check, dict) or check.get("head_sha") != sha:
                raise CollectionBlocked("mismatched check SHA")
            ident = check.get("id")
            if type(ident) is not int or ident <= 0:
                raise CollectionBlocked("invalid check id")
            status = check.get("status")
            mapped = ("failed" if status == "completed" and check.get("conclusion") != "success"
                      else "completed" if status == "completed"
                      else status)
            if mapped not in {"queued", "in_progress", "completed", "failed"}:
                raise CollectionBlocked("unsupported check state")
            url = "https://github.com/" + PROJECT + "/runs/" + str(ident)
            checks.append({
                "event_id": "check-run-" + str(ident),
                "kind": "check_run", "repo": PROJECT, "commit_sha": sha,
                "status": mapped, "occurred_at": _utc(check.get("started_at")),
                "source_url": url
            })
        if len(batch) < 100:
            complete = len(checks) == total
            break
    if not complete:
        raise CollectionBlocked("incomplete check pagination")

    # Snapshot is validated before writes; ledger is not transactional across
    # events, so an interrupted append can leave a valid partial snapshot.
    for event in collected + checks:
        append_event(ledger_path, event)
    return {"workflow_runs": len(collected), "check_runs": len(checks),
            "commit_sha": sha, "automatic_approval": False}
