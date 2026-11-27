import tempfile
import unittest
from pathlib import Path
from scripts.golge_ai_operation_ledger import append_event, PROJECT
from scripts.golge_ai_timer_evidence_adapter import timer_from_ledger

SHA = "a" * 40
EVENT = {
    "event_id": "run-1", "kind": "workflow_run", "repo": PROJECT,
    "commit_sha": SHA, "status": "completed",
    "occurred_at": "2026-11-23T03:00:00Z",
    "source_url": "https://github.com/cihatsarsilmaz/astrowar-capacitor/actions/runs/1"
}


class TimerEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "ledger.json"

    def tearDown(self):
        self.tmp.cleanup()

    def test_missing_evidence_fails_closed(self):
        with self.assertRaises(ValueError):
            timer_from_ledger(self.path, SHA, "2026-11-23T03:01:00Z")

    def test_real_ledger_event_drives_timer(self):
        append_event(self.path, EVENT)
        state = timer_from_ledger(self.path, SHA, "2026-11-23T03:10:00Z")
        self.assertEqual(state["wait_remaining_seconds"], 0)
        self.assertEqual(state["review_remaining_seconds"], 300)
        self.assertFalse(state["automatic_approval"])
        self.assertFalse(state["source_authenticated"])

    def test_later_event_does_not_reset_clock(self):
        append_event(self.path, EVENT)
        later = dict(EVENT, event_id="run-2", occurred_at="2026-11-23T03:08:00Z")
        append_event(self.path, later)
        state = timer_from_ledger(self.path, SHA, "2026-11-23T03:15:00Z")
        self.assertEqual(state["elapsed_seconds"], 900)
        self.assertEqual(state["evidence_count"], 2)

    def test_wrong_commit_fails_closed(self):
        append_event(self.path, EVENT)
        with self.assertRaises(ValueError):
            timer_from_ledger(self.path, "b" * 40, "2026-11-23T03:10:00Z")

    def test_stop_does_not_authorize(self):
        append_event(self.path, EVENT)
        state = timer_from_ledger(self.path, SHA, "2026-11-23T03:20:00Z", stop=True)
        self.assertEqual(state["state"], "STOPPED")
        self.assertFalse(state["merge_permitted"])
        self.assertFalse(state["deploy_permitted"])


if __name__ == "__main__":
    unittest.main()
