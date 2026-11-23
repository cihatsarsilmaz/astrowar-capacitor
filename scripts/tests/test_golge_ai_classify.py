"""Tests for GOLGE AI Actions failure classification."""
import unittest
from scripts.golge_ai_classify import classify

class ClassifierTests(unittest.TestCase):
    def test_no_data(self):
        self.assertEqual(classify({"jobs": []})[0], "NO_JOB_DATA")

    def test_no_failure(self):
        self.assertEqual(classify({"jobs": [{"conclusion": "success"}]})[0], "NO_FAILED_JOBS")

    def test_pre_runner_failure(self):
        self.assertEqual(classify({"jobs": [{"conclusion": "failure", "steps": [], "runner_id": 0}]})[0], "PRE_RUNNER_FAILURE")

    def test_step_failure(self):
        self.assertEqual(classify({"jobs": [{"conclusion": "failure", "runner_id": 10, "steps": [{"conclusion": "failure"}]}]})[0], "STEP_FAILURE")

    def test_unclassified(self):
        self.assertEqual(classify({"jobs": [{"conclusion": "failure", "runner_id": 1, "steps": []}]})[0], "UNCLASSIFIED_FAILURE")

    def test_step_failure_reports_job_and_step(self):
        code, detail = classify({"jobs": [{"name": "Web build", "conclusion": "failure", "runner_id": 7, "steps": [{"name": "Install", "conclusion": "success"}, {"name": "Build", "conclusion": "failure"}]}]})
        self.assertEqual(code, "STEP_FAILURE")
        self.assertIn("Web build / Build", detail)

    def test_step_failure_missing_names(self):
        code, detail = classify({"jobs": [{"conclusion": "failure", "runner_id": 7, "steps": [{"conclusion": "failure"}]}]})
        self.assertEqual(code, "STEP_FAILURE")
        self.assertIn("unnamed job / unnamed step", detail)
