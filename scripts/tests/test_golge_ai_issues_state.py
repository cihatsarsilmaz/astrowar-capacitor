"""Contract tests for the GitHub Issues incident ledger."""
import unittest
from scripts.golge_ai_issues_state import IssuesLedger, incident_key, PREFIX


class FakeAPI:
    def __init__(self, pages=None):
        self.pages = pages or [[]]
        self.created = []
        self.fail = False

    def get(self, path):
        if self.fail:
            raise RuntimeError("GitHub unavailable")
        page = int(path.rsplit("page=", 1)[1])
        return self.pages[page - 1] if page <= len(self.pages) else []

    def post(self, path, payload):
        self.created.append(payload)
        self.pages[0].append({"title": payload["title"], "number": 123})
        return {"title": payload["title"], "number": 123}


class IssuesLedgerTests(unittest.TestCase):
    def test_restart_deduplicates_from_persistent_issue(self):
        api = FakeAPI()
        url = "https://github.com/example/project/actions/runs/123"
        self.assertTrue(IssuesLedger(api, "example", "project").record_once("astrowar", "run:123", url)[0])
        self.assertFalse(IssuesLedger(api, "example", "project").record_once("astrowar", "run:123", url)[0])
        self.assertEqual(len(api.created), 1)

    def test_project_isolation(self):
        api = FakeAPI()
        url = "https://github.com/example/project/actions/runs/123"
        IssuesLedger(api, "example", "project").record_once("astrowar", "run:123", url)
        IssuesLedger(api, "example", "project").record_once("citvapp", "run:123", url)
        self.assertEqual(len(api.created), 2)
        self.assertNotEqual(incident_key("astrowar", "run:123"), incident_key("citvapp", "run:123"))

    def test_api_failure_fails_closed(self):
        api = FakeAPI()
        api.fail = True
        with self.assertRaises(RuntimeError):
            IssuesLedger(api, "example", "project").record_once(
                "astrowar", "run:123", "https://github.com/example/project/actions/runs/123")
        self.assertFalse(api.created)

    def test_pagination_finds_old_issue(self):
        title = PREFIX + incident_key("astrowar", "run:123")
        api = FakeAPI([[{"title": "other"} for _ in range(100)], [{"title": title, "number": 9}]])
        created, issue = IssuesLedger(api, "example", "project").record_once(
            "astrowar", "run:123", "https://github.com/example/project/actions/runs/123")
        self.assertFalse(created)
        self.assertEqual(issue["number"], 9)

    def test_rejects_invalid_reference(self):
        with self.assertRaises(ValueError):
            IssuesLedger(FakeAPI(), "example", "project").record_once("astrowar", "run:123", "token=secret")


if __name__ == "__main__":
    unittest.main()
