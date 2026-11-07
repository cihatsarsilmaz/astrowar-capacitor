#!/usr/bin/env python3
"""Classify GitHub Actions job states without claiming unverified root causes."""
import json
import sys

def classify(run):
    jobs = run.get("jobs", [])
    if not jobs:
        return "NO_JOB_DATA", "No job data available; inspect workflow run and repository settings."
    failures = [job for job in jobs if job.get("conclusion") == "failure"]
    if not failures:
        return "NO_FAILED_JOBS", "No failed jobs reported."
    if any(not j.get("steps") and not j.get("runner_id") for j in failures):
        return "PRE_RUNNER_FAILURE", "Job failed before runner/steps; inspect environment rules, Pages source and Actions policies."
    if any(any(s.get("conclusion") == "failure" for s in j.get("steps", [])) for j in failures):
        return "STEP_FAILURE", "A step failed; inspect the first failing step log."
    return "UNCLASSIFIED_FAILURE", "Failed job; inspect GitHub job annotations and logs."

if __name__ == "__main__":
    payload = json.load(sys.stdin)
    code, detail = classify(payload)
    print(f"{code}: {detail}")
