"""Static policy safety guards for the delayed level 4 diagnostic reviewer."""
from pathlib import Path
import unittest

WORKFLOW = Path(__file__).resolve().parents[2] / ".github/workflows/golge-ai-level4-review.yml"


class Level4PolicyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = WORKFLOW.read_text(encoding="utf-8")

    def test_delay_and_stop_switch(self):
        self.assertIn("10 * 60 * 1000", self.source)
        self.assertIn("'[GOLGE AI STOP]'", self.source)
        self.assertIn("return;", self.source)

    def test_serial_execution(self):
        self.assertIn("group: golge-level4-review-single-writer", self.source)
        self.assertIn("cancel-in-progress: false", self.source)

    def test_durable_idempotent_review(self):
        self.assertIn("github.paginate(github.rest.issues.listComments", self.source)
        self.assertIn("golge-level4-reviewed-v1", self.source)
        self.assertIn("comments.some(", self.source)

    def test_only_allowlisted_diagnostic(self):
        self.assertIn("'[GOLGE AI QUEUE] review-issues-ledger-integration-v1'", self.source)
        self.assertIn("golge-safe-task:review-issues-ledger-integration-v1", self.source)
        self.assertIn("const task = issues.find(", self.source)

    def test_no_code_or_deployment_execution(self):
        for forbidden in ("actions/checkout@", "github.rest.pulls.merge(", "github.rest.actions.createWorkflowDispatch(",
                          "github.rest.git.createRef(", "github.rest.repos.createDeployment(", "execSync(", "eval("):
            self.assertNotIn(forbidden, self.source)
        self.assertIn("contents: read", self.source)
        self.assertIn("issues: write", self.source)


if __name__ == "__main__":
    unittest.main()
