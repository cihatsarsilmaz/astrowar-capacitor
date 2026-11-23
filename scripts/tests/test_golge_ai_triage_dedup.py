"""Regression guards for durable, fail-closed GÖLGE AI triage deduplication."""
from pathlib import Path
import unittest

WORKFLOW = Path(__file__).resolve().parents[2] / ".github/workflows/golge-ai-failure-triage.yml"


class TriageDedupGuards(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workflow = WORKFLOW.read_text(encoding="utf-8")

    def test_issue_lookup_is_paginated_and_includes_closed_issues(self):
        self.assertIn("github.paginate(github.rest.issues.listForRepo", self.workflow)
        self.assertIn("state: 'all', per_page: 100", self.workflow)
        self.assertIn("!issue.pull_request && issue.title === title", self.workflow)

    def test_pr_comment_lookup_is_paginated(self):
        self.assertIn("github.paginate(github.rest.issues.listComments", self.workflow)
        self.assertIn("comments.some(c => c.body?.includes(marker))", self.workflow)

    def test_no_automatic_merge_or_deployment(self):
        self.assertNotIn("github.rest.pulls.merge(", self.workflow)
        self.assertNotIn("github.rest.repos.createDeployment(", self.workflow)


if __name__ == "__main__":
    unittest.main()
