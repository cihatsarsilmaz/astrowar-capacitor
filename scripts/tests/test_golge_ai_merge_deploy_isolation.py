"""Fail closed checks: merging main must not auto-deploy or release."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2] / ".github/workflows"


class MergeDeployIsolationTests(unittest.TestCase):
    def test_pages_manual_only(self):
        s = (ROOT / "deploy-web.yml").read_text()
        self.assertIn("workflow_dispatch:", s)
        self.assertNotIn("push:", s)
        self.assertIn("actions/deploy-pages@v4", s)

    def test_apk_manual_only(self):
        s = (ROOT / "build-apk.yml").read_text()
        self.assertIn("workflow_dispatch:", s)
        self.assertNotIn("push:", s)
        self.assertIn("actions/upload-artifact@v4", s)

    def test_apk_cannot_mutate_releases(self):
        s = (ROOT / "build-apk.yml").read_text()
        self.assertIn("contents: read", s)
        self.assertNotIn("contents: write", s)
        self.assertNotIn("gh release", s)

    def test_package_publish_remains_separately_gated(self):
        s = (ROOT / "publish.yml").read_text()
        self.assertIn("release:", s)
        self.assertIn("types: [published]", s)
        self.assertNotIn("push:", s)


if __name__ == "__main__":
    unittest.main()
