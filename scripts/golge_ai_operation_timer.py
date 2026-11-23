"""GÖLGE AI operational timer: pure, UTC-aware read-only dashboard state.

This does not schedule jobs or authorize merges/deployments. A caller must
provide authenticated timestamps from the durable operation ledger.
"""
from datetime import datetime, timedelta, timezone

WAIT_SECONDS = 10 * 60
REVIEW_SECONDS = 15 * 60


def _timestamp(value):
    if not isinstance(value, str):
        raise ValueError("timestamp must be string")
    try:
        stamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("invalid timestamp") from exc
    if stamp.tzinfo is None:
        raise ValueError("timezone required")
    return stamp.astimezone(timezone.utc)


def timer_state(started_at, now, stop=False):
    """Return remaining wait/review time without triggering side effects."""
    start = _timestamp(started_at)
    current = _timestamp(now)
    if current < start:
        raise ValueError("current time precedes start")
    elapsed = int((current - start).total_seconds())
    wait_remaining = max(0, WAIT_SECONDS - elapsed)
    review_remaining = max(0, REVIEW_SECONDS - elapsed)
    return {
        "started_at": start.isoformat(),
        "observed_at": current.isoformat(),
        "elapsed_seconds": elapsed,
        "wait_remaining_seconds": wait_remaining,
        "review_remaining_seconds": review_remaining,
        "wait_elapsed": wait_remaining == 0,
        "review_due": review_remaining == 0,
        "stop": bool(stop),
        "state": "STOPPED" if stop else "REVIEW_DUE" if review_remaining == 0 else "WAITING" if wait_remaining else "AWAITING_REVIEW",
        "automatic_approval": False,
        "merge_permitted": False,
        "deploy_permitted": False,
    }
