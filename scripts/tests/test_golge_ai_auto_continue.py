"""Security regression guards for the GOLGE AI automatic task queue."""
from pathlib import Path
import unittest

WORKFLOW = Path(__file__).resolve().parents[2] / ".github/workflows/golge-ai-auto-continue.yml"


class AutoContinueSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = WORKFLOW.read_text(encoding="utf-8")

    def test_only_successful_trusted_main_pushes(self):
        for value in (
            "workflow_run.conclusion == 'success'",
            "workflow_run.event == 'push'",
            "workflow_run.head_branch == 'main'",
            "workflow_run.head_repository.full_name == github.repository",
            "run.name !== 'test'",
        ):
            self.assertIn(value, self.source)

    def test_single_writer_and_no_untrusted_checkout(self):
        self.assertIn("group: golge-safe-queue-single-writer", self.source)
        self.assertIn("cancel-in-progress: false", self.source)
        self.assertNotIn("actions/checkout@", self.source)

    def test_paginated_dedup_and_fail_closed(self):
        self.assertIn("github.paginate(github.rest.issues.listForRepo", self.source)
        self.assertIn("state: 'all', per_page: 100", self.source)
        self.assertIn("(issue.body || '').includes(marker)", self.source)

    def test_only_review_issue_write(self):
        self.assertIn("github.rest.issues.create(", self.source)
        for forbidden in ("github.rest.pulls.merge(", "github.rest.repos.createDeployment(",
                          "github.rest.actions.createWorkflowDispatch(", "github.rest.git.createRef("):
            self.assertNotIn(forbidden, self.source)

    def test_read_only_other_scopes(self):
        self.assertIn("contents: read", self.source)
        self.assertIn("actions: read", self.source)
        self.assertIn("issues: write", self.source)


if __name__ == "__main__":
    unittest.main()
