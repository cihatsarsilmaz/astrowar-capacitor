"""Durable ledger regression tests; no external services required."""
import json
from pathlib import Path
import tempfile
import unittest
from scripts.golge_ai_state import empty_state, load, record, save


class StateTests(unittest.TestCase):
    def test_restart_preserves_event_and_prevents_duplicate(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "state.json"
            state = load(path)
            self.assertTrue(record(state, "astrowar", "run:123", "https://github.com/example/run/123"))
            save(path, state)
            restarted = load(path)
            self.assertFalse(record(restarted, "astrowar", "run:123"))
            self.assertEqual(len(restarted["projects"]["astrowar"]), 1)

    def test_project_isolation(self):
        state = empty_state()
        self.assertTrue(record(state, "astrowar", "run:123"))
        self.assertTrue(record(state, "citvapp", "run:123"))
        self.assertEqual(len(state["projects"]), 2)

    def test_corrupt_state_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "state.json"
            path.write_text("{invalid", encoding="utf-8")
            with self.assertRaises(json.JSONDecodeError):
                load(path)

    def test_unsupported_schema_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "state.json"
            path.write_text('{"schema_version":999,"projects":{}}', encoding="utf-8")
            with self.assertRaises(ValueError):
                load(path)

    def test_invalid_identifier_rejected(self):
        with self.assertRaises(ValueError):
            record(empty_state(), "../escape", "run:123")


if __name__ == "__main__":
    unittest.main()
