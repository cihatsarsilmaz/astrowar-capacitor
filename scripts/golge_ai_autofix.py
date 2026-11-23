#!/usr/bin/env python3
"""GOLGE AI v1: narrowly scoped, review-only CI repair."""
from pathlib import Path
import sys

path = Path(".github/workflows/deploy-functions.yml")
if not path.is_file():
    print("SKIP: Firebase workflow not found")
    sys.exit(0)

original = path.read_text(encoding="utf-8")
anchor = "      - name: Validate Firebase deployment configuration\n"
condition = "        if: steps.firebase-config.outputs.enabled == 'true'\n"
if original.count(anchor) != 1:
    print("SKIP: unexpected workflow structure")
    sys.exit(0)
start = original.index(anchor) + len(anchor)
next_step = original.find("      - name:", start)
end = len(original) if next_step == -1 else next_step
step_body = original[start:end]
# A condition may appear after env or run; never introduce duplicate YAML keys.
if any(line.startswith("        if:") for line in step_body.splitlines()):
    print("OK: validation step already has a condition; no changes made")
    sys.exit(0)
if not step_body.startswith("        env:\n"):
    print("SKIP: validation step differs from known safe pattern")
    sys.exit(0)
path.write_text(original[:start] + condition + original[start:], encoding="utf-8")
print("FIXED: gate Firebase validation on config availability")
