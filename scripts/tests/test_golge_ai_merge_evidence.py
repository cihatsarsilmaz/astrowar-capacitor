"""Fail-closed integration tests with fake read-only GitHub API."""
from pathlib import Path
import unittest
from scripts.golge_ai_merge_evidence import collect, evaluate

ROOT = Path(__file__).resolve().parents[2] / ".github/workflows"
BASE = "/repos/cihatsarsilmaz/astrowar-capacitor"


class FakeAPI:
    def __init__(self, denied=False):
        self.denied = denied
        self.calls = []

    def get(self, path):
        self.calls.append(path)
        if self.denied and "/protection" in path:
            raise PermissionError("403 Resource not accessible by integration")
        if path == BASE + "/pulls/12":
            return {"base": {"ref": "main"}, "head": {"sha": "abc"},
                    "draft": False, "user": {"login": "author"}}
        if path.startswith(BASE + "/pulls/12/files?"):
            return [{"filename": "docs/readme.md"}]
        if path == BASE + "/branches/main/protection":
            return {"required_status_checks": {"contexts": ["vitest"]},
                    "required_pull_request_reviews": {"required_approving_review_count": 1},
                    "enforce_admins": {"enabled": True}}
        if path.startswith(BASE + "/pulls/12/reviews?"):
            return [{"user": {"login": "reviewer"}, "state": "APPROVED"}]
        if path.startswith(BASE + "/issues?"):
            return []
        if "/check-runs?" in path:
            return {"total_count": 1, "check_runs": [{"name": "vitest", "head_sha": "abc", "status": "completed", "conclusion": "success", "started_at": "2026-11-23T00:00:00Z"}]}
        raise AssertionError("Unexpected API call " + path)


class EvidenceAdapterTests(unittest.TestCase):
    def test_protection_and_independent_review_collected(self):
        evidence, errors = collect(FakeAPI(), "cihatsarsilmaz", "astrowar-capacitor", 12)
        self.assertTrue(evidence["branch_protection_verified"])
        self.assertTrue(evidence["independent_review_verified"])
        self.assertFalse(evidence["stop_switch"])
        self.assertTrue(evidence["required_checks_passed"])
        self.assertEqual(evidence["checks_commit_sha"], "abc")

    def test_403_denies_and_does_not_merge(self):
        result = evaluate(FakeAPI(denied=True), "cihatsarsilmaz",
                          "astrowar-capacitor", 12, ROOT)
        self.assertEqual(result["decision"], "BLOCK")
        self.assertFalse(result["merge_performed"])
        self.assertIn("branch_protection_unverified", result["reasons"])

    def test_unknown_external_hooks_always_block(self):
        result = evaluate(FakeAPI(), "cihatsarsilmaz",
                          "astrowar-capacitor", 12, ROOT)
        self.assertIn("external_deploy_hooks_unverified", result["reasons"])

    def test_no_write_api_calls(self):
        api = FakeAPI()
        collect(api, "cihatsarsilmaz", "astrowar-capacitor", 12)
        self.assertTrue(api.calls)
        self.assertTrue(all(isinstance(p, str) for p in api.calls))

    def test_firebase_workflow_now_manual_only(self):
        s = (ROOT / "deploy-functions.yml").read_text()
        self.assertIn("workflow_dispatch:", s)
        self.assertNotIn("push:", s)

    def test_integrated_local_isolation_fixed(self):
        from scripts.golge_ai_merge_integrated import workflow_isolation
        self.assertEqual(workflow_isolation(ROOT), [])

    def test_stale_sha_check_is_rejected(self):
        class Stale(FakeAPI):
            def get(self, path):
                value = super().get(path)
                if "/check-runs?" in path:
                    value["check_runs"][0]["head_sha"] = "old"
                return value
        evidence, errors = collect(Stale(), "cihatsarsilmaz", "astrowar-capacitor", 12)
        self.assertFalse(evidence["required_checks_passed"])
        self.assertIn("required_checks_missing_or_failed", errors)

    def test_failed_required_check_is_rejected(self):
        class Failed(FakeAPI):
            def get(self, path):
                value = super().get(path)
                if "/check-runs?" in path:
                    value["check_runs"][0]["conclusion"] = "failure"
                return value
        evidence, errors = collect(Failed(), "cihatsarsilmaz", "astrowar-capacitor", 12)
        self.assertFalse(evidence["required_checks_passed"])
        self.assertIn("required_checks_missing_or_failed", errors)

    def test_incomplete_check_pagination_denied(self):
        class Incomplete(FakeAPI):
            def get(self, path):
                value = super().get(path)
                if "/check-runs?" in path:
                    value["total_count"] = 2
                return value
        evidence, errors = collect(Incomplete(), "cihatsarsilmaz", "astrowar-capacitor", 12)
        self.assertFalse(evidence["required_checks_passed"])
        self.assertIn("checks_unverified", errors)

    def test_self_review_not_independent(self):
        class SelfReview(FakeAPI):
            def get(self, path):
                if "/reviews?" in path:
                    return [{"user": {"login": "author"}, "state": "APPROVED"}]
                return super().get(path)
        evidence, _ = collect(SelfReview(), "cihatsarsilmaz", "astrowar-capacitor", 12)
        self.assertFalse(evidence["independent_review_verified"])

    def test_review_dismissal_revokes_approval(self):
        class Dismissed(FakeAPI):
            def get(self, path):
                if "/reviews?" in path:
                    return [{"user": {"login": "reviewer"}, "state": "APPROVED"},
                            {"user": {"login": "reviewer"}, "state": "DISMISSED"}]
                return super().get(path)
        evidence, _ = collect(Dismissed(), "cihatsarsilmaz", "astrowar-capacitor", 12)
        self.assertFalse(evidence["independent_review_verified"])


if __name__ == "__main__":
    unittest.main()
