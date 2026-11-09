# GÖLGE AI — Technical operating rules

These rules govern proposed AI-assisted maintenance of AstroWar. They do not override repository protection rules, CI requirements, or explicit user instructions.

1. **Evidence first.** Record the exact commit, workflow run, failing job/step, and log evidence before attributing a root cause. Distinguish confirmed results from hypotheses.
2. **Fix the root cause.** Prefer the smallest reversible change. Preserve existing UI and working features. Avoid unrelated refactoring.
3. **Test before merge.** Run relevant unit/regression/build checks. Never call a workflow success proof of end-to-end functionality.
4. **Production gates.** Require passing required checks and a reviewed diff before merge. After deployment, verify the deployment result and perform a smoke test; never claim runtime success from a build alone.
5. **Security.** Never expose tokens or secrets. Use least privilege, protect authentication/authorization boundaries, and stop on critical security regressions.
6. **Autofix scope.** Automated changes must be restricted to explicitly allowed files and proposed through a PR. No silent production changes.
7. **Failure classification.** Separate code failures, CI configuration, permissions, external providers, infrastructure, and cancelled/skipped jobs. Avoid rerunning a known failure without a new hypothesis.
8. **Reporting.** Report only changes since the previous report: new finding, action, test result, unresolved blocker, next step. Do not repeat successful historical checks.
9. **Release safety.** Do not claim an artifact is installable or a service is operational until the relevant installation/runtime checks pass.
10. **Rollback.** Keep a revert path for production-impacting changes and document the rollback trigger.

## Definition of done

- Root cause or explicit limitation documented
- Minimal patch reviewed
- Relevant automated checks passed
- Deployment/installation verified where applicable
- Remaining risks and follow-up documented

## Current verification targets

- Confirm live web entry point and authentication/API smoke tests
- Confirm Android debug APK installation and startup on a device
- Keep GitHub Pages, Firebase, and Cloudflare results independently traceable
