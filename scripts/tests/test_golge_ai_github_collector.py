from pathlib import Path
import tempfile
import unittest
from scripts.golge_ai_github_collector import collect, CollectionBlocked
from scripts.golge_ai_operation_ledger import dashboard_snapshot

SHA = "a" * 40
BASE = "/repos/cihatsarsilmaz/astrowar-capacitor"
URL = "https://github.com/cihatsarsilmaz/astrowar-capacitor"


class FakeClient:
    authenticated = True
    def __init__(self, mode=None):
        self.mode = mode
        self.paths = []

    def get(self, path):
        self.paths.append(path)
        if self.mode == "403":
            raise PermissionError("403")
        if "/actions/runs?" in path:
            if self.mode == "missing":
                return {"workflow_runs": [], "total_count": 1}
            return {"total_count": 1, "workflow_runs": [{
                "id": 42, "head_sha": "b" * 40 if self.mode == "stale" else SHA,
                "status": "completed", "conclusion": "success",
                "updated_at": "2026-11-23T02:40:00Z",
                "html_url": URL + "/actions/runs/42", "run_attempt": 1
            }]}
        if "/check-runs?" in path:
            return {"total_count": 1, "check_runs": [{
                "id": 123, "head_sha": SHA, "status": "completed",
                "conclusion": "success", "started_at": "2026-11-23T02:40:00Z"
            }]}
        raise AssertionError("unapproved endpoint " + path)


class CollectorTests(unittest.TestCase):
    def test_authenticated_snapshot(self):
        with tempfile.TemporaryDirectory() as tmp:
            client = FakeClient()
            path = Path(tmp) / "ledger.json"
            result = collect(client, path, SHA)
            self.assertEqual(result["workflow_runs"], 1)
            self.assertEqual(result["check_runs"], 1)
            self.assertEqual(len(dashboard_snapshot(path)["events"]), 2)
            self.assertFalse(result["automatic_approval"])
            self.assertTrue(all(p.startswith(BASE + "/") for p in client.paths))

    def test_replay_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "ledger.json"
            collect(FakeClient(), path, SHA)
            collect(FakeClient(), path, SHA)
            self.assertEqual(len(dashboard_snapshot(path)["events"]), 2)

    def test_unauthenticated_denied(self):
        with tempfile.TemporaryDirectory() as tmp:
            client = FakeClient()
            client.authenticated = False
            with self.assertRaises(CollectionBlocked):
                collect(client, Path(tmp) / "ledger.json", SHA)

    def test_403_denied_without_writes(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "ledger.json"
            with self.assertRaises(CollectionBlocked):
                collect(FakeClient("403"), path, SHA)
            self.assertFalse(path.exists())

    def test_stale_sha_denied_without_writes(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "ledger.json"
            with self.assertRaises(CollectionBlocked):
                collect(FakeClient("stale"), path, SHA)
            self.assertFalse(path.exists())

    def test_incomplete_page_denied_without_writes(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "ledger.json"
            with self.assertRaises(CollectionBlocked):
                collect(FakeClient("missing"), path, SHA)
            self.assertFalse(path.exists())

    def test_invalid_sha_denied(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(CollectionBlocked):
                collect(FakeClient(), Path(tmp) / "ledger.json", "bad")

    def test_policy_timing_not_automatic_approval(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "ledger.json"
            collect(FakeClient(), path, SHA)
            snapshot = dashboard_snapshot(path)
            self.assertEqual(snapshot["wait_minutes"], 10)
            self.assertEqual(snapshot["review_interval_minutes"], 15)
            self.assertFalse(snapshot["automatic_approval"])


if __name__ == "__main__":
    unittest.main()
