"""Fail-closed adapter from durable ledger evidence to a timer display payload.

No network access, no scheduling, no automatic approvals. Evidence validity
is not proof of GitHub authentication; caller must verify source and custody.
"""
import json
from datetime import datetime, timezone
from pathlib import Path
from scripts.golge_ai_operation_ledger import dashboard_snapshot, PROJECT
from scripts.golge_ai_operation_timer import timer_state


def _parse_time(value):
    if not isinstance(value, str):
        raise ValueError("missing timestamp")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("timezone required")
    return parsed.astimezone(timezone.utc)


def timer_from_ledger(ledger_path, commit_sha, now, stop=False):
    if not isinstance(commit_sha, str) or len(commit_sha) != 40 or any(c not in "0123456789abcdef" for c in commit_sha):
        raise ValueError("invalid SHA")
    snapshot = dashboard_snapshot(ledger_path)
    matching = [event for event in snapshot["events"]
                if event["repo"] == PROJECT and event["commit_sha"] == commit_sha]
    if not matching:
        raise ValueError("no evidence for selected commit")
    # A stable start is derived from the earliest validated event, not the last
    # check completion; later events do not reset the timer.
    earliest = min(matching, key=lambda event: _parse_time(event["occurred_at"]))
    state = timer_state(earliest["occurred_at"], now, stop=stop)
    state.update({
        "schema": 1,
        "repo": PROJECT,
        "commit_sha": commit_sha,
        "source_event_id": earliest["event_id"],
        "source_url": earliest["source_url"],
        "evidence_count": len(matching),
        "source_authenticated": False,
        "mode": "offline_verified_shape_only",
    })
    return state


def write_snapshot(ledger_path, commit_sha, now, output_path, stop=False):
    """Export a static preview file; not a server endpoint or live source."""
    state = timer_from_ledger(ledger_path, commit_sha, now, stop)
    target = Path(output_path)
    if target.is_symlink():
        raise ValueError("symlink destination refused")
    # Caller must control destination path; no arbitrary HTTP access.
    target.write_text(json.dumps(state, ensure_ascii=False, sort_keys=True), encoding="utf-8")
    return state
