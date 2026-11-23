"""Integration-style tests with a durable file-backed fake GitHub Issues API.

No real GitHub writes, credentials, network access, or production changes.
"""
import json
from pathlib import Path
import tempfile
import unittest

from scripts.golge_ai_issues_state import IssuesLedger


class FileBackedIssuesAPI:
    def __init__(self, path, *, fail_read=False, fail_write=False):
        self.path = Path(path)
        self.fail_read = fail_read
        self.fail_write = fail_write

    def get(self, path):
        if self.fail_read:
            raise ConnectionError("simulated GitHub API outage")
        page = int(path.rsplit("page=", 1)[1])
        data = json.loads(self.path.read_text(encoding="utf-8")) if self.path.exists() else []
        return data[(page - 1) * 100:page * 100]

    def post(self, path, payload):
        if self.fail_write:
            raise ConnectionError("simulated write outage")
        data = json.loads(self.path.read_text(encoding="utf-8")) if self.path.exists() else []
        item = {"title": payload["title"], "body": payload["body"], "number": len(data) + 1}
        data.insert(0, item)
        self.path.write_text(json.dumps(data), encoding="utf-8")
        return item


class IntegrationSimulation(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "issues.json"
        self.url = "https://github.com/example/repo/actions/runs/123"

    def tearDown(self):
        self.tmp.cleanup()

    def ledger(self, **kwargs):
        return IssuesLedger(FileBackedIssuesAPI(self.path, **kwargs), "example", "repo")

    def test_recovery_across_new_api_instances(self):
        self.assertTrue(self.ledger().record_once("astrowar", "run:123", self.url)[0])
        self.assertFalse(self.ledger().record_once("astrowar", "run:123", self.url)[0])
        self.assertEqual(len(json.loads(self.path.read_text())), 1)

    def test_independent_project_keys(self):
        self.assertTrue(self.ledger().record_once("astrowar", "run:123", self.url)[0])
        self.assertTrue(self.ledger().record_once("citvapp", "run:123", self.url)[0])
        self.assertEqual(len(json.loads(self.path.read_text())), 2)

    def test_read_outage_never_creates_issue(self):
        with self.assertRaises(ConnectionError):
            self.ledger(fail_read=True).record_once("astrowar", "run:123", self.url)
        self.assertFalse(self.path.exists())

    def test_write_outage_retries_without_duplicate(self):
        with self.assertRaises(ConnectionError):
            self.ledger(fail_write=True).record_once("astrowar", "run:123", self.url)
        self.assertTrue(self.ledger().record_once("astrowar", "run:123", self.url)[0])
        self.assertFalse(self.ledger().record_once("astrowar", "run:123", self.url)[0])

    def test_closed_history_and_pagination(self):
        history = [{"title": "other", "number": n, "state": "closed"} for n in range(150)]
        self.path.write_text(json.dumps(history), encoding="utf-8")
        self.assertTrue(self.ledger().record_once("astrowar", "run:123", self.url)[0])
        self.assertFalse(self.ledger().record_once("astrowar", "run:123", self.url)[0])


if __name__ == "__main__":
    unittest.main()
