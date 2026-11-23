"""Versioned project-scoped incident ledger for a trusted durable storage mount.

This module does not provision persistence. Do not store secrets in event references.
"""
import json
import os
from pathlib import Path
import re
import tempfile

VERSION = 1
PROJECT = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,79}$")
EVENT = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,159}$")


def empty_state():
    return {"schema_version": VERSION, "projects": {}}


def validate(state):
    if not isinstance(state, dict) or state.get("schema_version") != VERSION:
        raise ValueError("Unsupported state schema")
    projects = state.get("projects")
    if not isinstance(projects, dict):
        raise ValueError("Invalid projects")
    for name, events in projects.items():
        if not isinstance(name, str) or not PROJECT.fullmatch(name) or not isinstance(events, dict):
            raise ValueError("Invalid project entry")
        for event_id, entry in events.items():
            if not isinstance(event_id, str) or not EVENT.fullmatch(event_id):
                raise ValueError("Invalid event id")
            if not isinstance(entry, dict) or set(entry) != {"status", "reference"}:
                raise ValueError("Invalid event entry")
            if entry["status"] not in ("observed", "reviewed") or not isinstance(entry["reference"], str) or len(entry["reference"]) > 500:
                raise ValueError("Invalid event metadata")
    return state


def load(path):
    path = Path(path)
    if not path.exists():
        return empty_state()
    return validate(json.loads(path.read_text(encoding="utf-8")))


def record(state, project, event_id, reference=""):
    validate(state)
    if not isinstance(project, str) or not PROJECT.fullmatch(project):
        raise ValueError("Invalid project")
    if not isinstance(event_id, str) or not EVENT.fullmatch(event_id):
        raise ValueError("Invalid event id")
    if not isinstance(reference, str) or len(reference) > 500:
        raise ValueError("Invalid reference")
    events = state["projects"].setdefault(project, {})
    if event_id in events:
        return False
    events[event_id] = {"status": "observed", "reference": reference}
    return True


def save(path, state):
    validate(state)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(prefix=".golge-state-", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(state, stream, sort_keys=True, ensure_ascii=False)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)
