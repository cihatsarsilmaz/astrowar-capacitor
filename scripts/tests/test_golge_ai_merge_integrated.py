"""Regression tests for integrated merge safety, including restart and fail-closed cases."""
import tempfile
from pathlib import Path
import unittest

from scripts.golge_ai_merge_integrated import integrated_decide, workflow_isolation

SOURCE = Path(__file__).resolve().parents[2] / ".github/workflows"


def sample():
    return dict(repo="cihatsarsilmaz/astrowar-capacitor", base="main",
                draft=False, stop_switch=False, branch_protection_verified=True,
                independent_review_verified=True, checks_commit_sha="abc",
                head_sha="abc", required_checks_passed=True,
                deploy_on_merge=False, external_deploy_hooks_verified=True,
                files=["docs/readme.md"])


class IntegratedMergeTests(unittest.TestCase):
    def test_repository_workflows_are_locally_isolated(self):
        self.assertEqual(workflow_isolation(SOURCE), [])

    def test_unknown_external_hooks_block_even_if_caller_says_safe(self):
        evidence = sample()
        del evidence["external_deploy_hooks_verified"]
        result = integrated_decide(evidence, SOURCE)
        self.assertEqual(result["decision"], "BLOCK")
        self.assertIn("external_deployment_hooks_unverified", result["reasons"])

    def test_branch_protection_403_blocks(self):
        evidence = sample()
        evidence["branch_protection_verified"] = None
        result = integrated_decide(evidence, SOURCE)
        self.assertIn("branch_protection_unverified", result["reasons"])

    def test_stop_blocks(self):
        evidence = sample()
        evidence["stop_switch"] = True
        self.assertEqual(integrated_decide(evidence, SOURCE)["decision"], "BLOCK")

    def test_simulated_eligibility_never_merges(self):
        result = integrated_decide(sample(), SOURCE)
        self.assertEqual(result["decision"], "SIMULATED_ELIGIBLE")
        self.assertFalse(result["merge_performed"])

    def test_missing_workflow_blocks(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = integrated_decide(sample(), tmp)
            self.assertEqual(result["decision"], "BLOCK")
            self.assertTrue(any("workflow_unreadable:" in r for r in result["reasons"]))

    def test_push_trigger_blocks(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            for name in ("deploy-web.yml", "build-apk.yml", "deploy-functions.yml", "publish.yml"):
                (directory / name).write_text((SOURCE / name).read_text())
            file = directory / "deploy-web.yml"
            file.write_text(file.read_text().replace(
                "on:\n  workflow_dispatch:", "on:\n  push:\n    branches: [main]\n  workflow_dispatch:"))
            result = integrated_decide(sample(), directory)
            self.assertIn("publishing_trigger_not_isolated:deploy-web.yml", result["reasons"])

    def test_stale_sha_blocks(self):
        evidence = sample()
        evidence["checks_commit_sha"] = "outdated"
        self.assertEqual(integrated_decide(evidence, SOURCE)["decision"], "BLOCK")

    def test_restart_is_deterministic(self):
        first = integrated_decide(sample(), SOURCE)
        second = integrated_decide(sample(), SOURCE)
        self.assertEqual(first, second)


if __name__ == "__main__":
    unittest.main()
