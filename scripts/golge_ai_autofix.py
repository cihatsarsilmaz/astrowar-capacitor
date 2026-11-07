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
if original[start:].startswith(condition):
    print("OK: Firebase validation is correctly gated")
    sys.exit(0)
if not original[start:].startswith("        env:\n"):
    print("SKIP: validation step differs from known safe pattern")
    sys.exit(0)
path.write_text(original[:start] + condition + original[start:], encoding="utf-8")
print("FIXED: gate Firebase validation on config availability")
