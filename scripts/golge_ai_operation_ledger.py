"""GÖLGE AI operation evidence ledger, local read-only data ingestion.

Stores verified-shaped GitHub events for dashboard display. Never merges,
deploys, approves or schedules actions. A trusted caller must authenticate
source data before ingestion; schema validation is NOT authentication.
"""
import json
import os
from pathlib import Path
import tempfile
from datetime import datetime, timezone

SCHEMA = 1
KINDS = {"workflow_run", "check_run", "task_status"}
STATUSES = {"queued", "in_progress", "completed", "blocked", "failed"}
PROJECT = "cihatsarsilmaz/astrowar-capacitor"
MAX_RECORDS = 1000


def validate(event):
    if not isinstance(event, dict):
        raise ValueError("event must be object")
    required = ("event_id", "kind", "repo", "commit_sha", "status", "occurred_at", "source_url")
    if any(not isinstance(event.get(k), str) or not event[k] for k in required):
        raise ValueError("missing required evidence")
    if event["repo"] != PROJECT or event["kind"] not in KINDS or event["status"] not in STATUSES:
        raise ValueError("invalid project, kind or status")
    sha = event["commit_sha"]
    if len(sha) != 40 or any(c not in "0123456789abcdef" for c in sha):
        raise ValueError("invalid commit SHA")
    try:
        stamp = datetime.fromisoformat(event["occurred_at"].replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError("invalid timestamp") from exc
    if stamp.tzinfo is None:
        raise ValueError("timestamp must include timezone")
    if not event["source_url"].startswith("https://github.com/cihatsarsilmaz/astrowar-capacitor/"):
        raise ValueError("source must be repository GitHub URL")
    return {k: event[k] for k in required}


def append_event(path, event):
    record = validate(event)
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.is_symlink():
        raise ValueError("symlink ledger refused")
    if target.exists():
        data = json.loads(target.read_text(encoding="utf-8"))
        if data.get("schema") != SCHEMA or not isinstance(data.get("events"), list):
            raise ValueError("ledger schema mismatch")
    else:
        data = {"schema": SCHEMA, "events": []}
    for existing in data["events"]:
        if existing["event_id"] == record["event_id"]:
            if existing != record:
                raise ValueError("event id conflict")
            return False
    data["events"] = (data["events"] + [record])[-MAX_RECORDS:]
    # Same-filesystem atomic replacement. Caller must enforce single-writer
    # concurrency externally; this is not a distributed transaction.
    fd, tmp = tempfile.mkstemp(dir=str(target.parent), prefix=".golge-")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(data, stream, ensure_ascii=False, sort_keys=True)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(tmp, target)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)
    return True


def dashboard_snapshot(path):
    target = Path(path)
    if not target.exists():
        return {"schema": SCHEMA, "events": [], "last_verified_at": None,
                "review_interval_minutes": 15, "wait_minutes": 10,
                "automatic_approval": False}
    data = json.loads(target.read_text(encoding="utf-8"))
    if data.get("schema") != SCHEMA or not isinstance(data.get("events"), list):
        raise ValueError("invalid ledger")
    events = [validate(event) for event in data["events"]]
    return {"schema": SCHEMA, "events": events,
            "last_verified_at": max((e["occurred_at"] for e in events), default=None),
            "review_interval_minutes": 15, "wait_minutes": 10,
            "automatic_approval": False}
