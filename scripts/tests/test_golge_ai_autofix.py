"""Regression tests for the allowlisted GOLGE AI autofix script."""
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "golge_ai_autofix.py"
HEADER = "      - name: Validate Firebase deployment configuration\n"
GUARD = "        if: steps.firebase-config.outputs.enabled == 'true'\n"
ENV = "        env:\n"


class AutofixTests(unittest.TestCase):
    def run_case(self, initial):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / ".github/workflows/deploy-functions.yml"
            target.parent.mkdir(parents=True)
            target.write_text(initial, encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(SCRIPT)], cwd=root,
                capture_output=True, text=True, check=False
            )
            return result, target.read_text(encoding="utf-8")

    def test_known_issue_is_repaired(self):
        before = "name: test\n" + HEADER + ENV + "          KEY: value\n"
        result, after = self.run_case(before)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(after, before.replace(HEADER, HEADER + GUARD))

    def test_already_fixed_is_unchanged(self):
        before = HEADER + GUARD + ENV
        result, after = self.run_case(before)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(after, before)

    def test_existing_condition_after_env_is_not_duplicated(self):
        before = HEADER + ENV + "          KEY: value\\n" + GUARD
        result, after = self.run_case(before)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(after, before)

    def test_unknown_structure_is_unchanged(self):
        before = HEADER + "        run: echo unexpected\n"
        result, after = self.run_case(before)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(after, before)

    def test_ambiguous_duplicate_is_unchanged(self):
        before = HEADER + ENV + HEADER + ENV
        result, after = self.run_case(before)
        self.assertEqual(result.returncode, 0)
        self.assertEqual(after, before)


if __name__ == "__main__":
    unittest.main()
