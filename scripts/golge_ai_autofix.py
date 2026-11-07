#!/usr/bin/env python3
"""GOLGE AI v1: narrowly scoped, review-only CI repair."""
from pathlib import Path
import re
import sys

path = Path(".github/workflows/deploy-functions.yml")
if not path.is_file():
    print("SKIP: Firebase workflow not found")
    sys.exit(0)

original = path.read_text(encoding="utf-8")
job_header = "  deploy-functions:\n"
anchor = "      - name: Validate Firebase deployment configuration\n"
producer_anchor = "      - name: Check Firebase deployment configuration\n"
condition = "        if: steps.firebase-config.outputs.enabled == 'true'\n"
if original.count(job_header) != 1:
    print("SKIP: unexpected workflow job structure")
    sys.exit(0)

job_start = original.index(job_header)
following_job = re.search(r"(?m)^  [A-Za-z0-9_-]+:\s*$", original[job_start + len(job_header):])
job_end = len(original) if following_job is None else job_start + len(job_header) + following_job.start()
job = original[job_start:job_end]

if job.count(anchor) != 1 or job.count(producer_anchor) != 1:
    print("SKIP: unexpected workflow structure")
    sys.exit(0)

producer_start = job.index(producer_anchor) + len(producer_anchor)
producer_next_step = job.find("      - ", producer_start)
producer_end = len(job) if producer_next_step == -1 else producer_next_step
producer_body = job[producer_start:producer_end]
if (
    producer_start >= job.index(anchor)
    or "        id: firebase-config\n" not in producer_body
    or "printf 'enabled=true\\n' >> \"$GITHUB_OUTPUT\"" not in producer_body
):
    print("SKIP: Firebase config step does not provide the expected enabled output")
    sys.exit(0)

step_start = job.index(anchor) + len(anchor)
next_step = job.find("      - ", step_start)
step_end = len(job) if next_step == -1 else next_step
step_body = job[step_start:step_end]
# A condition may appear after env or run; never introduce duplicate YAML keys.
if any(line.startswith("        if:") for line in step_body.splitlines()):
    print("OK: validation step already has a condition; no changes made")
    sys.exit(0)
if not step_body.startswith("        env:\n"):
    print("SKIP: validation step differs from known safe pattern")
    sys.exit(0)
start = job_start + step_start
path.write_text(original[:start] + condition + original[start:], encoding="utf-8")
print("FIXED: gate Firebase validation on config availability")
