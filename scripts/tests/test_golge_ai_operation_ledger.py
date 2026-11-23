import json
from pathlib import Path
import tempfile
import unittest
from scripts.golge_ai_operation_ledger import append_event, dashboard_snapshot


def event(**overrides):
    data = dict(event_id="run-1", kind="workflow_run",
                repo="cihatsarsilmaz/astrowar-capacitor",
                commit_sha="a" * 40, status="completed",
                occurred_at="2026-11-23T02:35:00Z",
                source_url="https://github.com/cihatsarsilmaz/astrowar-capacitor/actions/runs/1")
    data.update(overrides)
    return data


class OperationLedgerTests(unittest.TestCase):
    def test_append_and_snapshot(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "events.json"
            self.assertTrue(append_event(path, event()))
            snap = dashboard_snapshot(path)
            self.assertEqual(len(snap["events"]), 1)
            self.assertEqual(snap["last_verified_at"], event()["occurred_at"])
            self.assertFalse(snap["automatic_approval"])
            self.assertEqual(snap["wait_minutes"], 10)
            self.assertEqual(snap["review_interval_minutes"], 15)

    def test_idempotent_event(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "events.json"
            append_event(path, event())
            self.assertFalse(append_event(path, event()))
            self.assertEqual(len(dashboard_snapshot(path)["events"]), 1)

    def test_conflicting_event_denied(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "events.json"
            append_event(path, event())
            with self.assertRaises(ValueError):
                append_event(path, event(status="failed"))

    def test_bad_sha_and_project_denied(self):
        with tempfile.TemporaryDirectory() as tmp:
            for invalid in (event(commit_sha="bad"), event(repo="other/repo")):
                with self.assertRaises(ValueError):
                    append_event(Path(tmp) / "events.json", invalid)

    def test_timestamp_without_timezone_denied(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                append_event(Path(tmp) / "events.json", event(occurred_at="2026-11-23T02:35:00"))

    def test_untrusted_url_denied(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                append_event(Path(tmp) / "events.json", event(source_url="https://example.com/"))

    def test_missing_snapshot_has_no_approval(self):
        with tempfile.TemporaryDirectory() as tmp:
            snap = dashboard_snapshot(Path(tmp) / "missing.json")
            self.assertEqual(snap["events"], [])
            self.assertFalse(snap["automatic_approval"])

    def test_invalid_existing_ledger_denied(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "events.json"
            path.write_text(json.dumps({"schema": 999, "events": []}))
            with self.assertRaises(ValueError):
                append_event(path, event())


if __name__ == "__main__":
    unittest.main()
