import unittest
from scripts.golge_ai_merge_safety import decide


class MergeSafetyTests(unittest.TestCase):
    def good(self):
        return dict(repo="cihatsarsilmaz/astrowar-capacitor", base="main",
                    draft=False, stop_switch=False, branch_protection_verified=True,
                    independent_review_verified=True, checks_commit_sha="abc",
                    head_sha="abc", required_checks_passed=True,
                    deploy_on_merge=False, files=["docs/readme.md"])

    def test_allowlisted_docs_simulation_never_merges(self):
        result = decide(self.good())
        self.assertEqual(result["decision"], "SIMULATED_ELIGIBLE")
        self.assertFalse(result["merge_performed"])

    def test_unknown_protection_denied(self):
        data = self.good()
        data.pop("branch_protection_verified")
        self.assertIn("branch_protection_unverified", decide(data)["reasons"])

    def test_main_push_deploy_blocks(self):
        data = self.good()
        data["deploy_on_merge"] = True
        self.assertEqual(decide(data)["decision"], "BLOCK")

    def test_workflow_and_auth_files_block(self):
        for path in (".github/workflows/deploy-web.yml", "functions/index.js",
                     "android/app/build.gradle", "scripts/golge_ai_merge_safety.py"):
            with self.subTest(path=path):
                data = self.good()
                data["files"] = [path]
                self.assertEqual(decide(data)["decision"], "BLOCK")

    def test_stale_sha_and_failed_ci_block(self):
        data = self.good()
        data["checks_commit_sha"] = "old"
        data["required_checks_passed"] = False
        self.assertEqual(decide(data)["decision"], "BLOCK")

    def test_stop_switch_blocks(self):
        data = self.good()
        data["stop_switch"] = True
        self.assertIn("stop_or_unknown", decide(data)["reasons"])

    def test_draft_and_missing_review_block(self):
        data = self.good()
        data["draft"] = True
        data["independent_review_verified"] = False
        self.assertEqual(decide(data)["decision"], "BLOCK")

    def test_unclassified_or_empty_inventory_blocks(self):
        for files in ([], ["src/App.tsx"]):
            data = self.good()
            data["files"] = files
            self.assertEqual(decide(data)["decision"], "BLOCK")


if __name__ == "__main__":
    unittest.main()
